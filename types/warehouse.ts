export type Point = {
  x: number;
  y: number;
};

export type Shelf = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Obstacle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Intersection = {
  id: string;
  x: number;
  y: number;
};

export type Path = {
  id: string;
  startId: string; // intersection id
  endId: string; // intersection id
};

export type PointOfInterest = {
  id: string;
  type: 'PICKUP' | 'DROP' | 'CHARGER';
  x: number;
  y: number;
  label: string;
};

export type RobotState = 'IDLE' | 'MOVING' | 'CHARGING' | 'ERROR' | 'WAITING';

export type Robot = {
  id: string;
  label: string;
  x: number;
  y: number;
  state: RobotState;
  battery: number;
  speed: number;
  currentTask: string | null;
  path: Point[];
};
