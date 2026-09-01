import { AmrAgentNode, P2PMessage, P2PMessageType } from '../../types/p2p';
import { IP2PCommunicationAdapter } from './P2PAdapter';

let messageCounter = 0;
function generateMessageId(): string {
  messageCounter++;
  return `P2P-MSG-${Date.now()}-${messageCounter}`;
}

export class SimulatedP2PNetwork implements IP2PCommunicationAdapter {
  private nodes: Map<string, AmrAgentNode> = new Map();

  registerNode(
    robotId: string,
    nodeId: string = `amr-node-${robotId.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  ): AmrAgentNode {
    if (this.nodes.has(robotId)) {
      return this.nodes.get(robotId)!;
    }

    const newNode: AmrAgentNode = {
      robotId,
      nodeId,
      isOnline: true,
      lastHeartbeatSent: 0,
      peerList: {},
      knownTasks: {},
      inbox: [],
      history: [],
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        heartbeatsSent: 0,
        heartbeatsReceived: 0,
      },
    };

    const now = Date.now();

    // Populate dynamic peer lists between newly registered node and existing nodes
    this.nodes.forEach((existingNode) => {
      // Existing node discovers new node
      existingNode.peerList[robotId] = {
        robotId,
        nodeId,
        status: 'ONLINE',
        lastSeen: now,
      };
      // New node discovers existing node
      newNode.peerList[existingNode.robotId] = {
        robotId: existingNode.robotId,
        nodeId: existingNode.nodeId,
        status: existingNode.isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeen: now,
      };
    });

    this.nodes.set(robotId, newNode);
    return newNode;
  }

  unregisterNode(robotId: string): void {
    this.nodes.delete(robotId);
    this.nodes.forEach((node) => {
      delete node.peerList[robotId];
    });
  }

  sendMessage(message: P2PMessage): boolean {
    const isSystemSender = message.senderId === 'TASK_DISPATCH' || message.senderId === 'SYSTEM';
    const sender = this.nodes.get(message.senderId);
    if (!isSystemSender && (!sender || !sender.isOnline)) {
      return false; // Offline or unregistered sender cannot send messages
    }

    if (sender) {
      sender.history.push(message);
      sender.stats.messagesSent++;
      if (message.type === 'HEARTBEAT') {
        sender.lastHeartbeatSent = message.timestamp;
      }
    }

    if (message.type !== 'HEARTBEAT') {
      try {
        const bodyText = typeof message.payload === 'string' ? message.payload : message.payload?.body || message.payload?.status || message.type;
        const category = (message.type.startsWith('TASK_') ? 'TASK' : message.type === 'STATUS_UPDATE' ? 'SYSTEM' : 'COORDINATION') as any;
        const warehouseStore = require('../../store/warehouseStore').useWarehouseStore.getState();
        warehouseStore.addCommunication({
          id: `COMM-${message.timestamp}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: message.timestamp,
          sender: message.senderId,
          receiver: message.receiverId,
          category,
          priority: 'NORMAL',
          message: `[${message.type}] ${bodyText}`,
        });
      } catch (e) {}
    }

    const handleTargetNodeReceive = (targetNode: AmrAgentNode) => {
      targetNode.inbox.push(message);
      targetNode.history.push(message);
      targetNode.stats.messagesReceived++;
      if (message.type === 'HEARTBEAT') {
        targetNode.stats.heartbeatsReceived++;
      }

      if (sender) {
        // Peer discovery & peer state knowledge update
        const prevPeer = targetNode.peerList[sender.robotId];
        targetNode.peerList[sender.robotId] = {
          robotId: sender.robotId,
          nodeId: sender.nodeId,
          status: 'ONLINE',
          lastSeen: message.timestamp,
          lastKnownPosition: message.payload?.position || prevPeer?.lastKnownPosition,
          lastKnownState: message.payload?.status || prevPeer?.lastKnownState,
          lastKnownBattery: message.payload?.battery || prevPeer?.lastKnownBattery,
          lastKnownTask: message.payload?.task !== undefined ? message.payload?.task : prevPeer?.lastKnownTask,
        };
      }

      // Handle ROBOT_FAILURE (Phase 5): Peer nodes update local peer knowledge table
      if (message.type === 'ROBOT_FAILURE' && message.payload?.robotId) {
        const failedId = message.payload.robotId;
        if (targetNode.peerList[failedId]) {
          targetNode.peerList[failedId].status = 'OFFLINE';
          targetNode.peerList[failedId].lastKnownState = 'ERROR';
        }
      }

      // Handle TASK_HANDOVER_REQUEST (Phase 7): Operational dynamic task reallocation
      if (message.type === 'TASK_HANDOVER_REQUEST' && message.payload?.taskId) {
        const payload = message.payload;
        const taskId = payload.taskId;

        const warehouseStore = require('../../store/warehouseStore').useWarehouseStore.getState();
        const robotState = warehouseStore.robots.find((r: any) => r.id === targetNode.robotId);

        // Exclude the handing-over robot, busy AMRs, offline AMRs, or failed AMRs
        const isFree = robotState && (robotState.state === 'WAITING' || robotState.state === 'IDLE') && !robotState.currentTask;
        if (isFree && robotState.isOnline !== false && robotState.state !== 'ERROR' && targetNode.robotId !== payload.robotId) {
          targetNode.knownTasks = targetNode.knownTasks || {};
          const handoverRound = payload.handoverRound || 1;

          targetNode.knownTasks[taskId] = {
            task: payload.taskData,
            announcementTimestamp: message.timestamp,
            allocationRound: handoverRound,
            allocationState: 'ANNOUNCED',
            peerBids: {},
            peerProposals: {},
            myBidSent: false,
            myProposalSent: false,
            claimedBy: null,
          };

          const evaluateTask = require('../evaluation/TaskEvaluator').evaluateTask;
          const evalResult = evaluateTask(
            robotState,
            payload.taskData,
            warehouseStore.pois,
            warehouseStore.shelves
          );

          const taskKnowledge = targetNode.knownTasks[taskId];
          taskKnowledge.evaluation = evalResult;
          taskKnowledge.allocationState = 'EVALUATING';

          taskKnowledge.peerBids[targetNode.robotId] = {
            robotId: targetNode.robotId,
            timestamp: message.timestamp,
            eligible: evalResult.eligible,
            suitabilityScore: evalResult.suitabilityScore,
            evaluation: evalResult,
          };

          if (evalResult.eligible && !taskKnowledge.myBidSent) {
            taskKnowledge.myBidSent = true;
            taskKnowledge.allocationState = 'BIDDING';
            setTimeout(() => {
              this.broadcastMessage(targetNode.robotId, 'TASK_BID', {
                taskId,
                robotId: targetNode.robotId,
                allocationRound: handoverRound,
                isHandover: true,
                taskPhase: payload.taskPhase,
                originalRobotId: payload.robotId,
                reason: payload.reason,
                eligible: true,
                suitabilityScore: evalResult.suitabilityScore,
                body: `TASK_BID (HANDOVER): ${taskId} | Suitability: ${evalResult.suitabilityScore}/100`,
              });
            }, 0);
          }
        }
      }

      // Handle TASK_RECOVERY_ANNOUNCEMENT (Phase 5): Exclude failed AMR, evaluate task, and bid
      if (message.type === 'TASK_RECOVERY_ANNOUNCEMENT' && message.payload?.taskId) {
        const payload = message.payload;
        const taskId = payload.taskId;

        const warehouseStore = require('../../store/warehouseStore').useWarehouseStore.getState();
        const robotState = warehouseStore.robots.find((r: any) => r.id === targetNode.robotId);

        // Failed robot and offline AMRs are strictly excluded
        if (robotState && robotState.isOnline !== false && robotState.state !== 'ERROR' && targetNode.robotId !== payload.failedRobotId) {
          targetNode.knownTasks = targetNode.knownTasks || {};
          const recoveryRound = payload.recoveryRound || 1;

          targetNode.knownTasks[taskId] = {
            task: payload.taskData,
            announcementTimestamp: message.timestamp,
            allocationRound: recoveryRound,
            allocationState: 'ANNOUNCED',
            peerBids: {},
            peerProposals: {},
            myBidSent: false,
            myProposalSent: false,
            claimedBy: null,
          };

          const evaluateTask = require('../evaluation/TaskEvaluator').evaluateTask;
          const evalResult = evaluateTask(
            robotState,
            payload.taskData,
            warehouseStore.pois,
            warehouseStore.shelves
          );

          const taskKnowledge = targetNode.knownTasks[taskId];
          taskKnowledge.evaluation = evalResult;
          taskKnowledge.allocationState = 'EVALUATING';

          taskKnowledge.peerBids[targetNode.robotId] = {
            robotId: targetNode.robotId,
            timestamp: message.timestamp,
            eligible: evalResult.eligible,
            suitabilityScore: evalResult.suitabilityScore,
            evaluation: evalResult,
          };

          if (evalResult.eligible && !taskKnowledge.myBidSent) {
            taskKnowledge.myBidSent = true;
            taskKnowledge.allocationState = 'BIDDING';
            setTimeout(() => {
              this.broadcastMessage(targetNode.robotId, 'TASK_BID', {
                taskId,
                robotId: targetNode.robotId,
                allocationRound: recoveryRound,
                isRecovery: true,
                taskPhase: payload.taskPhase,
                lastKnownPosition: payload.lastKnownPosition,
                eligible: true,
                suitabilityScore: evalResult.suitabilityScore,
                body: `TASK_BID (RECOVERY): ${taskId} | Suitability: ${evalResult.suitabilityScore}/100`,
              });
            }, 0);
          }
        }
      }
      if (message.type === 'TASK_ANNOUNCEMENT' && message.payload?.task) {
        const task = message.payload.task;
        const incomingRound = message.payload.allocationRound || 1;
        targetNode.knownTasks = targetNode.knownTasks || {};

        const existingKnowledge = targetNode.knownTasks[task.task_id];
        const warehouseStore = require('../../store/warehouseStore').useWarehouseStore.getState();
        const robotState = warehouseStore.robots.find((r: any) => r.id === targetNode.robotId);
        const robotStateFree = robotState && (robotState.state === 'WAITING' || robotState.state === 'IDLE') && !robotState.currentTask && !robotState.currentTaskId;

        // Reset knowledge if task is new, unclaimed, in a newer allocation round, or when robot is free for re-evaluation
        const isNewerRound = existingKnowledge && (incomingRound > (existingKnowledge.allocationRound || 0));
        const shouldResetKnowledge = !existingKnowledge || (
          !existingKnowledge.claimedBy && (
            isNewerRound || robotStateFree || (message.timestamp - (existingKnowledge.announcementTimestamp || 0) > 2500)
          )
        );

        if (shouldResetKnowledge) {
          targetNode.knownTasks[task.task_id] = {
            task,
            announcementTimestamp: message.timestamp,
            allocationRound: incomingRound,
            allocationState: 'ANNOUNCED',
            peerBids: {},
            peerProposals: {},
            myBidSent: false,
            myProposalSent: false,
            claimedBy: null,
          };
        }

        try {
          const warehouseStore = require('../../store/warehouseStore').useWarehouseStore.getState();
          const robotState = warehouseStore.robots.find((r: any) => r.id === targetNode.robotId);
          if (robotState) {
            const evaluateTask = require('../evaluation/TaskEvaluator').evaluateTask;
            const evalResult = evaluateTask(
              robotState,
              task,
              warehouseStore.pois,
              warehouseStore.shelves
            );
            
            const taskKnowledge = targetNode.knownTasks[task.task_id];
            taskKnowledge.evaluation = evalResult;
            taskKnowledge.allocationState = 'EVALUATING';

            // Populate own bid entry in local peerBids table
            taskKnowledge.peerBids[targetNode.robotId] = {
              robotId: targetNode.robotId,
              timestamp: message.timestamp,
              eligible: evalResult.eligible,
              suitabilityScore: evalResult.suitabilityScore,
              evaluation: evalResult,
            };

            // Fix 9: Audit ineligibility reasons on global taskStore ONLY for ineligible robots
            try {
              const useTaskStore = require('../../store/taskStore').useTaskStore.getState;
              const taskStore = useTaskStore();
              if (!evalResult.eligible && evalResult.ineligibilityReasons && evalResult.ineligibilityReasons.length > 0) {
                taskStore.updateTaskIneligibilityAudit(task.task_id, targetNode.robotId, evalResult.ineligibilityReasons);
              } else if (evalResult.eligible) {
                // Clear ineligibility entry when robot is eligible
                taskStore.updateTaskIneligibilityAudit(task.task_id, targetNode.robotId, []);
              }
            } catch (e) {}

            // Phase 4C: If eligible and bid not yet sent, AMR broadcasts its TASK_BID to ALL peers
            if (evalResult.eligible && !taskKnowledge.myBidSent) {
              taskKnowledge.myBidSent = true;
              taskKnowledge.allocationState = 'BIDDING';
              setTimeout(() => {
                this.broadcastMessage(targetNode.robotId, 'TASK_BID', {
                  taskId: task.task_id,
                  robotId: targetNode.robotId,
                  allocationRound: taskKnowledge.allocationRound || 1,
                  eligible: true,
                  suitabilityScore: evalResult.suitabilityScore,
                  distanceToPickup: evalResult.distanceToPickup,
                  estimatedTravelDistance: evalResult.estimatedTotalDistance,
                  estimatedTimeSeconds: evalResult.estimatedTimeSeconds,
                  remainingBatteryAfterTask: evalResult.remainingBatteryAfterTask,
                  capabilityScore: evalResult.capabilityScore,
                  evaluation: evalResult,
                  body: `TASK_BID: ${task.task_id} (Round ${taskKnowledge.allocationRound || 1}) | Suitability: ${evalResult.suitabilityScore}/100 | Dist: ${evalResult.distanceToPickup}m`,
                });
              }, 0);
            } else if (!evalResult.eligible) {
              setTimeout(() => {
                this.broadcastMessage(targetNode.robotId, 'STATUS_UPDATE', {
                  robotId: targetNode.robotId,
                  status: robotState.state,
                  battery: robotState.battery,
                  body: `EVALUATION [${task.task_id}]: Ineligible -> ${evalResult.ineligibilityReasons.join(' | ')}`,
                });
              }, 0);
            }
          }
        } catch (e) {}
      }

      // Handle TASK_BID: Store peer bid in receiving AMR's local knowledge table & check if ready to propose candidate winner
      if (message.type === 'TASK_BID' && message.payload?.taskId) {
        const taskId = message.payload.taskId;
        const msgRound = message.payload.allocationRound || 1;
        targetNode.knownTasks = targetNode.knownTasks || {};

        if (targetNode.knownTasks[taskId]) {
          const taskKnowledge = targetNode.knownTasks[taskId];
          // Fix 4: Ignore bids from older allocation rounds
          if (msgRound >= (taskKnowledge.allocationRound || 1)) {
            taskKnowledge.peerBids = taskKnowledge.peerBids || {};
            taskKnowledge.peerBids[message.senderId] = {
              robotId: message.senderId,
              timestamp: message.timestamp,
              eligible: message.payload.eligible ?? true,
              suitabilityScore: message.payload.suitabilityScore ?? 0,
              evaluation: message.payload.evaluation,
            };

            // Fix 3 & Phase 5: Wait for expected bids from online, non-failed nodes before determining winner
            const warehouseStoreState = require('../../store/warehouseStore').useWarehouseStore.getState();
            const onlineNodesCount = Object.values(this.nodes).filter((n) => {
              if (!n.isOnline) return false;
              const r = warehouseStoreState.robots.find((bot: any) => bot.id === n.robotId);
              return r && r.isOnline !== false && r.state !== 'ERROR';
            }).length;

            const receivedBidsCount = Object.keys(taskKnowledge.peerBids).length;

            if (!taskKnowledge.myProposalSent && !taskKnowledge.claimedBy && receivedBidsCount >= Math.max(1, onlineNodesCount)) {
              try {
                const determineCandidateWinner = require('../evaluation/TaskEvaluator').determineCandidateWinner;
                const candidateWinner = determineCandidateWinner(taskKnowledge.evaluation, taskKnowledge.peerBids);
                if (candidateWinner) {
                  taskKnowledge.myProposalSent = true;
                  taskKnowledge.allocationState = 'PROPOSING';

                  // Populate own proposal in local peerProposals table
                  taskKnowledge.peerProposals = taskKnowledge.peerProposals || {};
                  taskKnowledge.peerProposals[targetNode.robotId] = {
                    robotId: targetNode.robotId,
                    proposedWinnerId: candidateWinner,
                    timestamp: message.timestamp,
                  };

                  setTimeout(() => {
                    this.broadcastMessage(targetNode.robotId, 'TASK_WINNER_PROPOSAL', {
                      taskId,
                      proposedWinnerId: candidateWinner,
                      allocationRound: taskKnowledge.allocationRound || 1,
                      body: `TASK_WINNER_PROPOSAL: Proposing ${candidateWinner} for ${taskId} (Round ${taskKnowledge.allocationRound || 1})`,
                    });
                  }, 0);
                }
              } catch (e) {}
            }
          }
        }
      }

      // Handle TASK_WINNER_PROPOSAL: Store peer proposal and check for consensus
      if (message.type === 'TASK_WINNER_PROPOSAL' && message.payload?.taskId) {
        const taskId = message.payload.taskId;
        const proposedWinnerId = message.payload.proposedWinnerId;
        const msgRound = message.payload.allocationRound || 1;
        targetNode.knownTasks = targetNode.knownTasks || {};

        if (targetNode.knownTasks[taskId]) {
          const taskKnowledge = targetNode.knownTasks[taskId];
          if (msgRound >= (taskKnowledge.allocationRound || 1)) {
            taskKnowledge.peerProposals = taskKnowledge.peerProposals || {};
            taskKnowledge.peerProposals[message.senderId] = {
              robotId: message.senderId,
              proposedWinnerId,
              timestamp: message.timestamp,
            };

            // Fix 5: Asynchronous consensus check
            const proposals = Object.values(taskKnowledge.peerProposals);
            const eligibleBidsCount = Object.values(taskKnowledge.peerBids).filter((b) => b.eligible).length;
            const expectedProposalsCount = Math.max(1, eligibleBidsCount);

            const unanimousConsensus = proposals.length >= expectedProposalsCount && proposals.every((p) => p.proposedWinnerId === proposedWinnerId);

            if (unanimousConsensus && !taskKnowledge.claimedBy) {
              taskKnowledge.allocationState = 'CONSENSUS';
              const warehouseStoreState = require('../../store/warehouseStore').useWarehouseStore.getState();
              const myRobot = warehouseStoreState.robots.find((r: any) => r.id === targetNode.robotId);
              const isFreeToClaim = myRobot && (myRobot.state === 'WAITING' || myRobot.state === 'IDLE') && !myRobot.currentTask;

              if (targetNode.robotId === proposedWinnerId && isFreeToClaim) {
                taskKnowledge.claimedBy = proposedWinnerId;
                taskKnowledge.status = 'CLAIMED';
                taskKnowledge.allocationState = 'CLAIMED';
                setTimeout(() => {
                  this.broadcastMessage(targetNode.robotId, 'TASK_CLAIMED', {
                    taskId,
                    ownerRobotId: proposedWinnerId,
                    allocationRound: taskKnowledge.allocationRound || 1,
                    body: `TASK_CLAIMED: Task ${taskId} claimed by ${proposedWinnerId} via P2P Consensus (Round ${taskKnowledge.allocationRound || 1})!`,
                  });
                }, 0);
              }
            }
          }
        }
      }

      // Handle TASK_CLAIMED: Synchronize local & global task ownership
      if (message.type === 'TASK_CLAIMED' && message.payload?.taskId) {
        const taskId = message.payload.taskId;
        const ownerRobotId = message.payload.ownerRobotId;
        targetNode.knownTasks = targetNode.knownTasks || {};
        if (targetNode.knownTasks[taskId]) {
          targetNode.knownTasks[taskId].claimedBy = ownerRobotId;
          targetNode.knownTasks[taskId].status = 'CLAIMED';
          targetNode.knownTasks[taskId].allocationState = 'CLAIMED';
        }

        // Synchronize global taskStore & warehouseStore ownership
        try {
          const useTaskStore = require('../../store/taskStore').useTaskStore.getState;
          const useWarehouseStore = require('../../store/warehouseStore').useWarehouseStore.getState;
          
          const taskStore = useTaskStore();
          taskStore.receiveAssignmentResult(taskId, ownerRobotId);

          const warehouseStore = useWarehouseStore();
          const task = taskStore.getTask(taskId);
          if (task && task.handoverAudit?.originalRobotId) {
            const executeHandoverAssignment = require('../recovery/TaskHandoverManager').executeHandoverAssignment;
            executeHandoverAssignment(
              ownerRobotId,
              task,
              task.handoverAudit.handoverPhase || 'TO_PICKUP',
              task.handoverAudit.originalRobotId,
              task.handoverAudit.handoverReason
            );
          } else if (task && task.recoveryAudit?.failedRobotId) {
            const executeRecoveryAssignment = require('../recovery/FailureRecoveryManager').executeRecoveryAssignment;
            executeRecoveryAssignment(
              ownerRobotId,
              task,
              task.recoveryAudit.recoveryPhase || 'TO_PICKUP',
              message.payload?.lastKnownPosition || { col: 5, row: 5 }
            );
          } else if (task) {
            warehouseStore.assignTaskToRobot(ownerRobotId, task);
          }
        } catch (e) {}
      }

    };

    if (message.receiverId === 'ALL') {
      let deliveredCount = 0;
      this.nodes.forEach((targetNode) => {
        if ((!sender || targetNode.robotId !== sender.robotId) && targetNode.isOnline) {
          handleTargetNodeReceive(targetNode);
          deliveredCount++;
        }
      });
      return deliveredCount > 0;
    } else {
      // Direct unicast message to specific receiver
      const targetNode = this.nodes.get(message.receiverId);
      if (targetNode && targetNode.isOnline) {
        handleTargetNodeReceive(targetNode);
        return true;
      }
      return false; // Target node offline or not found
    }
  }

  sendDirectMessage(senderId: string, receiverId: string, type: P2PMessageType, payload?: any): boolean {
    const message: P2PMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      senderId,
      receiverId,
      type,
      payload,
    };
    return this.sendMessage(message);
  }

  broadcastMessage(senderId: string, type: P2PMessageType, payload?: any): boolean {
    const message: P2PMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      senderId,
      receiverId: 'ALL',
      type,
      payload,
    };
    return this.sendMessage(message);
  }

  setNodeOnlineStatus(robotId: string, isOnline: boolean): void {
    const node = this.nodes.get(robotId);
    if (!node) return;

    node.isOnline = isOnline;
    const now = Date.now();

    if (!isOnline) {
      // Notify peer lists that node went offline
      this.nodes.forEach((peer) => {
        if (peer.robotId !== robotId && peer.peerList[robotId]) {
          peer.peerList[robotId].status = 'OFFLINE';
        }
      });
    } else {
      // When node comes back online, update peer lists
      this.nodes.forEach((peer) => {
        if (peer.robotId !== robotId && peer.peerList[robotId]) {
          peer.peerList[robotId].status = 'ONLINE';
          peer.peerList[robotId].lastSeen = now;
        }
      });
      // Send HELLO / HEARTBEAT reconnect broadcast
      this.broadcastMessage(robotId, 'HELLO', { status: 'RECONNECTED', timestamp: now });
    }
  }

  getNode(robotId: string): AmrAgentNode | undefined {
    return this.nodes.get(robotId);
  }

  getAllNodes(): AmrAgentNode[] {
    return Array.from(this.nodes.values());
  }

  processHeartbeats(now: number = Date.now(), timeoutMs: number = 8000): void {
    // 1. Every online node broadcasts a HEARTBEAT to peers
    this.nodes.forEach((node) => {
      if (node.isOnline) {
        this.broadcastMessage(node.robotId, 'HEARTBEAT', { status: 'OK', timestamp: now });
      }
    });

    // 2. Peer discovery timeout check:
    // Every online node checks its peer list. If a peer hasn't been heard from in > timeoutMs, mark OFFLINE.
    this.nodes.forEach((node) => {
      if (node.isOnline) {
        Object.keys(node.peerList).forEach((peerId) => {
          const peer = node.peerList[peerId];
          const peerNode = this.nodes.get(peerId);

          if (!peerNode || !peerNode.isOnline || (now - peer.lastSeen > timeoutMs)) {
            peer.status = 'OFFLINE';
          }
        });
      }
    });
  }

  removeTaskFromAllNodes(taskId: string): void {
    this.nodes.forEach((node) => {
      if (node.knownTasks && node.knownTasks[taskId]) {
        delete node.knownTasks[taskId];
      }
    });
  }

  resetNetwork(): void {
    const now = Date.now();
    this.nodes.forEach((node) => {
      node.isOnline = true;
      node.inbox = [];
      node.history = [];
      node.stats = {
        messagesSent: 0,
        messagesReceived: 0,
        heartbeatsSent: 0,
        heartbeatsReceived: 0,
      };
      Object.keys(node.peerList).forEach((peerId) => {
        node.peerList[peerId].status = 'ONLINE';
        node.peerList[peerId].lastSeen = now;
      });
    });
  }
}
