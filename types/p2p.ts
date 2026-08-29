export type P2PMessageType =
  // Phase 1 Foundation Message Types
  | 'HEARTBEAT'
  | 'HELLO'
  | 'PEER_DISCOVERY'
  | 'STATUS_UPDATE'
  | 'TEXT'
  | 'CONNECTION'
  | 'DISCONNECTION'
  // Reserved Future Message Types (Phase 2+)
  | 'TASK_ANNOUNCEMENT'
  | 'TASK_BID'
  | 'TASK_CLAIMED'
  | 'TASK_RELEASED'
  | 'TASK_COMPLETED'
  | 'EMERGENCY';

export type PeerNodeStatus = 'ONLINE' | 'OFFLINE';

export interface P2PMessage {
  id: string;
  timestamp: number;
  senderId: string;       // e.g. "AMR-01"
  receiverId: string | 'ALL';
  type: P2PMessageType;
  payload?: any;
}

export interface PeerInfo {
  robotId: string;        // e.g. "AMR-01"
  nodeId: string;         // e.g. "amr-node-01"
  status: PeerNodeStatus;
  lastSeen: number;       // Timestamp (ms) when last message/heartbeat was received
  lastKnownPosition?: { col: number; row: number };
  lastKnownState?: string;
  lastKnownBattery?: number;
  lastKnownTask?: string | null;
}


export interface AmrAgentNodeStats {
  messagesSent: number;
  messagesReceived: number;
  heartbeatsSent: number;
  heartbeatsReceived: number;
}

export interface AmrAgentNode {
  robotId: string;        // e.g. "AMR-01"
  nodeId: string;         // e.g. "amr-node-01"
  isOnline: boolean;
  lastHeartbeatSent: number;
  peerList: Record<string, PeerInfo>; // Keyed by peer's robotId
  inbox: P2PMessage[];
  history: P2PMessage[];
  stats: AmrAgentNodeStats;
}
