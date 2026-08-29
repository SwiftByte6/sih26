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

export type Task = { id: string, targetRow: number, targetCol: number, assignedTo: string | null };

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
  setPendingPlaceType: (type: PlaceableType | null) => void;
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

  addRobot: (robot: Omit<Robot, 'id'>) => void;
  updateRobot: (id: string, updates: Partial<Robot>) => void;
  removeRobot: (id: string) => void;

  addPoi: (poi: Omit<PointOfInterest, 'id'>) => void;
  updatePoi: (id: string, updates: Partial<PointOfInterest>) => void;
  removePoi: (id: string) => void;

  addPallet: (pallet: Omit<Pallet, 'id'>) => void;
  updatePallet: (id: string, updates: Partial<Pallet>) => void;
  removePallet: (id: string) => void;

  placeAtCell: (type: PlaceableType, row: number, col: number) => void;
  moveSelectedToCell: (row: number, col: number) => void;
  deleteSelected: () => void;
  validateCurrentLayout: () => LayoutValidationIssue[];
  applyLayout: () => { ok: boolean; issues: LayoutValidationIssue[] };

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
  setPendingPlaceType: (type) => set({ pendingPlaceType: type }),
  setSimSpeed: (speed) => set({ simSpeed: Math.max(0.25, Math.min(4, speed)) }),
  toggleSensors: () => set((state) => ({ showSensors: !state.showSensors })),
  setGridSnap: (snap) => set({ gridSnap: Math.max(1, Math.round(snap)) }),

  setAppMode: (mode) => {
    if (mode === 'BUILDER') {
      set({
        appMode: 'BUILDER',
        isRunning: false,
        pendingPlaceType: null,
      });
      return;
    }
    const result = get().applyLayout();
    if (result.ok) {
      set({ appMode: 'PLAY', pendingPlaceType: null, selectedItemId: null, selectedItemType: null });
    } else {
      alert(`Cannot switch to Play mode. There are ${result.issues.filter(i => i.severity === 'error').length} blocking errors. Please check the Builder Sidebar.`);
    }
  },

  setSelectedItem: (id, type) => set({ selectedItemId: id, selectedItemType: type, pendingPlaceType: null }),
  toggleSimulation: () => {
    const { appMode, isRunning } = get();
    if (appMode !== 'PLAY') {
      get().startSimulation();
      return;
    }
    set({ isRunning: !isRunning });
  },
  startSimulation: () => {
    if (get().appMode !== 'PLAY') {
      const result = get().applyLayout();
      if (!result.ok) {
        alert("Cannot start simulation. Fix layout errors first.");
        return;
      }
      set({ appMode: 'PLAY', isRunning: true, pendingPlaceType: null });
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
    const nextId = nextPrefixedId('R', state.robots.map((r) => r.id));
    const pos = clampMove(robot.row, robot.col, 1, 1, state);
    const created: Robot = {
      ...DEFAULT_TRANSFORM,
      ...robot,
      ...pos,
      id: nextId,
      path: [],
      state: 'WAITING',
      currentTask: null,
      currentTaskId: null,
      taskPhase: null,
    };
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

  placeAtCell: (type, row, col) => {
    const state = get();
    const w = type === 'SHELF' ? 6 : type === 'OBSTACLE' ? 2 : 1;
    const h = type === 'SHELF' ? 2 : type === 'OBSTACLE' ? 2 : 1;
    const pos = clampMove(row, col, w, h, state);
    if (type === 'SHELF') get().addShelf({ ...pos, width: 6, height: 2 });
    else if (type === 'OBSTACLE') get().addObstacle({ ...pos, width: 2, height: 2 });
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
    set({ pendingPlaceType: null });
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
      pendingPlaceType: null,
    });
    useTaskStore.getState().resetTasks();
    return { ok: true, issues };
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

    const taskStore = useTaskStore.getState();
    const now = Date.now();
    const newMessages: CommunicationMessage[] = [];
    const newLinks: ActiveCommLink[] = [];
    
    // Expire old visual links
    const activeLinks = state.activeCommLinks.filter(l => l.expires > now);

    // 1. Conflict Resolution Phase (Pre-tick 2-step lookahead check)
    let coordinatedRobots = state.robots.map(r => ({ ...r, path: [...r.path] }));
    
    // Resolve conflicts iteratively (max 5 passes)
    for (let pass = 0; pass < 5; pass++) {
      let conflictResolved = false;
      
      for (let i = 0; i < coordinatedRobots.length; i++) {
        const r1 = coordinatedRobots[i];
        if (r1.state !== 'MOVING' || r1.path.length === 0) continue;
        
        const next1 = r1.path[0];
        const next1_2 = r1.path.length > 1 ? r1.path[1] : null;
        
        for (let j = i + 1; j < coordinatedRobots.length; j++) {
          const r2 = coordinatedRobots[j];
          if (r2.state !== 'MOVING' || r2.path.length === 0) continue;
          
          const next2 = r2.path[0];
          const next2_2 = r2.path.length > 1 ? r2.path[1] : null;
          
          let hasConflict = false;
          let conflictCell = null;
          
          // Case 1: Next cell overlap (Step 1)
          if (next1.row === next2.row && next1.col === next2.col) {
            hasConflict = true;
            conflictCell = next1;
          }
          // Case 2: Step 2 overlap
          else if (next1_2 && next2_2 && next1_2.row === next2_2.row && next1_2.col === next2_2.col) {
            hasConflict = true;
            conflictCell = next1_2;
          }
          // Case 3: Swap overlap (passing through each other)
          else if (next1.row === r2.row && next1.col === r2.col && next2.row === r1.row && next2.col === r1.col) {
            hasConflict = true;
            conflictCell = next1;
          }
          
          if (hasConflict && conflictCell) {
            const r1Dist = r1.path.length;
            const r2Dist = r2.path.length;
            // Longer remaining path yields, tie-breaker is alphabetical ID
            const r1Yields = r1Dist > r2Dist || (r1Dist === r2Dist && r1.id > r2.id);
            
            const yielder = r1Yields ? r1 : r2;
            const target = yielder.path[yielder.path.length - 1];
            
            // Recalculate path for yielder, treating conflictCell as blocked
            const tempObstacles = [
              ...state.obstacles,
              { row: conflictCell.row, col: conflictCell.col, width: 1, height: 1 }
            ];
            const tempState = { ...state, obstacles: tempObstacles };
            const newPath = findPathAStar(tempState, yielder.row, yielder.col, target.row, target.col);
            
            if (newPath.length > 0) {
              yielder.path = newPath;
              newMessages.push(createMsg(yielder.id, 'ALL', `Conflict detected at (${conflictCell.row},${conflictCell.col}). Recalculating route...`, 'COORDINATION', 'WARNING'));
            } else {
              // No bypass route, must yield priority by waiting
              yielder.path = [];
              yielder.state = 'WAITING';
              newMessages.push(createMsg(yielder.id, 'ALL', `Intersection conflict at (${conflictCell.row},${conflictCell.col}). No bypass, waiting.`, 'COORDINATION', 'IMPORTANT'));
            }
            
            conflictResolved = true;
            break;
          }
        }
        if (conflictResolved) break;
      }
      if (!conflictResolved) break;
    }

    const findLocationCoordinates = (locString: string): { row: number, col: number, label: string } | null => {
      const poi = state.pois.find(p => p.label.toLowerCase() === locString.toLowerCase() || p.id.toLowerCase() === locString.toLowerCase());
      if (poi) return { row: poi.row, col: poi.col, label: poi.label };
      
      const shelf = state.shelves.find(s => s.id.toLowerCase() === locString.toLowerCase() || locString.toLowerCase().includes(s.id.toLowerCase()));
      if (shelf) return { row: shelf.row - 1, col: shelf.col, label: shelf.id };
      
      return null;
    };

    // 2. Movement Phase (Execute movements using coordinated paths)
    const updatedRobots = coordinatedRobots.map(robot => {
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
            taskStore.failTask(assignedTask.task_id, 'No path to pickup');
            newMessages.push(createMsg(robot.id, 'SYSTEM', `Cannot find path to pickup ${pickupCoord.label}`, 'FAILURE', 'CRITICAL'));
          }
        }
      }

      if (robot.state === 'MOVING' && robot.path.length > 0) {
        const nextCell = robot.path[0];
        
        // Static obstacle check
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
        
        // Dynamic robot same-cell block (movement-time validation)
        const conflictRobot = coordinatedRobots.find(r => r.id !== robot.id && r.row === nextCell.row && r.col === nextCell.col);
        if (conflictRobot) {
          newMessages.push(createMsg(robot.id, conflictRobot.id, `Collision risk at (${nextCell.row},${nextCell.col}). I'll wait.`, 'COORDINATION', 'WARNING'));
          newLinks.push({ from: robot.id, to: conflictRobot.id, expires: now + 2500 });
          return robot;
        }

        const approachingIntersection = state.intersections.find(i => i.row === nextCell.row && i.col === nextCell.col);
        if (approachingIntersection) {
          newMessages.push(createMsg(robot.id, 'ALL', `Approaching intersection ${approachingIntersection.id}`, 'COORDINATION', 'NORMAL'));
        }

        const remainingPath = robot.path.slice(1);
        let newState: RobotState = 'MOVING';
        let newTaskPhase: 'TO_PICKUP' | 'TO_DROP' | null = robot.taskPhase || null;
        let newCurrentTaskId: string | null = robot.currentTaskId || null;
        let newPath = remainingPath;
        
        if (remainingPath.length === 0) {
          if (robot.taskPhase === 'TO_PICKUP' && robot.currentTaskId && robot.dropPoint) {
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
            taskStore.completeTask(robot.currentTaskId);
            newMessages.push(createMsg(robot.id, 'ALL', `Task [${robot.currentTaskId}] completed at ${robot.dropPoint?.label}.`, 'TASK', 'NORMAL'));
            newLinks.push({ from: robot.id, to: 'ALL', expires: now + 2000 });
            newState = 'WAITING';
            newTaskPhase = null;
            newCurrentTaskId = null;
          } else {
            newState = 'WAITING';
          }
        }
        
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

    // 3. Post-tick Actual Collision Verification (Double occupying cells)
    let actualCollisions = 0;
    for (let i = 0; i < updatedRobots.length; i++) {
      for (let j = i + 1; j < updatedRobots.length; j++) {
        const r1 = updatedRobots[i];
        const r2 = updatedRobots[j];
        if (r1.row === r2.row && r1.col === r2.col) {
          actualCollisions++;
          newMessages.push(createMsg('SYSTEM', 'ALL', `COLLISION ALERT: Robots ${r1.id} & ${r2.id} overlapped at grid cell (${r1.row}, ${r1.col})!`, 'FAILURE', 'CRITICAL'));
        }
      }
    }

    const allComms = [...state.communications, ...newMessages];
    if (allComms.length > MAX_MESSAGES) {
      allComms.splice(0, allComms.length - MAX_MESSAGES);
    }

    return { 
      robots: updatedRobots, 
      communications: allComms,
      activeCommLinks: [...activeLinks, ...newLinks],
      collisionsCount: state.collisionsCount + actualCollisions
    };
  }),
}));
