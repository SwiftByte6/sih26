import { create } from 'zustand';
import {
  Robot,
  RobotState,
  Shelf,
  Obstacle,
  Intersection,
  Path,
  PointOfInterest,
  CommunicationMessage,
  ActiveCommLink,
  Pallet,
  Wall,
  AppMode,
  ViewMode,
  TransformMode,
  PlaceableType,
  SelectedItemType,
  LayoutSnapshot,
  DEFAULT_TRANSFORM,
} from '../types/warehouse';
import { demoWarehouse, defaultWalls } from '../data/demoWarehouse';
import { findPathAStar, findDeconflictedPathAStar, isWalkable } from '../engine/pathfinding';
import { useTaskStore } from './taskStore';
import { snapAndClamp } from '../lib/coords';
import { clampAllToGrid, cloneLayout, robotsForPlay, validateLayout, LayoutValidationIssue } from '../engine/validateLayout';

import { useP2PStore } from './p2pStore';
import { autoRearrangeLayout } from '../engine/rearrangeLayout';
import { resolveTickCollisions, preemptivelyDeconflictTrajectories } from '../engine/coordination/CollisionCoordinator';
import { resolveLocationCoordinates } from '../engine/evaluation/TaskEvaluator';

export type Task = { id: string, targetRow: number, targetCol: number, assignedTo: string | null };

// --- P2P Simulation Globals ---
export const announcedTaskIds = new Set<string>();
export const announcedTaskTimestamps = new Map<string, number>();
export const lastRobotTelemetry = new Map<string, any>();
export const lastConflictTime = new Map<string, number>();
export const blockedTicksMap = new Map<string, number>();
export const taskAllocationRounds = new Map<string, number>();

const MAX_MESSAGES = 200;
const LAYOUT_KEY = 'amr-warehouse-layout';
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

function nextPrefixedId(prefix: string, ids: string[]): string {
  let max = 0;
  for (const id of ids) {
    const match = id.match(/(\d+)\s*$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${prefix}-${(max + 1).toString().padStart(3, '0')}`;
}

function snapshotFrom(state: {
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
}): LayoutSnapshot {
  return cloneLayout({
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    walls: state.walls,
    shelves: state.shelves,
    obstacles: state.obstacles,
    pois: state.pois,
    pallets: state.pallets,
    robots: state.robots.map((r) => ({ ...r })),
    intersections: state.intersections,
    paths: state.paths,
  });
}

function demoSnapshot(): LayoutSnapshot {
  return snapshotFrom({
    gridRows: 40,
    gridCols: 60,
    walls: demoWarehouse.walls,
    shelves: demoWarehouse.shelves,
    obstacles: demoWarehouse.obstacles,
    pois: demoWarehouse.pois,
    pallets: demoWarehouse.pallets,
    robots: demoWarehouse.robots,
    intersections: demoWarehouse.intersections,
    paths: demoWarehouse.paths,
  });
}

function loadPersistedLayout(): LayoutSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutSnapshot;
    if (!parsed?.shelves || !parsed?.robots) return null;

    // Migrate any legacy machine entries out of robots into obstacles
    if (parsed.robots) {
      const machineRobots = parsed.robots.filter((r) => r.assetUrl && (r.assetUrl.includes('machine') || r.assetUrl.includes('laser') || r.assetUrl.includes('industrial')));
      if (machineRobots.length > 0) {
        parsed.robots = parsed.robots.filter((r) => !machineRobots.includes(r));
        const newObs: Obstacle[] = machineRobots.map((m, idx) => ({
          id: `SYS-${idx + 1}`,
          row: m.row,
          col: m.col,
          width: 2,
          height: 2,
          posY: m.posY ?? 0,
          rotX: m.rotX ?? 0,
          rotY: m.rotY ?? 0,
          rotZ: m.rotZ ?? 0,
          scale: m.scale ?? { x: 1, y: 1, z: 1 },
          assetUrl: m.assetUrl,
        }));
        parsed.obstacles = [...(parsed.obstacles || []), ...newObs];
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistLayout(layout: LayoutSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* ignore quota */
  }
}

const initialLayout = loadPersistedLayout() ?? demoSnapshot();

interface WarehouseState {
  robots: Robot[];
  shelves: Shelf[];
  obstacles: Obstacle[];
  intersections: Intersection[];
  paths: Path[];
  pois: PointOfInterest[];
  pallets: Pallet[];
  walls: Wall[];
  selectedItemId: string | null;
  selectedItemType: SelectedItemType;
  isRunning: boolean;
  scale: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  gridRows: number;
  gridCols: number;
  cellSize: number;
  metersPerCell: number;
  gridSnap: number;
  collisionsCount: number;

  communications: CommunicationMessage[];
  activeCommLinks: ActiveCommLink[];

  appMode: AppMode;
  viewMode: ViewMode;
  transformMode: TransformMode;
  pendingPlaceType: PlaceableType | null;
  pendingAssetUrl: string | null;
  simSpeed: number;
  showSensors: boolean;
  validationIssues: LayoutValidationIssue[];
  savedLayout: LayoutSnapshot;
  activeTool: 'select' | 'pan';
  setActiveTool: (tool: 'select' | 'pan') => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  historyStack: LayoutSnapshot[];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  isManageRobotsOpen: boolean;
  manageRobotsSelectedRobotId: string | null;
  openManageRobots: (robotId?: string | null) => void;
  closeManageRobots: () => void;
  selectRobotForManagement: (robotId: string | null) => void;
  rearrangeLayout: () => void;

  setSelectedItem: (id: string | null, type: SelectedItemType) => void;
  toggleSimulation: () => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setScale: (scale: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleGrid: () => void;
  setViewMode: (mode: ViewMode) => void;
  setAppMode: (mode: AppMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  setPendingPlaceType: (type: PlaceableType | null, assetUrl?: string | null) => void;
  setSimSpeed: (speed: number) => void;
  toggleSensors: () => void;
  setGridSnap: (snap: number) => void;
  setWarehouseSize: (cols: number, rows: number) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;

  addObstacle: (obstacle: Omit<Obstacle, 'id'>) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (id: string) => void;

  addShelf: (shelf: Omit<Shelf, 'id'>) => void;
  updateShelf: (id: string, updates: Partial<Shelf>) => void;
  removeShelf: (id: string) => void;

  addRobot: (robot: Partial<Robot> & { id?: string }) => void;
  updateRobot: (id: string, updates: Partial<Robot>) => void;
  removeRobot: (id: string) => void;

  assignTaskToRobot: (robotId: string, task: any) => void;
  removeAnnouncedTaskId: (taskId: string) => void;

  addPoi: (poi: Omit<PointOfInterest, 'id'>) => void;
  updatePoi: (id: string, updates: Partial<PointOfInterest>) => void;
  removePoi: (id: string) => void;

  addPallet: (pallet: Omit<Pallet, 'id'>) => void;
  updatePallet: (id: string, updates: Partial<Pallet>) => void;
  removePallet: (id: string) => void;

  placeAtCell: (type: PlaceableType, row: number, col: number, assetUrl?: string | null) => void;
  moveSelectedToCell: (row: number, col: number) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  validateCurrentLayout: () => LayoutValidationIssue[];
  applyLayout: () => { ok: boolean; issues: LayoutValidationIssue[] };
  getSnapshot: () => LayoutSnapshot;
  loadLayout: (snap: LayoutSnapshot) => void;

  addCommunication: (msg: CommunicationMessage) => void;
  clearCommunications: () => void;

  tick: () => void;
}

function clampMove(
  row: number,
  col: number,
  width: number,
  height: number,
  state: { gridCols: number; gridRows: number; gridSnap: number }
) {
  return snapAndClamp(row, col, width, height, state.gridCols, state.gridRows, state.gridSnap);
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  viewMode: '2D',
  appMode: 'PLAY',
  transformMode: 'translate',
  activeTool: 'select',
  historyStack: [initialLayout],
  historyIndex: 0,
  isManageRobotsOpen: false,
  manageRobotsSelectedRobotId: null,
  pendingPlaceType: null,
  pendingAssetUrl: null,
  simSpeed: 1,
  showSensors: false,
  validationIssues: [],
  savedLayout: initialLayout,
  robots: initialLayout.robots,
  shelves: initialLayout.shelves,
  obstacles: initialLayout.obstacles,
  intersections: initialLayout.intersections,
  paths: initialLayout.paths,
  pois: initialLayout.pois,
  pallets: initialLayout.pallets ?? [],
  walls: initialLayout.walls?.length === 4 ? initialLayout.walls : defaultWalls,
  selectedItemId: null,
  selectedItemType: null,
  isRunning: false,
  scale: 1,
  pan: { x: 0, y: 0 },
  showGrid: true,
  gridRows: initialLayout.gridRows,
  gridCols: initialLayout.gridCols,
  cellSize: 20,
  metersPerCell: 1,
  gridSnap: 1,
  collisionsCount: 0,

  communications: [],
  activeCommLinks: [],

  setViewMode: (mode) => set({ viewMode: mode }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setPendingPlaceType: (type, assetUrl) => set({ pendingPlaceType: type, pendingAssetUrl: assetUrl ?? null }),
  setSimSpeed: (speed) => set({ simSpeed: Math.max(0.25, Math.min(4, speed)) }),
  toggleSensors: () => set((state) => ({ showSensors: !state.showSensors })),
  setGridSnap: (snap) => set({ gridSnap: Math.max(1, Math.round(snap)) }),

  setAppMode: (mode) => {
    if (mode === 'BUILDER') {
      set({
        appMode: 'BUILDER',
        isRunning: false,
        pendingPlaceType: null, pendingAssetUrl: null,
      });
      return;
    }
    const result = get().applyLayout();
    if (result.ok) {
      set({ appMode: 'PLAY', pendingPlaceType: null, pendingAssetUrl: null, selectedItemId: null, selectedItemType: null });
    } else {
      if (typeof window !== 'undefined') {
        const errMsg = 'Cannot switch to PLAY mode. Layout has errors:\n' + result.issues.filter(i=>i.severity==='error').map(i=>'- ' + i.message).join('\n');
        const doAutoFix = window.confirm(errMsg + '\n\nWould you like to Auto-Rearrange the layout now to fix all overlaps and trapped robots?');
        if (doAutoFix) {
          get().rearrangeLayout();
          set({ appMode: 'PLAY', pendingPlaceType: null, pendingAssetUrl: null, selectedItemId: null, selectedItemType: null });
        }
      }
    }
  },

  setSelectedItem: (id, type) => set({ selectedItemId: id, selectedItemType: type, pendingPlaceType: null, pendingAssetUrl: null }),
  toggleSimulation: () => {
    const { isRunning } = get();
    if (isRunning) {
      get().pauseSimulation();
    } else {
      get().startSimulation();
    }
  },
  startSimulation: () => {
    if (get().appMode !== 'PLAY') {
      const result = get().applyLayout();
      if (!result.ok) {
        if (typeof window !== 'undefined') {
          const errMsg = 'Cannot run simulation. Layout has errors:\n' + result.issues.filter(i=>i.severity==='error').map(i=>'- ' + i.message).join('\n');
          const doAutoFix = window.confirm(errMsg + '\n\nWould you like to Auto-Rearrange the layout now to fix all overlaps and trapped robots?');
          if (doAutoFix) {
            get().rearrangeLayout();
            set({ appMode: 'PLAY', isRunning: true, pendingPlaceType: null, pendingAssetUrl: null });
            return;
          }
        }
        return;
      }
      set({ appMode: 'PLAY', isRunning: true, pendingPlaceType: null, pendingAssetUrl: null });
      return;
    }
    set({ isRunning: true });
  },
  pauseSimulation: () => set({ isRunning: false }),
  stopSimulation: () => set({ isRunning: false }),
  resetSimulation: () => {
    useTaskStore.getState().resetTasks();
    const layout = get().savedLayout;
    const cloned = cloneLayout(layout);
    set({
      isRunning: false,
      robots: robotsForPlay(cloned.robots),
      shelves: cloned.shelves,
      obstacles: cloned.obstacles,
      pois: cloned.pois,
      pallets: cloned.pallets,
      walls: cloned.walls,
      intersections: cloned.intersections,
      paths: cloned.paths,
      gridRows: layout.gridRows,
      gridCols: layout.gridCols,
      selectedItemId: null,
      selectedItemType: null,
      communications: [],
      activeCommLinks: [],
      collisionsCount: 0,
    });
    useP2PStore.getState().initializeNetwork(cloned.robots.map((r) => r.id));
  },
  setScale: (scale) => set({ scale }),
  setPan: (pan) => set({ pan }),
  setActiveTool: (tool) => set({ activeTool: tool, pendingPlaceType: null }),
  zoomIn: () => set((state) => ({ scale: Math.min(3.0, Number((state.scale + 0.2).toFixed(2))) })),
  zoomOut: () => set((state) => ({ scale: Math.max(0.3, Number((state.scale - 0.2).toFixed(2))) })),
  zoomFit: () => set({ scale: 1, pan: { x: 0, y: 0 } }),
  undo: () => set((state) => {
    if (state.historyIndex <= 0) return {};
    const prevIdx = state.historyIndex - 1;
    const snap = state.historyStack[prevIdx];
    const cloned = cloneLayout(snap);
    return {
      historyIndex: prevIdx,
      robots: cloned.robots,
      shelves: cloned.shelves,
      obstacles: cloned.obstacles,
      pois: cloned.pois,
      pallets: cloned.pallets,
      walls: cloned.walls,
      gridRows: snap.gridRows,
      gridCols: snap.gridCols,
    };
  }),
  redo: () => set((state) => {
    if (state.historyIndex >= state.historyStack.length - 1) return {};
    const nextIdx = state.historyIndex + 1;
    const snap = state.historyStack[nextIdx];
    const cloned = cloneLayout(snap);
    return {
      historyIndex: nextIdx,
      robots: cloned.robots,
      shelves: cloned.shelves,
      obstacles: cloned.obstacles,
      pois: cloned.pois,
      pallets: cloned.pallets,
      walls: cloned.walls,
      gridRows: snap.gridRows,
      gridCols: snap.gridCols,
    };
  }),
  openManageRobots: (robotId = null) => set({ isManageRobotsOpen: true, manageRobotsSelectedRobotId: robotId }),
  closeManageRobots: () => set({ isManageRobotsOpen: false }),
  selectRobotForManagement: (robotId) => set({ manageRobotsSelectedRobotId: robotId }),
  rearrangeLayout: () => {
    const state = get();
    const result = autoRearrangeLayout({
      gridRows: state.gridRows,
      gridCols: state.gridCols,
      shelves: state.shelves,
      obstacles: state.obstacles,
      pois: state.pois,
      pallets: state.pallets,
      robots: state.robots,
    });
    set({
      shelves: result.shelves,
      obstacles: result.obstacles,
      pallets: result.pallets,
      robots: result.robots,
      pois: result.pois,
    });
    get().applyLayout();
  },
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  setWarehouseSize: (cols, rows) => set((state) => {
    const gridCols = Math.max(8, Math.min(120, Math.round(cols)));
    const gridRows = Math.max(8, Math.min(80, Math.round(rows)));
    return {
      gridCols,
      gridRows,
      shelves: clampAllToGrid(state.shelves, gridCols, gridRows),
      obstacles: clampAllToGrid(state.obstacles, gridCols, gridRows),
      pallets: clampAllToGrid(state.pallets, gridCols, gridRows),
      pois: clampAllToGrid(state.pois.map((p) => ({ ...p, width: 1, height: 1 })), gridCols, gridRows),
      robots: clampAllToGrid(state.robots.map((r) => ({ ...r, width: 1, height: 1 })), gridCols, gridRows),
    };
  }),

  updateWall: (id, updates) => set((state) => ({
    walls: state.walls.map((w) => {
      if (w.id !== id) return w;
      const next = { ...w, ...updates };
      next.height = Math.max(8, Math.min(200, next.height));
      next.thickness = Math.max(1, Math.min(24, next.thickness));
      return next;
    }),
  })),

  addObstacle: (obs) => set((state) => {
    const isMachine = obs.assetUrl && (obs.assetUrl.includes('machine') || obs.assetUrl.includes('laser') || obs.assetUrl.includes('industrial'));
    const prefix = isMachine ? 'SYS' : 'OBS';
    const obsId = (obs as Partial<Obstacle>).id;
    const nextId = obsId || nextPrefixedId(prefix, state.obstacles.map((o) => o.id));
    const pos = clampMove(obs.row, obs.col, obs.width, obs.height, state);
    const newObstacle = { ...DEFAULT_TRANSFORM, ...obs, ...pos, id: nextId };
    return {
      obstacles: [...state.obstacles, newObstacle],
      selectedItemId: nextId,
      selectedItemType: 'OBSTACLE' as const,
    };
  }),
  updateObstacle: (id, updates) => set((state) => ({
    obstacles: state.obstacles.map((o) => {
      if (o.id !== id) return o;
      const next = { ...o, ...updates };
      const pos = clampMove(next.row, next.col, next.width, next.height, state);
      return { ...next, ...pos };
    }),
  })),
  removeObstacle: (id) => set((state) => ({
    obstacles: state.obstacles.filter((o) => o.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    selectedItemType: state.selectedItemId === id ? null : state.selectedItemType,
  })),

  addShelf: (shelf) => set((state) => {
    const nextId = nextPrefixedId('S', state.shelves.map((s) => s.id));
    const pos = clampMove(shelf.row, shelf.col, shelf.width, shelf.height, state);
    const created = { ...DEFAULT_TRANSFORM, ...shelf, ...pos, id: nextId };
    return {
      shelves: [...state.shelves, created],
      selectedItemId: nextId,
      selectedItemType: 'SHELF' as const,
    };
  }),
  updateShelf: (id, updates) => set((state) => ({
    shelves: state.shelves.map((s) => {
      if (s.id !== id) return s;
      const next = { ...s, ...updates };
      const pos = clampMove(next.row, next.col, next.width, next.height, state);
      return { ...next, ...pos };
    }),
  })),
  removeShelf: (id) => set((state) => ({
    shelves: state.shelves.filter((s) => s.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    selectedItemType: state.selectedItemId === id ? null : state.selectedItemType,
  })),

  addRobot: (robot) => set((state) => {
    const nextId = robot.id || nextPrefixedId('R', state.robots.map((r) => r.id));
    const centerRow = Math.floor(state.gridRows / 2);
    const centerCol = Math.floor(state.gridCols / 2);
    const countOffset = (state.robots.length % 6) * 2;
    const defaultRow = centerRow + Math.floor(countOffset / 3);
    const defaultCol = centerCol + (countOffset % 3);
    const pos = clampMove(robot.row ?? defaultRow, robot.col ?? defaultCol, 1, 1, state);
    const created: Robot = {
      ...DEFAULT_TRANSFORM,
      ...robot,
      ...pos,
      id: nextId,
      label: robot.label || nextId,
      state: robot.state || 'IDLE',
      battery: robot.battery ?? 100,
      speed: robot.speed ?? 1.2,
      path: [],
      currentTask: null,
      currentTaskId: null,
      taskPhase: null,
      pickupPoint: null,
      dropPoint: null,
      sensingRadius: robot.sensingRadius ?? 5,
      payloadCapacity: robot.payloadCapacity ?? 20,
      currentLoad: robot.currentLoad ?? 0,
      temperature: robot.temperature ?? 35,
      signalStrength: robot.signalStrength ?? 100,
      deliveryCapability: robot.deliveryCapability ?? 'Standard Transport',
    } as Robot;
    return {
      robots: [...state.robots, created],
      selectedItemId: nextId,
      selectedItemType: 'ROBOT' as const,
    };
  }),
  updateRobot: (id, updates) => set((state) => {
    return {
      robots: state.robots.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...updates };
        const pos = clampMove(next.row, next.col, 1, 1, state);
        const moved = pos.row !== r.row || pos.col !== r.col;
        
        if (moved) {
          if (state.appMode === 'BUILDER') {
            return { 
              ...next, 
              ...pos, 
              path: [], 
              state: 'WAITING', 
              currentTask: null, 
              currentTaskId: null, 
              taskPhase: null, 
              pickupPoint: null, 
              dropPoint: null 
            };
          } else {
            // In PLAY mode, recalculate path from new position
            let newPath: { row: number; col: number }[] = [];
            const targetCoord = r.taskPhase === 'TO_PICKUP' ? r.pickupPoint : r.taskPhase === 'TO_DROP' ? r.dropPoint : null;
            if (targetCoord) {
              newPath = findPathAStar(state, pos.row, pos.col, targetCoord.row, targetCoord.col);
            }
            return {
              ...next,
              ...pos,
              path: newPath,
              state: newPath.length === 0 && targetCoord ? 'WAITING' : r.state
            };
          }
        }
        
        return { ...next, ...pos };
      }),
    };
  }),

  assignTaskToRobot: (robotId, task) => set((state) => {
    console.log(`[WAREHOUSE] assignTaskToRobot called for robot ${robotId} and task ${task.task_id}`);
    const pickupCoord = resolveLocationCoordinates(task.pickup_point, state.pois, state.shelves);
    const dropCoord = resolveLocationCoordinates(task.drop_point, state.pois, state.shelves);
    
    const updatedRobots = state.robots.map((r) => {
      if (r.id === robotId) {
        let newPath = r.path;
        let newState = r.state;
        if (pickupCoord && dropCoord) {
          newPath = findPathAStar(state, r.row, r.col, pickupCoord.row, pickupCoord.col);
          console.log(`[WAREHOUSE] route generated for ${robotId} to ${task.pickup_point}: path length ${newPath.length}`);
          if (newPath.length > 0) {
            newState = 'MOVING';
            console.log(`[WAREHOUSE] robot state changed to MOVING for ${robotId}`);
          } else {
            console.error(`[P2P ERROR] Robot ${robotId} claimed task ${task.task_id} but A* found NO PATH to pickup ${task.pickup_point}`);
            setTimeout(() => {
              useTaskStore.getState().failTask(task.task_id, 'No path to pickup');
              useP2PStore.getState().sendDirectMessage(r.id, 'SYSTEM', 'TEXT', { body: `Cannot find path to pickup ${pickupCoord.label}` });
            }, 0);
          }
        } else {
          console.error(`[P2P ERROR] Robot ${robotId} claimed task ${task.task_id} but coordinates could not be resolved! Pickup: ${!!pickupCoord}, Drop: ${!!dropCoord}`);
          setTimeout(() => {
            useTaskStore.getState().failTask(task.task_id, 'Invalid pickup or drop location coordinates');
          }, 0);
        }
        return {
          ...r,
          currentTask: pickupCoord ? `Pickup at ${pickupCoord.label}` : 'Task Assigned',
          currentTaskId: task.task_id,
          taskPhase: 'TO_PICKUP' as const,
          pickupPoint: pickupCoord,
          dropPoint: dropCoord,
          path: newPath,
          state: newState,
        };
      }
      return r;
    });

    // Proactively deconflict the newly assigned route against active peers
    const taskStoreTasks = useTaskStore.getState().tasks;
    const deconfliction = preemptivelyDeconflictTrajectories(updatedRobots, taskStoreTasks, state);

    return {
      robots: deconfliction.updatedRobots,
    };
  }),
  removeAnnouncedTaskId: (taskId: string) => {
    announcedTaskIds.delete(taskId);
    announcedTaskTimestamps.delete(taskId);
  },

  removeRobot: (id) => {
    try {
      useP2PStore.getState().network.unregisterNode(id);
      useP2PStore.getState().processHeartbeats();
      lastRobotTelemetry.delete(id);
      blockedTicksMap.delete(id);
    } catch (e) {}
    set((state) => ({
      robots: state.robots.filter((r) => r.id !== id),
      activeCommLinks: state.activeCommLinks.filter((l) => l.from !== id && l.to !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      selectedItemType: state.selectedItemId === id ? null : state.selectedItemType,
    }));
  },

  addPoi: (poi) => set((state) => {
    const nextId = nextPrefixedId('POI', state.pois.map((p) => p.id));
    const pos = clampMove(poi.row, poi.col, 1, 1, state);
    const created = { ...DEFAULT_TRANSFORM, ...poi, ...pos, id: nextId };
    return {
      pois: [...state.pois, created],
      selectedItemId: nextId,
      selectedItemType: 'POI' as const,
    };
  }),
  updatePoi: (id, updates) => set((state) => ({
    pois: state.pois.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...updates };
      const pos = clampMove(next.row, next.col, 1, 1, state);
      return { ...next, ...pos };
    }),
  })),
  removePoi: (id) => set((state) => ({
    pois: state.pois.filter((p) => p.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    selectedItemType: state.selectedItemId === id ? null : state.selectedItemType,
  })),

  addPallet: (pallet) => set((state) => {
    const nextId = nextPrefixedId('PAL', state.pallets.map((p) => p.id));
    const pos = clampMove(pallet.row, pallet.col, pallet.width, pallet.height, state);
    const created = { ...DEFAULT_TRANSFORM, ...pallet, ...pos, id: nextId };
    return {
      pallets: [...state.pallets, created],
      selectedItemId: nextId,
      selectedItemType: 'PALLET' as const,
    };
  }),
  updatePallet: (id, updates) => set((state) => ({
    pallets: state.pallets.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...updates };
      const pos = clampMove(next.row, next.col, next.width, next.height, state);
      return { ...next, ...pos };
    }),
  })),
  removePallet: (id) => set((state) => ({
    pallets: state.pallets.filter((p) => p.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    selectedItemType: state.selectedItemId === id ? null : state.selectedItemType,
  })),

  placeAtCell: (type, row, col, assetUrl) => {
    const state = get();
    const w = type === 'SHELF' ? 6 : type === 'OBSTACLE' ? 2 : 1;
    const h = type === 'SHELF' ? 2 : type === 'OBSTACLE' ? 2 : 1;
    const pos = clampMove(row, col, w, h, state);
    if (type === 'SHELF') get().addShelf({ ...pos, width: 6, height: 2 });
    else if (type === 'OBSTACLE') get().addObstacle({ ...pos, width: 2, height: 2, assetUrl: assetUrl || state.pendingAssetUrl || undefined });
    else if (type === 'PALLET') get().addPallet({ ...DEFAULT_TRANSFORM, ...pos, width: 1, height: 1 });
    else if (type === 'ROBOT') {
      get().addRobot({
        ...DEFAULT_TRANSFORM,
        ...pos,
        label: `AMR-${(state.robots.length + 1).toString().padStart(2, '0')}`,
        state: 'WAITING',
        battery: 100,
        speed: 1.2,
        currentTask: null,
        path: [],
        assetUrl: assetUrl || state.pendingAssetUrl || undefined,
      });
    } else if (type === 'PICKUP' || type === 'DROP' || type === 'CHARGER') {
      const n =
        type === 'PICKUP' ? state.pois.filter((p) => p.type === 'PICKUP').length + 1 :
        type === 'DROP' ? state.pois.filter((p) => p.type === 'DROP').length + 1 :
        state.pois.filter((p) => p.type === 'CHARGER').length + 1;
      const label = type === 'PICKUP' ? `PICKUP ${n}` : type === 'DROP' ? `DROP ${n}` : `CHARGER ${n}`;
      get().addPoi({ ...DEFAULT_TRANSFORM, ...pos, type, label });
    }
    set({ pendingPlaceType: null, pendingAssetUrl: null });
  },

  moveSelectedToCell: (row, col) => {
    const { selectedItemId, selectedItemType, appMode } = get();
    if (!selectedItemId || !selectedItemType) return;
    if (appMode === 'PLAY' && selectedItemType === 'ROBOT') return;
    if (selectedItemType === 'SHELF') get().updateShelf(selectedItemId, { row, col });
    else if (selectedItemType === 'OBSTACLE') get().updateObstacle(selectedItemId, { row, col });
    else if (selectedItemType === 'PALLET') get().updatePallet(selectedItemId, { row, col });
    else if (selectedItemType === 'POI') get().updatePoi(selectedItemId, { row, col });
    else if (selectedItemType === 'ROBOT') get().updateRobot(selectedItemId, { row, col });
  },

  deleteSelected: () => {
    const { selectedItemId, selectedItemType, appMode } = get();
    if (!selectedItemId || appMode !== 'BUILDER') return;
    if (selectedItemType === 'OBSTACLE') get().removeObstacle(selectedItemId);
    else if (selectedItemType === 'SHELF') get().removeShelf(selectedItemId);
    else if (selectedItemType === 'PALLET') get().removePallet(selectedItemId);
    else if (selectedItemType === 'POI') get().removePoi(selectedItemId);
    else if (selectedItemType === 'ROBOT') get().removeRobot(selectedItemId);
  },

  duplicateSelected: () => {
    const state = get();
    const id = state.selectedItemId;
    const type = state.selectedItemType;
    if (!id || !type) return;
    if (type === 'SHELF') {
      const src = state.shelves.find(s => s.id === id);
      if (src) {
        state.placeAtCell('SHELF', src.row + 1, src.col);
        const nextId = get().shelves[get().shelves.length - 1].id;
        get().updateShelf(nextId, { rotX: src.rotX, rotY: src.rotY, rotZ: src.rotZ, scale: src.scale, posY: src.posY });
      }
    } else if (type === 'OBSTACLE') {
      const src = state.obstacles.find(s => s.id === id);
      if (src) {
        state.placeAtCell('OBSTACLE', src.row + 1, src.col, src.assetUrl);
        const nextId = get().obstacles[get().obstacles.length - 1].id;
        get().updateObstacle(nextId, { rotX: src.rotX, rotY: src.rotY, rotZ: src.rotZ, scale: src.scale, posY: src.posY });
      }
    } else if (type === 'PALLET') {
      const src = state.pallets.find(s => s.id === id);
      if (src) {
        state.placeAtCell('PALLET', src.row + 1, src.col);
        const nextId = get().pallets[get().pallets.length - 1].id;
        get().updatePallet(nextId, { rotX: src.rotX, rotY: src.rotY, rotZ: src.rotZ, scale: src.scale, posY: src.posY });
      }
    } else if (type === 'ROBOT') {
      const src = state.robots.find(s => s.id === id);
      if (src) {
        state.placeAtCell('ROBOT', src.row + 1, src.col);
        const nextId = get().robots[get().robots.length - 1].id;
        get().updateRobot(nextId, { rotX: src.rotX, rotY: src.rotY, rotZ: src.rotZ, scale: src.scale, posY: src.posY });
      }
    } else if (type === 'POI') {
      const src = state.pois.find(s => s.id === id);
      if (src) {
        state.placeAtCell(src.type, src.row + 1, src.col);
        const nextId = get().pois[get().pois.length - 1].id;
        get().updatePoi(nextId, { rotX: src.rotX, rotY: src.rotY, rotZ: src.rotZ, scale: src.scale, posY: src.posY });
      }
    }
  },

  validateCurrentLayout: () => {
    const s = get();
    const issues = validateLayout({
      gridRows: s.gridRows,
      gridCols: s.gridCols,
      walls: s.walls,
      shelves: s.shelves,
      obstacles: s.obstacles,
      pois: s.pois,
      pallets: s.pallets,
      robots: s.robots,
    });
    set({ validationIssues: issues });
    return issues;
  },

  applyLayout: () => {
    const issues = get().validateCurrentLayout();
    const blocking = issues.filter((i) => i.severity === 'error');
    if (blocking.length > 0) {
      return { ok: false, issues };
    }
    const snap = snapshotFrom(get());
    persistLayout(snap);
    set({
      savedLayout: snap,
      robots: robotsForPlay(snap.robots),
      isRunning: false,
      communications: [],
      activeCommLinks: [],
      validationIssues: issues,
      appMode: 'PLAY',
      pendingPlaceType: null, pendingAssetUrl: null,
    });
    return { ok: true, issues };
  },

  getSnapshot: () => {
    return snapshotFrom(get());
  },

  loadLayout: (snap) => {
    persistLayout(snap);
    const cloned = cloneLayout(snap);
    set({
      savedLayout: snap,
      gridRows: cloned.gridRows,
      gridCols: cloned.gridCols,
      walls: cloned.walls,
      shelves: cloned.shelves,
      obstacles: cloned.obstacles,
      pois: cloned.pois,
      pallets: cloned.pallets,
      robots: robotsForPlay(cloned.robots),
      intersections: cloned.intersections || [],
      paths: cloned.paths || [],
      selectedItemId: null,
      selectedItemType: null,
      validationIssues: [],
      isRunning: false,
      appMode: 'BUILDER'
    });
    useTaskStore.getState().clearTasks();
  },

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

    // Ensure ALL robots in current layout are registered in P2P Network
    state.robots.forEach((robot) => {
      if (!p2pStore.network.getNode(robot.id)) {
        p2pStore.network.registerNode(robot.id);
      }
    });

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
        if (stateChanged) changes.push(`State: ${prev.state} ΓåÆ ${currentSnap.state}`);
        if (taskChanged) changes.push(`Task: ${prev.task || 'None'} ΓåÆ ${currentSnap.task || 'None'}`);
        if (battChangedMeaningfully) changes.push(`Batt: ${prev.battery}% ΓåÆ ${currentSnap.battery}%`);
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
    const unassignedTasks = pendingTasks.filter((t) => t.status === 'PENDING' && t.assigned_robot_id === null);

    // Group tasks strictly by priority
    const urgentTasks = unassignedTasks.filter((t) => t.priority === 'URGENT');
    const normalTasks = unassignedTasks.filter((t) => t.priority === 'NORMAL');
    const lowTasks = unassignedTasks.filter((t) => t.priority === 'LOW');

    const hasFreeRobot = state.robots.some(
      (r) => (r.state === 'WAITING' || r.state === 'IDLE') && !r.currentTask && !r.currentTaskId && (r.isOnline ?? true)
    );

    let taskToAnnounce: any = undefined;

    // STRICT PRIORITY GATE:
    // 1. If any URGENT task is unassigned, ONLY allocate URGENT tasks! Block NORMAL and LOW tasks from leaking announcements.
    // 2. Only if NO urgent tasks are waiting, announce NORMAL tasks.
    // 3. Only if NO urgent or normal tasks are waiting, announce LOW tasks.
    if (urgentTasks.length > 0) {
      taskToAnnounce = urgentTasks.find((t) => !announcedTaskIds.has(t.task_id));
      if (!taskToAnnounce && hasFreeRobot) {
        // Accelerate urgent task re-announcement (every 1.5s) to ensure immediate bidding/consensus on available AMR
        taskToAnnounce = urgentTasks.find((t) => {
          const lastTime = announcedTaskTimestamps.get(t.task_id);
          return !lastTime || (now - lastTime > 1500);
        });
      }
    } else if (normalTasks.length > 0) {
      taskToAnnounce = normalTasks.find((t) => !announcedTaskIds.has(t.task_id));
      if (!taskToAnnounce && hasFreeRobot) {
        taskToAnnounce = normalTasks.find((t) => {
          const lastTime = announcedTaskTimestamps.get(t.task_id);
          return !lastTime || (now - lastTime > 2500);
        });
      }
    } else if (lowTasks.length > 0) {
      taskToAnnounce = lowTasks.find((t) => !announcedTaskIds.has(t.task_id));
      if (!taskToAnnounce && hasFreeRobot) {
        taskToAnnounce = lowTasks.find((t) => {
          const lastTime = announcedTaskTimestamps.get(t.task_id);
          return !lastTime || (now - lastTime > 3000);
        });
      }
    }

    if (taskToAnnounce) {
      console.log(`[P2P] announcement sent for task ${taskToAnnounce.task_id} [${taskToAnnounce.priority}]`);
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
        body: `TASK_ANNOUNCEMENT: ${taskToAnnounce.task_id} [${taskToAnnounce.priority}] Pickup: ${taskToAnnounce.pickup_point} -> Drop: ${taskToAnnounce.drop_point} (Weight: ${taskToAnnounce.weight}kg, Round ${currentRound})`,
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

    // 1. Proactive Ahead-of-Time Trajectory Deconfliction
    const deconfliction = preemptivelyDeconflictTrajectories(state.robots, taskStore.tasks, state);
    const movingRobots = deconfliction.updatedRobots;

    deconfliction.deconflictEvents.forEach((evt) => {
      p2pStore.sendDirectMessage(evt.yieldingRobotId, evt.priorityRobotId, 'PATH_DECONFLICT', {
        yieldingRobotId: evt.yieldingRobotId,
        priorityRobotId: evt.priorityRobotId,
        conflictLocation: evt.conflictLocation,
        conflictTick: evt.conflictTick,
        conflictType: evt.conflictType,
        body: evt.body,
      });
      newLinks.push({ from: evt.yieldingRobotId, to: evt.priorityRobotId, expires: now + 3000 });
    });

    // 2. Evaluate immediate 1-tick movement intents using deterministic CollisionCoordinator
    const collisionResolution = resolveTickCollisions(
      movingRobots,
      [...state.obstacles, ...(state.shelves || []), ...(state.pallets || [])] as any,
      taskStore.tasks,
      blockedTicksMap,
      state
    );

    // 2b. Execute Cooperative Sidestepping for Idle AMRs blocking active robots
    const sidesteppedRobotPositions = new Map<string, { col: number; row: number }>();
    if (collisionResolution.idleSidestepRequests && collisionResolution.idleSidestepRequests.length > 0) {
      collisionResolution.idleSidestepRequests.forEach((req) => {
        const idleRobot = movingRobots.find((r) => r.id === req.idleRobotId);
        if (!idleRobot) return;

        // Candidate adjacent directions (up, down, left, right)
        const deltas = [
          { dc: 0, dr: -1 },
          { dc: 0, dr: 1 },
          { dc: -1, dr: 0 },
          { dc: 1, dr: 0 },
        ];

        // Find a walkable neighbor cell that is not the blocked cell, not occupied by another robot, and not obstacle
        for (const d of deltas) {
          const candCol = idleRobot.col + d.dc;
          const candRow = idleRobot.row + d.dr;

          if (candCol === req.blockedCell.col && candRow === req.blockedCell.row) continue;
          if (!isWalkable(state, candRow, candCol)) continue;

          // Check not occupied by other robots
          const occupied = movingRobots.some(
            (r) => (r.id !== idleRobot.id) && (
              (sidesteppedRobotPositions.has(r.id) ? sidesteppedRobotPositions.get(r.id)!.col === candCol && sidesteppedRobotPositions.get(r.id)!.row === candRow : r.col === candCol && r.row === candRow)
            )
          );
          if (occupied) continue;

          // Found a clear sidestep cell!
          sidesteppedRobotPositions.set(idleRobot.id, { col: candCol, row: candRow });
          p2pStore.sendDirectMessage(idleRobot.id, req.requestingRobotId, 'TEXT', {
            body: `Clearing path: AMR ${idleRobot.id} sidestepped to (${candCol},${candRow}) for ${req.requestingRobotId}`,
          });
          newLinks.push({ from: idleRobot.id, to: req.requestingRobotId, expires: now + 2500 });
          blockedTicksMap.set(req.requestingRobotId, 0);
          break;
        }
      });
    }

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

    const updatedRobots = movingRobots.map((robot) => {
      // If this robot was sidestepped to clear path for an active peer
      if (sidesteppedRobotPositions.has(robot.id)) {
        const newPos = sidesteppedRobotPositions.get(robot.id)!;
        return {
          ...robot,
          col: newPos.col,
          row: newPos.row,
          path: [],
          state: 'WAITING' as const,
        };
      }

      if ((robot.state === 'MOVING' || robot.state === 'WAITING_FOR_PATH_CLEARANCE') && robot.path.length > 0) {
        // Check if robot is blocked by collision coordinator
        if (collisionResolution.blockedRobotIds.has(robot.id)) {
          // Docking Proximity Check: If blocked while already adjacent to target pickup/drop POI, complete action directly
          if (robot.taskPhase === 'TO_PICKUP' && robot.currentTaskId && robot.dropPoint && robot.pickupPoint) {
            const dist = Math.abs(robot.col - robot.pickupPoint.col) + Math.abs(robot.row - robot.pickupPoint.row);
            if (dist <= 1) {
              taskStore.startTask(robot.currentTaskId);
              p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Picked up item at ${robot.pickupPoint.label} (adjacent dock). Heading to ${robot.dropPoint.label}` });
              const dropPath = findPathAStar(state, robot.row, robot.col, robot.dropPoint.row, robot.dropPoint.col);
              blockedTicksMap.set(robot.id, 0);
              return {
                ...robot,
                path: dropPath,
                state: (dropPath.length > 0 ? 'MOVING' : 'WAITING') as RobotState,
                taskPhase: 'TO_DROP' as const,
              };
            }
          } else if (robot.taskPhase === 'TO_DROP' && robot.currentTaskId && robot.dropPoint) {
            const dist = Math.abs(robot.col - robot.dropPoint.col) + Math.abs(robot.row - robot.dropPoint.row);
            if (dist <= 1) {
              taskStore.completeTask(robot.currentTaskId);
              p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Task [${robot.currentTaskId}] completed at ${robot.dropPoint.label}.` });
              newLinks.push({ from: robot.id, to: 'ALL', expires: now + 2000 });
              blockedTicksMap.set(robot.id, 0);
              return {
                ...robot,
                path: [],
                state: 'WAITING' as const,
                taskPhase: null,
                currentTaskId: null,
                currentTask: null,
              };
            }
          }

          const blockedTicks = blockedTicksMap.get(robot.id) || 0;
          // Reactive dynamic replanning for AMRs blocked >= 2 ticks
          if (blockedTicks >= 2 && robot.path.length > 0) {
            const targetCoord =
              robot.taskPhase === 'TO_PICKUP'
                ? robot.pickupPoint
                : robot.taskPhase === 'TO_DROP'
                ? robot.dropPoint
                : robot.path[robot.path.length - 1];
            if (targetCoord) {
              const otherOccupied = movingRobots
                .filter((o) => o.id !== robot.id)
                .map((o) => ({ row: o.row, col: o.col }));
              const rerouted = findDeconflictedPathAStar(
                state,
                robot.row,
                robot.col,
                targetCoord.row,
                targetCoord.col,
                [],
                otherOccupied
              );
              if (rerouted.length > 0 && (rerouted[0].row !== robot.path[0].row || rerouted[0].col !== robot.path[0].col)) {
                blockedTicksMap.set(robot.id, 0);
                return {
                  ...robot,
                  path: rerouted,
                  state: 'MOVING' as const,
                };
              }
            }
          }
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
          }
          
          // Battery warning & Phase 7 Dynamic Handover Trigger
          const newBattery = robot.battery - 0.3;
          if (newBattery <= 20 && robot.battery > 20) {
            p2pStore.broadcastMessage(robot.id, 'TEXT', { body: `Battery at ${Math.round(newBattery)}%. Requesting charger & task handover.` });
            if (robot.currentTask || robot.currentTaskId) {
              try {
                const requestTaskHandover = require('../engine/recovery/TaskHandoverManager').requestTaskHandover;
                requestTaskHandover(robot.id, 'CRITICAL_BATTERY');
              } catch (e) {}
            }
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
    const currentComms = get().communications;
    const allComms = [...currentComms, ...newMessages];
    if (allComms.length > MAX_MESSAGES) {
      allComms.splice(0, allComms.length - MAX_MESSAGES);
    }

    return { 
      robots: updatedRobots, 
      communications: allComms,
      activeCommLinks: [...activeLinks, ...newLinks],
      collisionsCount: state.collisionsCount
    };
  }),

}));

// Initialize P2P Network with default robots on module load
useP2PStore.getState().initializeNetwork(demoWarehouse.robots.map((r) => r.id));
