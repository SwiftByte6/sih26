import { create } from 'zustand';
import { Robot, RobotState, Shelf, Obstacle, Intersection, Path, PointOfInterest, CommunicationMessage, ActiveCommLink } from '../types/warehouse';
import { demoWarehouse } from '../data/demoWarehouse';
import { findPathAStar, isWalkable } from '../engine/pathfinding';
import { useTaskStore } from './taskStore';
import { useP2PStore } from './p2pStore';
import { resolveLocationCoordinates } from '../engine/evaluation/TaskEvaluator';
import { resolveTickCollisions } from '../engine/coordination/CollisionCoordinator';

export type Task = { id: string, targetRow: number, targetCol: number, assignedTo: string | null };

const MAX_MESSAGES = 200;
let msgCounter = 0;
let lastStatusBroadcastTime = 0;
const STATUS_BROADCAST_INTERVAL_MS = 1000;
interface RobotTelemetrySnapshot {
  state: string;
  col: number;
  row: number;
  battery: number;
  task: string | null;
  isOnline: boolean;
}

const announcedTaskIds = new Set<string>();
const announcedTaskTimestamps = new Map<string, number>();
const lastRobotTelemetry = new Map<string, RobotTelemetrySnapshot>();
const lastConflictTime = new Map<string, number>();
const blockedTicksMap = new Map<string, number>();
const taskAllocationRounds = new Map<string, number>();

function createMsg(sender: string, receiver: string, message: string, category: CommunicationMessage['category'], priority: CommunicationMessage['priority'] = 'NORMAL'): CommunicationMessage {
  msgCounter++;
  return {
    id: `MSG-${msgCounter}`,
    timestamp: Date.now(),
    sender,
    receiver,
    category,
    priority,
    message
  };
}

interface WarehouseState {
  robots: Robot[];
  shelves: Shelf[];
  obstacles: Obstacle[];
  intersections: Intersection[];
  paths: Path[];
  pois: PointOfInterest[];
  selectedItemId: string | null;
  selectedItemType: 'ROBOT' | 'SHELF' | 'OBSTACLE' | 'POI' | 'INTERSECTION' | null;
  isRunning: boolean;
  scale: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  gridRows: number;
  gridCols: number;
  cellSize: number;
  
  communications: CommunicationMessage[];
  activeCommLinks: ActiveCommLink[];
  
  setSelectedItem: (id: string | null, type: 'ROBOT' | 'SHELF' | 'OBSTACLE' | 'POI' | 'INTERSECTION' | null) => void;
  toggleSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setScale: (scale: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleGrid: () => void;
  
  addObstacle: (obstacle: Omit<Obstacle, 'id'>) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (id: string) => void;
  
  addRobot: (robotData: Partial<Robot> & { id: string }) => void;
  updateRobot: (id: string, updates: Partial<Robot>) => void;
  removeRobot: (id: string) => void;

  addCommunication: (msg: CommunicationMessage) => void;
  clearCommunications: () => void;
  assignTaskToRobot: (robotId: string, task: any) => void;
  removeAnnouncedTaskId: (taskId: string) => void;
  
  tick: () => void;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
  robots: demoWarehouse.robots,
  shelves: demoWarehouse.shelves,
  obstacles: demoWarehouse.obstacles,
  intersections: demoWarehouse.intersections,
  paths: demoWarehouse.paths,
  pois: demoWarehouse.pois,
  selectedItemId: null,
  selectedItemType: null,
  isRunning: false,
  scale: 1,
  pan: { x: 0, y: 0 },
  showGrid: true,
  gridRows: 40,
  gridCols: 60,
  cellSize: 20,
  
  communications: [],
  activeCommLinks: [],

  setSelectedItem: (id, type) => set({ selectedItemId: id, selectedItemType: type }),
  toggleSimulation: () => set((state) => ({ isRunning: !state.isRunning })),
  stopSimulation: () => set({ isRunning: false }),
  resetSimulation: () => {
    announcedTaskIds.clear();
    announcedTaskTimestamps.clear();
    lastRobotTelemetry.clear();
    lastConflictTime.clear();
    blockedTicksMap.clear();
    taskAllocationRounds.clear();
    useP2PStore.getState().resetP2PNetwork();
    set({ 
      isRunning: false, 
      robots: demoWarehouse.robots,
      obstacles: demoWarehouse.obstacles,
      selectedItemId: null,
      selectedItemType: null,
      communications: [],
      activeCommLinks: []
    });
  },
  removeAnnouncedTaskId: (taskId: string) => {
    announcedTaskIds.delete(taskId);
    announcedTaskTimestamps.delete(taskId);
  },
  setScale: (scale) => set({ scale }),
  setPan: (pan) => set({ pan }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  addObstacle: (obs) => set((state) => {
    const nextId = `OBS-${(state.obstacles.length + 1).toString().padStart(3, '0')}`;
    const newObstacle = { ...obs, id: nextId };
    return {
      obstacles: [...state.obstacles, newObstacle],
      selectedItemId: nextId,
      selectedItemType: 'OBSTACLE'
    };
  }),
  updateObstacle: (id, updates) => set((state) => ({
    obstacles: state.obstacles.map(o => o.id === id ? { ...o, ...updates } : o)
  })),
  removeObstacle: (id) => set((state) => ({
    obstacles: state.obstacles.filter(o => o.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    selectedItemType: state.selectedItemId === id ? null : state.selectedItemType
  })),

  addRobot: (robotData) => set((state) => {

    const newRobot: Robot = {
      id: robotData.id,
      label: robotData.label || robotData.id,
      row: robotData.row ?? 10,
      col: robotData.col ?? 10,
      state: robotData.state || 'IDLE',
      battery: robotData.battery ?? 100,
      speed: robotData.speed ?? 1.2,
      currentTask: null,
      currentTaskId: null,
      taskPhase: null,
      pickupPoint: null,
      dropPoint: null,
      path: [],
      sensingRadius: robotData.sensingRadius ?? 5,
      payloadCapacity: robotData.payloadCapacity ?? 20,
      currentLoad: robotData.currentLoad ?? 0,
      temperature: robotData.temperature ?? 35,
      signalStrength: robotData.signalStrength ?? 95,
      deliveryCapability: robotData.deliveryCapability || 'Standard Transport',
      isOnline: true,
    };

    useP2PStore.getState().network.registerNode(newRobot.id);
    useP2PStore.getState().processHeartbeats();

    // Broadcast currently pending tasks to the newly added robot
    const pendingTasks = useTaskStore.getState().getPendingTasks();
    pendingTasks.forEach((t) => {
      useP2PStore.getState().sendDirectMessage('TASK_DISPATCH', newRobot.id, 'TASK_ANNOUNCEMENT', {
        taskId: t.task_id,
        task: t,
        pickupPoint: t.pickup_point,
        dropPoint: t.drop_point,
        weight: t.weight,
        priority: t.priority,
        body: `TASK_ANNOUNCEMENT: ${t.task_id} [${t.task_type}] Pickup: ${t.pickup_point} -> Drop: ${t.drop_point} (Weight: ${t.weight}kg)`,
      });
    });

    return {
      robots: [...state.robots, newRobot],
      selectedItemId: newRobot.id,
      selectedItemType: 'ROBOT'
    };
  }),

  assignTaskToRobot: (robotId: string, task: any) => set((state) => {
    const robotIndex = state.robots.findIndex((r) => r.id === robotId);
    if (robotIndex === -1) return state;

    const robot = state.robots[robotIndex];
    const pickupCoord = resolveLocationCoordinates(task.pickup_point, state.pois, state.shelves);
    const dropCoord = resolveLocationCoordinates(task.drop_point, state.pois, state.shelves);

    if (!pickupCoord || !dropCoord) return state;

    // Verify start position walkability; if blocked inside shelf, find nearest walkable aisle cell
    let startRow = robot.row;
    let startCol = robot.col;

    if (!isWalkable(state, startRow, startCol)) {
      const neighbors = [
        { row: startRow - 1, col: startCol },
        { row: startRow + 1, col: startCol },
        { row: startRow, col: startCol - 1 },
        { row: startRow, col: startCol + 1 },
      ];
      const validNeighbor = neighbors.find((n) => isWalkable(state, n.row, n.col));
      if (validNeighbor) {
        startRow = validNeighbor.row;
        startCol = validNeighbor.col;
      }
    }

    const path = findPathAStar(state, startRow, startCol, pickupCoord.row, pickupCoord.col);

    if (path.length === 0) {
      const isStartBlocked = !isWalkable(state, robot.row, robot.col);
      const isPickupBlocked = !isWalkable(state, pickupCoord.row, pickupCoord.col);
      const failReason = isStartBlocked
        ? `Robot start position blocked at (${robot.col},${robot.row})`
        : isPickupBlocked
        ? `Pickup location blocked at (${pickupCoord.col},${pickupCoord.row})`
        : 'No path to pickup';
      useTaskStore.getState().failTask(task.task_id, failReason);
      return state;
    }

    const updatedRobots = [...state.robots];
    updatedRobots[robotIndex] = {
      ...robot,
      row: startRow,
      col: startCol,
      state: 'MOVING' as const,
      currentTask: task.task_id,
      currentTaskId: task.task_id,
      taskPhase: 'TO_PICKUP' as const,
      pickupPoint: pickupCoord,
      dropPoint: dropCoord,
      path,
    };

    return { robots: updatedRobots };
  }),


  updateRobot: (id, updates) => set((state) => ({
    robots: state.robots.map(r => r.id === id ? { ...r, ...updates } : r)
  })),

  removeRobot: (id) => set((state) => {
    useP2PStore.getState().network.unregisterNode(id);
    useP2PStore.getState().processHeartbeats();

    return {
      robots: state.robots.filter(r => r.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      selectedItemType: state.selectedItemId === id ? null : state.selectedItemType
    };
  }),
  
  addCommunication: (msg) => set((state) => {
    const updated = [...state.communications, msg];
    if (updated.length > MAX_MESSAGES) {
      updated.splice(0, updated.length - MAX_MESSAGES);
    }
    return { communications: updated };
  }),
  
  clearCommunications: () => set({ communications: [], activeCommLinks: [] }),

  tick: () => set((state) => {

    if (!state.isRunning) return state;

    const now = Date.now();
    const p2pStore = useP2PStore.getState();

    // Process P2P Heartbeats & Peer Discovery in Simulated Network
    p2pStore.processHeartbeats();

    // Event / Change-Driven P2P STATUS_UPDATE broadcast:
    // Broadcast ONLY when meaningful state, task, position (>= 5 cells), battery (>= 5%), or online status changes.
    state.robots.forEach((robot) => {
      const isOnline = robot.isOnline ?? true;
      if (!isOnline) return;

      const taskLabel = robot.currentTask || robot.currentTaskId || null;
      const currentSnap = {
        state: robot.state,
        col: robot.col,
        row: robot.row,
        battery: Math.round(robot.battery),
        task: taskLabel,
        isOnline,
      };

      const prev = lastRobotTelemetry.get(robot.id);
      if (!prev) {
        // Initial snapshot registration (broadcast initial status once)
        lastRobotTelemetry.set(robot.id, currentSnap);
        p2pStore.broadcastMessage(robot.id, 'STATUS_UPDATE', {
          robotId: robot.id,
          position: { col: robot.col, row: robot.row },
          status: robot.state,
          battery: currentSnap.battery,
          task: taskLabel,
          speed: robot.speed,
          body: `Initial Status: ${robot.state} | Pos (${robot.col},${robot.row}) | Batt: ${currentSnap.battery}%${taskLabel ? ` | Task: ${taskLabel}` : ''}`,
        });
        return;
      }

      // Check meaningful change conditions:
      const stateChanged = prev.state !== currentSnap.state;
      const taskChanged = prev.task !== currentSnap.task;
      const onlineChanged = prev.isOnline !== currentSnap.isOnline;
      const posDist = Math.abs(currentSnap.col - prev.col) + Math.abs(currentSnap.row - prev.row);
      const posChangedMeaningfully = posDist >= 5;
      const battChangedMeaningfully = Math.abs(currentSnap.battery - prev.battery) >= 5;

      if (stateChanged || taskChanged || onlineChanged || posChangedMeaningfully || battChangedMeaningfully) {
        lastRobotTelemetry.set(robot.id, currentSnap);

        const changes: string[] = [];
        if (stateChanged) changes.push(`State: ${prev.state} → ${currentSnap.state}`);
        if (taskChanged) changes.push(`Task: ${prev.task || 'None'} → ${currentSnap.task || 'None'}`);
        if (battChangedMeaningfully) changes.push(`Batt: ${prev.battery}% → ${currentSnap.battery}%`);
        if (posChangedMeaningfully) changes.push(`Moved to (${currentSnap.col},${currentSnap.row})`);

        p2pStore.broadcastMessage(robot.id, 'STATUS_UPDATE', {
          robotId: robot.id,
          position: { col: robot.col, row: robot.row },
          status: robot.state,
          battery: currentSnap.battery,
          task: taskLabel,
          speed: robot.speed,
          body: `STATUS_UPDATE [${changes.join(' | ')}] Pos (${robot.col},${robot.row}) | Batt: ${currentSnap.battery}%`,
        });
      }
    });

    const taskStore = useTaskStore.getState();

    // Assigned Task Execution Dispatcher:
    // If a robot is WAITING/IDLE with no currentTask, check if there is an ASSIGNED task in taskStore for this robot.
    // Immediately dispatch assignTaskToRobot so that assigned tasks execute sequentially without getting stranded!
    state.robots.forEach((robot) => {
      if ((robot.state === 'WAITING' || robot.state === 'IDLE') && !robot.currentTask && !robot.currentTaskId) {
        const assignedTask = taskStore.tasks.find(
          (t) => t.assigned_robot_id === robot.id && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')
        );
        if (assignedTask) {
          useWarehouseStore.getState().assignTaskToRobot(robot.id, assignedTask);
        }
      }
    });

    const pendingTasks = taskStore.getPendingTasks();

    // Announce the top unassigned pending task that has not been announced yet,
    // or re-announce an unassigned pending task if 4+ seconds have elapsed.
    // We announce 1 task at a time to allow the winner to transition to MOVING before the next task is announced.
    const unassignedTasks = pendingTasks.filter((t) => t.status === 'PENDING' && t.assigned_robot_id === null);

    let taskToAnnounce = unassignedTasks.find((t) => !announcedTaskIds.has(t.task_id));
    if (!taskToAnnounce) {
      taskToAnnounce = unassignedTasks.find((t) => {
        const lastTime = announcedTaskTimestamps.get(t.task_id);
        return !lastTime || (now - lastTime > 4000);
      });
    }

    if (taskToAnnounce) {
      announcedTaskIds.add(taskToAnnounce.task_id);
      announcedTaskTimestamps.set(taskToAnnounce.task_id, now);
      const currentRound = (taskAllocationRounds.get(taskToAnnounce.task_id) || 0) + 1;
      taskAllocationRounds.set(taskToAnnounce.task_id, currentRound);

      p2pStore.broadcastMessage('TASK_DISPATCH', 'TASK_ANNOUNCEMENT', {
        taskId: taskToAnnounce.task_id,
        task: taskToAnnounce,
        allocationRound: currentRound,
        pickupPoint: taskToAnnounce.pickup_point,
        dropPoint: taskToAnnounce.drop_point,
        weight: taskToAnnounce.weight,
        priority: taskToAnnounce.priority,
        requiredCapability: taskToAnnounce.requiredCapability,
        requiredSensingRadius: taskToAnnounce.requiredSensingRadius,
        body: `TASK_ANNOUNCEMENT: ${taskToAnnounce.task_id} [${taskToAnnounce.task_type}] Pickup: ${taskToAnnounce.pickup_point} -> Drop: ${taskToAnnounce.drop_point} (Weight: ${taskToAnnounce.weight}kg, Round ${currentRound})`,
      });
    }

    const newMessages: CommunicationMessage[] = [];
    const newLinks: ActiveCommLink[] = [];


    
    // Expire old visual links
    const activeLinks = state.activeCommLinks.filter(l => l.expires > now);

    const findLocationCoordinates = (locString: string): { row: number, col: number, label: string } | null => {
      const poi = state.pois.find(p => p.label.toLowerCase() === locString.toLowerCase() || p.id.toLowerCase() === locString.toLowerCase());
      if (poi) return { row: poi.row, col: poi.col, label: poi.label };
      
      const shelf = state.shelves.find(s => s.id.toLowerCase() === locString.toLowerCase() || locString.toLowerCase().includes(s.id.toLowerCase()));
      // Return a coordinate just outside the shelf (e.g. row - 1) because the shelf itself is an obstacle
      if (shelf) return { row: shelf.row - 1, col: shelf.col, label: shelf.id };
      
      return null;
    };

    // Evaluate tick movement intents using deterministic CollisionCoordinator
    const collisionResolution = resolveTickCollisions(state.robots, state.obstacles, taskStore.tasks, blockedTicksMap);

    // Process yielding events for P2P messaging (throttled)
    collisionResolution.yieldingEvents.forEach((evt) => {
      const conflictKey = `${evt.yieldingRobotId}-${evt.priorityRobotId}`;
      if (!lastConflictTime.has(conflictKey) || (now - (lastConflictTime.get(conflictKey) || 0) > 3000)) {
        lastConflictTime.set(conflictKey, now);
        p2pStore.sendDirectMessage(evt.yieldingRobotId, evt.priorityRobotId, 'TEXT', {
          body: `YIELDING to ${evt.priorityRobotId}: ${evt.reason}`,
        });
        newLinks.push({ from: evt.yieldingRobotId, to: evt.priorityRobotId, expires: now + 2500 });
      }
    });

    const updatedRobots = state.robots.map(robot => {
      // Robot is idle/waiting -> assign new task
      if (robot.state === 'WAITING' || (robot.state !== 'MOVING' && robot.state !== 'WAITING_FOR_PATH_CLEARANCE' && robot.path.length === 0)) {
        const pendingTasks = taskStore.getPendingTasks();
        let assignedTask = null;
        let pickupCoord = null;
        let dropCoord = null;

        for (const t of pendingTasks) {
          // Bypass legacy random assignment for tasks participating in P2P decentralized allocation
          if (announcedTaskIds.has(t.task_id)) {
            continue;
          }
          pickupCoord = findLocationCoordinates(t.pickup_point);
          dropCoord = findLocationCoordinates(t.drop_point);
          if (pickupCoord && dropCoord && t.assigned_robot_id === null) {
            assignedTask = t;
            break;
          }
        }

        if (assignedTask && pickupCoord && dropCoord) {
          taskStore.receiveAssignmentResult(assignedTask.task_id, robot.id);
          const newPath = findPathAStar(state, robot.row, robot.col, pickupCoord.row, pickupCoord.col);
          
          if (newPath.length > 0) {
            p2pStore.sendDirectMessage('SYSTEM', robot.id, 'TEXT', { body: `Task assigned: [${assignedTask.task_id}] Pickup at ${pickupCoord.label}` });
            p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Heading to pickup ${pickupCoord.label}` });
            newLinks.push({ from: robot.id, to: 'ALL', expires: now + 2000 });
            return { 
              ...robot, 
              path: newPath, 
              state: 'MOVING' as const, 
              currentTask: assignedTask.task_id,
              currentTaskId: assignedTask.task_id,
              taskPhase: 'TO_PICKUP' as const,
              pickupPoint: pickupCoord,
              dropPoint: dropCoord
            };
          } else {
            // Pathfinding failed, fail task
            taskStore.failTask(assignedTask.task_id, 'No path to pickup');
            p2pStore.sendDirectMessage(robot.id, 'SYSTEM', 'TEXT', { body: `Cannot find path to pickup ${pickupCoord.label}` });
          }
        }
      }

      if ((robot.state === 'MOVING' || robot.state === 'WAITING_FOR_PATH_CLEARANCE') && robot.path.length > 0) {
        // Check if robot is blocked by collision coordinator
        if (collisionResolution.blockedRobotIds.has(robot.id)) {
          const blockInfo = collisionResolution.blockedRobotIds.get(robot.id);
          return {
            ...robot,
            state: 'WAITING_FOR_PATH_CLEARANCE' as const,
          };
        }

        // If unblocked and allowed, advance 1 cell along path
        if (collisionResolution.allowedRobotIds.has(robot.id)) {
          const nextCell = robot.path[0];

          const approachingIntersection = state.intersections.find(i => i.row === nextCell.row && i.col === nextCell.col);
          if (approachingIntersection) {
            p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Approaching intersection ${approachingIntersection.id}` });
          }

          // Move to next cell
          const remainingPath = robot.path.slice(1);
          let newState: RobotState = 'MOVING';
          let newTaskPhase: 'TO_PICKUP' | 'TO_DROP' | null = robot.taskPhase || null;
          let newCurrentTaskId: string | null = robot.currentTaskId || null;
          let newPath = remainingPath;
          
          if (remainingPath.length === 0) {
            if (robot.taskPhase === 'TO_PICKUP' && robot.currentTaskId && robot.dropPoint) {
              // Reached pickup, start going to drop
              taskStore.startTask(robot.currentTaskId);
              p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Picked up item. Heading to ${robot.dropPoint.label}` });
              newPath = findPathAStar(state, nextCell.row, nextCell.col, robot.dropPoint.row, robot.dropPoint.col);
              newTaskPhase = 'TO_DROP';
              if (newPath.length === 0) {
                taskStore.failTask(robot.currentTaskId, 'No path to drop');
                newState = 'WAITING';
                newTaskPhase = null;
                newCurrentTaskId = null;
              }
            } else if (robot.taskPhase === 'TO_DROP' && robot.currentTaskId) {
              // Reached drop, task complete
              taskStore.completeTask(robot.currentTaskId);
              p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Task [${robot.currentTaskId}] completed at ${robot.dropPoint?.label}.` });
              newLinks.push({ from: robot.id, to: 'ALL', expires: now + 2000 });
              newState = 'WAITING';
              newTaskPhase = null;
              newCurrentTaskId = null;
            } else {
              // Just reached a point, no active task phase
              newState = 'WAITING';
            }

            if (newState === 'WAITING') {
              unassignedTasks.forEach((pt) => {
                announcedTaskIds.delete(pt.task_id);
                announcedTaskTimestamps.delete(pt.task_id);
              });
            }
          }
          
          // Battery warning
          const newBattery = robot.battery - 0.3;
          if (newBattery <= 20 && robot.battery > 20) {
            p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Battery at ${Math.round(newBattery)}%. Requesting charger.` });
          }
          
          return {
            ...robot,
            col: nextCell.col,
            row: nextCell.row,
            path: newPath,
            state: newState,
            taskPhase: newTaskPhase,
            currentTaskId: newCurrentTaskId,
            currentTask: newCurrentTaskId ? newCurrentTaskId : null,
            battery: Math.max(0, newBattery)
          };
        }
      }

      if (robot.state === 'CHARGING') {
        const newBattery = Math.min(100, robot.battery + 1.0);
        if (newBattery >= 100) {
          p2pStore.broadcastMessage(robot.id, 'STATUS_UPDATE', {
            robotId: robot.id,
            status: 'WAITING',
            battery: 100,
            body: `CHARGING complete (100%). Transitioning to WAITING.`,
          });
          return {
            ...robot,
            battery: 100,
            state: 'WAITING' as const,
          };
        }
        return {
          ...robot,
          battery: newBattery,
        };
      }

      return robot;
    });

    // Trim communications to MAX_MESSAGES
    const allComms = [...state.communications, ...newMessages];
    if (allComms.length > MAX_MESSAGES) {
      allComms.splice(0, allComms.length - MAX_MESSAGES);
    }

    return { 
      robots: updatedRobots, 
      communications: allComms,
      activeCommLinks: [...activeLinks, ...newLinks]
    };
  }),
}));

// Initialize P2P Network with default robots on module load
useP2PStore.getState().initializeNetwork(demoWarehouse.robots.map((r) => r.id));
