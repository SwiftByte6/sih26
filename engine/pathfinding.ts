import { Point } from '../types/warehouse';

// Define the state interface needed for pathfinding to avoid circular dependencies
export interface PathfindingState {
  gridRows: number;
  gridCols: number;
  obstacles: { row: number; col: number; width: number; height: number }[];
  shelves: { row: number; col: number; width: number; height: number }[];
  pallets?: { row: number; col: number; width: number; height: number }[];
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

  if (state.pallets) {
    for (const pallet of state.pallets) {
      if (row >= pallet.row && row < pallet.row + pallet.height && col >= pallet.col && col < pallet.col + pallet.width) {
        return false;
      }
    }
  }
  
  return true;
}

function getWalkableNeighbors(state: PathfindingState, row: number, col: number): { row: number; col: number }[] {
  const neighbors = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];
  return neighbors.filter((n) => isWalkable(state, n.row, n.col));
}

function getSearchNeighbors(state: PathfindingState, row: number, col: number, radius: number): { row: number; col: number }[] {
  const results: { row: number; col: number }[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (isWalkable(state, r, c)) {
        results.push({ row: r, col: c });
      }
    }
  }
  return results;
}

function runAStarCore(
  state: PathfindingState,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): { row: number; col: number }[] {
  if (startRow === endRow && startCol === endCol) {
    return [{ row: endRow, col: endCol }];
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

  return [];
}

// Robust A* pathfinding with automatic destination adjacency resolution
export function findPathAStar(
  state: PathfindingState,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): { row: number; col: number }[] {
  // 1. If start is already at destination
  if (startRow === endRow && startCol === endCol) {
    return [{ row: endRow, col: endCol }];
  }

  // 2. Resolve walkable start position if start cell is occupied
  let actualStartRow = startRow;
  let actualStartCol = startCol;
  if (!isWalkable(state, startRow, startCol)) {
    const adjStart = getWalkableNeighbors(state, startRow, startCol);
    if (adjStart.length > 0) {
      actualStartRow = adjStart[0].row;
      actualStartCol = adjStart[0].col;
    }
  }

  // 3. Resolve target destination candidates (if end is blocked by shelf/obstacle/POI)
  let targets: { row: number; col: number }[] = [];
  if (!isWalkable(state, endRow, endCol)) {
    targets = getWalkableNeighbors(state, endRow, endCol);
    if (targets.length === 0) {
      targets = getSearchNeighbors(state, endRow, endCol, 2);
    }
    if (targets.length === 0) return [];
  } else {
    targets = [{ row: endRow, col: endCol }];
  }

  // 4. If actual start is already at one of the target cells
  if (targets.some((t) => t.row === actualStartRow && t.col === actualStartCol)) {
    return [{ row: actualStartRow, col: actualStartCol }];
  }

  // 5. Route to best accessible target candidate
  let bestPath: { row: number; col: number }[] = [];
  let minLen = Infinity;

  for (const target of targets) {
    const path = runAStarCore(state, actualStartRow, actualStartCol, target.row, target.col);
    if (path.length > 0 && path.length < minLen) {
      minLen = path.length;
      bestPath = path;
    }
  }

  if (bestPath.length > 0 && (actualStartRow !== startRow || actualStartCol !== startCol)) {
    bestPath.unshift({ row: actualStartRow, col: actualStartCol });
  }

  return bestPath;
}

function heuristic(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function getNeighbors(row: number, col: number) {
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];
}

function reconstructPath(cameFrom: Map<string, string>, currentKey: string): { row: number; col: number }[] {
  const path = [];
  let current = currentKey;

  while (cameFrom.has(current)) {
    const [row, col] = current.split(',').map(Number);
    path.unshift({ row, col });
    current = cameFrom.get(current)!;
  }

  return path;
}
