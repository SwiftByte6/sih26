import { ROBOT_IDS } from './robots';

export const latencyKpis = {
  average: 8.4,
  median: 7.2,
  minimum: 2.1,
  maximum: 31.4,
};

export const latencyOverTime = [
  { time: '08:00', latency: 6.2 },
  { time: '09:00', latency: 7.1 },
  { time: '10:00', latency: 8.3 },
  { time: '11:00', latency: 7.8 },
  { time: '12:00', latency: 9.4 },
  { time: '13:00', latency: 10.1 },
  { time: '14:00', latency: 8.7 },
  { time: '15:00', latency: 7.6 },
];

export const latencyDistribution = [
  { bucket: '0–5 sec', count: 18 },
  { bucket: '5–10 sec', count: 51 },
  { bucket: '10–15 sec', count: 17 },
  { bucket: '15–20 sec', count: 6 },
  { bucket: '20–25 sec', count: 2 },
  { bucket: '25+ sec', count: 2 },
];

export const avgLatencyByAMR = [
  { amr: 'AMR-01', latency: 7.6 },
  { amr: 'AMR-02', latency: 8.1 },
  { amr: 'AMR-03', latency: 8.7 },
  { amr: 'AMR-04', latency: 9.2 },
];

export const latencyByTaskType = [
  { type: 'Deliver Item', latency: 7.4 },
  { type: 'Restock Shelf', latency: 9.1 },
  { type: 'Take to Packing', latency: 8.2 },
  { type: 'Store Item', latency: 9.0 },
];

export const latencyByPriority = [
  { priority: 'URGENT', latency: 7.1 },
  { priority: 'NORMAL', latency: 8.2 },
  { priority: 'LOW', latency: 9.4 },
];

export const slowestTasks = [
  { taskId: 'TASK-047', latency: 31.4 },
  { taskId: 'TASK-082', latency: 27.8 },
  { taskId: 'TASK-019', latency: 25.6 },
  { taskId: 'TASK-105', latency: 23.9 },
  { taskId: 'TASK-031', latency: 22.7 },
];

export const latencyData = latencyOverTime;

export const _internalCheck = {
  robots: ROBOT_IDS,
  histogramTotal: 18 + 51 + 17 + 6 + 2 + 2,
};