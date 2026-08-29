import { Robot, PointOfInterest, Shelf } from '../../types/warehouse';
import { Task } from '../../types/task';
import { TaskEvaluationResult } from '../../types/evaluation';

export interface EvaluationTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export interface EvaluationTestSummary {
  timestamp: string;
  totalTests: number;
  passCount: number;
  failCount: number;
  results: EvaluationTestResult[];
}

/**
 * Resolves grid coordinates for a location string (e.g. "PICKUP A", "Storage-01", "S5")
 */
export function resolveLocationCoordinates(
  locString: string,
  pois: PointOfInterest[],
  shelves: Shelf[]
): { col: number; row: number; label: string } | null {
  if (!locString) return null;
  const norm = locString.toLowerCase().trim();

  // Look up in POIs
  const poi = pois.find((p) => p.label.toLowerCase().trim() === norm || p.id.toLowerCase().trim() === norm);
  if (poi) return { col: poi.col, row: poi.row, label: poi.label };

  // Look up in Shelves
  const shelf = shelves.find((s) => s.id.toLowerCase().trim() === norm || norm.includes(s.id.toLowerCase().trim()));
  if (shelf) return { col: shelf.col, row: shelf.row - 1, label: shelf.id };

  return null;
}

/**
 * Pure evaluation function:
 * Evaluates whether an AMR can perform a task (eligibility) and calculates its suitability score (0-100).
 * Does NOT assign tasks, modify simulation state, or broadcast bids.
 */
export function evaluateTask(
  robot: Robot,
  task: Task,
  pois: PointOfInterest[],
  shelves: Shelf[]
): TaskEvaluationResult {
  const ineligibilityReasons: string[] = [];
  const now = new Date().toISOString();

  // 1. Resolve Locations
  const pickupCoord = resolveLocationCoordinates(task.pickup_point, pois, shelves);
  const dropCoord = resolveLocationCoordinates(task.drop_point, pois, shelves);

  if (!pickupCoord || !dropCoord) {
    ineligibilityReasons.push(`Unresolvable location: pickup="${task.pickup_point}", drop="${task.drop_point}".`);
  }

  const robotCol = robot.col ?? 0;
  const robotRow = robot.row ?? 0;
  const pickupCol = pickupCoord?.col ?? robotCol;
  const pickupRow = pickupCoord?.row ?? robotRow;
  const dropCol = dropCoord?.col ?? pickupCol;
  const dropRow = dropCoord?.row ?? pickupRow;

  // 2. Distance Calculations (Manhattan grid distance)
  const distanceToPickup = Math.abs(robotCol - pickupCol) + Math.abs(robotRow - pickupRow);
  const pickupToDropDistance = Math.abs(pickupCol - dropCol) + Math.abs(pickupRow - dropRow);
  const estimatedTotalDistance = distanceToPickup + pickupToDropDistance;
  const robotSpeed = robot.speed > 0 ? robot.speed : 1.2;
  const estimatedTimeSeconds = Math.round(estimatedTotalDistance / robotSpeed);

  // 3. Battery Estimation (0.3% per grid cell unit)
  const estimatedBatteryConsumption = Math.round(estimatedTotalDistance * 0.3 * 10) / 10;
  const robotBattery = robot.battery ?? 100;
  const remainingBatteryAfterTask = robotBattery - estimatedBatteryConsumption;
  const hasSufficientBattery = remainingBatteryAfterTask >= 15; // Minimum 15% reserve

  // 4. Eligibility Checks
  const isOnline = robot.isOnline ?? true;

  // Rule 1: Online & Status Check
  if (!isOnline) {
    ineligibilityReasons.push(`Robot ${robot.id} is OFFLINE.`);
  }
  if (robot.state === 'ERROR') {
    ineligibilityReasons.push(`Robot ${robot.id} is in ERROR state.`);
  }

  // Rule 2: Payload Capacity Check
  const payloadCap = robot.payloadCapacity ?? 20;
  const taskWeight = task.weight ?? 10;
  if (taskWeight > payloadCap) {
    ineligibilityReasons.push(`Task weight (${taskWeight}kg) exceeds robot capacity (${payloadCap}kg).`);
  }

  // Rule 3: Delivery Capability Level Check
  if (task.requiredCapability && robot.deliveryCapability) {
    if (task.requiredCapability !== robot.deliveryCapability) {
      ineligibilityReasons.push(`Required capability "${task.requiredCapability}" does not match robot capability "${robot.deliveryCapability}".`);
    }
  }

  // Rule 4: Battery Reserve Check
  if (!hasSufficientBattery) {
    ineligibilityReasons.push(`Insufficient battery reserve. Remaining would be ${remainingBatteryAfterTask.toFixed(1)}% (minimum 15% required).`);
  }

  const eligible = ineligibilityReasons.length === 0;

  // 5. Suitability Sub-Score Calculations (0 to 100)
  let distanceScore = 0;
  let batteryScore = 0;
  let workloadScore = 0;
  let capabilityScore = 0;
  let suitabilityScore = 0;

  if (eligible) {
    // Distance score: closer to pickup = higher score
    distanceScore = Math.max(0, Math.min(100, 100 - distanceToPickup * 3));

    // Battery score: higher remaining battery = higher score
    batteryScore = Math.max(0, Math.min(100, remainingBatteryAfterTask));

    // Workload score based on current robot state
    if (robot.state === 'WAITING' || robot.state === 'IDLE') {
      workloadScore = 100;
    } else if (robot.state === 'CHARGING') {
      workloadScore = 50;
    } else if (robot.state === 'MOVING') {
      workloadScore = 30;
    } else {
      workloadScore = 10;
    }

    // Capability score (optimal payload efficiency around 70% capacity ratio)
    const loadRatio = taskWeight / payloadCap;
    capabilityScore = Math.max(0, Math.min(100, Math.round((1 - Math.abs(loadRatio - 0.7)) * 100)));

    // Composite Weighted Suitability Score (0 to 100)
    suitabilityScore = Math.round(
      0.4 * distanceScore + 0.3 * batteryScore + 0.2 * workloadScore + 0.1 * capabilityScore
    );
    suitabilityScore = Math.max(0, Math.min(100, suitabilityScore));
  }

  return {
    taskId: task.task_id,
    robotId: robot.id,
    timestamp: now,
    eligible,
    ineligibilityReasons,
    distanceToPickup,
    pickupToDropDistance,
    estimatedTotalDistance,
    estimatedTimeSeconds,
    estimatedBatteryConsumption,
    remainingBatteryAfterTask,
    hasSufficientBattery,
    distanceScore,
    batteryScore,
    workloadScore,
    capabilityScore,
    suitabilityScore,
  };
}

/**
 * Phase 4A Verification Test Suite
 */
export function runTaskEvaluationTestSuite(): EvaluationTestSummary {
  const results: EvaluationTestResult[] = [];

  const demoPois: PointOfInterest[] = [
    { id: 'POI1', type: 'PICKUP', col: 8, row: 25, label: 'PICKUP A' },
    { id: 'POI2', type: 'DROP', col: 24, row: 25, label: 'DROP B' },
  ];

  const demoShelves: Shelf[] = [];

  const sampleTask: Task = {
    task_id: 'T-004',
    task_type: 'DELIVER_ITEM',
    pickup_point: 'PICKUP A',
    drop_point: 'DROP B',
    priority: 'NORMAL',
    weight: 15,
    status: 'PENDING',
    assigned_robot_id: null,
    created_time: new Date().toISOString(),
    assigned_time: null,
    started_time: null,
    completed_time: null,
    failed_time: null,
    reassigned_count: 0,
    failure_reason: null,
  };

  // TEST 1: Sufficient Payload Capacity -> Eligible
  const robot1: Robot = {
    id: 'AMR-01',
    label: 'AMR-01',
    col: 8,
    row: 20,
    state: 'WAITING',
    battery: 90,
    speed: 1.4,
    currentTask: null,
    path: [],
    payloadCapacity: 20,
    isOnline: true,
  };
  const eval1 = evaluateTask(robot1, sampleTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 1: Sufficient Payload Capacity -> Eligible',
    passed: eval1.eligible === true,
    details: eval1.eligible ? `Eligible (Score: ${eval1.suitabilityScore})` : `Failed: ${eval1.ineligibilityReasons.join('; ')}`,
  });

  // TEST 2: Insufficient Payload Capacity -> Not Eligible
  const heavyTask: Task = { ...sampleTask, weight: 30 };
  const eval2 = evaluateTask(robot1, heavyTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 2: Insufficient Payload Capacity -> Not Eligible',
    passed: eval2.eligible === false && eval2.ineligibilityReasons.some((r) => r.includes('exceeds robot capacity')),
    details: !eval2.eligible ? `Correctly ineligible: ${eval2.ineligibilityReasons[0]}` : `Failed: expected ineligible`,
  });

  // TEST 3: Insufficient Delivery Capability -> Not Eligible
  const specTask: Task = { ...sampleTask, requiredCapability: 'Heavy Transport' };
  const stdRobot: Robot = { ...robot1, deliveryCapability: 'Express Lightweight' };
  const eval3 = evaluateTask(stdRobot, specTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 3: Insufficient Delivery Capability -> Not Eligible',
    passed: eval3.eligible === false && eval3.ineligibilityReasons.some((r) => r.includes('does not match robot capability')),
    details: !eval3.eligible ? `Correctly ineligible: ${eval3.ineligibilityReasons[0]}` : `Failed: expected ineligible`,
  });

  // TEST 4: Insufficient Battery -> Not Eligible
  const lowBattRobot: Robot = { ...robot1, battery: 18 };
  const eval4 = evaluateTask(lowBattRobot, sampleTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 4: Insufficient Battery Reserve -> Not Eligible',
    passed: eval4.eligible === false && eval4.ineligibilityReasons.some((r) => r.includes('Insufficient battery reserve')),
    details: !eval4.eligible ? `Correctly ineligible: ${eval4.ineligibilityReasons[0]}` : `Failed: expected ineligible`,
  });

  // TEST 5: Robot Offline -> Not Eligible
  const offlineRobot: Robot = { ...robot1, isOnline: false };
  const eval5 = evaluateTask(offlineRobot, sampleTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 5: Robot Offline -> Not Eligible',
    passed: eval5.eligible === false && eval5.ineligibilityReasons.some((r) => r.includes('OFFLINE')),
    details: !eval5.eligible ? `Correctly ineligible: ${eval5.ineligibilityReasons[0]}` : `Failed: expected ineligible`,
  });

  // TEST 6: Available & Capable Robot -> Eligible with Suitability Score
  const eval6 = evaluateTask(robot1, sampleTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 6: Available & Capable Robot -> Eligible with Score',
    passed: eval6.eligible === true && eval6.suitabilityScore > 0,
    details: eval6.eligible ? `Eligible (Composite Suitability Score: ${eval6.suitabilityScore}/100)` : `Failed: expected eligible`,
  });

  // TEST 7: Independent Evaluation of Same Task by Two Capable Robots
  const robotFar: Robot = {
    id: 'AMR-02',
    label: 'AMR-02',
    col: 2,
    row: 2, // Further away
    state: 'WAITING',
    battery: 60,
    speed: 1.0,
    currentTask: null,
    path: [],
    payloadCapacity: 25,
    isOnline: true,
  };
  const evalRobot1 = evaluateTask(robot1, sampleTask, demoPois, demoShelves);
  const evalRobot2 = evaluateTask(robotFar, sampleTask, demoPois, demoShelves);

  const t7Passed =
    evalRobot1.eligible &&
    evalRobot2.eligible &&
    evalRobot1.suitabilityScore > evalRobot2.suitabilityScore; // Closer robot1 has higher score

  results.push({
    testName: 'TEST 7: Independent Multi-Robot Evaluation (No Central Selection)',
    passed: t7Passed,
    details: t7Passed
      ? `Both evaluated independently: AMR-01 score=${evalRobot1.suitabilityScore}, AMR-02 score=${evalRobot2.suitabilityScore}`
      : `Failed: eval1=${evalRobot1.suitabilityScore}, eval2=${evalRobot2.suitabilityScore}`,
  });

  const passCount = results.filter((r) => r.passed).length;
  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passCount,
    failCount: results.length - passCount,
    results,
  };
}
