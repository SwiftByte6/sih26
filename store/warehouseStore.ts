import { create } from 'zustand';
import { Robot, RobotState, Shelf, Obstacle, Intersection, Path, PointOfInterest, CommunicationMessage, ActiveCommLink } from '../types/warehouse';
import { demoWarehouse } from '../data/demoWarehouse';
import { findPathAStar } from '../engine/pathfinding';
import { useTaskStore } from './taskStore';
import { useP2PStore } from './p2pStore';

export type Task = { id: string, targetRow: number, targetCol: number, assignedTo: string | null };

const MAX_MESSAGES = 200;
let msgCounter = 0;

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

    return {
      robots: [...state.robots, newRobot],
      selectedItemId: newRobot.id,
      selectedItemType: 'ROBOT'
    };
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

    // Process P2P Heartbeats & Peer Discovery in Simulated Network
    useP2PStore.getState().processHeartbeats();

    const taskStore = useTaskStore.getState();
    const now = Date.now();
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

    const updatedRobots = state.robots.map(robot => {
      // Robot is idle/waiting -> assign new task
      if (robot.state === 'WAITING' || (robot.state !== 'MOVING' && robot.path.length === 0)) {
        const pendingTasks = taskStore.getPendingTasks();
        let assignedTask = null;
        let pickupCoord = null;
        let dropCoord = null;

        for (const t of pendingTasks) {
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
            newMessages.push(createMsg('SYSTEM', robot.id, `Task assigned: [${assignedTask.task_id}] Pickup at ${pickupCoord.label}`, 'TASK', 'NORMAL'));
            newMessages.push(createMsg(robot.id, 'ALL', `Heading to pickup ${pickupCoord.label}`, 'NAVIGATION', 'NORMAL'));
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
            newMessages.push(createMsg(robot.id, 'SYSTEM', `Cannot find path to pickup ${pickupCoord.label}`, 'FAILURE', 'CRITICAL'));
          }
        }
      }

      if (robot.state === 'MOVING' && robot.path.length > 0) {
        const nextCell = robot.path[0];
        
        // Check if next cell is blocked by an obstacle
        const isBlocked = state.obstacles.some(o => 
          nextCell.row >= o.row && nextCell.row < o.row + o.height && 
          nextCell.col >= o.col && nextCell.col < o.col + o.width
        );

        if (isBlocked) {
          newMessages.push(createMsg(robot.id, 'ALL', `Obstacle detected at (${nextCell.row},${nextCell.col}). Path blocked!`, 'OBSTACLE', 'WARNING'));
          newLinks.push({ from: robot.id, to: 'ALL', expires: now + 3000 });
          
          const target = robot.path[robot.path.length - 1];
          const newPath = findPathAStar(state, robot.row, robot.col, target.row, target.col);
          if (newPath.length > 0) {
            newMessages.push(createMsg(robot.id, 'ALL', `Recalculating route... New path confirmed`, 'NAVIGATION', 'IMPORTANT'));
            return { ...robot, path: newPath };
          } else {
            newMessages.push(createMsg(robot.id, 'ALL', `No alternate route available. Waiting.`, 'OBSTACLE', 'CRITICAL'));
            return { ...robot, state: 'WAITING' as const, path: [] };
          }
        }
        
        // Check for same-cell conflicts with other robots
        const conflictRobot = state.robots.find(r => r.id !== robot.id && r.row === nextCell.row && r.col === nextCell.col);
        if (conflictRobot) {
          newMessages.push(createMsg(robot.id, conflictRobot.id, `Collision risk at (${nextCell.row},${nextCell.col}). I'll wait.`, 'COORDINATION', 'WARNING'));
          newLinks.push({ from: robot.id, to: conflictRobot.id, expires: now + 2500 });
          return robot; // skip this tick, wait
        }

        const approachingIntersection = state.intersections.find(i => i.row === nextCell.row && i.col === nextCell.col);
        if (approachingIntersection) {
          newMessages.push(createMsg(robot.id, 'ALL', `Approaching intersection ${approachingIntersection.id}`, 'COORDINATION', 'NORMAL'));
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
            newMessages.push(createMsg(robot.id, 'ALL', `Picked up item. Heading to ${robot.dropPoint.label}`, 'TASK', 'NORMAL'));
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
            newMessages.push(createMsg(robot.id, 'ALL', `Task [${robot.currentTaskId}] completed at ${robot.dropPoint?.label}.`, 'TASK', 'NORMAL'));
            newLinks.push({ from: robot.id, to: 'ALL', expires: now + 2000 });
            newState = 'WAITING';
            newTaskPhase = null;
            newCurrentTaskId = null;
          } else {
            // Just reached a point, no active task phase
            newState = 'WAITING';
          }
        }
        
        // Battery warning
        const newBattery = robot.battery - 0.3;
        if (newBattery <= 20 && robot.battery > 20) {
          newMessages.push(createMsg(robot.id, 'ALL', `Battery at ${Math.round(newBattery)}%. Requesting charger.`, 'BATTERY', 'WARNING'));
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
