import { useWarehouseStore } from '../../store/warehouseStore';
import { useTaskStore } from '../../store/taskStore';
import { useP2PStore } from '../../store/p2pStore';
import { resolveLocationCoordinates } from '../evaluation/TaskEvaluator';
import { findPathAStar, isWalkable } from '../pathfinding';

const activeHandoverRounds = new Map<string, number>();

export interface TaskHandoverPayload {
  taskId: string;
  robotId: string;
  reason: 'CRITICAL_BATTERY' | 'WORKLOAD_UNSUITABLE' | 'CAPABILITY_UNAVAILABLE' | 'VOLUNTARY';
  taskPhase: 'TO_PICKUP' | 'TO_DROP';
  currentPosition: { col: number; row: number };
  handoverRound: number;
  taskData: any;
}

/**
 * Requests voluntary/operational task handover for an AMR (Phase 7 requirement)
 */
export function requestTaskHandover(
  robotId: string,
  reason: 'CRITICAL_BATTERY' | 'WORKLOAD_UNSUITABLE' | 'CAPABILITY_UNAVAILABLE' | 'VOLUNTARY' = 'VOLUNTARY'
): void {
  const warehouseStore = useWarehouseStore.getState();
  const taskStore = useTaskStore.getState();
  const p2pStore = useP2PStore.getState();

  const robot = warehouseStore.robots.find((r) => r.id === robotId);
  if (!robot || robot.state === 'ERROR' || robot.isOnline === false) return;

  const taskId = robot.currentTaskId || robot.currentTask;
  if (!taskId) return;

  const activeTask = taskStore.getTask(taskId);
  if (!activeTask) return;

  const currentRound = (activeHandoverRounds.get(taskId) || 0) + 1;
  activeHandoverRounds.set(taskId, currentRound);

  const taskPhase = robot.taskPhase || 'TO_PICKUP';
  const position = { col: robot.col, row: robot.row };

  // Set original robot recoveryStatus to indicate handover in progress
  warehouseStore.updateRobot(robotId, {
    recoveryStatus: 'RECOVERY_IN_PROGRESS',
  });

  // Preserve task metadata & set handoverAudit on taskStore
  taskStore.updateTask(taskId, {
    handoverAudit: {
      originalRobotId: robotId,
      handoverReason: reason,
      handoverPhase: taskPhase,
      handoverRound: currentRound,
    },
  });

  const payload: TaskHandoverPayload = {
    taskId,
    robotId,
    reason,
    taskPhase,
    currentPosition: position,
    handoverRound: currentRound,
    taskData: activeTask,
  };

  // Broadcast TASK_HANDOVER_REQUEST over P2P network
  p2pStore.broadcastMessage(robotId, 'TASK_HANDOVER_REQUEST', payload);
}

/**
 * Executes assignment for the replacement AMR upon successful P2P handover claim
 */
export function executeHandoverAssignment(
  winnerRobotId: string,
  task: any,
  taskPhase: 'TO_PICKUP' | 'TO_DROP',
  originalRobotId: string,
  reason?: string
): void {
  const warehouseStore = useWarehouseStore.getState();
  const taskStore = useTaskStore.getState();

  // 1. Release original AMR
  const origRobotIndex = warehouseStore.robots.findIndex((r) => r.id === originalRobotId);
  if (origRobotIndex !== -1) {
    const origRobot = warehouseStore.robots[origRobotIndex];
    const isBatteryIssue = reason === 'CRITICAL_BATTERY' || origRobot.battery < 25;
    warehouseStore.updateRobot(originalRobotId, {
      currentTask: null,
      currentTaskId: null,
      taskPhase: null,
      path: [],
      state: 'WAITING',
      recoveryStatus: 'NONE',
    });
    if (isBatteryIssue) {
      setTimeout(() => {
        warehouseStore.sendRobotToCharger(originalRobotId);
      }, 0);
    }
  }

  // 2. Assign replacement AMR
  const winnerIndex = warehouseStore.robots.findIndex((r) => r.id === winnerRobotId);
  if (winnerIndex === -1) return;

  const winnerRobot = warehouseStore.robots[winnerIndex];
  const pickupCoord = resolveLocationCoordinates(task.pickup_point, warehouseStore.pois, warehouseStore.shelves);
  const dropCoord = resolveLocationCoordinates(task.drop_point, warehouseStore.pois, warehouseStore.shelves);

  if (!pickupCoord || !dropCoord) return;

  let startRow = winnerRobot.row;
  let startCol = winnerRobot.col;

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
    // Preserve phase: item is already picked up! Travel replacement AMR -> Drop
    finalPath = findPathAStar(warehouseStore, startRow, startCol, dropCoord.row, dropCoord.col);
  } else {
    // Travel replacement AMR -> Pickup -> Drop
    const pathToPickup = findPathAStar(warehouseStore, startRow, startCol, pickupCoord.row, pickupCoord.col);
    const pickupToDrop = findPathAStar(warehouseStore, pickupCoord.row, pickupCoord.col, dropCoord.row, dropCoord.col);
    finalPath = [...pathToPickup, ...pickupToDrop];
  }

  const updatedRobots = [...warehouseStore.robots];
  updatedRobots[winnerIndex] = {
    ...winnerRobot,
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

  // Update taskStore state
  taskStore.updateTask(task.task_id, {
    assigned_robot_id: winnerRobotId,
    status: 'IN_PROGRESS',
    handoverAudit: {
      ...task.handoverAudit,
      originalRobotId,
      replacementRobotId: winnerRobotId,
    },
  });
}
