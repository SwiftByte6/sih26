import type { GridOccupant } from '../types/warehouse';

/** One simulation grid cell maps to this many world units (and 2D pixels). */
export const WORLD_SCALE = 20;

/** Logical meters represented by one grid cell (display / inspector). */
export const DEFAULT_METERS_PER_CELL = 1;

/**
 * Simulation grid: (col, row) with origin at top-left of the warehouse.
 * Three.js: X = col * cellSize, Y = up, Z = row * cellSize.
 */
export function simulationToWorld(
  row: number,
  col: number,
  cellSize: number,
  size: { width?: number; height?: number } = {}
): { x: number; y: number; z: number } {
  const width = size.width ?? 1;
  const height = size.height ?? 1;
  return {
    x: (col + width / 2) * cellSize,
    y: 0,
    z: (row + height / 2) * cellSize,
  };
}

export function worldToSimulation(
  x: number,
  z: number,
  cellSize: number,
  size: { width?: number; height?: number } = {}
): { row: number; col: number } {
  const width = size.width ?? 1;
  const height = size.height ?? 1;
  return {
    col: x / cellSize - width / 2,
    row: z / cellSize - height / 2,
  };
}

export function snapToGrid(row: number, col: number, snap = 1): { row: number; col: number } {
  const s = snap > 0 ? snap : 1;
  return {
    row: Math.round(row / s) * s,
    col: Math.round(col / s) * s,
  };
}

/** Clamp so the object's full footprint stays inside the warehouse grid. */
export function clampToWarehouse(
  occupant: GridOccupant,
  gridCols: number,
  gridRows: number
): { row: number; col: number } {
  const width = Math.max(1, occupant.width);
  const height = Math.max(1, occupant.height);
  const maxCol = Math.max(0, gridCols - width);
  const maxRow = Math.max(0, gridRows - height);
  return {
    col: Math.max(0, Math.min(Math.round(occupant.col), maxCol)),
    row: Math.max(0, Math.min(Math.round(occupant.row), maxRow)),
  };
}

export function snapAndClamp(
  row: number,
  col: number,
  width: number,
  height: number,
  gridCols: number,
  gridRows: number,
  snap = 1
): { row: number; col: number } {
  const snapped = snapToGrid(row, col, snap);
  return clampToWarehouse({ row: snapped.row, col: snapped.col, width, height }, gridCols, gridRows);
}

export function warehouseWorldSize(gridCols: number, gridRows: number, cellSize: number) {
  return {
    width: gridCols * cellSize,
    depth: gridRows * cellSize,
  };
}

export function cellsOverlap(a: GridOccupant, b: GridOccupant): boolean {
  return (
    a.col < b.col + b.width &&
    a.col + a.width > b.col &&
    a.row < b.row + b.height &&
    a.row + a.height > b.row
  );
}
