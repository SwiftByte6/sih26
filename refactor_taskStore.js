const fs = require('fs');

let content = fs.readFileSync('store/taskStore.ts', 'utf8');

// 1. Add Supabase import
content = content.replace(
  "import { create } from 'zustand';",
  "import { create } from 'zustand';\nimport { supabase } from '../lib/supabaseClient';"
);

// 2. Replace interface TaskState
const interfaceRegex = /interface TaskState \{[\s\S]*?subscribeToTaskEvents: \(listener: TaskEventListener\) => \(\) => void;\n\}/;
const newInterface = `interface TaskState {
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

  subscribeToTaskEvents: (listener: TaskEventListener) => () => void;
}`;
content = content.replace(interfaceRegex, newInterface);

// 3. Replace the store implementation block
const storeRegex = /export const useTaskStore = create<TaskState>\(\)\([\s\S]*?\n\);/;
const newStore = `export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: INITIAL_DEMO_TASKS,
      activeView: 'WAREHOUSE',

      setActiveView: (view) => set({ activeView: view }),

      fetchTasks: async () => {
        const { data, error } = await supabase.from('tasks').select('*').order('created_time', { ascending: true });
        if (error) {
          console.error('Error fetching tasks from Supabase:', error);
          return;
        }
        if (data) {
          set({ tasks: data as Task[] });
        }
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

        const { error } = await supabase.from('tasks').insert(newTask);
        if (error) {
          console.error('Error inserting task:', error);
          return { success: false, taskId: generatedId, error: error.message };
        }

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
            errors.push(validation.error || \`Row \${rowNum}: Invalid task data.\`);
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
          const { error } = await supabase.from('tasks').insert(newTasksToPush);
          if (error) {
            console.error('Error batch inserting tasks:', error);
            errors.push('Database insert failed.');
            return { success: false, addedCount: 0, errors };
          }
          
          set(() => ({
            tasks: runningTasksList,
          }));
          newTasksToPush.forEach((t) => notifyListeners('TASK_CREATED', t));
        }

        return { success: addedCount > 0, addedCount, errors };
      },

      updateTask: async (taskId, updates) => {
        const { error } = await supabase.from('tasks').update(updates).eq('task_id', taskId);
        if (error) {
          console.error('Error updating task:', error);
          return;
        }
        set((state) => ({
          tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, ...updates } : t)),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_UPDATED', task);
      },

      deleteTask: async (taskId) => {
        const { error } = await supabase.from('tasks').delete().eq('task_id', taskId);
        if (error) {
          console.error('Error deleting task:', error);
          return;
        }
        const task = get().getTask(taskId);
        set((state) => ({
          tasks: state.tasks.filter((t) => t.task_id !== taskId),
        }));
        if (task) notifyListeners('TASK_UPDATED', { ...task, status: 'FAILED', failure_reason: 'Deleted' });
      },

      updatePriority: async (taskId, priority) => {
        const { error } = await supabase.from('tasks').update({ priority }).eq('task_id', taskId);
        if (error) {
          console.error('Error updating priority:', error);
          return;
        }
        set((state) => ({
          tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, priority } : t)),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_PRIORITY_CHANGED', task);
      },

      redoTask: async (taskId) => {
        const oldTask = get().getTask(taskId);
        if (!oldTask) return { success: false, error: 'Task not found' };

        const generatedId = generateNextTaskId(get().tasks);
        const newTask: Task = {
          ...oldTask,
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

        const { error } = await supabase.from('tasks').insert(newTask);
        if (error) {
          return { success: false, error: error.message };
        }

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        notifyListeners('TASK_CREATED', newTask);
        return { success: true, newTaskId: generatedId };
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

        const { error } = await supabase.from('tasks').update(updates).eq('task_id', taskId);
        if (error) return;

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
        const { error } = await supabase.from('tasks').update({ status: 'IN_PROGRESS', started_time }).eq('task_id', taskId);
        if (error) return;

        set((state) => ({
          tasks: state.tasks.map((t) => t.task_id === taskId ? { ...t, status: 'IN_PROGRESS', started_time } : t),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_STARTED', task);
      },

      completeTask: async (taskId) => {
        const completed_time = new Date().toISOString();
        const { error } = await supabase.from('tasks').update({ status: 'COMPLETED', completed_time }).eq('task_id', taskId);
        if (error) return;

        set((state) => ({
          tasks: state.tasks.map((t) => t.task_id === taskId ? { ...t, status: 'COMPLETED', completed_time } : t),
        }));
        const task = get().getTask(taskId);
        if (task) notifyListeners('TASK_COMPLETED', task);
      },

      failTask: async (taskId, reason = 'Execution failed') => {
        const failed_time = new Date().toISOString();
        const { error } = await supabase.from('tasks').update({ status: 'FAILED', failed_time, failure_reason: reason }).eq('task_id', taskId);
        if (error) return;

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
        
        const updates = { status: 'PENDING', assigned_robot_id: null, reassigned_count, failure_reason: reason };
        const { error } = await supabase.from('tasks').update(updates).eq('task_id', taskId);
        if (error) return;

        set((state) => ({
          tasks: state.tasks.map((t) => t.task_id === taskId ? { ...t, ...updates as Partial<Task> } : t),
        }));
        notifyListeners('TASK_REASSIGNED', task, { reason });
      },

      handleRobotFailure: async (robotId, reason = 'Robot Hardware/Connectivity Failure') => {
        const state = get();
        const affectedTasks = state.tasks.filter((t) => t.assigned_robot_id === robotId && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'));
        
        for (const t of affectedTasks) {
          const failed_time = new Date().toISOString();
          const failure_reason = \`\${reason} (\${robotId})\`;
          const reassigned_count = t.reassigned_count + 1;
          const updates = { status: 'PENDING', assigned_robot_id: null, failed_time, failure_reason, reassigned_count };
          
          await supabase.from('tasks').update(updates).eq('task_id', t.task_id);
          
          set((s) => ({
            tasks: s.tasks.map((task) => task.task_id === t.task_id ? { ...task, ...updates as Partial<Task> } : task)
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
      }
    }),
    {
      name: 'task-store-storage',
    }
  )
);`;
content = content.replace(storeRegex, newStore);

fs.writeFileSync('store/taskStore.ts', content, 'utf8');
