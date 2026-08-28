import { create } from 'zustand';
import { Robot, Shelf, Obstacle, Intersection, Path, PointOfInterest } from '../types/warehouse';
import { demoWarehouse } from '../data/demoWarehouse';

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
  
  setSelectedItem: (id: string | null, type: 'ROBOT' | 'SHELF' | 'OBSTACLE' | 'POI' | 'INTERSECTION' | null) => void;
  toggleSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setScale: (scale: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  
  addObstacle: (obstacle: Omit<Obstacle, 'id'>) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (id: string) => void;
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

  setSelectedItem: (id, type) => set({ selectedItemId: id, selectedItemType: type }),
  toggleSimulation: () => set((state) => ({ isRunning: !state.isRunning })),
  stopSimulation: () => set({ isRunning: false }),
  resetSimulation: () => set({ 
    isRunning: false, 
    robots: demoWarehouse.robots,
    obstacles: demoWarehouse.obstacles,
    selectedItemId: null,
    selectedItemType: null
  }),
  setScale: (scale) => set({ scale }),
  setPan: (pan) => set({ pan }),

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
}));
