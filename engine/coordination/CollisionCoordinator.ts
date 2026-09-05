import { Robot, Obstacle } from '../../types/warehouse';
import { Task } from '../../types/task';
import { findDeconflictedPathAStar, findPathAStar, PathfindingState } from '../pathfinding';

export interface MovementStepIntent {
  robotId: string;
  currentCell: { col: number; row: number };
  targetCell: { col: number; row: number } | null;
  priorityScore: number;
  hasActiveTask: boolean;
}

export interface IdleSidestepRequest {
  idleRobotId: string;
  requestingRobotId: string;
  blockedCell: { col: number; row: number };
}

export interface CollisionResolutionResult {
  allowedRobotIds: Set<string>;
  blockedRobotIds: Map<string, { blockingRobotId: string; reason: string }>;
  yieldingEvents: Array<{ yieldingRobotId: string; priorityRobotId: string; reason: string }>;
  idleSidestepRequests: IdleSidestepRequest[];
}

export interface TrajectoryConflict {
  conflictType: 'VERTEX_COLLISION' | 'HEAD_ON_SWAP';
  tick: number;
  location: { row: number; col: number };
  priorityRobotId: string;
  yieldingRobotId: string;
  reason: string;
}

export interface PreemptiveDeconflictResult {
  updatedRobots: Robot[];
  deconflictEvents: Array<{
    yieldingRobotId: string;
    priorityRobotId: string;
    conflictLocation: { row: number; col: number };
    conflictTick: number;
    conflictType: 'VERTEX_COLLISION' | 'HEAD_ON_SWAP';
    newPathLength: number;
    body: string;
  }>;
}

const getPriorityRank = (priority?: string): number => {
  switch (priority) {
    case 'URGENT':
      return 300;
    case 'LOW':
      return 200;
    case 'NORMAL':
    default:
      return 100;
  }
};

/**
 * Calculates a deterministic priority score for a robot.
 * Higher score = higher movement priority.
 */
export function calculateRobotPriority(robot: Robot, activeTask?: Task | null): number {
  let score = 0;

  // 1. Robot with active task has priority over idle robot
  const hasTask = Boolean(robot.currentTask || robot.currentTaskId || (activeTask && activeTask.status !== 'COMPLETED'));
  if (hasTask) {
    score += 1000;
  }

  // 2. Task priority (URGENT > LOW > NORMAL)
  if (activeTask) {
    score += getPriorityRank(activeTask.priority);
  }

  // 3. Task assignment timestamp (earlier assignment = higher priority)
  if (activeTask && activeTask.assigned_time) {
    const timeMs = new Date(activeTask.assigned_time).getTime();
    const timeBonus = Math.max(0, 100 - Math.floor((Date.now() - timeMs) / 60000));
    score += timeBonus;
  }

  // 4. Deterministic Robot ID tie-breaker (e.g. AMR-01 [99] > AMR-02 [98] > AMR-03 [97])
  const match = robot.id.match(/\d+/);
  const numId = match ? parseInt(match[0], 10) : 99;
  const tieBreaker = Math.max(1, 100 - numId);
  score += tieBreaker * 0.1;

  return score;
}

/**
 * Proactively scans all moving AMRs' projected paths up to `lookaheadTicks` ahead in time.
 * Detects both future vertex collisions (same cell at time t) and head-on swap collisions.
 */
export function detectFutureTrajectoryConflicts(
  robots: Robot[],
  tasks: Task[],
  lookaheadTicks: number = 12
): TrajectoryConflict[] {
  const conflicts: TrajectoryConflict[] = [];
  const movingRobots = robots.filter(
    (r) => (r.isOnline ?? true) && r.state !== 'ERROR' && r.path && r.path.length > 0
  );

  if (movingRobots.length < 2) return conflicts;

  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.task_id, t));

  // Build time-indexed trajectories for each moving robot
  // trajectory[robotId][t] = { row, col } (t = 0 is current position, t = 1 is path[0], ...)
  const trajectories = new Map<string, Array<{ row: number; col: number }>>();

  movingRobots.forEach((robot) => {
    const traj: Array<{ row: number; col: number }> = [{ row: robot.row, col: robot.col }];
    for (let i = 0; i < Math.min(robot.path.length, lookaheadTicks); i++) {
      traj.push({ row: robot.path[i].row, col: robot.path[i].col });
    }
    trajectories.set(robot.id, traj);
  });

  // Pairwise comparison of trajectories
  for (let i = 0; i < movingRobots.length; i++) {
    for (let j = i + 1; j < movingRobots.length; j++) {
      const robotA = movingRobots[i];
      const robotB = movingRobots[j];

      const trajA = trajectories.get(robotA.id) || [];
      const trajB = trajectories.get(robotB.id) || [];

      const priorityA = calculateRobotPriority(robotA, robotA.currentTaskId ? taskMap.get(robotA.currentTaskId) : null);
      const priorityB = calculateRobotPriority(robotB, robotB.currentTaskId ? taskMap.get(robotB.currentTaskId) : null);

      const winnerId = priorityA >= priorityB ? robotA.id : robotB.id;
      const yieldingId = winnerId === robotA.id ? robotB.id : robotA.id;

      const maxT = Math.min(trajA.length, trajB.length);

      for (let t = 1; t < maxT; t++) {
        const cellA = trajA[t];
        const cellB = trajB[t];
        const prevCellA = trajA[t - 1];
        const prevCellB = trajB[t - 1];

        // 1. Future Vertex Collision: Both AMRs arrive at the exact same cell at tick t
        if (cellA.row === cellB.row && cellA.col === cellB.col) {
          conflicts.push({
            conflictType: 'VERTEX_COLLISION',
            tick: t,
            location: { row: cellA.row, col: cellA.col },
            priorityRobotId: winnerId,
            yieldingRobotId: yieldingId,
            reason: `Predicted vertex collision at (${cellA.col}, ${cellA.row}) in ${t} ticks with ${winnerId}`,
          });
          break; // Deconflict earliest detected conflict for this pair
        }

        // 2. Future Head-On Swap: AMR-A moves prevA -> prevB while AMR-B moves prevB -> prevA
        if (
          cellA.row === prevCellB.row &&
          cellA.col === prevCellB.col &&
          cellB.row === prevCellA.row &&
          cellB.col === prevCellA.col
        ) {
          conflicts.push({
            conflictType: 'HEAD_ON_SWAP',
            tick: t,
            location: { row: cellA.row, col: cellA.col },
            priorityRobotId: winnerId,
            yieldingRobotId: yieldingId,
            reason: `Predicted head-on swap collision between (${prevCellA.col}, ${prevCellA.row}) and (${cellA.col}, ${cellA.row}) in ${t} ticks with ${winnerId}`,
          });
          break;
        }
      }
    }
  }

  return conflicts;
}

/**
 * Preemptively refactors routes for lower-priority AMRs when ahead-of-time trajectory conflicts are detected.
 * The lower-priority AMR recalculates its path avoiding the priority AMR's corridor before entering it.
 */
export function preemptivelyDeconflictTrajectories(
  robots: Robot[],
  tasks: Task[],
  warehouseState: PathfindingState
): PreemptiveDeconflictResult {
  const conflicts = detectFutureTrajectoryConflicts(robots, tasks, 12);
  const updatedRobots = [...robots];
  const deconflictEvents: PreemptiveDeconflictResult['deconflictEvents'] = [];

  const processedYielders = new Set<string>();

  conflicts.forEach((conflict) => {
    if (processedYielders.has(conflict.yieldingRobotId)) return;

    const yielderIdx = updatedRobots.findIndex((r) => r.id === conflict.yieldingRobotId);
    const priorityRobot = updatedRobots.find((r) => r.id === conflict.priorityRobotId);

    if (yielderIdx === -1 || !priorityRobot) return;

    const yielder = updatedRobots[yielderIdx];

    // Determine target destination (pickupPoint or dropPoint depending on phase)
    const targetCoord =
      yielder.taskPhase === 'TO_PICKUP'
        ? yielder.pickupPoint
        : yielder.taskPhase === 'TO_DROP'
        ? yielder.dropPoint
        : yielder.path.length > 0
        ? yielder.path[yielder.path.length - 1]
        : null;

    if (!targetCoord) return;

    // Full trajectory of the priority robot to avoid
    const priorityCorridor = [
      { row: priorityRobot.row, col: priorityRobot.col },
      ...priorityRobot.path,
    ];

    const currentOtherRobots = updatedRobots
      .filter((r) => r.id !== yielder.id)
      .map((r) => ({ row: r.row, col: r.col }));

    const newDeconflictedPath = findDeconflictedPathAStar(
      warehouseState,
      yielder.row,
      yielder.col,
      targetCoord.row,
      targetCoord.col,
      priorityCorridor,
      currentOtherRobots
    );

    // If a valid alternate path was found that differs from the blocked path
    if (newDeconflictedPath.length > 0) {
      updatedRobots[yielderIdx] = {
        ...yielder,
        path: newDeconflictedPath,
        state: 'MOVING',
      };
      processedYielders.add(conflict.yieldingRobotId);

      const desc = `[PATH_DECONFLICT] ${conflict.yieldingRobotId} refactored path ahead of time to avoid ${conflict.priorityRobotId} at (${conflict.location.col},${conflict.location.row}) in t+${conflict.tick}`;
      deconflictEvents.push({
        yieldingRobotId: conflict.yieldingRobotId,
        priorityRobotId: conflict.priorityRobotId,
        conflictLocation: conflict.location,
        conflictTick: conflict.tick,
        conflictType: conflict.conflictType,
        newPathLength: newDeconflictedPath.length,
        body: desc,
      });
    }
  });

  return {
    updatedRobots,
    deconflictEvents,
  };
}

/**
 * Evaluates immediate 1-tick movement intents using deterministic priority arbitration.
 * Resolves immediate contention, occupied cells, and head-on swaps on the next step.
 */
export function resolveTickCollisions(
  robots: Robot[],
  obstacles: Obstacle[],
  tasks: Task[],
  blockedTicksMap: Map<string, number>,
  warehouseState?: PathfindingState
): CollisionResolutionResult {
  const allowedRobotIds = new Set<string>();
  const blockedRobotIds = new Map<string, { blockingRobotId: string; reason: string }>();
  const yieldingEvents: Array<{ yieldingRobotId: string; priorityRobotId: string; reason: string }> = [];
  const idleSidestepRequests: IdleSidestepRequest[] = [];

  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.task_id, t));

  const intents: MovementStepIntent[] = [];
  const currentOccupiedCells = new Map<string, string>(); // "col,row" -> robotId

  robots.forEach((r) => {
    currentOccupiedCells.set(`${r.col},${r.row}`, r.id);
  });

  robots.forEach((robot) => {
    const isOnline = robot.isOnline ?? true;
    if (!isOnline || robot.state === 'ERROR' || robot.state === 'CHARGING') {
      return;
    }

    const currentTaskObj = robot.currentTaskId ? taskMap.get(robot.currentTaskId) : null;
    const priorityScore = calculateRobotPriority(robot, currentTaskObj);

    if ((robot.state === 'MOVING' || robot.state === 'WAITING_FOR_PATH_CLEARANCE') && robot.path.length > 0) {
      const nextCell = robot.path[0];
      intents.push({
        robotId: robot.id,
        currentCell: { col: robot.col, row: robot.row },
        targetCell: { col: nextCell.col, row: nextCell.row },
        priorityScore,
        hasActiveTask: Boolean(robot.currentTask || robot.currentTaskId),
      });
    } else {
      intents.push({
        robotId: robot.id,
        currentCell: { col: robot.col, row: robot.row },
        targetCell: null,
        priorityScore,
        hasActiveTask: Boolean(robot.currentTask || robot.currentTaskId),
      });
    }
  });

  // Group intents by target cell
  const targetCellGroups = new Map<string, MovementStepIntent[]>();

  intents.forEach((intent) => {
    if (intent.targetCell) {
      const key = `${intent.targetCell.col},${intent.targetCell.row}`;
      const group = targetCellGroups.get(key) || [];
      group.push(intent);
      targetCellGroups.set(key, group);
    } else {
      allowedRobotIds.add(intent.robotId);
    }
  });

  // Step 1: Detect Obstacle collisions
  intents.forEach((intent) => {
    if (!intent.targetCell) return;
    const targetCol = intent.targetCell.col;
    const targetRow = intent.targetCell.row;

    const hitObstacle = obstacles.some(
      (o) => targetRow >= o.row && targetRow < o.row + o.height && targetCol >= o.col && targetCol < o.col + o.width
    );

    if (hitObstacle) {
      blockedRobotIds.set(intent.robotId, { blockingRobotId: 'STATIC_OBSTACLE', reason: 'Static Obstacle' });
    }
  });

  // Step 2: Resolve Target Cell Contention (2+ AMRs wanting exact same cell)
  targetCellGroups.forEach((group, cellKey) => {
    if (group.length <= 1) return;

    group.sort((a, b) => b.priorityScore - a.priorityScore);

    const winner = group[0];
    for (let i = 1; i < group.length; i++) {
      const loser = group[i];
      blockedRobotIds.set(loser.robotId, {
        blockingRobotId: winner.robotId,
        reason: `Target cell contention (${cellKey}) - ${winner.robotId} has higher priority`,
      });
      yieldingEvents.push({
        yieldingRobotId: loser.robotId,
        priorityRobotId: winner.robotId,
        reason: `Target cell contention at (${cellKey})`,
      });
    }
  });

  // Step 3: Detect Head-On Swaps (AMR-A A->B while AMR-B B->A)
  intents.forEach((intentA) => {
    if (!intentA.targetCell || blockedRobotIds.has(intentA.robotId)) return;

    const intentB = intents.find(
      (i) =>
        i.robotId !== intentA.robotId &&
        i.targetCell &&
        i.targetCell.col === intentA.currentCell.col &&
        i.targetCell.row === intentA.currentCell.row &&
        i.currentCell.col === intentA.targetCell!.col &&
        i.currentCell.row === intentA.targetCell!.row
    );

    if (intentB) {
      let winnerIntent = intentA;
      let loserIntent = intentB;

      if (intentB.priorityScore > intentA.priorityScore) {
        winnerIntent = intentB;
        loserIntent = intentA;
      }

      blockedRobotIds.set(loserIntent.robotId, {
        blockingRobotId: winnerIntent.robotId,
        reason: `Head-on swap collision - ${winnerIntent.robotId} has priority`,
      });
      yieldingEvents.push({
        yieldingRobotId: loserIntent.robotId,
        priorityRobotId: winnerIntent.robotId,
        reason: `Head-on swap at (${winnerIntent.targetCell!.col},${winnerIntent.targetCell!.row})`,
      });
    }
  });

  // Step 4: Detect Occupied Cell Entry & Idle Yielding Requests
  intents.forEach((intent) => {
    if (!intent.targetCell || blockedRobotIds.has(intent.robotId)) return;

    const targetKey = `${intent.targetCell.col},${intent.targetCell.row}`;
    const occupantRobotId = currentOccupiedCells.get(targetKey);

    if (occupantRobotId && occupantRobotId !== intent.robotId) {
      // If occupant was already blocked in Step 3 as the head-on swap loser to THIS intent, do not block the winner
      const occupantBlockedInfo = blockedRobotIds.get(occupantRobotId);
      if (occupantBlockedInfo && occupantBlockedInfo.blockingRobotId === intent.robotId && occupantBlockedInfo.reason.includes('Head-on swap')) {
        return;
      }

      const occupantBlocked = blockedRobotIds.has(occupantRobotId);
      const occupantIntent = intents.find((i) => i.robotId === occupantRobotId);
      const isOccupantMoving = Boolean(occupantIntent && occupantIntent.targetCell !== null);

      if (occupantBlocked || !isOccupantMoving) {
        const occupantIsIdle = Boolean(occupantIntent && !occupantIntent.hasActiveTask);
        const requesterIsActive = intent.hasActiveTask;

        if (occupantIsIdle && requesterIsActive) {
          // The idle occupant must sidestep and yield to the active robot!
          idleSidestepRequests.push({
            idleRobotId: occupantRobotId,
            requestingRobotId: intent.robotId,
            blockedCell: { col: intent.targetCell.col, row: intent.targetCell.row },
          });
          blockedRobotIds.set(intent.robotId, {
            blockingRobotId: occupantRobotId,
            reason: `Waiting for idle ${occupantRobotId} to clear (${intent.targetCell.col},${intent.targetCell.row})`,
          });
          yieldingEvents.push({
            yieldingRobotId: occupantRobotId,
            priorityRobotId: intent.robotId,
            reason: `Idle AMR ${occupantRobotId} clearing path for active ${intent.robotId}`,
          });
        } else {
          blockedRobotIds.set(intent.robotId, {
            blockingRobotId: occupantRobotId,
            reason: `Target cell occupied by ${occupantRobotId}`,
          });
          yieldingEvents.push({
            yieldingRobotId: intent.robotId,
            priorityRobotId: occupantRobotId,
            reason: `Occupied cell at (${intent.targetCell.col},${intent.targetCell.row})`,
          });
        }
      }
    }
  });

  // Step 5: Mark all unblocked intents as allowed & reset blocked ticks
  intents.forEach((intent) => {
    if (intent.targetCell && !blockedRobotIds.has(intent.robotId)) {
      allowedRobotIds.add(intent.robotId);
      blockedTicksMap.set(intent.robotId, 0);
    } else if (blockedRobotIds.has(intent.robotId)) {
      const count = (blockedTicksMap.get(intent.robotId) || 0) + 1;
      blockedTicksMap.set(intent.robotId, count);
    }
  });

  return {
    allowedRobotIds,
    blockedRobotIds,
    yieldingEvents,
    idleSidestepRequests,
  };
}
