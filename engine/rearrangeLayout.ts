import type { LayoutSnapshot, Robot, Shelf, Obstacle, Pallet, PointOfInterest } from '../types/warehouse';
import { cellsOverlap } from '../lib/coords';
import { isWalkable } from './pathfinding';

export function autoRearrangeLayout(layout: {
  gridRows: number;
  gridCols: number;
  shelves: Shelf[];
  obstacles: Obstacle[];
  pois: PointOfInterest[];
  pallets: Pallet[];
  robots: Robot[];
}) {
  const gridRows = layout.gridRows;
  const gridCols = layout.gridCols;

  // 1. Rearrange Shelves to ensure zero overlaps
  const placedShelves: Shelf[] = [];
  for (const s of layout.shelves) {
    let shelf = { ...s };
    let overlaps = placedShelves.some((other) => cellsOverlap(shelf, other));
    if (overlaps) {
      let found = false;
      for (let r = 0; r <= gridRows - shelf.height; r++) {
        for (let c = 0; c <= gridCols - shelf.width; c++) {
          const candidate = { ...shelf, row: r, col: c };
          if (!placedShelves.some((other) => cellsOverlap(candidate, other))) {
            shelf = candidate;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    placedShelves.push(shelf);
  }

  // 2. Rearrange Obstacles to ensure zero overlaps with shelves or other obstacles
  const placedObstacles: Obstacle[] = [];
  for (const obs of layout.obstacles) {
    let obstacle = { ...obs };
    let overlaps =
      placedShelves.some((s) => cellsOverlap(obstacle, s)) ||
      placedObstacles.some((other) => cellsOverlap(obstacle, other));
    if (overlaps) {
      let found = false;
      for (let r = 0; r <= gridRows - obstacle.height; r++) {
        for (let c = 0; c <= gridCols - obstacle.width; c++) {
          const candidate = { ...obstacle, row: r, col: c };
          if (
            !placedShelves.some((s) => cellsOverlap(candidate, s)) &&
            !placedObstacles.some((other) => cellsOverlap(candidate, other))
          ) {
            obstacle = candidate;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    placedObstacles.push(obstacle);
  }

  // 3. Rearrange Pallets
  const placedPallets: Pallet[] = [];
  for (const pal of layout.pallets) {
    let pallet = { ...pal };
    let overlaps =
      placedShelves.some((s) => cellsOverlap(pallet, s)) ||
      placedObstacles.some((o) => cellsOverlap(pallet, o)) ||
      placedPallets.some((other) => cellsOverlap(pallet, other));
    if (overlaps) {
      let found = false;
      for (let r = 0; r <= gridRows - pallet.height; r++) {
        for (let c = 0; c <= gridCols - pallet.width; c++) {
          const candidate = { ...pallet, row: r, col: c };
          if (
            !placedShelves.some((s) => cellsOverlap(candidate, s)) &&
            !placedObstacles.some((o) => cellsOverlap(candidate, o)) &&
            !placedPallets.some((other) => cellsOverlap(candidate, other))
          ) {
            pallet = candidate;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    placedPallets.push(pallet);
  }

  // State for pathfinding/walkability check
  const pf = { gridRows, gridCols, obstacles: placedObstacles, shelves: placedShelves, pallets: placedPallets };

  // 4. Rearrange Robots to ensure they are on free, non-overlapping, walkable cells
  const placedRobots: Robot[] = [];
  const occupiedCells = new Set<string>();

  for (const r of layout.robots) {
    let robot = { ...r };
    const cellKey = `${robot.row},${robot.col}`;
    const walkable = isWalkable(pf, robot.row, robot.col);

    if (!walkable || occupiedCells.has(cellKey)) {
      // Find nearest open walkable cell
      let found = false;
      for (let dist = 1; dist < Math.max(gridRows, gridCols); dist++) {
        for (let dr = -dist; dr <= dist; dr++) {
          for (let dc = -dist; dc <= dist; dc++) {
            if (Math.abs(dr) !== dist && Math.abs(dc) !== dist) continue;
            const nr = robot.row + dr;
            const nc = robot.col + dc;
            const nk = `${nr},${nc}`;
            if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
              if (isWalkable(pf, nr, nc) && !occupiedCells.has(nk)) {
                robot = { ...robot, row: nr, col: nc, path: [], state: 'IDLE', currentTask: null };
                found = true;
                break;
              }
            }
          }
          if (found) break;
        }
        if (found) break;
      }
    }
    occupiedCells.add(`${robot.row},${robot.col}`);
    placedRobots.push(robot);
  }

  // 5. Rearrange POIs (Pickups/Drops) if they overlap shelves
  const placedPois: PointOfInterest[] = [];
  for (const p of layout.pois) {
    let poi = { ...p };
    const poiOcc = { row: poi.row, col: poi.col, width: 1, height: 1 };
    const overlaps = placedShelves.some((s) => cellsOverlap(poiOcc, s));
    if (overlaps) {
      let found = false;
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (isWalkable(pf, r, c)) {
            poi = { ...poi, row: r, col: c };
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    placedPois.push(poi);
  }

  return {
    shelves: placedShelves,
    obstacles: placedObstacles,
    pallets: placedPallets,
    robots: placedRobots,
    pois: placedPois,
  };
}
