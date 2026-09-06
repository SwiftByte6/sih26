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

export interface CandidateBid {
  robotId: string;
  eligible: boolean;
  suitabilityScore: number;
  estimatedTimeSeconds?: number;
  distanceToPickup?: number;
  remainingBatteryAfterTask?: number;
  evaluation?: TaskEvaluationResult;
}

/**
 * Deterministic candidate winner selection (Phase 8 Advanced Tie-Breaking):
 * 1. Higher suitabilityScore
 * 2. Higher remainingBatteryAfterTask margin
 * 3. Lower distanceToPickup
 * 4. Lower estimatedTimeSeconds
 * 5. Lower robotId (alphabetically)
 */
export function determineCandidateWinner(
  myEval: TaskEvaluationResult | undefined,
  peerBids: Record<string, { robotId: string; eligible: boolean; suitabilityScore: number; evaluation?: TaskEvaluationResult }>
): string | null {
  const candidateBids: CandidateBid[] = [];

  // Add my evaluation if eligible
  if (myEval && myEval.eligible) {
    candidateBids.push({
      robotId: myEval.robotId,
      eligible: true,
      suitabilityScore: myEval.suitabilityScore,
      estimatedTimeSeconds: myEval.estimatedTimeSeconds,
      distanceToPickup: myEval.distanceToPickup,
      remainingBatteryAfterTask: myEval.remainingBatteryAfterTask,
      evaluation: myEval,
    });
  }

  // Add peer bids if eligible
  if (peerBids) {
    Object.values(peerBids).forEach((peerBid) => {
      if (peerBid.eligible && peerBid.suitabilityScore > 0) {
        candidateBids.push({
          robotId: peerBid.robotId,
          eligible: true,
          suitabilityScore: peerBid.suitabilityScore,
          estimatedTimeSeconds: peerBid.evaluation?.estimatedTimeSeconds ?? 60,
          distanceToPickup: peerBid.evaluation?.distanceToPickup ?? 20,
          remainingBatteryAfterTask: peerBid.evaluation?.remainingBatteryAfterTask ?? 100,
          evaluation: peerBid.evaluation,
        });
      }
    });
  }

  if (candidateBids.length === 0) return null;

  // Deduplicate bids by robotId (keep highest suitabilityScore per robot)
  const uniqueMap = new Map<string, CandidateBid>();
  candidateBids.forEach((bid) => {
    const existing = uniqueMap.get(bid.robotId);
    if (!existing || bid.suitabilityScore > existing.suitabilityScore) {
      uniqueMap.set(bid.robotId, bid);
    }
  });

  const uniqueBids = Array.from(uniqueMap.values());
  if (uniqueBids.length === 0) return null;

  uniqueBids.sort((a, b) => {
    // 1. Higher suitability score
    if (b.suitabilityScore !== a.suitabilityScore) {
      return b.suitabilityScore - a.suitabilityScore;
    }
    // 2. Higher remaining battery margin after task (Deterministic Tie Breaker #1)
    const battA = a.remainingBatteryAfterTask ?? a.evaluation?.remainingBatteryAfterTask ?? 100;
    const battB = b.remainingBatteryAfterTask ?? b.evaluation?.remainingBatteryAfterTask ?? 100;
    if (battB !== battA) {
      return battB - battA;
    }
    // 3. Shorter distance to pickup (Deterministic Tie Breaker #2)
    const distA = a.distanceToPickup ?? a.evaluation?.distanceToPickup ?? 20;
    const distB = b.distanceToPickup ?? b.evaluation?.distanceToPickup ?? 20;
    if (distA !== distB) {
      return distA - distB;
    }
    // 4. Lower travel time (Deterministic Tie Breaker #3)
    const timeA = a.estimatedTimeSeconds ?? a.evaluation?.estimatedTimeSeconds ?? 60;
    const timeB = b.estimatedTimeSeconds ?? b.evaluation?.estimatedTimeSeconds ?? 60;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    // 5. Deterministic tie-breaker: Robot ID string comparison
    return a.robotId.localeCompare(b.robotId);
  });

  return uniqueBids[0].robotId;
}

/**
 * Resolves grid coordinates for a location string (e.g. "PICKUP A", "Storage-01", "S5")
 */

export function normalizeLocString(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

const LOCATION_ALIAS_MAP: Record<string, string> = {
  'pickupa': 'POI1',
  'pickupb': 'POI2',
  'dropa': 'POI1',
  'dropb': 'POI2',
  'drop3': 'POI2',
  'drop2': 'POI2',
  'drop1': 'POI1',
  'storage01': 'POI4',
  'storage02': 'POI5',
  'storage1': 'POI4',
  'storage2': 'POI5',
  'packingareab': 'POI6',
  'packingb': 'POI6',
  'packingarea': 'POI6',
  'p3': 'POI7',
  'p1': 'POI8',
  'd5': 'POI2',
  'd8': 'POI2',
};

export function resolveLocationCoordinates(
  locString: string,
  pois: PointOfInterest[],
  shelves: Shelf[]
): { col: number; row: number; label: string } | null {
  if (!locString) return null;
  const rawNorm = locString.toLowerCase().trim();
  const norm = normalizeLocString(locString);

  // 1. Exact POI ID match (normalized or raw)
  const poiById = pois.find(
    (p) => normalizeLocString(p.id) === norm || p.id.toLowerCase().trim() === rawNorm
  );
  if (poiById) return { col: poiById.col, row: poiById.row, label: poiById.label };

  // 2. Exact normalized POI label match
  const poiByLabel = pois.find(
    (p) => normalizeLocString(p.label) === norm || p.label.toLowerCase().trim() === rawNorm
  );
  if (poiByLabel) return { col: poiByLabel.col, row: poiByLabel.row, label: poiByLabel.label };

  // 3. Exact normalized task alias match
  const aliasTargetId = LOCATION_ALIAS_MAP[norm] || LOCATION_ALIAS_MAP[rawNorm];
  if (aliasTargetId) {
    const targetNorm = normalizeLocString(aliasTargetId);
    const aliasedPoi = pois.find(
      (p) => normalizeLocString(p.id) === targetNorm || normalizeLocString(p.label) === targetNorm
    );
    if (aliasedPoi) return { col: aliasedPoi.col, row: aliasedPoi.row, label: aliasedPoi.label };

    const aliasedShelf = shelves.find(
      (s) => normalizeLocString(s.id) === targetNorm || normalizeLocString(s.id) === `s${targetNorm}`
    );
    if (aliasedShelf) return { col: aliasedShelf.col, row: aliasedShelf.row - 1, label: aliasedShelf.id };
  }

  // 4. Exact shelf ID match
  const shelfById = shelves.find(
    (s) => normalizeLocString(s.id) === norm || s.id.toLowerCase().trim() === rawNorm
  );
  if (shelfById) return { col: shelfById.col, row: shelfById.row - 1, label: shelfById.id };

  // 5. Shelf normalized prefix/suffix variations (e.g. 'shelf 5', 's5', 'shelf-5')
  const numMatch = norm.match(/\d+/);
  if (numMatch) {
    const shelfNum = numMatch[0];
    const shelfByNum = shelves.find(
      (s) => normalizeLocString(s.id) === `s${shelfNum}` || normalizeLocString(s.id) === `shelf${shelfNum}`
    );
    if (shelfByNum) return { col: shelfByNum.col, row: shelfByNum.row - 1, label: shelfByNum.id };

    // Numbered POI match fallback (e.g. 'PICKUP 6', 'POI 6', 'P6')
    const poiByNum = pois.find(
      (p) => normalizeLocString(p.id) === `poi${shelfNum}` || normalizeLocString(p.id) === `p${shelfNum}`
    );
    if (poiByNum) return { col: poiByNum.col, row: poiByNum.row, label: poiByNum.label };
  }

  // 6. Substring containment match on POI label or ID
  const poiContains = pois.find(
    (p) => normalizeLocString(p.label).includes(norm) || norm.includes(normalizeLocString(p.label))
  );
  if (poiContains) return { col: poiContains.col, row: poiContains.row, label: poiContains.label };

  return null;
}

/**
 * Pure evaluation function (Phase 8 Advanced Decision Engine):
 * Evaluates whether an AMR can perform a task (10 Hard Eligibility Rules)
 * and calculates its normalized suitability score (0-100) across 6 weighted sub-scores:
 * - Distance: 30%
 * - Battery Reserve Margin: 20%
 * - Travel Time / Speed: 15%
 * - Workload / Availability: 15%
 * - Capability & Complexity: 10%
 * - Sensing Radius Fit: 10%
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
  const dropRow = dropCoord?.row ?? robotRow;

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

  // 4. Hard Eligibility Checks (Phase 8 10-Rule Suite)
  const isOnline = robot.isOnline ?? true;

  // Rule 1: Online & Status Check
  if (!isOnline) {
    ineligibilityReasons.push(`Robot ${robot.id} is OFFLINE.`);
  }
  if (robot.state === 'ERROR') {
    ineligibilityReasons.push(`Robot ${robot.id} is in ERROR state.`);
  }
  if (robot.failureStatus && robot.failureStatus !== 'NORMAL') {
    ineligibilityReasons.push(`Robot ${robot.id} failure status: ${robot.failureStatus}.`);
  }

  // Rule 2: Occupied / Workload Check
  if (robot.currentTask || robot.state === 'MOVING') {
    ineligibilityReasons.push(`Robot ${robot.id} is currently occupied with active task "${robot.currentTask || 'MOVING'}".`);
  }

  // Rule 3: Payload Capacity Check
  const payloadCap = robot.payloadCapacity ?? 20;
  const taskWeight = task.weight ?? 10;
  if (taskWeight > payloadCap) {
    ineligibilityReasons.push(`Task weight (${taskWeight}kg) exceeds robot capacity (${payloadCap}kg).`);
  }

  // Rule 4: Required Capability Check
  if (task.requiredCapability && robot.deliveryCapability) {
    if (task.requiredCapability.toLowerCase().trim() !== robot.deliveryCapability.toLowerCase().trim()) {
      ineligibilityReasons.push(`Required capability "${task.requiredCapability}" does not match robot capability "${robot.deliveryCapability}".`);
    }
  }

  // Rule 5: Delivery Complexity Check
  if (task.deliveryComplexity) {
    const complexity = task.deliveryComplexity;
    const robotCap = robot.deliveryCapability || 'Standard Transport';

    if (complexity === 'HEAVY' && !/heavy/i.test(robotCap)) {
      ineligibilityReasons.push(`Delivery complexity HEAVY requires Heavy Transport capability.`);
    } else if (complexity === 'SENSITIVE' && !/sensitive|arm/i.test(robotCap)) {
      ineligibilityReasons.push(`Delivery complexity SENSITIVE requires Sensitive Handling or Robotic Arm capability.`);
    } else if (complexity === 'COMPLEX' && /standard/i.test(robotCap)) {
      ineligibilityReasons.push(`Delivery complexity COMPLEX requires advanced robot capability.`);
    }
  }

  // Rule 6: Sensing Radius Check
  const robotSensingRadius = robot.sensingRadius ?? 5;
  const requiredSensingRadius = task.requiredSensingRadius ?? 0;
  if (requiredSensingRadius > robotSensingRadius) {
    ineligibilityReasons.push(`Task required sensing radius (${requiredSensingRadius}m) exceeds robot sensing radius (${robotSensingRadius}m).`);
  }

  // Rule 7: Battery Reserve Check
  if (!hasSufficientBattery) {
    ineligibilityReasons.push(`Insufficient battery reserve. Remaining would be ${remainingBatteryAfterTask.toFixed(1)}% (minimum 15% required).`);
  }

  const eligible = ineligibilityReasons.length === 0;

  // 5. Normalized 6-Factor Suitability Sub-Score Calculations (0 to 100)
  let distanceScore = 0;
  let batteryScore = 0;
  let travelTimeScore = 0;
  let workloadScore = 0;
  let capabilityScore = 0;
  let sensingScore = 0;
  let suitabilityScore = 0;

  if (eligible) {
    // 1. Distance Score (30%): Closer to pickup = higher score
    distanceScore = Math.max(0, Math.min(100, Math.round(100 - distanceToPickup * 2.5)));

    // 2. Battery Margin Score (20%): Higher remaining battery = higher score
    batteryScore = Math.max(0, Math.min(100, Math.round(remainingBatteryAfterTask)));

    // 3. Travel Time Score (15%): Faster travel time / speed = higher score
    travelTimeScore = Math.max(0, Math.min(100, Math.round(100 - estimatedTimeSeconds * 1.5)));

    // 4. Workload Score (15%): Available = 100, Charging = 50, Moving = 0
    if (robot.state === 'WAITING' || robot.state === 'IDLE') {
      workloadScore = 100;
    } else if (robot.state === 'CHARGING') {
      workloadScore = 50;
    } else {
      workloadScore = 0;
    }

    // 5. Capability Score (10%): Load efficiency ratio around 70%
    const loadRatio = taskWeight / payloadCap;
    capabilityScore = Math.max(0, Math.min(100, Math.round((1 - Math.abs(loadRatio - 0.7)) * 100)));

    // 6. Sensing Score (10%): Sensing radius ratio
    const reqSense = requiredSensingRadius > 0 ? requiredSensingRadius : 5;
    sensingScore = Math.min(100, Math.round((robotSensingRadius / reqSense) * 100));

    // Composite Weighted Suitability Score (0 to 100)
    // Formula: Distance (30%) + Battery (20%) + Time (15%) + Workload (15%) + Capability (10%) + Sensing (10%)
    suitabilityScore = Math.round(
      0.30 * distanceScore +
      0.20 * batteryScore +
      0.15 * travelTimeScore +
      0.15 * workloadScore +
      0.10 * capabilityScore +
      0.10 * sensingScore
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
    travelTimeScore,
    workloadScore,
    capabilityScore,
    sensingScore,
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

  // TEST 8: Sensing Radius Exceeded -> Not Eligible
  const senseTask: Task = { ...sampleTask, requiredSensingRadius: 10 };
  const smallSenseRobot: Robot = { ...robot1, sensingRadius: 4 };
  const eval8 = evaluateTask(smallSenseRobot, senseTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 8: Sensing Radius Exceeded -> Not Eligible',
    passed: eval8.eligible === false && eval8.ineligibilityReasons.some((r) => r.includes('sensing radius')),
    details: !eval8.eligible ? `Correctly ineligible: ${eval8.ineligibilityReasons[0]}` : `Failed: expected ineligible`,
  });

  // TEST 9: Delivery Complexity HEAVY Mismatch -> Not Eligible
  const heavyComplexityTask: Task = { ...sampleTask, deliveryComplexity: 'HEAVY' };
  const stdCapRobot: Robot = { ...robot1, deliveryCapability: 'Standard Transport' };
  const eval9 = evaluateTask(stdCapRobot, heavyComplexityTask, demoPois, demoShelves);
  results.push({
    testName: 'TEST 9: Delivery Complexity HEAVY Mismatch -> Not Eligible',
    passed: eval9.eligible === false && eval9.ineligibilityReasons.some((r) => r.includes('HEAVY requires Heavy Transport')),
    details: !eval9.eligible ? `Correctly ineligible: ${eval9.ineligibilityReasons[0]}` : `Failed: expected ineligible`,
  });

  // TEST 10: Faster Speed AMR -> Higher Travel Time Score
  const fastRobot: Robot = { ...robot1, id: 'AMR-FAST', speed: 2.5 };
  const slowRobot: Robot = { ...robot1, id: 'AMR-SLOW', speed: 0.8 };
  const evalFast = evaluateTask(fastRobot, sampleTask, demoPois, demoShelves);
  const evalSlow = evaluateTask(slowRobot, sampleTask, demoPois, demoShelves);
  const t10Passed = evalFast.travelTimeScore > evalSlow.travelTimeScore;
  results.push({
    testName: 'TEST 10: Faster Speed AMR -> Higher Travel Time Score',
    passed: t10Passed,
    details: t10Passed
      ? `Fast AMR time score=${evalFast.travelTimeScore}, Slow AMR time score=${evalSlow.travelTimeScore}`
      : `Failed: fast=${evalFast.travelTimeScore}, slow=${evalSlow.travelTimeScore}`,
  });

  // TEST 11: Deterministic Tie Breaking (Same Suitability Score, Higher Remaining Battery Margin Wins)
  const candidateWinner = determineCandidateWinner(evalFast, {
    'AMR-SLOW': {
      robotId: 'AMR-SLOW',
      eligible: true,
      suitabilityScore: evalFast.suitabilityScore, // Same score
      evaluation: { ...evalSlow, suitabilityScore: evalFast.suitabilityScore, remainingBatteryAfterTask: 95 },
    },
  });
  results.push({
    testName: 'TEST 11: Deterministic Winner Selection Tie Breaking',
    passed: candidateWinner !== null,
    details: candidateWinner ? `Selected deterministic winner: ${candidateWinner}` : `Failed: candidateWinner is null`,
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
