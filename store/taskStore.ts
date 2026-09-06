import { create } from 'zustand';
import {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskEvent,
  TaskEventType,
  TaskEventListener,
  TaskUploadRow,
} from '../types/task';

// Initial demo tasks with T-001 format
const INITIAL_DEMO_TASKS: Task[] = [
  {
    task_id: 'T-001',
    task_type: 'DELIVER_ITEM',
    pickup_point: 'PICKUP A',
    drop_point: 'DROP B',
    priority: 'NORMAL',
    weight: 10,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-002',
    task_type: 'RESTOCK_SHELF',
    pickup_point: 'Storage-01',
    drop_point: 'S1',
    priority: 'LOW',
    weight: 15,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-003',
    task_type: 'TAKE_TO_PACKING',
    pickup_point: 'S5',
    drop_point: 'PackingArea B',
    priority: 'URGENT',
    weight: 12,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-004',
    task_type: 'DELIVER_ITEM',
    pickup_point: 'P3',
    drop_point: 'DROP 3',
    priority: 'URGENT',
    weight: 8,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-005',
    task_type: 'STORE_ITEM',
    pickup_point: 'P1',
    drop_point: 'Storage-02',
    priority: 'NORMAL',
    weight: 18,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-006',
    task_type: 'RESTOCK_SHELF',
    pickup_point: 'Storage-02',
    drop_point: 'S2',
    priority: 'NORMAL',
    weight: 14,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-007',
    task_type: 'TAKE_TO_PACKING',
    pickup_point: 'S3',
    drop_point: 'PackingArea B',
    priority: 'LOW',
    weight: 10,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-008',
    task_type: 'DELIVER_ITEM',
    pickup_point: 'PICKUP 6',
    drop_point: 'DROP 3',
    priority: 'URGENT',
    weight: 6,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-009',
    task_type: 'RESTOCK_SHELF',
    pickup_point: 'Storage-01',
    drop_point: 'S6',
    priority: 'NORMAL',
    weight: 20,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-010',
    task_type: 'TAKE_TO_PACKING',
    pickup_point: 'S4',
    drop_point: 'PackingArea B',
    priority: 'NORMAL',
    weight: 9,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-011',
    task_type: 'STORE_ITEM',
    pickup_point: 'PICKUP A',
    drop_point: 'Storage-01',
    priority: 'LOW',
    weight: 16,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'T-012',
    task_type: 'DELIVER_ITEM',
    pickup_point: 'P1',
    drop_point: 'DROP B',
    priority: 'NORMAL',
    weight: 11,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
];

// Calculate next sequential Task ID in T-001 format
export const generateNextTaskId = (tasks: Task[]): string => {
  let maxId = 0;
  tasks.forEach((t) => {
    const match = t.task_id.match(/(?:T|TASK)-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  });
  return `T-${(maxId + 1).toString().padStart(3, '0')}`;
};

// Priority Rank: URGENT (300) -> NORMAL (200) -> LOW (100)
const getPriorityRank = (priority: TaskPriority): number => {
  switch (priority) {
    case 'URGENT':
      return 300;
    case 'NORMAL':
      return 200;
    case 'LOW':
    default:
      return 100;
  }
};

// Sort pending / unassigned tasks for execution consideration order (URGENT -> LOW -> NORMAL)
// Preserves FIFO creation order for same priority
export const sortPendingTasksByPriority = (pendingTasks: Task[]): Task[] => {
  return [...pendingTasks].sort((a, b) => {
    const rankA = getPriorityRank(a.priority);
    const rankB = getPriorityRank(b.priority);
    if (rankB !== rankA) {
      return rankB - rankA; // Higher rank first (URGENT -> LOW -> NORMAL)
    }
    return new Date(a.created_time).getTime() - new Date(b.created_time).getTime();
  });
};

// Helper to release robot when task completes, fails, or is cancelled
const releaseRobotForTask = (taskId: string, robotId?: string | null) => {
  try {
    const warehouseStore = require('./warehouseStore').useWarehouseStore;
    if (warehouseStore) {
      const robots = warehouseStore.getState().robots;
      const updatedRobots = robots.map((r: any) => {
        if ((robotId && r.id === robotId) || r.currentTask === taskId || r.currentTaskId === taskId) {
          console.log(`[P2P] Robot ${r.id} released from task ${taskId}, becoming WAITING`);
          return {
            ...r,
            currentTask: null,
            currentTaskId: null,
            taskPhase: null,
            path: [],
            state: r.state === 'ERROR' ? 'ERROR' : 'WAITING',
          };
        }
        return r;
      });
      warehouseStore.setState({ robots: updatedRobots });
    }
  } catch (e) {}
};

export interface ImportedRowValidation {
  valid: boolean;
  error?: string;
  task?: Omit<Task, 'task_id' | 'created_time' | 'assigned_time' | 'started_time' | 'completed_time' | 'failed_time' | 'reassigned_count' | 'failure_reason' | 'status' | 'assigned_robot_id'>;
}

// Helper to extract field value by normalized header name regardless of column order, case, or format
const getFieldValue = (item: any, possibleKeys: string[]): string | undefined => {
  if (!item || typeof item !== 'object') return undefined;

  // 1. Direct key check
  for (const k of possibleKeys) {
    if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') {
      return String(item[k]).trim();
    }
  }

  // 2. Case-insensitive & space-insensitive header matching
  const itemKeys = Object.keys(item);
  for (const key of itemKeys) {
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const targetKey of possibleKeys) {
      const normTarget = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey === normTarget) {
        const val = item[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }
  return undefined;
};

// Canonical Validation for imported Task Rows
export const validateImportedRow = (item: any, rowNum: number): ImportedRowValidation => {
  const rawType = getFieldValue(item, ['Task Type', 'task_type', 'taskType', 'type']) || '';
  if (!rawType) {
    return { valid: false, error: `Row ${rowNum}: Missing required column "Task Type".` };
  }

  // Canonical Task Type Normalization
  let taskType: TaskType | null = null;
  const normType = rawType.toUpperCase().replace(/[_\-\s]+/g, ' ');
  if (normType === 'DELIVER ITEM' || normType === 'DELIVER_ITEM' || normType === 'DELIVER') taskType = 'DELIVER_ITEM';
  else if (normType === 'RESTOCK SHELF' || normType === 'RESTOCK_SHELF' || normType === 'RESTOCK') taskType = 'RESTOCK_SHELF';
  else if (normType === 'TAKE TO PACKING' || normType === 'TAKE_TO_PACKING' || normType === 'PACKING') taskType = 'TAKE_TO_PACKING';
  else if (normType === 'STORE ITEM' || normType === 'STORE_ITEM' || normType === 'STORE') taskType = 'STORE_ITEM';
  else if (normType === 'MOVE CONTAINER' || normType === 'MOVE_CONTAINER' || normType === 'CONTAINER') taskType = 'MOVE_CONTAINER';

  if (!taskType) {
    return {
      valid: false,
      error: `Row ${rowNum}: Invalid Task Type "${rawType}". Allowed values: Deliver Item, Restock Shelf, Take to Packing, Store Item, Move Container.`,
    };
  }

  // Canonical Priority Normalization
  const rawPriorityStr = getFieldValue(item, ['Priority', 'priority']) || 'NORMAL';
  const rawPriority = rawPriorityStr.toUpperCase();
  let priority: TaskPriority | null = null;
  if (rawPriority === 'URGENT') priority = 'URGENT';
  else if (rawPriority === 'LOW') priority = 'LOW';
  else if (rawPriority === 'NORMAL') priority = 'NORMAL';

  if (!priority) {
    return {
      valid: false,
      error: `Row ${rowNum}: Invalid Priority "${rawPriorityStr}". Allowed values: NORMAL, LOW, URGENT.`,
    };
  }

  const pickup = getFieldValue(item, ['Source', 'source', 'pickup_point', 'pickupPoint', 'pickup', 'p1']) || '';
  const drop = getFieldValue(item, ['Target', 'target', 'destination', 'drop_point', 'dropPoint', 'drop', 'd1']) || '';

  if (!pickup) {
    return { valid: false, error: `Row ${rowNum}: Missing required column "Source".` };
  }

  if (!drop) {
    return { valid: false, error: `Row ${rowNum}: Missing required column "Target".` };
  }

  // Charger Prohibition Check
  if (pickup.toUpperCase().includes('CHARGER') || drop.toUpperCase().includes('CHARGER')) {
    return { valid: false, error: `Row ${rowNum}: Charger locations (e.g. CHARGER 1) are not allowed for task creation.` };
  }

  // Location Rules Validation by Task Type
  const isPickupLoc = (loc: string) => /pickup|p1|p3|poi1/i.test(loc);
  const isDropLoc = (loc: string) => /drop|d5|d8|poi2/i.test(loc);
  const isStorageLoc = (loc: string) => /storage/i.test(loc);
  const isShelfLoc = (loc: string) => /shelf|^s[1-6]$/i.test(loc);
  const isPackingLoc = (loc: string) => /packing/i.test(loc);
  const isContainerLoc = (loc: string) => /bin|container/i.test(loc);

  switch (taskType) {
    case 'DELIVER_ITEM':
      if (!isPickupLoc(pickup)) {
        return { valid: false, error: `Row ${rowNum}: Invalid source "${pickup}" for Deliver Item. Source must be a Pickup location (e.g. PICKUP A, P1).` };
      }
      if (!isDropLoc(drop)) {
        return { valid: false, error: `Row ${rowNum}: Invalid target "${drop}" for Deliver Item. Target must be a Drop location (e.g. DROP B, D5).` };
      }
      break;

    case 'RESTOCK_SHELF':
      if (!isStorageLoc(pickup)) {
        return { valid: false, error: `Row ${rowNum}: Invalid source "${pickup}" for Restock Shelf. Source must be a Storage location (e.g. Storage-01).` };
      }
      if (!isShelfLoc(drop)) {
        return { valid: false, error: `Row ${rowNum}: Invalid target "${drop}" for Restock Shelf. Target must be a Shelf (e.g. S1-S6, Shelf S5).` };
      }
      break;

    case 'TAKE_TO_PACKING':
      if (!isShelfLoc(pickup)) {
        return { valid: false, error: `Row ${rowNum}: Invalid source "${pickup}" for Take to Packing. Source must be a Shelf (e.g. S1-S6, Shelf S5).` };
      }
      if (!isPackingLoc(drop)) {
        return { valid: false, error: `Row ${rowNum}: Invalid target "${drop}" for Take to Packing. Target must be a Packing area (e.g. Packing Area B).` };
      }
      break;

    case 'STORE_ITEM':
      if (!isPickupLoc(pickup)) {
        return { valid: false, error: `Row ${rowNum}: Invalid source "${pickup}" for Store Item. Source must be a Pickup location (e.g. PICKUP A, P3).` };
      }
      if (!isStorageLoc(drop)) {
        return { valid: false, error: `Row ${rowNum}: Invalid target "${drop}" for Store Item. Target must be a Storage location (e.g. Storage-01).` };
      }
      break;

    case 'MOVE_CONTAINER':
      if (!isContainerLoc(pickup)) {
        return { valid: false, error: `Row ${rowNum}: Invalid source "${pickup}" for Move Container. Source must be a Container/Bin (e.g. Bin-A).` };
      }
      if (!isContainerLoc(drop)) {
        return { valid: false, error: `Row ${rowNum}: Invalid target "${drop}" for Move Container. Target must be a Container/Bin (e.g. Bin-B).` };
      }
      break;
  }

  const rawWeight = getFieldValue(item, ['Weight', 'weight']);
  const weight = rawWeight !== undefined && !isNaN(Number(rawWeight)) && Number(rawWeight) >= 0 ? Number(rawWeight) : 10;

  return {
    valid: true,
    task: {
      task_type: taskType,
      pickup_point: pickup,
      drop_point: drop,
      priority,
      weight,
    },
  };
};

const eventListeners: Set<TaskEventListener> = new Set();

const notifyListeners = (type: TaskEventType, task: Task, metadata?: Record<string, unknown>) => {
  const event: TaskEvent = {
    type,
    task,
    timestamp: new Date().toISOString(),
    metadata,
  };
  eventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (e) {
      console.error('Task listener error:', e);
    }
  });
};

interface TaskState {
  tasks: Task[];
  activeView: 'WAREHOUSE' | 'TASKS' | 'ROBOTS';

  setActiveView: (view: 'WAREHOUSE' | 'TASKS' | 'ROBOTS') => void;

  // Task Creation
  createTask: (taskData: Omit<Task, 'task_id' | 'created_time' | 'assigned_time' | 'started_time' | 'completed_time' | 'failed_time' | 'reassigned_count' | 'failure_reason' | 'status' | 'assigned_robot_id'>) => { success: boolean; taskId: string; error?: string };
  addMultipleTasks: (tasksData: (TaskUploadRow | Partial<Task>)[]) => { success: boolean; addedCount: number; errors: string[] };
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => { success: boolean; error?: string };
  redoTask?: (taskId: string) => { success: boolean; newTaskId?: string; error?: string };
  updatePriority: (taskId: string, priority: TaskPriority) => void;
  updateTaskIneligibilityAudit: (taskId: string, robotId: string, reasons: string[]) => void;

  // Queries
  getTask: (taskId: string) => Task | undefined;
  getAllTasks: () => Task[];
  getPendingTasks: () => Task[]; // Returns pending tasks in priority execution consideration order
  getAssignedTasks: () => Task[];
  getActiveTasks: () => Task[];
  getCompletedTasks: () => Task[];

  // Assignment Result Reception (From AMR Assignment Module)
  receiveAssignmentResult: (taskId: string, robotId: string | null) => void;

  // Task Execution Tracking State Machine
  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, reason?: string) => void;
  reassignTask: (taskId: string, reason?: string) => void;
  handleRobotFailure: (robotId: string, reason?: string) => void;

  // Persistence
  saveTasks: () => string;
  loadTasks: (jsonContent: string) => boolean;
  resetTasks: () => void;
  clearTasks: () => void;

  // Event subscription
  subscribeToTaskEvents: (listener: TaskEventListener) => () => void;
}

import { persist } from 'zustand/middleware';

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: INITIAL_DEMO_TASKS,
      activeView: 'WAREHOUSE',

      setActiveView: (view) => set({ activeView: view }),

  createTask: (taskData) => {
    const generatedId = generateNextTaskId(get().tasks);

    const newTask: Task = {
      ...taskData,
      task_id: generatedId,
      status: 'PENDING',
      assigned_robot_id: null,
      created_time: new Date().toISOString(),
      assigned_time: null,
      started_time: null,
      completed_time: null,
      failed_time: null,
      reassigned_count: 0,
      failure_reason: null,
    };

    // Main Master Task List preserves Task ID / creation order
    set((state) => ({
      tasks: [...state.tasks, newTask],
    }));

    notifyListeners('TASK_CREATED', newTask);
    return { success: true, taskId: generatedId };
  },

  addMultipleTasks: (tasksData) => {
    const errors: string[] = [];
    let addedCount = 0;
    const currentTasks = [...get().tasks];

    const newTasksToPush: Task[] = [];

    tasksData.forEach((item, idx) => {
      const rowNum = idx + 1;
      const validation = validateImportedRow(item, rowNum);

      if (!validation.valid || !validation.task) {
        errors.push(validation.error || `Row ${rowNum}: Invalid task data.`);
        return;
      }

      // Auto-generate Task ID sequentially continuing from current max
      const nextId = generateNextTaskId([...currentTasks, ...newTasksToPush]);

      const validTask: Task = {
        task_id: nextId,
        ...validation.task,
        status: 'PENDING',
        assigned_robot_id: null,
        created_time: new Date().toISOString(),
        assigned_time: null,
        started_time: null,
        completed_time: null,
        failed_time: null,
        reassigned_count: 0,
        failure_reason: null,
      };

      newTasksToPush.push(validTask);
      addedCount++;
    });

    if (newTasksToPush.length > 0) {
      set(() => ({
        tasks: [...currentTasks, ...newTasksToPush],
      }));
      newTasksToPush.forEach((t) => notifyListeners('TASK_CREATED', t));
    }

    return { success: addedCount > 0, addedCount, errors };
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, ...updates } : t)),
    }));
    const task = get().getTask(taskId);
    if (task) notifyListeners('TASK_UPDATED', task);
  },

  deleteTask: (taskId) => {
    const task = get().getTask(taskId);
    if (!task) {
      return { success: false, error: `Task "${taskId}" not found.` };
    }

    // Requirement 2 & 8: Delete allowed ONLY when task.status === PENDING AND assigned_robot_id === null AND started_time === null
    if (task.status !== 'PENDING' || task.assigned_robot_id !== null || task.started_time !== null) {
      return { success: false, error: 'Started or assigned tasks cannot be deleted.' };
    }

    // 1. Remove task from store
    set((state) => ({
      tasks: state.tasks.filter((t) => t.task_id !== taskId),
    }));

    // 2. Cleanup announced state & local task knowledge in AMR P2P agents
    try {
      const warehouseStore = require('./warehouseStore').useWarehouseStore.getState();
      if (warehouseStore && warehouseStore.removeAnnouncedTaskId) {
        warehouseStore.removeAnnouncedTaskId(taskId);
      }

      const p2pStore = require('./p2pStore').useP2PStore.getState();
      if (p2pStore && p2pStore.removeTaskFromAllNodes) {
        p2pStore.removeTaskFromAllNodes(taskId);
      }
    } catch (e) {}

    notifyListeners('TASK_DELETED' as any, task);
    return { success: true };
  },

  redoTask: (taskId) => {
    const oldTask = get().getTask(taskId);
    if (!oldTask) return { success: false, error: 'Task not found' };

    // Instead of creating a new task, we reset the existing task to PENDING
    const updates: Partial<Task> = {
      status: 'PENDING',
      assigned_robot_id: null,
      assigned_time: null,
      started_time: null,
      completed_time: null,
      failed_time: null,
      failure_reason: null,
    };

    set((state) => ({
      tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, ...updates } : t)),
    }));
    
    const task = get().getTask(taskId);
    if (task) notifyListeners('TASK_UPDATED' as any, task);
    return { success: true, newTaskId: taskId };
  },

  updatePriority: (taskId, priority) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, priority } : t)),
    }));
    try {
      const warehouseStore = require('./warehouseStore').useWarehouseStore.getState();
      if (warehouseStore && warehouseStore.removeAnnouncedTaskId) {
        warehouseStore.removeAnnouncedTaskId(taskId);
      }
      const p2pStore = require('./p2pStore').useP2PStore.getState();
      if (p2pStore && p2pStore.removeTaskFromAllNodes) {
        p2pStore.removeTaskFromAllNodes(taskId);
      }
    } catch (e) {}
    const task = get().getTask(taskId);
    if (task) notifyListeners('TASK_PRIORITY_CHANGED', task);
  },

  updateTaskIneligibilityAudit: (taskId, robotId, reasons) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.task_id === taskId) {
          const audit = t.ineligibilityAudit || {};
          return {
            ...t,
            ineligibilityAudit: {
              ...audit,
              [robotId]: reasons,
            },
          };
        }
        return t;
      }),
    }));
  },

  getTask: (taskId) => get().tasks.find((t) => t.task_id === taskId),
  getAllTasks: () => get().tasks,
  // Pending tasks query returns pending tasks sorted strictly by execution priority order (URGENT -> LOW -> NORMAL)
  getPendingTasks: () => {
    const pending = get().tasks.filter((t) => t.status === 'PENDING' || t.status === 'REASSIGNED');
    return sortPendingTasksByPriority(pending);
  },
  getAssignedTasks: () => get().tasks.filter((t) => t.status === 'ASSIGNED'),
  getActiveTasks: () => get().tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'),
  getCompletedTasks: () => get().tasks.filter((t) => t.status === 'COMPLETED'),

  // Assignment Result Reception
  receiveAssignmentResult: (taskId, robotId) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.task_id === taskId) {
          if (robotId) {
            return {
              ...t,
              status: 'ASSIGNED' as TaskStatus,
              assigned_robot_id: robotId,
              assigned_time: new Date().toISOString(),
            };
          } else {
            return {
              ...t,
              status: 'PENDING' as TaskStatus,
              assigned_robot_id: null,
            };
          }
        }
        return t;
      }),
    }));

    const task = get().getTask(taskId);
    if (task) {
      if (robotId) {
        notifyListeners('TASK_ASSIGNED', task, { robotId });
      } else {
        notifyListeners('TASK_UNASSIGNED', task);
      }
    }
  },

  startTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.task_id === taskId
          ? {
              ...t,
              status: 'IN_PROGRESS',
              started_time: new Date().toISOString(),
            }
          : t
      ),
    }));
    const task = get().getTask(taskId);
    if (task) notifyListeners('TASK_STARTED', task);
  },

  completeTask: (taskId) => {
    const task = get().getTask(taskId);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.task_id === taskId
          ? {
              ...t,
              status: 'COMPLETED',
              completed_time: new Date().toISOString(),
            }
          : t
      ),
    }));
    releaseRobotForTask(taskId, task?.assigned_robot_id);
    const updatedTask = get().getTask(taskId);
    if (updatedTask) notifyListeners('TASK_COMPLETED', updatedTask);
  },

  failTask: (taskId, reason = 'Execution failed') => {
    const originalTask = get().getTask(taskId);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.task_id === taskId
          ? {
              ...t,
              status: 'FAILED',
              failed_time: new Date().toISOString(),
              failure_reason: reason,
            }
          : t
      ),
    }));
    releaseRobotForTask(taskId, originalTask?.assigned_robot_id);
    const task = get().getTask(taskId);
    if (task) notifyListeners('TASK_FAILED', task, { reason });

    // Phase 5 Failure Recovery Hook: If failure is recoverable, initiate decentralized recovery
    if (originalTask && originalTask.assigned_robot_id) {
      const isNonRecoverable = /unreachable for all amrs|invalid source|invalid target/i.test(reason);
      if (!isNonRecoverable) {
        try {
          const handlePeerRobotFailure = require('../engine/recovery/FailureRecoveryManager').handlePeerRobotFailure;
          handlePeerRobotFailure({
            robotId: originalTask.assigned_robot_id,
            failureType: 'ERROR',
            currentTaskId: taskId,
            position: { col: 5, row: 5 },
            timestamp: Date.now(),
          });
        } catch (e) {}
      }
    }
  },

  reassignTask: (taskId, reason = 'Reassignment triggered') => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.task_id === taskId) {
          return {
            ...t,
            status: 'PENDING' as TaskStatus,
            assigned_robot_id: null,
            reassigned_count: t.reassigned_count + 1,
            failure_reason: reason,
          };
        }
        return t;
      }),
    }));

    const task = get().getTask(taskId);
    if (task) notifyListeners('TASK_REASSIGNED', task, { reason });
  },

  handleRobotFailure: (robotId, reason = 'Robot Hardware/Connectivity Failure') => {
    set((state) => {
      const affectedTasks = state.tasks.filter(
        (t) => t.assigned_robot_id === robotId && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')
      );

      const updatedTasks = state.tasks.map((t) => {
        if (t.assigned_robot_id === robotId && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')) {
          return {
            ...t,
            status: 'PENDING' as TaskStatus,
            assigned_robot_id: null,
            reassigned_count: t.reassigned_count + 1,
            failed_time: new Date().toISOString(),
            failure_reason: `${reason} (${robotId})`,
          };
        }
        return t;
      });

      affectedTasks.forEach((at) => {
        notifyListeners('TASK_FAILED', at, { robotId, reason });
        notifyListeners('TASK_REASSIGNED', at, { robotId, reason });
      });

      return { tasks: updatedTasks };
    });
  },

  saveTasks: () => {
    const payload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      tasks: get().tasks,
    };
    return JSON.stringify(payload, null, 2);
  },

  resetTasks: () => set({ tasks: INITIAL_DEMO_TASKS }),
  clearTasks: () => set({ tasks: [] }),
  loadTasks: (jsonContent) => {
    try {
      const parsed = JSON.parse(jsonContent);
      const tasksArray: Task[] = Array.isArray(parsed) ? parsed : parsed.tasks || [];

      if (!Array.isArray(tasksArray) || tasksArray.length === 0) return false;

      // Validate saved task items preserve exact Task ID, status, assignment, etc.
      const validTasks: Task[] = [];
      for (const t of tasksArray) {
        const rawPickup = t.pickup_point || (t as any).source || (t as any).pickup || '';
        const rawDrop = t.drop_point || (t as any).target || (t as any).destination || (t as any).drop || '';

        if (!t.task_id || !rawPickup || !rawDrop) {
          console.error('Invalid task structure in saved state file:', t);
          return false;
        }

        validTasks.push({
          task_id: String(t.task_id).toUpperCase(),
          task_type: (t.task_type || (t as any).taskType || 'DELIVER_ITEM') as TaskType,
          pickup_point: String(rawPickup),
          drop_point: String(rawDrop),
          priority: (t.priority || 'NORMAL') as TaskPriority,
          weight: Number(t.weight) >= 0 ? Number(t.weight) : 10,
          status: (t.status || 'PENDING') as TaskStatus,
          assigned_robot_id: t.assigned_robot_id || (t as any).assignedRobotId || null,
          created_time: t.created_time || (t as any).createdAt || new Date().toISOString(),
          assigned_time: t.assigned_time || (t as any).assignedAt || null,
          started_time: t.started_time || (t as any).startedAt || null,
          completed_time: t.completed_time || (t as any).completedAt || null,
          failed_time: t.failed_time || (t as any).failedAt || null,
          reassigned_count: Number(t.reassigned_count) || 0,
          failure_reason: t.failure_reason || (t as any).failureReason || null,
        });
      }

      set(() => ({
        tasks: validTasks,
      }));

      return true;
    } catch (e) {
      console.error('Failed to parse saved task state JSON:', e);
      return false;
    }
  },

  subscribeToTaskEvents: (listener) => {
    eventListeners.add(listener);
    return () => {
      eventListeners.delete(listener);
    };
  }
}),
  {
    name: 'task-store-storage',
  }
)
);
