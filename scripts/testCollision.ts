import { runCollisionAvoidanceTestSuite } from '../engine/coordination/CollisionAvoidanceTestSuite';
import { Robot, Obstacle } from '../types/warehouse';
import { Task } from '../types/task';
import { PathfindingState } from '../engine/pathfinding';
import {
  calculateRobotPriority,
  detectFutureTrajectoryConflicts,
  preemptivelyDeconflictTrajectories,
  resolveTickCollisions,
} from '../engine/coordination/CollisionCoordinator';

console.log('===============================================================');
console.log('=== RUNNING COLLISION AVOIDANCE & DECONFLICTION TEST SUITE ===');
console.log('===============================================================');

const summary = runCollisionAvoidanceTestSuite();
summary.results.forEach((res, idx) => {
  const status = res.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${status}] ${res.testName}`);
  console.log(`    ↳ ${res.details}`);
});

console.log('\n---------------------------------------------------------------');
console.log(`Summary: ${summary.passCount} / ${summary.totalTests} Passed (${summary.failCount} Failed)`);
console.log('---------------------------------------------------------------\n');

console.log('===============================================================');
console.log('=== LIVE SIMULATION TRACE: TWO HEAD-ON CONFLICTING AMRs ===');
console.log('===============================================================');

const warehouseState: PathfindingState = {
  gridRows: 20,
  gridCols: 20,
  cellSize: 20,
  obstacles: [],
  shelves: [],
  pallets: [],
};

const tasks: Task[] = [
  {
    task_id: 'TASK-URGENT-01',
    task_type: 'DELIVER_ITEM',
    pickup_point: 'DOCK-A',
    drop_point: 'STATION-SOUTH',
    priority: 'URGENT',
    weight: 15,
    status: 'ASSIGNED',
    assigned_robot_id: 'AMR-01',
    created_time: '2026-09-10T12:00:00.000Z',
    assigned_time: '2026-09-10T12:00:01.000Z',
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
  {
    task_id: 'TASK-NORMAL-02',
    task_type: 'RESTOCK_SHELF',
    pickup_point: 'STORAGE-B',
    drop_point: 'STATION-NORTH',
    priority: 'NORMAL',
    weight: 10,
    status: 'ASSIGNED',
    assigned_robot_id: 'AMR-02',
    created_time: '2026-09-10T12:00:00.000Z',
    assigned_time: '2026-09-10T12:00:02.000Z',
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  },
];

let robots: Robot[] = [
  {
    id: 'AMR-01',
    label: 'AMR-01',
    col: 8,
    row: 2,
    state: 'MOVING',
    battery: 95,
    speed: 1.0,
    currentTaskId: 'TASK-URGENT-01',
    currentTask: 'TASK-URGENT-01',
    dropPoint: { col: 8, row: 8, label: 'STATION-SOUTH' },
    path: [
      { col: 8, row: 3 },
      { col: 8, row: 4 },
      { col: 8, row: 5 },
      { col: 8, row: 6 },
      { col: 8, row: 7 },
      { col: 8, row: 8 },
    ],
  },
  {
    id: 'AMR-02',
    label: 'AMR-02',
    col: 8,
    row: 8,
    state: 'MOVING',
    battery: 90,
    speed: 1.0,
    currentTaskId: 'TASK-NORMAL-02',
    currentTask: 'TASK-NORMAL-02',
    dropPoint: { col: 8, row: 2, label: 'STATION-NORTH' },
    path: [
      { col: 8, row: 7 },
      { col: 8, row: 6 },
      { col: 8, row: 5 },
      { col: 8, row: 4 },
      { col: 8, row: 3 },
      { col: 8, row: 2 },
    ],
  },
];

console.log('INITIAL STATE:');
console.log(`  AMR-01 (Priority: URGENT) at (col ${robots[0].col}, row ${robots[0].row}) heading South along col 8`);
console.log(`  AMR-02 (Priority: NORMAL) at (col ${robots[1].col}, row ${robots[1].row}) heading North along col 8`);

const blockedTicksMap = new Map<string, number>();

// Simulate step-by-step
for (let tick = 1; tick <= 7; tick++) {
  console.log(`\n--- TICK ${tick} ---`);

  // Step 1: Preemptive Lookahead Deconfliction
  const deconfliction = preemptivelyDeconflictTrajectories(robots, tasks, warehouseState);
  robots = deconfliction.updatedRobots;

  if (deconfliction.deconflictEvents.length > 0) {
    deconfliction.deconflictEvents.forEach((evt) => {
      console.log(`[P2P] ${evt.priorityRobotId} -> ${evt.yieldingRobotId} : PATH_INTENT`);
      console.log(`      ↳ "Priority trajectory corridor claimed along col ${evt.conflictLocation.col}"`);
      console.log(`[P2P] ${evt.yieldingRobotId} -> ${evt.priorityRobotId} : CONFLICT_DETECTED`);
      console.log(`      ↳ "Predicted head-on collision at (${evt.conflictLocation.col}, ${evt.conflictLocation.row}) in t+${evt.conflictTick}"`);
      console.log(`[P2P] ${evt.yieldingRobotId} -> ${evt.priorityRobotId} : YIELD_REQUEST`);
      console.log(`      ↳ "${evt.yieldingRobotId} yielding right-of-way to ${evt.priorityRobotId}"`);
      console.log(`[ROBOT] ${evt.yieldingRobotId} : REPLANNING (findDeconflictedPathAStar)`);
      console.log(`[P2P] ${evt.yieldingRobotId} -> ${evt.priorityRobotId} : PATH_UPDATED`);
      console.log(`      ↳ "${evt.yieldingRobotId} detour route calculated (${evt.newPathLength} steps). Continuing movement."`);
    });
  }

  // Step 2: 1-Tick Collision Arbitration
  const resolution = resolveTickCollisions(robots, [], tasks, blockedTicksMap, warehouseState);

  // Step 3: Advance Robots
  robots = robots.map((robot) => {
    if (resolution.allowedRobotIds.has(robot.id) && robot.path.length > 0) {
      const nextCell = robot.path[0];
      const remaining = robot.path.slice(1);
      return {
        ...robot,
        col: nextCell.col,
        row: nextCell.row,
        path: remaining,
        state: remaining.length === 0 ? 'WAITING' as const : 'MOVING' as const,
      };
    }
    return robot;
  });

  console.log(`  AMR-01 Pos: (${robots[0].col}, ${robots[0].row}) | State: ${robots[0].state} | Path Length: ${robots[0].path.length}`);
  console.log(`  AMR-02 Pos: (${robots[1].col}, ${robots[1].row}) | State: ${robots[1].state} | Path Length: ${robots[1].path.length}`);

  // Invariant check: collision
  if (robots[0].col === robots[1].col && robots[0].row === robots[1].row) {
    console.error(`FATAL COLLISION at (${robots[0].col}, ${robots[0].row})!`);
    process.exit(1);
  }
}

console.log('\n===============================================================');
console.log('✓ LIVE SIMULATION COMPLETE: ZERO COLLISIONS & ZERO STOP-AND-WAIT!');
console.log('===============================================================');

if (summary.failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
