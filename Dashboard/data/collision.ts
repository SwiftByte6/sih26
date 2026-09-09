import { ROBOT_IDS } from './robots';

export const collisionKpis = {
  detected: 62,
  avoided: 60,
  successRate: 96.8,
  collisions: 2,
  interventions: 74,
};

export const detectedVsAvoided = [
  { time: '08:00', detected: 5, avoided: 5 },
  { time: '09:00', detected: 7, avoided: 7 },
  { time: '10:00', detected: 8, avoided: 8 },
  { time: '11:00', detected: 9, avoided: 9 },
  { time: '12:00', detected: 10, avoided: 9 },
  { time: '13:00', detected: 8, avoided: 8 },
  { time: '14:00', detected: 8, avoided: 7 },
  { time: '15:00', detected: 7, avoided: 7 },
];

export const successRateOverTime = [
  { time: '08:00', rate: 100 },
  { time: '09:00', rate: 100 },
  { time: '10:00', rate: 100 },
  { time: '11:00', rate: 100 },
  { time: '12:00', rate: 90 },
  { time: '13:00', rate: 100 },
  { time: '14:00', rate: 87.5 },
  { time: '15:00', rate: 100 },
];

export const conflictTypePerformance = [
  {
    type: 'Robot ↔ Robot',
    detected: 38,
    avoided: 37,
    failed: 1,
  },
  {
    type: 'Robot ↔ Obstacle',
    detected: 24,
    avoided: 23,
    failed: 1,
  },
];

export const interventionsByAMR = [
  { amr: 'AMR-01', count: 18 },
  { amr: 'AMR-02', count: 20 },
  { amr: 'AMR-03', count: 17 },
  { amr: 'AMR-04', count: 19 },
];

export const conflictPressureOverTime = [
  { time: '08:00', pressure: 5 },
  { time: '09:00', pressure: 7 },
  { time: '10:00', pressure: 8 },
  { time: '11:00', pressure: 9 },
  { time: '12:00', pressure: 10 },
  { time: '13:00', pressure: 8 },
  { time: '14:00', pressure: 8 },
  { time: '15:00', pressure: 7 },
];

export const avoidanceOutcomes = [
  { outcome: 'Successfully Avoided', value: 60 },
  { outcome: 'Actual Collision', value: 2 },
];

export const collisionData = detectedVsAvoided;

export const _internalCheck = {
  robots: ROBOT_IDS,
  detected: 62,
  avoided: 60,
  sumOutcomes: 60 + 2,
  sumPressure: 5 + 7 + 8 + 9 + 10 + 8 + 8 + 7,
  sumInterventions: 18 + 20 + 17 + 19,
  sumTypesDetected: 38 + 24,
  sumTypesAvoided: 37 + 23,
  sumTypesFailed: 1 + 1,
};