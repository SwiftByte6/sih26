import { ROBOT_IDS } from './robots';

export const fleetKpis = {
  totalTasks: 124,
  completedTasks: 96,
  fleetThroughput: 28.8,
  successRate: 94.1,
  activeRobots: 4,
  fleetUtilization: 81.5,
};

export const fleetThroughputOverTime = [
  { time: '08:00', tasks: 21.2 },
  { time: '09:00', tasks: 24.6 },
  { time: '10:00', tasks: 26.8 },
  { time: '11:00', tasks: 29.1 },
  { time: '12:00', tasks: 31.4 },
  { time: '13:00', tasks: 28.7 },
  { time: '14:00', tasks: 30.2 },
  { time: '15:00', tasks: 32.0 },
];

export const tasksCompletedByAMR = [
  { amr: 'AMR-01', tasks: 27 },
  { amr: 'AMR-02', tasks: 24 },
  { amr: 'AMR-03', tasks: 23 },
  { amr: 'AMR-04', tasks: 22 },
];

export const amrThroughputComparison = [
  { amr: 'AMR-01', rate: 8.1 },
  { amr: 'AMR-02', rate: 7.4 },
  { amr: 'AMR-03', rate: 6.9 },
  { amr: 'AMR-04', rate: 6.4 },
];

export const amrUtilization = [
  { amr: 'AMR-01', utilization: 86 },
  { amr: 'AMR-02', utilization: 82 },
  { amr: 'AMR-03', utilization: 79 },
  { amr: 'AMR-04', utilization: 78 },
];

export const taskStatusDistribution = [
  { status: 'Pending', value: 12 },
  { status: 'Assigned', value: 6 },
  { status: 'In Progress', value: 10 },
  { status: 'Completed', value: 96 },
];

export const cumulativeCompletion = [
  { time: '08:00', cumulative: 0 },
  { time: '09:00', cumulative: 11 },
  { time: '10:00', cumulative: 23 },
  { time: '11:00', cumulative: 37 },
  { time: '12:00', cumulative: 52 },
  { time: '13:00', cumulative: 66 },
  { time: '14:00', cumulative: 81 },
  { time: '15:00', cumulative: 96 },
];

export const fleetData = fleetThroughputOverTime;

export const _internalCheck = {
  robots: ROBOT_IDS,
  total: 124,
  completed: 96,
  sumByAMR: 27 + 24 + 23 + 22,
  sumStatus: 12 + 6 + 10 + 96,
};