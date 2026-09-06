import { useWarehouseStore } from '../../store/warehouseStore';
import { useTaskStore } from '../../store/taskStore';
import { useP2PStore } from '../../store/p2pStore';
import { resolveLocationCoordinates } from '../evaluation/TaskEvaluator';
import { findPathAStar, isWalkable } from '../pathfinding';

const activeRecoveryRounds = new Map<string, number>();

export interface RobotFailurePayload {
  robotId: string;
  failureType: 'OFFLINE' | 'ERROR' | 'COMMUNICATION_LOST';
  currentTaskId: string | null;
  position: { col: number; row: number };
  timestamp: number;
}

export interface TaskRecoveryAnnouncementPayload {
  taskId: string;
  failedRobotId: string;
  taskPhase: 'TO_PICKUP' | 'TO_DROP';
  lastKnownPosition: { col: number; row: number };
  taskData: any;
  recoveryRound: number;
}

/**
 * Triggers explicit robot failure for simulation & testing (Phase 5 requirement)
 */
export function triggerRobotFailure(robotId: string, failureType: 'OFFLINE' | 'ERROR' | 'COMMUNICATION_LOST'): void {
  const warehouseStore = useWarehouseStore.getState();
  const p2pStore = useP2PStore.getState();

  const robot = warehouseStore.robots.find((r) => r.id === robotId);
  if (!robot) return;

  const currentTaskId = robot.currentTaskId || robot.currentTask || null;
  const position = { col: robot.col, row: robot.row };

  // Halt robot movement and mark state
  warehouseStore.updateRobot(robotId, {
    state: 'ERROR',
    isOnline: failureType !== 'OFFLINE',
    failureStatus: failureType,
    recoveryStatus: 'RECOVERY_IN_PROGRESS',
    path: [],
  });

  const payload: RobotFailurePayload = {
    robotId,
    failureType,
    currentTaskId,
    position,
    timestamp: Date.now(),
  };

  // Broadcast ROBOT_FAILURE if network communication is available
  if (failureType !== 'COMMUNICATION_LOST') {
    p2pStore.broadcastMessage(robotId, 'ROBOT_FAILURE', payload);
  }

  // Peer-side failure handling
  handlePeerRobotFailure(payload);
}

/**
 * Restores a failed robot to normal operating state
 */
export function restoreRobot(robotId: string): void {
  const warehouseStore = useWarehouseStore.getState();
  warehouseStore.releaseCharger(robotId);
  warehouseStore.updateRobot(robotId, {
    state: 'WAITING',
    isOnline: true,
    failureStatus: 'NORMAL',
    recoveryStatus: 'NONE',
    currentTask: null,
    currentTaskId: null,
    taskPhase: null,
    path: [],
  });
}

/**
 * Handles peer failure events & initiates TASK_RECOVERY_ANNOUNCEMENT if an active task was interrupted
 */
export function handlePeerRobotFailure(payload: RobotFailurePayload): void {
  const taskStore = useTaskStore.getState();
  const p2pStore = useP2PStore.getState();
  const warehouseStore = useWarehouseStore.getState();

  const failedRobot = warehouseStore.robots.find((r) => r.id === payload.robotId);
  const activeTask = taskStore.tasks.find(
    (t) => (t.task_id === payload.currentTaskId || t.assigned_robot_id === payload.robotId) &&
           (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS' || t.status === 'FAILED')
  );

  if (!activeTask) return;

  const taskId = activeTask.task_id;
  const currentRound = (activeRecoveryRounds.get(taskId) || 0) + 1;
  activeRecoveryRounds.set(taskId, currentRound);

  // Preserve task metadata and mark recovery audit
  taskStore.updateTask(taskId, {
    recoveryAudit: {
      failedRobotId: payload.robotId,
      recoveryPhase: failedRobot?.taskPhase || 'TO_PICKUP',
      recoveryRound: currentRound,
    },
  });

  const recoveryAnnouncement: TaskRecoveryAnnouncementPayload = {
    taskId,
    failedRobotId: payload.robotId,
    taskPhase: (failedRobot?.taskPhase as any) || 'TO_PICKUP',
    lastKnownPosition: payload.position,
    taskData: activeTask,
    recoveryRound: currentRound,
  };

  // Broadcast TASK_RECOVERY_ANNOUNCEMENT over P2P layer
  p2pStore.broadcastMessage('TASK_DISPATCH', 'TASK_RECOVERY_ANNOUNCEMENT', recoveryAnnouncement);
}

/**
 * Calculates phase-aware recovery path for the replacement robot:
 * - TO_PICKUP: Replacement AMR -> Pickup -> Drop
 * - TO_DROP: Replacement AMR -> Last Known Position (Item) -> Drop
 */
export function executeRecoveryAssignment(winnerRobotId: string, task: any, taskPhase: 'TO_PICKUP' | 'TO_DROP', lastKnownPosition: { col: number; row: number }): void {
  const warehouseStore = useWarehouseStore.getState();
  const taskStore = useTaskStore.getState();

  const robotIndex = warehouseStore.robots.findIndex((r) => r.id === winnerRobotId);
  if (robotIndex === -1) return;

  const robot = warehouseStore.robots[robotIndex];
  const pickupCoord = resolveLocationCoordinates(task.pickup_point, warehouseStore.pois, warehouseStore.shelves);
  const dropCoord = resolveLocationCoordinates(task.drop_point, warehouseStore.pois, warehouseStore.shelves);

  if (!pickupCoord || !dropCoord) return;

  let startRow = robot.row;
  let startCol = robot.col;

  if (!isWalkable(warehouseStore, startRow, startCol)) {
    const neighbors = [
      { row: startRow - 1, col: startCol },
      { row: startRow + 1, col: startCol },
      { row: startRow, col: startCol - 1 },
      { row: startRow, col: startCol + 1 },
    ];
    const valid = neighbors.find((n) => isWalkable(warehouseStore, n.row, n.col));
    if (valid) {
      startRow = valid.row;
      startCol = valid.col;
    }
  }

  let finalPath: { row: number; col: number }[] = [];

  if (taskPhase === 'TO_DROP') {
    // Item already picked up: Navigate from current position -> item last known location -> Drop
    const pathToItem = findPathAStar(warehouseStore, startRow, startCol, lastKnownPosition.row, lastKnownPosition.col);
    const itemToDrop = findPathAStar(warehouseStore, lastKnownPosition.row, lastKnownPosition.col, dropCoord.row, dropCoord.col);
    finalPath = [...pathToItem, ...itemToDrop];
  } else {
    // Item not yet picked up: Navigate from current position -> Pickup -> Drop
    const pathToPickup = findPathAStar(warehouseStore, startRow, startCol, pickupCoord.row, pickupCoord.col);
    const pickupToDrop = findPathAStar(warehouseStore, pickupCoord.row, pickupCoord.col, dropCoord.row, dropCoord.col);
    finalPath = [...pathToPickup, ...pickupToDrop];
  }

  // Update replacement robot state
  const updatedRobots = [...warehouseStore.robots];
  updatedRobots[robotIndex] = {
    ...robot,
    row: startRow,
    col: startCol,
    state: 'MOVING',
    currentTask: task.task_id,
    currentTaskId: task.task_id,
    taskPhase: taskPhase,
    pickupPoint: pickupCoord,
    dropPoint: dropCoord,
    path: finalPath.length > 0 ? finalPath : [{ row: startRow, col: startCol }],
    recoveryStatus: 'RECOVERED',
  };

  useWarehouseStore.setState({ robots: updatedRobots });

  // Update task store
  taskStore.updateTask(task.task_id, {
    assigned_robot_id: winnerRobotId,
    status: 'IN_PROGRESS',
    recoveryAudit: {
      ...task.recoveryAudit,
      failedRobotId: task.recoveryAudit?.failedRobotId || 'UNKNOWN',
      recoveredRobotId: winnerRobotId,
    },
  });
}
