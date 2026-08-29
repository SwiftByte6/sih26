import { create } from 'zustand';
import { Robot, Shelf, Obstacle, Intersection, Path, PointOfInterest, CommunicationMessage, ActiveCommLink } from '../types/warehouse';
import { demoWarehouse } from '../data/demoWarehouse';
import { findPathAStar } from '../engine/pathfinding';

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
  resetSimulation: () => set({ 
    isRunning: false, 
    robots: demoWarehouse.robots,
    obstacles: demoWarehouse.obstacles,
    selectedItemId: null,
    selectedItemType: null,
    communications: [],
    activeCommLinks: []
  }),
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
    const newMessages: CommunicationMessage[] = [];
    const newLinks: ActiveCommLink[] = [];
    
    // Expire old visual links
    const activeLinks = state.activeCommLinks.filter(l => l.expires > now);

    const updatedRobots = state.robots.map(robot => {
      // Robot is idle/waiting -> assign new task
      if (robot.state === 'WAITING' || (robot.state !== 'MOVING' && robot.path.length === 0)) {
        const target = state.pois[Math.floor(Math.random() * state.pois.length)];
        const newPath = findPathAStar(state, robot.row, robot.col, target.row, target.col);
        if (newPath.length > 0) {
          // Event: Task assigned
          newMessages.push(createMsg('SYSTEM', robot.id, `Task assigned: Navigate to ${target.label}`, 'TASK', 'NORMAL'));
          newMessages.push(createMsg(robot.id, 'ALL', `Heading toward ${target.label} at (${target.row},${target.col})`, 'NAVIGATION', 'NORMAL'));
          newLinks.push({ from: robot.id, to: 'ALL', expires: now + 2000 });
          return { ...robot, path: newPath, state: 'MOVING' as const, currentTask: target.label };
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
          // Event: Path blocked + replanning
          newMessages.push(createMsg(robot.id, 'ALL', `Obstacle detected at (${nextCell.row},${nextCell.col}). Path blocked!`, 'OBSTACLE', 'WARNING'));
          newLinks.push({ from: robot.id, to: 'ALL', expires: now + 3000 });
          
          const target = robot.path[robot.path.length - 1];
          const newPath = findPathAStar(state, robot.row, robot.col, target.row, target.col);
          if (newPath.length > 0) {
            newMessages.push(createMsg(robot.id, 'ALL', `Recalculating route... New path confirmed (${newPath.length} steps)`, 'NAVIGATION', 'IMPORTANT'));
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

        // Check intersection approach
        const approachingIntersection = state.intersections.find(i => i.row === nextCell.row && i.col === nextCell.col);
        if (approachingIntersection) {
          newMessages.push(createMsg(robot.id, 'ALL', `Approaching intersection ${approachingIntersection.id} at (${nextCell.row},${nextCell.col})`, 'COORDINATION', 'NORMAL'));
        }

        // Move to next cell
        const remainingPath = robot.path.slice(1);
        const newState = remainingPath.length === 0 ? 'WAITING' as const : 'MOVING' as const;
        
        // Event: Task completed
        if (newState === 'WAITING') {
          newMessages.push(createMsg(robot.id, 'ALL', `Reached destination. Task "${robot.currentTask}" completed.`, 'TASK', 'NORMAL'));
          newLinks.push({ from: robot.id, to: 'ALL', expires: now + 2000 });
        }
        
        // Battery warning
        const newBattery = robot.battery - 0.3;
        if (newBattery <= 20 && robot.battery > 20) {
          newMessages.push(createMsg(robot.id, 'ALL', `Battery at ${Math.round(newBattery)}%. Requesting charger assignment.`, 'BATTERY', 'WARNING'));
        }
        
        return {
          ...robot,
          col: nextCell.col,
          row: nextCell.row,
          path: remainingPath,
          state: newState,
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
