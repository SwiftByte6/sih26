export interface TaskEvaluationResult {
  taskId: string;
  robotId: string;
  timestamp: string;
  eligible: boolean;
  ineligibilityReasons: string[];

  // Distances & Timing
  distanceToPickup: number;           // Grid distance from robot to pickup
  pickupToDropDistance: number;       // Grid distance from pickup to drop
  estimatedTotalDistance: number;     // Total distance (robot -> pickup -> drop)
  estimatedTimeSeconds: number;       // Estimated travel time in seconds

  // Battery Requirement
  estimatedBatteryConsumption: number; // In %
  remainingBatteryAfterTask: number;   // Battery % left after completing task
  hasSufficientBattery: boolean;

  // Breakdown Sub-Scores (0 to 100)
  distanceScore: number;
  batteryScore: number;
  travelTimeScore: number;
  workloadScore: number;
  capabilityScore: number;
  sensingScore: number;

  // Final Composite Suitability Score (0 to 100)
  suitabilityScore: number;
}
