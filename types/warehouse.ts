export type Point = {
  x: number;
  y: number;
};

export type Vec3 = { x: number; y: number; z: number };

export type GridOccupant = {
  row: number;
  col: number;
  width: number;
  height: number;
};

/** Visual transform in world space. Grid occupancy remains row/col/width/height. */
export type ObjectTransform = {
  posY: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: Vec3;
};

export const DEFAULT_TRANSFORM: ObjectTransform = {
  posY: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scale: { x: 1, y: 1, z: 1 },
};

export type AppMode = 'BUILDER' | 'PLAY';
export type ViewMode = '2D' | '3D';
export type CameraMode = 'OVERVIEW' | 'FOLLOW' | 'POV';
export type TransformMode = 'translate' | 'rotate' | 'scale';
export type PlaceableType = 'SHELF' | 'OBSTACLE' | 'ROBOT' | 'PICKUP' | 'DROP' | 'CHARGER' | 'PALLET';
export type SelectedItemType =
  | 'ROBOT'
  | 'SHELF'
  | 'OBSTACLE'
  | 'POI'
  | 'INTERSECTION'
  | 'PALLET'
  | 'FLOOR'
  | 'WALL'
  | null;

export type WallSide = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export type Wall = {
  id: string;
  side: WallSide;
  height: number;
  thickness: number;
};

export type Pallet = GridOccupant &
  ObjectTransform & {
    id: string;
  };

export type Shelf = GridOccupant &
  Partial<ObjectTransform> & {
    id: string;
  };

export type Obstacle = GridOccupant &
  Partial<ObjectTransform> & {
    id: string;
    assetUrl?: string;
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
} & Partial<ObjectTransform>;

export type ChargerState = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';

export type ChargerNode = {
  id: string;
  label: string;
  row: number;
  col: number;
  state: ChargerState;
  reservedBy: string | null;
  occupiedBy: string | null;
};

export type BatteryConfig = {
  lowBatteryThreshold: number;
  criticalBatteryThreshold: number;
  fullBattery: number;
  chargingDuration: number;
  drainRatePerStep: number;
};

export type RobotState = 'IDLE' | 'MOVING' | 'NAVIGATING_TO_CHARGER' | 'CHARGING' | 'ERROR' | 'WAITING' | 'WAITING_FOR_PATH_CLEARANCE';

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
  // Charging System Fields
  chargingState?: 'IDLE' | 'REQUESTING' | 'NAVIGATING' | 'CHARGING' | 'COMPLETED';
  targetChargerId?: string | null;
  chargingPoint?: { row: number; col: number } | null;
  chargingStartTime?: number | null;
  interruptedTaskId?: string | null;
  // Hardware Telemetry & Capability (Phase 2)
  sensingRadius?: number;       // in meters
  payloadCapacity?: number;     // in kg
  currentLoad?: number;         // in kg
  temperature?: number;         // in °C
  signalStrength?: number;      // in %
  deliveryCapability?: string;  // e.g. "Standard Transport"
  isOnline?: boolean;
  failureStatus?: 'NORMAL' | 'OFFLINE' | 'ERROR' | 'COMMUNICATION_LOST';
  recoveryStatus?: 'NONE' | 'RECOVERY_IN_PROGRESS' | 'RECOVERED';
  assetUrl?: string;
} & Partial<ObjectTransform>;

export type LayoutSnapshot = {
  gridRows: number;
  gridCols: number;
  walls: Wall[];
  shelves: Shelf[];
  obstacles: Obstacle[];
  pois: PointOfInterest[];
  pallets: Pallet[];
  robots: Robot[];
  intersections: Intersection[];
  paths: Path[];
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
