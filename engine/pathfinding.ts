import { Point } from '../types/warehouse';

// Define the state interface needed for pathfinding to avoid circular dependencies
export interface PathfindingState {
  gridRows: number;
  gridCols: number;
  obstacles: { row: number; col: number; width: number; height: number }[];
  shelves: { row: number; col: number; width: number; height: number }[];
}

export function isWalkable(state: PathfindingState, row: number, col: number): boolean {
  if (row < 0 || row >= state.gridRows || col < 0 || col >= state.gridCols) return false;
  
  // Check obstacles
  for (const obs of state.obstacles) {
    if (row >= obs.row && row < obs.row + obs.height && col >= obs.col && col < obs.col + obs.width) {
      return false;
    }
  }
  
  // Check shelves
  for (const shelf of state.shelves) {
    if (row >= shelf.row && row < shelf.row + shelf.height && col >= shelf.col && col < shelf.col + shelf.width) {
      return false;
    }
  }
  
  return true;
}

// Basic A* pathfinding algorithm on the grid
export function findPathAStar(state: PathfindingState, startRow: number, startCol: number, endRow: number, endCol: number): {row: number, col: number}[] {
  // If start or end is not walkable (e.g. inside a shelf), return empty path or handle differently
  // For now, if the destination itself is blocked, we might want to navigate to the nearest adjacent cell.
  // But we'll keep it simple: just fail if end is strictly blocked.
  if (!isWalkable(state, startRow, startCol) || !isWalkable(state, endRow, endCol)) {
    return [];
  }

  const openSet = new Set<string>();
  const closedSet = new Set<string>();
  
  const startKey = `${startRow},${startCol}`;
  const endKey = `${endRow},${endCol}`;
  
  openSet.add(startKey);
  
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(startRow, startCol, endRow, endCol));
  
  while (openSet.size > 0) {
    // Find node with lowest fScore
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
      
      if (closedSet.has(neighborKey) || !isWalkable(state, neighbor.row, neighbor.col)) {
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
      fScore.set(neighborKey, tentativeG + heuristic(neighbor.row, neighbor.col, endRow, endCol));
    }
  }
  
  // No path found
  return [];
}

function heuristic(r1: number, c1: number, r2: number, c2: number): number {
  // Manhattan distance
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

function reconstructPath(cameFrom: Map<string, string>, currentKey: string): {row: number, col: number}[] {
  const path = [];
  let current = currentKey;
  
  while (cameFrom.has(current)) {
    const [row, col] = current.split(',').map(Number);
    path.unshift({ row, col });
    current = cameFrom.get(current)!;
  }
  
  // Note: we don't include the start cell in the path returned to the robot
  return path;
}
