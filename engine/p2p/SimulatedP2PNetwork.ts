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
    const sender = this.nodes.get(message.senderId);
    if (!sender || !sender.isOnline) {
      return false; // Offline or unregistered sender cannot send messages
    }

    sender.history.push(message);
    sender.stats.messagesSent++;
    if (message.type === 'HEARTBEAT') {
      sender.stats.heartbeatsSent++;
      sender.lastHeartbeatSent = message.timestamp;
    }

    if (message.receiverId === 'ALL') {
      let deliveredCount = 0;
      this.nodes.forEach((targetNode) => {
        if (targetNode.robotId !== sender.robotId && targetNode.isOnline) {
          targetNode.inbox.push(message);
          targetNode.history.push(message);
          targetNode.stats.messagesReceived++;
          if (message.type === 'HEARTBEAT') {
            targetNode.stats.heartbeatsReceived++;
          }
          // Peer discovery: update lastSeen & status for sender
          targetNode.peerList[sender.robotId] = {
            robotId: sender.robotId,
            nodeId: sender.nodeId,
            status: 'ONLINE',
            lastSeen: message.timestamp,
          };
          deliveredCount++;
        }
      });
      return deliveredCount > 0;
    } else {
      // Direct unicast message to specific receiver
      const targetNode = this.nodes.get(message.receiverId);
      if (targetNode && targetNode.isOnline) {
        targetNode.inbox.push(message);
        targetNode.history.push(message);
        targetNode.stats.messagesReceived++;
        if (message.type === 'HEARTBEAT') {
          targetNode.stats.heartbeatsReceived++;
        }
        // Peer discovery: update lastSeen & status for sender
        targetNode.peerList[sender.robotId] = {
          robotId: sender.robotId,
          nodeId: sender.nodeId,
          status: 'ONLINE',
          lastSeen: message.timestamp,
        };
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
