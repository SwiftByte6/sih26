import { Point } from '../types/warehouse';
import { isCellOverlappingObject, TransformableObject } from './collisionBounds';

// Define the state interface needed for pathfinding to avoid circular dependencies
export interface PathfindingState {
  gridRows: number;
  gridCols: number;
  cellSize?: number;
  obstacles: TransformableObject[];
  shelves: TransformableObject[];
  pallets?: TransformableObject[];
}

export function isWalkable(
  state: PathfindingState,
  row: number,
  col: number,
  avoidCells?: Set<string>
): boolean {
  if (row < 0 || row >= state.gridRows || col < 0 || col >= state.gridCols) return false;

  if (avoidCells && avoidCells.has(`${row},${col}`)) {
    return false;
  }

  const cellSize = state.cellSize ?? 20;

  // Check obstacles using transformed world-space OBB
  for (const obs of state.obstacles) {
    if (isCellOverlappingObject(row, col, obs, cellSize)) {
      return false;
    }
  }

  // Check shelves using transformed world-space OBB
  for (const shelf of state.shelves) {
    if (isCellOverlappingObject(row, col, shelf, cellSize)) {
      return false;
    }
  }

  if (state.pallets) {
    for (const pallet of state.pallets) {
      if (isCellOverlappingObject(row, col, pallet, cellSize)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Finds the nearest walkable cell adjacent to the target (for picking up/dropping next to shelves or boundaries)
 */
export function findNearestWalkableCell(
  state: PathfindingState,
  targetRow: number,
  targetCol: number,
  avoidCells?: Set<string>
): { row: number; col: number } | null {
  if (isWalkable(state, targetRow, targetCol, avoidCells)) {
    return { row: targetRow, col: targetCol };
  }

  // Search in expanding concentric rings up to radius 4
  for (let radius = 1; radius <= 4; radius++) {
    const candidates: { row: number; col: number; distSq: number; isAxial: boolean }[] = [];
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) + Math.abs(dc) === radius) {
          const r = targetRow + dr;
          const c = targetCol + dc;
          if (isWalkable(state, r, c, avoidCells)) {
            const distSq = dr * dr + dc * dc;
            const isAxial = dr === 0 || dc === 0;
            candidates.push({ row: r, col: c, distSq, isAxial });
          }
        }
      }
    }
    if (candidates.length > 0) {
      // Sort candidates: prefer axial cardinal steps, then closest euclidean distance
      candidates.sort((a, b) => {
        if (a.isAxial !== b.isAxial) return a.isAxial ? -1 : 1;
        return a.distSq - b.distSq;
      });
      return { row: candidates[0].row, col: candidates[0].col };
    }
  }

  // Fallback: If avoidCells was blocking, search again without avoidCells
  if (avoidCells && avoidCells.size > 0) {
    return findNearestWalkableCell(state, targetRow, targetCol);
  }

  return null;
}

// A* pathfinding algorithm on the grid with optional dynamic avoidance
export function findPathAStar(
  state: PathfindingState,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  avoidCells?: Set<string>,
  allowAvoidFallback: boolean = true
): { row: number; col: number }[] {
  if (startRow === endRow && startCol === endCol) {
    return [{ row: endRow, col: endCol }];
  }

  let actualStart = { row: startRow, col: startCol };
  if (!isWalkable(state, startRow, startCol)) {
    const fallbackStart = findNearestWalkableCell(state, startRow, startCol);
    if (fallbackStart) {
      actualStart = fallbackStart;
    } else {
      return [];
    }
  }

  let actualEnd = { row: endRow, col: endCol };
  if (!isWalkable(state, endRow, endCol, avoidCells)) {
    const fallbackEnd = findNearestWalkableCell(state, endRow, endCol, avoidCells);
    if (fallbackEnd) {
      actualEnd = fallbackEnd;
    } else if (!isWalkable(state, endRow, endCol)) {
      const fallbackEndNoAvoid = findNearestWalkableCell(state, endRow, endCol);
      if (fallbackEndNoAvoid) actualEnd = fallbackEndNoAvoid;
      else return [];
    }
  }

  if (actualStart.row === actualEnd.row && actualStart.col === actualEnd.col) {
    return [{ row: actualStart.row, col: actualStart.col }];
  }

  const openSet = new Set<string>();
  const closedSet = new Set<string>();

  const startKey = `${actualStart.row},${actualStart.col}`;
  const endKey = `${actualEnd.row},${actualEnd.col}`;

  openSet.add(startKey);

  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(actualStart.row, actualStart.col, actualEnd.row, actualEnd.col));

  while (openSet.size > 0) {
    let currentKey = '';
    let lowestF = Infinity;

    for (const key of openSet) {
      const score = fScore.get(key) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        currentKey = key;
      }
    }

    if (currentKey === endKey) {
      return reconstructPath(cameFrom, currentKey);
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    const [curRow, curCol] = currentKey.split(',').map(Number);
    const neighbors = getNeighbors(curRow, curCol);

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.row},${neighbor.col}`;

      if (closedSet.has(neighborKey) || !isWalkable(state, neighbor.row, neighbor.col, avoidCells)) {
        continue;
      }

      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;

      if (!openSet.has(neighborKey)) {
        openSet.add(neighborKey);
      } else if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) {
        continue;
      }

      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentativeG);
      fScore.set(neighborKey, tentativeG + heuristic(neighbor.row, neighbor.col, actualEnd.row, actualEnd.col));
    }
  }

  // If no path found with avoidCells, retry without avoidCells ONLY if fallback is explicitly allowed
  if (allowAvoidFallback && avoidCells && avoidCells.size > 0) {
    return findPathAStar(state, startRow, startCol, endRow, endCol);
  }

  return [];
}

/**
 * Preemptive Deconflicted Pathfinding:
 * Calculates an alternate detour path avoiding another robot's projected trajectory corridor.
 */
export function findDeconflictedPathAStar(
  state: PathfindingState,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  conflictingTrajectory: { row: number; col: number }[],
  currentRobotPositions?: { row: number; col: number }[]
): { row: number; col: number }[] {
  const avoidSet = new Set<string>();

  // Mark all cells in the conflicting trajectory as avoided
  conflictingTrajectory.forEach((p) => {
    avoidSet.add(`${p.row},${p.col}`);
  });

  // Also avoid other active robots' current stationary positions
  if (currentRobotPositions) {
    currentRobotPositions.forEach((pos) => {
      if (pos.row !== startRow || pos.col !== startCol) {
        avoidSet.add(`${pos.row},${pos.col}`);
      }
    });
  }

  // Never avoid the immediate start cell
  avoidSet.delete(`${startRow},${startCol}`);
  // If destination is not the conflicting cell, ensure destination is reachable
  avoidSet.delete(`${endRow},${endCol}`);

  const deconflictedPath = findPathAStar(state, startRow, startCol, endRow, endCol, avoidSet, false);
  if (deconflictedPath.length > 0) {
    return deconflictedPath;
  }

  return [];
}

function heuristic(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function getNeighbors(row: number, col: number) {
  return [
    { row: row - 1, col }, // up
    { row: row + 1, col }, // down
    { row, col: col - 1 }, // left
    { row, col: col + 1 }, // right
  ];
}

function reconstructPath(cameFrom: Map<string, string>, currentKey: string): { row: number; col: number }[] {
  const path: { row: number; col: number }[] = [];
  let current = currentKey;

  while (cameFrom.has(current)) {
    const [row, col] = current.split(',').map(Number);
    path.unshift({ row, col });
    current = cameFrom.get(current)!;
  }

  return path;
}
