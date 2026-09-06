import { useWarehouseStore } from '../../store/warehouseStore';

export interface ChargingTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export interface ChargingTestSummary {
  timestamp: string;
  totalTests: number;
  passCount: number;
  failCount: number;
  results: ChargingTestResult[];
}

export function runChargingSystemTestSuite(): ChargingTestSummary {
  const results: ChargingTestResult[] = [];
  const store = useWarehouseStore.getState();

  // Reset store chargers and POIs, enable simulation running state
  store.syncChargersFromPOIs();
  useWarehouseStore.setState({ isRunning: true });
  const initialChargers = useWarehouseStore.getState().chargers;

  // TEST 1: Charger Discovery & Initialization
  const test1Passed = initialChargers.length > 0 && initialChargers.every((c) => c.state === 'AVAILABLE');
  results.push({
    testName: 'Charger Discovery & Initialization',
    passed: test1Passed,
    details: `Discovered ${initialChargers.length} chargers. States: ${initialChargers.map((c) => c.state).join(', ')}`,
  });

  // TEST 2: Low Battery Auto-Reservation Trigger
  const robots = useWarehouseStore.getState().robots;
  if (robots.length > 0 && initialChargers.length > 0) {
    const testRobotId = robots[0].id;
    
    // Set battery to 15% (below lowBatteryThreshold 20%), IDLE state
    useWarehouseStore.setState((state) => ({
      robots: state.robots.map((r) =>
        r.id === testRobotId
          ? {
              ...r,
              battery: 15,
              state: 'IDLE' as const,
              path: [],
              currentTask: null,
              currentTaskId: null,
            }
          : r
      ),
    }));

    // Trigger sendRobotToCharger
    useWarehouseStore.getState().sendRobotToCharger(testRobotId);

    const updatedRobot = useWarehouseStore.getState().robots.find((r) => r.id === testRobotId);
    const reservedCharger = useWarehouseStore.getState().chargers.find((c) => c.reservedBy === testRobotId);

    const test2Passed =
      !!updatedRobot &&
      (updatedRobot.state === 'NAVIGATING_TO_CHARGER' || updatedRobot.state === 'CHARGING') &&
      !!reservedCharger &&
      reservedCharger.state === 'RESERVED';

    results.push({
      testName: 'Low Battery Auto-Dispatch & Charger Reservation',
      passed: test2Passed,
      details: `Robot ${testRobotId} state=${updatedRobot?.state}, reservedCharger=${reservedCharger?.id} (${reservedCharger?.state})`,
    });

    // TEST 3: Arrival & Charger Occupancy Transition
    if (reservedCharger) {
      // Position robot at charger location with targetChargerId and chargingPoint
      useWarehouseStore.setState((state) => ({
        robots: state.robots.map((r) =>
          r.id === testRobotId
            ? {
                ...r,
                row: reservedCharger.row,
                col: reservedCharger.col,
                chargingPoint: { row: reservedCharger.row, col: reservedCharger.col },
                targetChargerId: reservedCharger.id,
                path: [],
                state: 'NAVIGATING_TO_CHARGER' as const,
              }
            : r
        ),
      }));

      useWarehouseStore.getState().tick();

      const chargingRobot = useWarehouseStore.getState().robots.find((r) => r.id === testRobotId);
      const occupiedCharger = useWarehouseStore.getState().chargers.find((c) => c.id === reservedCharger.id);

      const test3Passed =
        !!chargingRobot &&
        chargingRobot.state === 'CHARGING' &&
        !!occupiedCharger &&
        occupiedCharger.state === 'OCCUPIED' &&
        occupiedCharger.occupiedBy === testRobotId;

      results.push({
        testName: 'Charger Arrival & Occupancy Transition',
        passed: test3Passed,
        details: `Robot ${testRobotId} state=${chargingRobot?.state}, charger ${occupiedCharger?.id} state=${occupiedCharger?.state}`,
      });

      // TEST 4: Battery Charging & Full Battery Release
      if (chargingRobot) {
        // Run tick loop to increment battery to 100%
        useWarehouseStore.setState((state) => ({
          robots: state.robots.map((r) =>
            r.id === testRobotId
              ? {
                  ...r,
                  battery: 99,
                  state: 'CHARGING' as const,
                  chargingState: 'CHARGING' as const,
                  targetChargerId: reservedCharger.id,
                }
              : r
          ),
        }));

        useWarehouseStore.getState().tick();

        const completedRobot = useWarehouseStore.getState().robots.find((r) => r.id === testRobotId);
        const releasedCharger = useWarehouseStore.getState().chargers.find((c) => c.id === reservedCharger.id);

        const test4Passed =
          !!completedRobot &&
          completedRobot.battery === 100 &&
          completedRobot.state === 'IDLE' &&
          !!releasedCharger &&
          releasedCharger.state === 'AVAILABLE';

        results.push({
          testName: 'Full Battery Release & Return to Operational IDLE',
          passed: test4Passed,
          details: `Robot ${testRobotId} battery=${completedRobot?.battery}%, state=${completedRobot?.state}, charger=${releasedCharger?.state}`,
        });
      }
    }
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.length - passCount;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passCount,
    failCount,
    results,
  };
}
