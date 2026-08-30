import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

const INITIAL_DEMO_TASKS: Task[] = [];

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

const getPriorityRank = (priority: TaskPriority): number => {
  switch (priority) {
    case 'URGENT': return 300;
    case 'LOW': return 200;
    case 'NORMAL':
    default: return 100;
  }
};

export const sortPendingTasksByPriority = (pendingTasks: Task[]): Task[] => {
  return [...pendingTasks].sort((a, b) => {
    const rankA = getPriorityRank(a.priority);
    const rankB = getPriorityRank(b.priority);
    if (rankB !== rankA) {
      return rankB - rankA;
    }
    return new Date(a.created_time).getTime() - new Date(b.created_time).getTime();
  });
};

export interface ImportedRowValidation {
  valid: boolean;
  error?: string;
  task?: Omit<Task, 'task_id' | 'created_time' | 'assigned_time' | 'started_time' | 'completed_time' | 'failed_time' | 'reassigned_count' | 'failure_reason' | 'status' | 'assigned_robot_id'>;
}

const getFieldValue = (item: any, possibleKeys: string[]): string | undefined => {
  if (!item || typeof item !== 'object') return undefined;
  for (const k of possibleKeys) {
    if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') {
      return String(item[k]).trim();
    }
  }
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

export const validateImportedRow = (item: any, rowNum: number): ImportedRowValidation => {
  const rawType = getFieldValue(item, ['Task Type', 'task_type', 'taskType', 'type']) || '';
  if (!rawType) return { valid: false, error: `Row ${rowNum}: Missing required column "Task Type".` };

  let taskType: TaskType | null = null;
  const normType = rawType.toUpperCase().replace(/[_\-\s]+/g, ' ');
  if (normType === 'DELIVER ITEM' || normType === 'DELIVER_ITEM' || normType === 'DELIVER') taskType = 'DELIVER_ITEM';
  else if (normType === 'RESTOCK SHELF' || normType === 'RESTOCK_SHELF' || normType === 'RESTOCK') taskType = 'RESTOCK_SHELF';
  else if (normType === 'TAKE TO PACKING' || normType === 'TAKE_TO_PACKING' || normType === 'PACKING') taskType = 'TAKE_TO_PACKING';
  else if (normType === 'STORE ITEM' || normType === 'STORE_ITEM' || normType === 'STORE') taskType = 'STORE_ITEM';
  else if (normType === 'MOVE CONTAINER' || normType === 'MOVE_CONTAINER' || normType === 'CONTAINER') taskType = 'MOVE_CONTAINER';

  if (!taskType) return { valid: false, error: `Row ${rowNum}: Invalid Task Type "${rawType}".` };

  const rawPriorityStr = getFieldValue(item, ['Priority', 'priority']) || 'NORMAL';
  const rawPriority = rawPriorityStr.toUpperCase();
  let priority: TaskPriority | null = null;
  if (rawPriority === 'URGENT') priority = 'URGENT';
  else if (rawPriority === 'LOW') priority = 'LOW';
  else if (rawPriority === 'NORMAL') priority = 'NORMAL';

  if (!priority) return { valid: false, error: `Row ${rowNum}: Invalid Priority "${rawPriorityStr}".` };

  const pickup = getFieldValue(item, ['Source', 'source', 'pickup_point', 'pickupPoint', 'pickup', 'p1']) || '';
  const drop = getFieldValue(item, ['Target', 'target', 'destination', 'drop_point', 'dropPoint', 'drop', 'd1']) || '';

  if (!pickup) return { valid: false, error: `Row ${rowNum}: Missing required column "Source".` };
  if (!drop) return { valid: false, error: `Row ${rowNum}: Missing required column "Target".` };

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
  const event: TaskEvent = { type, task, timestamp: new Date().toISOString(), metadata };
  eventListeners.forEach((listener) => { try { listener(event); } catch (e) { } });
};

interface TaskState {
  tasks: Task[];
  activeView: 'WAREHOUSE' | 'TASKS';
  setActiveView: (view: 'WAREHOUSE' | 'TASKS') => void;

  fetchTasks: () => Promise<void>;
  
  createTask: (taskData: Omit<Task, 'task_id' | 'created_time' | 'assigned_time' | 'started_time' | 'completed_time' | 'failed_time' | 'reassigned_count' | 'failure_reason' | 'status' | 'assigned_robot_id'>) => Promise<{ success: boolean; taskId: string; error?: string }>;
  addMultipleTasks: (tasksData: (TaskUploadRow | Partial<Task>)[]) => Promise<{ success: boolean; addedCount: number; errors: string[] }>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updatePriority: (taskId: string, priority: TaskPriority) => Promise<void>;
  redoTask: (taskId: string) => Promise<{ success: boolean; newTaskId?: string; error?: string }>;

  getTask: (taskId: string) => Task | undefined;
  getAllTasks: () => Task[];
  getPendingTasks: () => Task[]; 
  getAssignedTasks: () => Task[];
  getActiveTasks: () => Task[];
  getCompletedTasks: () => Task[];

  receiveAssignmentResult: (taskId: string, robotId: string | null) => Promise<void>;

  startTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  failTask: (taskId: string, reason?: string) => Promise<void>;
  reassignTask: (taskId: string, reason?: string) => Promise<void>;
  handleRobotFailure: (robotId: string, reason?: string) => Promise<void>;

  saveTasks: () => string;
  loadTasks: (jsonContent: string) => boolean;
  clearTasks: () => void;
  resetTasks: () => void;
  subscribeToTaskEvents: (listener: TaskEventListener) => () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: INITIAL_DEMO_TASKS,
      activeView: 'WAREHOUSE',

      setActiveView: (view) => set({ activeView: view }),

      fetchTasks: async () => {
        // No-op for local storage since Zustand persist handles hydration
      },

      createTask: async (taskData) => {
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

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));

        notifyListeners('TASK_CREATED', newTask);
        return { success: true, taskId: generatedId };
      },

      addMultipleTasks: async (tasksData) => {
        const errors: string[] = [];
        let addedCount = 0;
        const currentTasks = [...get().tasks];
        const newTasksToPush: Task[] = [];
        let runningTasksList = [...currentTasks];

        for (let idx = 0; idx < tasksData.length; idx++) {
          const item = tasksData[idx];
          const rowNum = idx + 1;
          const validation = validateImportedRow(item, rowNum);

          if (!validation.valid || !validation.task) {
            errors.push(validation.error || `Row ${rowNum}: Invalid task data.`);
            continue;
          }

          const nextId = generateNextTaskId(runningTasksList);
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
          runningTasksList.push(validTask);
          addedCount++;
        }

        if (newTasksToPush.length > 0) {
          set(() => ({
            tasks: runningTasksList,
          }));
          newTasksToPush.forEach((t) => notifyListeners('TASK_CREATED', t));
        }

        return { success: addedCount > 0, addedCount, errors };
      },

      updateTask: async (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, ...updates } : t)),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_UPDATED', task);
      },

      deleteTask: async (taskId) => {
        const task = get().getTask(taskId);
        set((state) => ({
          tasks: state.tasks.filter((t) => t.task_id !== taskId),
        }));
        if (task) notifyListeners('TASK_UPDATED', { ...task, status: 'FAILED', failure_reason: 'Deleted' });
      },

      updatePriority: async (taskId, priority) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, priority } : t)),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_PRIORITY_CHANGED', task);
      },

      redoTask: async (taskId) => {
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
        if (task) notifyListeners('TASK_UPDATED', task);
        return { success: true, newTaskId: taskId };
      },

      getTask: (taskId) => get().tasks.find((t) => t.task_id === taskId),
      getAllTasks: () => get().tasks,
      getPendingTasks: () => sortPendingTasksByPriority(get().tasks.filter((t) => t.status === 'PENDING' || t.status === 'REASSIGNED')),
      getAssignedTasks: () => get().tasks.filter((t) => t.status === 'ASSIGNED'),
      getActiveTasks: () => get().tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'),
      getCompletedTasks: () => get().tasks.filter((t) => t.status === 'COMPLETED'),

      receiveAssignmentResult: async (taskId, robotId) => {
        const updates: Partial<Task> = robotId 
          ? { status: 'ASSIGNED', assigned_robot_id: robotId, assigned_time: new Date().toISOString() }
          : { status: 'PENDING', assigned_robot_id: null };

        set((state) => ({
          tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, ...updates } : t))
        }));

        const task = get().getTask(taskId);
        if (task) {
          if (robotId) notifyListeners('TASK_ASSIGNED', task, { robotId });
          else notifyListeners('TASK_UNASSIGNED', task);
        }
      },

      startTask: async (taskId) => {
        const started_time = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) => t.task_id === taskId ? { ...t, status: 'IN_PROGRESS', started_time } : t),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_STARTED', task);
      },

      completeTask: async (taskId) => {
        const completed_time = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) => t.task_id === taskId ? { ...t, status: 'COMPLETED', completed_time } : t),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_COMPLETED', task);
      },

      failTask: async (taskId, reason = 'Execution failed') => {
        const failed_time = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) => t.task_id === taskId ? { ...t, status: 'FAILED', failed_time, failure_reason: reason } : t),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_FAILED', task, { reason });
      },

      reassignTask: async (taskId, reason = 'Reassignment triggered') => {
        const task = get().getTask(taskId);
        if (!task) return;
        const reassigned_count = task.reassigned_count + 1;
        
        const updates: Partial<Task> = { status: 'PENDING', assigned_robot_id: null, reassigned_count, failure_reason: reason };
        set((state) => ({
          tasks: state.tasks.map((t) => t.task_id === taskId ? { ...t, ...updates } : t),
        }));
        notifyListeners('TASK_REASSIGNED', task, { reason });
      },

      handleRobotFailure: async (robotId, reason = 'Robot Hardware/Connectivity Failure') => {
        const state = get();
        const affectedTasks = state.tasks.filter((t) => t.assigned_robot_id === robotId && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'));
        
        for (const t of affectedTasks) {
          const failed_time = new Date().toISOString();
          const failure_reason = `${reason} (${robotId})`;
          const reassigned_count = t.reassigned_count + 1;
          const updates: Partial<Task> = { status: 'PENDING', assigned_robot_id: null, failed_time, failure_reason, reassigned_count };
          
          set((s) => ({
            tasks: s.tasks.map((task) => task.task_id === t.task_id ? { ...task, ...updates } : task)
          }));
          
          const updated = get().getTask(t.task_id);
          if (updated) {
            notifyListeners('TASK_FAILED', updated, { robotId, reason });
            notifyListeners('TASK_REASSIGNED', updated, { robotId, reason });
          }
        }
      },

      saveTasks: () => {
        const payload = { version: '1.0', exported_at: new Date().toISOString(), tasks: get().tasks };
        return JSON.stringify(payload, null, 2);
      },

      loadTasks: (jsonContent) => {
        try {
          const parsed = JSON.parse(jsonContent);
          const tasksArray = Array.isArray(parsed) ? parsed : parsed.tasks || [];
          if (!Array.isArray(tasksArray) || tasksArray.length === 0) return false;
          set(() => ({ tasks: tasksArray as Task[] }));
          return true;
        } catch (e) {
          return false;
        }
      },

      subscribeToTaskEvents: (listener) => {
        eventListeners.add(listener);
        return () => { eventListeners.delete(listener); };
      },
      
      clearTasks: () => {
        set({ tasks: [] });
      },

      resetTasks: () => {
        set((state) => ({
          tasks: state.tasks.map((t) => ({
            ...t,
            status: 'PENDING' as TaskStatus,
            assigned_robot_id: null,
            assigned_time: null,
            started_time: null,
            completed_time: null,
            failed_time: null,
            reassigned_count: 0,
            failure_reason: null,
          })),
        }));
      }
    }),
    {
      name: 'task-store-storage',
    }
  )
);
