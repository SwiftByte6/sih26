import { AmrAgentNode, P2PMessage, P2PMessageType } from '../../types/p2p';

/**
 * Technology-Independent P2P Communication Adapter Interface
 *
 * This abstraction decouples the high-level AMR agent decision logic from the
 * underlying message transmission implementation (e.g. SimulatedP2PNetwork today,
 * or ESP-NOW / hardware communication adapters in the future).
 */
export interface IP2PCommunicationAdapter {
  registerNode(robotId: string, nodeId?: string): AmrAgentNode;
  unregisterNode(robotId: string): void;
  sendMessage(message: P2PMessage): boolean;
  sendDirectMessage(senderId: string, receiverId: string, type: P2PMessageType, payload?: any): boolean;
  broadcastMessage(senderId: string, type: P2PMessageType, payload?: any): boolean;
  setNodeOnlineStatus(robotId: string, isOnline: boolean): void;
  getNode(robotId: string): AmrAgentNode | undefined;
  getAllNodes(): AmrAgentNode[];
  processHeartbeats(now?: number, timeoutMs?: number): void;
  resetNetwork(): void;
}
