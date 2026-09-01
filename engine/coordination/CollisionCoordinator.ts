import { Robot, Obstacle } from '../../types/warehouse';
import { Task } from '../../types/task';

export interface MovementStepIntent {
  robotId: string;
  currentCell: { col: number; row: number };
  targetCell: { col: number; row: number } | null;
  priorityScore: number;
  hasActiveTask: boolean;
}

export interface CollisionResolutionResult {
  allowedRobotIds: Set<string>;
  blockedRobotIds: Map<string, { blockingRobotId: string; reason: string }>;
  yieldingEvents: Array<{ yieldingRobotId: string; priorityRobotId: string; reason: string }>;
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
    // Normalize timestamp inverse (recent = smaller, earlier = larger)
    const timeBonus = Math.max(0, 100 - Math.floor((Date.now() - timeMs) / 60000));
    score += timeBonus;
  }

  // 4. Alphabetical AMR ID tie-breaker (e.g. AMR-01 [99] > AMR-02 [98] > AMR-03 [97])
  const match = robot.id.match(/\d+/);
  const numId = match ? parseInt(match[0], 10) : 99;
  const tieBreaker = Math.max(1, 100 - numId);
  score += tieBreaker * 0.1;

  return score;
}

/**
 * Evaluates movement intents for all active AMRs in a single simulation tick.
 * Deterministically resolves target cell contentions, occupied cell entries, and head-on swaps.
 */
export function resolveTickCollisions(
  robots: Robot[],
  obstacles: Obstacle[],
  tasks: Task[],
  blockedTicksMap: Map<string, number>
): CollisionResolutionResult {
  const allowedRobotIds = new Set<string>();
  const blockedRobotIds = new Map<string, { blockingRobotId: string; reason: string }>();
  const yieldingEvents: Array<{ yieldingRobotId: string; priorityRobotId: string; reason: string }> = [];

  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.task_id, t));

  // Build movement intents for all active robots
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
      // Robot is stationary
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

    // Sort by priority score descending
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
      // Head-on swap detected! Choose single priority winner
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

  // Step 4: Detect Occupied Cell Entry & Following Distance Contention
  intents.forEach((intent) => {
    if (!intent.targetCell || blockedRobotIds.has(intent.robotId)) return;

    const targetKey = `${intent.targetCell.col},${intent.targetCell.row}`;
    const occupantRobotId = currentOccupiedCells.get(targetKey);

    if (occupantRobotId && occupantRobotId !== intent.robotId) {
      // Cell is currently occupied by another robot
      const occupantBlocked = blockedRobotIds.has(occupantRobotId);

      // If occupant is stationary or blocked from leaving (unless yielding to this robot in head-on swap), follower MUST yield
      const isHeadOnYieldingOccupant = blockedRobotIds.get(occupantRobotId)?.blockingRobotId === intent.robotId;
      if (!isHeadOnYieldingOccupant && (occupantBlocked || !intents.some((i) => i.robotId === occupantRobotId && i.targetCell !== null))) {
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
  });

  // Step 5: Deadlock Timeout Resolution (> 15 blocked ticks)
  blockedRobotIds.forEach((blockInfo, robotId) => {
    const ticks = (blockedTicksMap.get(robotId) || 0) + 1;
    blockedTicksMap.set(robotId, ticks);

    if (ticks > 15 && blockInfo.blockingRobotId !== 'STATIC_OBSTACLE') {
      // Deadlock detected! Force deadlock break by letting lower ID or waiting robot proceed
      const robotA = robots.find((r) => r.id === robotId);
      const robotB = robots.find((r) => r.id === blockInfo.blockingRobotId);

      if (robotA && robotB) {
        // Break tie deterministically
        if (robotA.id < robotB.id) {
          blockedRobotIds.delete(robotId);
          blockedRobotIds.set(robotB.id, {
            blockingRobotId: robotA.id,
            reason: `Deadlock resolution timeout (>15 ticks): ${robotA.id} granted right-of-way`,
          });
        }
      }
    }
  });

  // Mark all unblocked intents as allowed
  intents.forEach((intent) => {
    if (intent.targetCell && !blockedRobotIds.has(intent.robotId)) {
      allowedRobotIds.add(intent.robotId);
      blockedTicksMap.set(intent.robotId, 0); // reset blocked ticks
    }
  });

  return {
    allowedRobotIds,
    blockedRobotIds,
    yieldingEvents,
  };
}
