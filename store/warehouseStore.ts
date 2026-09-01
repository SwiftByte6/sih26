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
import { findPathAStar } from '../engine/pathfinding';
import { useTaskStore } from './taskStore';
import { snapAndClamp } from '../lib/coords';
import { clampAllToGrid, cloneLayout, robotsForPlay, validateLayout, LayoutValidationIssue } from '../engine/validateLayout';

import { useP2PStore } from './p2pStore';
import { resolveTickCollisions } from '../engine/coordination/CollisionCoordinator';
import { resolveLocationCoordinates } from '../engine/evaluation/TaskEvaluator';
import { isWalkable } from '../engine/pathfinding';

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
  appMode: 'BUILDER',
  transformMode: 'translate',
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
        alert('Cannot switch to PLAY mode. Layout has errors:\n' + result.issues.filter(i=>i.severity==='error').map(i=>'- ' + i.message).join('\n'));
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
          alert('Cannot run simulation. Layout has errors:\n' + result.issues.filter(i=>i.severity==='error').map(i=>'- ' + i.message).join('\n'));
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
    const nextId = nextPrefixedId('OBS', state.obstacles.map((o) => o.id));
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
    const pos = clampMove(robot.row ?? 10, robot.col ?? 10, 1, 1, state);
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

  assignTaskToRobot: (robotId, task) => set((state) => ({
    robots: state.robots.map((r) =>
      r.id === robotId
        ? {
            ...r,
            currentTask: task.pickup_point?.label ? `Pickup at ${task.pickup_point.label}` : 'Task Assigned',
            currentTaskId: task.task_id,
            taskPhase: 'TO_PICKUP',
            pickupPoint: task.pickup_point,
            dropPoint: task.drop_point,
          }
        : r
    ),
  })),
  removeAnnouncedTaskId: (taskId: string) => {
    announcedTaskIds.delete(taskId);
    announcedTaskTimestamps.delete(taskId);
  },

  removeRobot: (id) => set((state) => ({
    robots: state.robots.filter((r) => r.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    selectedItemType: state.selectedItemId === id ? null : state.selectedItemType,
  })),

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

    // Announce the top unassigned pending task that has not been announced yet,
    // or re-announce an unassigned pending task if 4+ seconds have elapsed.
    // We announce 1 task at a time to allow the winner to transition to MOVING before the next task is announced.
    const unassignedTasks = pendingTasks.filter((t) => t.status === 'PENDING' && t.assigned_robot_id === null);

    let taskToAnnounce = unassignedTasks.find((t) => !announcedTaskIds.has(t.task_id));
    if (!taskToAnnounce) {
      const hasFreeRobot = state.robots.some(
        (r) => (r.state === 'WAITING' || r.state === 'IDLE') && !r.currentTask && !r.currentTaskId && (r.isOnline ?? true)
      );
      if (hasFreeRobot) {
        taskToAnnounce = unassignedTasks.find((t) => {
          const lastTime = announcedTaskTimestamps.get(t.task_id);
          return !lastTime || (now - lastTime > 3000);
        });
      }
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
    const collisionResolution = resolveTickCollisions(state.robots, [...state.obstacles, ...(state.shelves || []), ...(state.pallets || [])] as any, taskStore.tasks, blockedTicksMap);

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
