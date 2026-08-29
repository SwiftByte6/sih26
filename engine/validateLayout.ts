import { findPathAStar, isWalkable } from './pathfinding';
import { cellsOverlap, clampToWarehouse } from '../lib/coords';
import type {
  LayoutSnapshot,
  Obstacle,
  Pallet,
  PointOfInterest,
  Robot,
  Shelf,
  Wall,
} from '../types/warehouse';

export type LayoutValidationIssue = {
  severity: 'error' | 'warning';
  message: string;
};

export type PathfindingLayout = {
  gridRows: number;
  gridCols: number;
  obstacles: Obstacle[];
  shelves: Shelf[];
  pallets: Pallet[];
};

function occupant(row: number, col: number, width = 1, height = 1) {
  return { row, col, width, height };
}

function isInside(obj: { row: number; col: number; width?: number; height?: number }, gridCols: number, gridRows: number) {
  const w = obj.width ?? 1;
  const h = obj.height ?? 1;
  return obj.col >= 0 && obj.row >= 0 && obj.col + w <= gridCols && obj.row + h <= gridRows;
}

export function validateLayout(layout: {
  gridRows: number;
  gridCols: number;
  walls: Wall[];
  shelves: Shelf[];
  obstacles: Obstacle[];
  pois: PointOfInterest[];
  pallets: Pallet[];
  robots: Robot[];
}): LayoutValidationIssue[] {
  const issues: LayoutValidationIssue[] = [];
  const { gridRows, gridCols, walls, shelves, obstacles, pois, pallets, robots } = layout;

  if (gridCols < 8 || gridRows < 8) {
    issues.push({ severity: 'error', message: 'Warehouse is too small. Use at least 8×8 cells.' });
  }

  if (walls.length !== 4) {
    issues.push({ severity: 'error', message: 'Walls do not form a complete warehouse boundary (need 4 walls).' });
  }

  for (const wall of walls) {
    if (wall.height <= 0 || wall.thickness <= 0) {
      issues.push({ severity: 'error', message: `Wall ${wall.side} has invalid height or thickness.` });
    }
    if (wall.thickness > 40) {
      issues.push({ severity: 'warning', message: `Wall ${wall.side} is very thick and may crowd the playable area.` });
    }
  }

  const pf: PathfindingLayout = { gridRows, gridCols, obstacles, shelves, pallets };

  for (const shelf of shelves) {
    if (!isInside(shelf, gridCols, gridRows)) {
      issues.push({ severity: 'error', message: `Shelf ${shelf.id} is outside the warehouse.` });
    }
  }
  for (const obs of obstacles) {
    if (!isInside(obs, gridCols, gridRows)) {
      issues.push({ severity: 'error', message: `Obstacle ${obs.id} is outside the warehouse.` });
    }
  }
  for (const pallet of pallets) {
    if (!isInside(pallet, gridCols, gridRows)) {
      issues.push({ severity: 'error', message: `Pallet ${pallet.id} is outside the warehouse.` });
    }
  }
  for (const poi of pois) {
    if (!isInside(occupant(poi.row, poi.col), gridCols, gridRows)) {
      issues.push({ severity: 'error', message: `${poi.label} (${poi.id}) is outside the warehouse.` });
    }
  }
  for (const robot of robots) {
    if (!isInside(occupant(robot.row, robot.col), gridCols, gridRows)) {
      issues.push({ severity: 'error', message: `Robot ${robot.id} is outside the warehouse.` });
    }
  }

  for (let i = 0; i < shelves.length; i++) {
    for (let j = i + 1; j < shelves.length; j++) {
      if (cellsOverlap(shelves[i], shelves[j])) {
        issues.push({ severity: 'error', message: `Shelf ${shelves[i].id} overlaps Shelf ${shelves[j].id}.` });
      }
    }
  }

  for (const shelf of shelves) {
    for (const obs of obstacles) {
      if (cellsOverlap(shelf, obs)) {
        issues.push({ severity: 'error', message: `Obstacle ${obs.id} overlaps Shelf ${shelf.id}.` });
      }
    }
    for (const pallet of pallets) {
      if (cellsOverlap(shelf, pallet)) {
        issues.push({ severity: 'error', message: `Pallet ${pallet.id} overlaps Shelf ${shelf.id}.` });
      }
    }
  }

  for (const robot of robots) {
    const rOcc = occupant(robot.row, robot.col);
    for (const shelf of shelves) {
      if (cellsOverlap(rOcc, shelf)) {
        issues.push({ severity: 'error', message: `Robot ${robot.id} is inside Shelf ${shelf.id}.` });
      }
    }
    for (const obs of obstacles) {
      if (cellsOverlap(rOcc, obs)) {
        issues.push({ severity: 'error', message: `Robot ${robot.id} is inside Obstacle ${obs.id}.` });
      }
    }
    for (const pallet of pallets) {
      if (cellsOverlap(rOcc, pallet)) {
        issues.push({ severity: 'error', message: `Robot ${robot.id} is inside Pallet ${pallet.id}.` });
      }
    }
    if (!isWalkable(pf, robot.row, robot.col)) {
      issues.push({ severity: 'error', message: `Robot ${robot.id} does not start on a navigable cell.` });
    }
  }

  for (const poi of pois) {
    const pOcc = occupant(poi.row, poi.col);
    for (const shelf of shelves) {
      if (cellsOverlap(pOcc, shelf)) {
        issues.push({ severity: 'error', message: `${poi.label} is inside Shelf ${shelf.id}.` });
      }
    }
    for (const obs of obstacles) {
      if (cellsOverlap(pOcc, obs)) {
        issues.push({ severity: 'warning', message: `${poi.label} overlaps Obstacle ${obs.id}.` });
      }
    }
  }

  const otherRobots = (id: string) => robots.filter((r) => r.id !== id);
  for (const robot of robots) {
    for (const other of otherRobots(robot.id)) {
      if (robot.row === other.row && robot.col === other.col) {
        issues.push({ severity: 'error', message: `Robots ${robot.id} and ${other.id} share the same start cell.` });
      }
    }
  }

  const pickups = pois.filter((p) => p.type === 'PICKUP');
  for (const robot of robots) {
    if (pickups.length === 0) continue;
    const reachable = pickups.some((p) => findPathAStar(pf, robot.row, robot.col, p.row, p.col).length > 0 || (p.row === robot.row && p.col === robot.col));
    if (!reachable) {
      issues.push({
        severity: 'warning',
        message: `No valid path exists from ${robot.id} to a pickup point.`,
      });
    }
  }

  const blockedRatio = estimateBlockedRatio(pf);
  if (blockedRatio > 0.75) {
    issues.push({ severity: 'warning', message: 'Shelves and obstacles block most of the warehouse. Robots may be trapped.' });
  }

  return issues;
}

function estimateBlockedRatio(state: PathfindingLayout): number {
  let blocked = 0;
  const total = state.gridRows * state.gridCols;
  if (total <= 0) return 1;
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      if (!isWalkable(state, r, c)) blocked++;
    }
  }
  return blocked / total;
}

export function cloneLayout(layout: LayoutSnapshot): LayoutSnapshot {
  return JSON.parse(JSON.stringify(layout)) as LayoutSnapshot;
}

export function robotsForPlay(robots: Robot[]): Robot[] {
  return robots.map((r) => ({
    ...r,
    state: r.state === 'CHARGING' ? 'CHARGING' : 'WAITING',
    path: [],
    currentTask: null,
    currentTaskId: null,
    taskPhase: null,
    pickupPoint: null,
    dropPoint: null,
  }));
}

export function clampAllToGrid<T extends { row: number; col: number; width?: number; height?: number }>(
  items: T[],
  gridCols: number,
  gridRows: number
): T[] {
  return items.map((item) => {
    const clamped = clampToWarehouse(
      { row: item.row, col: item.col, width: item.width ?? 1, height: item.height ?? 1 },
      gridCols,
      gridRows
    );
    return { ...item, ...clamped };
  });
}
