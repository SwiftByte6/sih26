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
    selectedItemId: null,
    selectedItemType: null
  }),
  setScale: (scale) => set({ scale }),
  setPan: (pan) => set({ pan })
}));
