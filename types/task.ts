export type TaskType =
  | 'DELIVER_ITEM'
  | 'RESTOCK_SHELF'
  | 'TAKE_TO_PACKING'
  | 'STORE_ITEM'
  | 'MOVE_CONTAINER';

export type TaskPriority = 'URGENT' | 'LOW' | 'NORMAL';

export type TaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'REASSIGNED';

export interface Task {
  task_id: string;
  task_type: TaskType;
  pickup_point: string; // Dynamic label depending on task_type (e.g. Pickup Point, Storage, Source Shelf, etc.)
  drop_point: string;   // Dynamic label depending on task_type (e.g. Drop Point, Target Shelf, Packing Area, etc.)
  priority: TaskPriority;
  weight: number; // in kg
  status: TaskStatus;
  assigned_robot_id: string | null;
  created_time: string;
  assigned_time: string | null;
  started_time: string | null;
  completed_time: string | null;
  failed_time: string | null;
  reassigned_count: number;
  failure_reason: string | null;
  requiredCapability?: string;
  requiredSensingRadius?: number;
  ineligibilityAudit?: Record<string, string[]>;
}


export type TaskEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_PRIORITY_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_REASSIGNED'
  | 'TASK_UNASSIGNED';

export interface TaskEvent {
  type: TaskEventType;
  task: Task;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type TaskEventListener = (event: TaskEvent) => void;

export interface TaskUploadRow {
  task_id?: string;
  task_type?: string;
  pickup?: string;
  pickup_point?: string;
  source?: string;
  drop?: string;
  drop_point?: string;
  target?: string;
  destination?: string;
  priority?: string;
  weight?: number | string;
}
