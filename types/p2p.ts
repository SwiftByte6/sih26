import { TaskEvaluationResult } from './evaluation';
import { Task } from './task';

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
  | 'TASK_WINNER_PROPOSAL'
  | 'CONSENSUS'
  | 'TASK_CLAIMED'
  | 'TASK_RELEASED'
  | 'TASK_COMPLETED'
  | 'EMERGENCY'
  // Phase 5 Failure Recovery Message Types
  | 'ROBOT_FAILURE'
  | 'TASK_RECOVERY_ANNOUNCEMENT'
  // Phase 7 Dynamic Reallocation Message Types
  | 'TASK_HANDOVER_REQUEST'
  // Phase 9 Proactive Trajectory Coordination & Deconfliction
  | 'PATH_INTENT'
  | 'PATH_DECONFLICT'
  | 'CONFLICT_DETECTED'
  | 'YIELD_REQUEST'
  | 'YIELD_RESPONSE'
  // Charging System Message Types
  | 'CHARGER_REQUEST'
  | 'CHARGER_RESERVED'
  | 'CHARGER_RELEASED'
  | 'CHARGING_STARTED'
  | 'CHARGING_COMPLETED';

export interface TrajectoryPoint {
  tick: number;
  row: number;
  col: number;
}

export interface PathIntentPayload {
  robotId: string;
  priorityScore: number;
  currentTaskId?: string | null;
  trajectory: TrajectoryPoint[];
}

export interface PathDeconflictPayload {
  yieldingRobotId: string;
  priorityRobotId: string;
  conflictLocation: { row: number; col: number };
  conflictTick: number;
  conflictType: 'VERTEX_COLLISION' | 'HEAD_ON_SWAP';
  reroutedPathLength: number;
  body: string;
}

export type PeerNodeStatus = 'ONLINE' | 'OFFLINE';

export interface P2PMessage {
  id: string;
  timestamp: number;
  senderId: string;       // e.g. "AMR-01" or "TASK_DISPATCH"
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

export interface PeerBidEntry {
  robotId: string;
  timestamp: number;
  eligible: boolean;
  suitabilityScore: number;
  distanceToPickup?: number;
  estimatedTravelDistance?: number;
  estimatedTimeSeconds?: number;
  remainingBatteryAfterTask?: number;
  capabilityScore?: number;
  sensingScore?: number;
  workloadScore?: number;
  evaluation?: TaskEvaluationResult;
}

export interface WinnerProposalEntry {
  robotId: string;
  proposedWinnerId: string;
  timestamp: number;
}

export interface LocalTaskKnowledge {
  task: Task;
  announcementTimestamp: number;
  allocationRound?: number;
  allocationState?: 'ANNOUNCED' | 'EVALUATING' | 'BIDDING' | 'PROPOSING' | 'CONSENSUS' | 'CLAIMED';
  evaluation?: TaskEvaluationResult;
  myBidSent?: boolean;
  myProposalSent?: boolean;
  myConsensusSent?: boolean;
  claimedBy?: string | null;
  status?: 'PENDING' | 'PROPOSED' | 'CLAIMED';
  peerBids: Record<string, PeerBidEntry>; // Keyed by peer's robotId (e.g. "AMR-02")
  peerProposals?: Record<string, WinnerProposalEntry>; // Keyed by peer's robotId (e.g. "AMR-02")
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
  knownTasks: Record<string, LocalTaskKnowledge>; // Keyed by taskId
  inbox: P2PMessage[];
  history: P2PMessage[];
  stats: AmrAgentNodeStats;
}

