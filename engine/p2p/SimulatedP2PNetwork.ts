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
        sender.stats.heartbeatsSent++;
        sender.lastHeartbeatSent = message.timestamp;
      }
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

      // Handle TASK_ANNOUNCEMENT: Store local task knowledge, trigger Phase 4A evaluation, and broadcast TASK_BID if eligible
      if (message.type === 'TASK_ANNOUNCEMENT' && message.payload?.task) {
        const task = message.payload.task;
        targetNode.knownTasks = targetNode.knownTasks || {};
        if (!targetNode.knownTasks[task.task_id]) {
          targetNode.knownTasks[task.task_id] = {
            task,
            announcementTimestamp: message.timestamp,
            allocationRound: 1,
            allocationState: 'ANNOUNCED',
            peerBids: {},
            peerProposals: {},
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

            // Phase 4C: If eligible and bid not yet sent, AMR broadcasts its TASK_BID to ALL peers
            if (evalResult.eligible && !taskKnowledge.myBidSent) {
              taskKnowledge.myBidSent = true;
              taskKnowledge.allocationState = 'BIDDING';
              setTimeout(() => {
                this.broadcastMessage(targetNode.robotId, 'TASK_BID', {
                  taskId: task.task_id,
                  robotId: targetNode.robotId,
                  eligible: true,
                  suitabilityScore: evalResult.suitabilityScore,
                  distanceToPickup: evalResult.distanceToPickup,
                  estimatedTravelDistance: evalResult.estimatedTotalDistance,
                  estimatedTimeSeconds: evalResult.estimatedTimeSeconds,
                  remainingBatteryAfterTask: evalResult.remainingBatteryAfterTask,
                  capabilityScore: evalResult.capabilityScore,
                  evaluation: evalResult,
                  body: `TASK_BID: ${task.task_id} | Suitability: ${evalResult.suitabilityScore}/100 | Dist: ${evalResult.distanceToPickup}m`,
                });
              }, 0);
            }
          }
        } catch (e) {}
      }

      // Handle TASK_BID: Store peer bid in receiving AMR's local knowledge table & check if ready to propose candidate winner
      if (message.type === 'TASK_BID' && message.payload?.taskId) {
        const taskId = message.payload.taskId;
        targetNode.knownTasks = targetNode.knownTasks || {};
        if (targetNode.knownTasks[taskId]) {
          const taskKnowledge = targetNode.knownTasks[taskId];
          taskKnowledge.peerBids = taskKnowledge.peerBids || {};
          taskKnowledge.peerBids[message.senderId] = {
            robotId: message.senderId,
            timestamp: message.timestamp,
            eligible: message.payload.eligible ?? true,
            suitabilityScore: message.payload.suitabilityScore ?? 0,
            evaluation: message.payload.evaluation,
          };

          // Check if ready to propose candidate winner (Phase 4D)
          if (!taskKnowledge.myProposalSent && !taskKnowledge.claimedBy) {
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
                    body: `TASK_WINNER_PROPOSAL: Proposing ${candidateWinner} for ${taskId}`,
                  });
                }, 0);
              }
            } catch (e) {}
          }
        }
      }

      // Handle TASK_WINNER_PROPOSAL: Store peer proposal and check for consensus
      if (message.type === 'TASK_WINNER_PROPOSAL' && message.payload?.taskId) {
        const taskId = message.payload.taskId;
        const proposedWinnerId = message.payload.proposedWinnerId;
        targetNode.knownTasks = targetNode.knownTasks || {};
        if (targetNode.knownTasks[taskId]) {
          const taskKnowledge = targetNode.knownTasks[taskId];
          taskKnowledge.peerProposals = taskKnowledge.peerProposals || {};
          taskKnowledge.peerProposals[message.senderId] = {
            robotId: message.senderId,
            proposedWinnerId,
            timestamp: message.timestamp,
          };

          // Consensus Check: Have all eligible participating nodes agreed on the same candidate winner?
          const proposals = Object.values(taskKnowledge.peerProposals);
          const eligibleBidsCount = Object.values(taskKnowledge.peerBids).filter((b) => b.eligible).length;
          const expectedProposalsCount = Math.max(1, eligibleBidsCount);

          const unanimousConsensus = proposals.length >= expectedProposalsCount && proposals.every((p) => p.proposedWinnerId === proposedWinnerId);

          if (unanimousConsensus && !taskKnowledge.claimedBy) {
            taskKnowledge.allocationState = 'CONSENSUS';
            // If targetNode IS the winning robot AND is free (not already occupied with another task), broadcast TASK_CLAIMED
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
                  body: `TASK_CLAIMED: Task ${taskId} claimed by ${proposedWinnerId} via P2P Consensus!`,
                });
              }, 0);
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
          const task = taskStore.tasks.find((t: any) => t.task_id === taskId);
          if (task && (task.assigned_robot_id === null || task.status === 'PENDING')) {
            task.assigned_robot_id = ownerRobotId;
            task.status = 'ASSIGNED';
            task.assigned_time = new Date().toISOString();

            const warehouseStore = useWarehouseStore();
            const robot = warehouseStore.robots.find((r: any) => r.id === ownerRobotId);
            if (robot && (robot.state === 'WAITING' || robot.state === 'IDLE' || robot.path.length === 0)) {
              warehouseStore.assignTaskToRobot(ownerRobotId, task);
            }
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
