export type Point = {
  x: number;
  y: number;
};

export type Shelf = {
  id: string;
  row: number;
  col: number;
  width: number;
  height: number;
};

export type Obstacle = {
  id: string;
  row: number;
  col: number;
  width: number;
  height: number;
};

export type Intersection = {
  id: string;
  row: number;
  col: number;
};

export type Path = {
  id: string;
  startId: string; // intersection id
  endId: string; // intersection id
};

export type PointOfInterest = {
  id: string;
  type: 'PICKUP' | 'DROP' | 'CHARGER';
  row: number;
  col: number;
  label: string;
};

export type RobotState = 'IDLE' | 'MOVING' | 'CHARGING' | 'ERROR' | 'WAITING';

export type Robot = {
  id: string;
  label: string;
  row: number;
  col: number;
  state: RobotState;
  battery: number;
  speed: number;
  currentTask: string | null;
  currentTaskId?: string | null;
  taskPhase?: 'TO_PICKUP' | 'TO_DROP' | null;
  pickupPoint?: { row: number, col: number, label: string } | null;
  dropPoint?: { row: number, col: number, label: string } | null;
  path: {row: number, col: number}[];

  // Hardware Telemetry & Capability (Phase 2)
  sensingRadius?: number;       // in meters
  payloadCapacity?: number;     // in kg
  currentLoad?: number;         // in kg
  temperature?: number;         // in °C
  signalStrength?: number;      // in %
  deliveryCapability?: string;  // e.g. "Standard Transport"
  isOnline?: boolean;
};


export type CommPriority = 'NORMAL' | 'IMPORTANT' | 'WARNING' | 'CRITICAL';
export type CommCategory = 'NAVIGATION' | 'TASK' | 'COORDINATION' | 'SAFETY' | 'OBSTACLE' | 'BATTERY' | 'FAILURE' | 'RECOVERY' | 'SYSTEM';

export type CommunicationMessage = {
  id: string;
  timestamp: number;
  sender: string;
  receiver: string;
  category: CommCategory;
  priority: CommPriority;
  message: string;
};

export type ActiveCommLink = {
  from: string;
  to: string;
  expires: number;
};
