import { ROBOT_IDS } from './robots';

export const p2pKpis = {
  totalMessages: 8640,
  sent: 4320,
  received: 4320,
  messagesPerSec: 24.0,
  activeNodes: 4,
  avgLatencyMs: 38,
};

export const messageTrafficOverTime = [
  { time: '08:00', messages: 720 },
  { time: '09:00', messages: 860 },
  { time: '10:00', messages: 940 },
  { time: '11:00', messages: 1080 },
  { time: '12:00', messages: 1210 },
  { time: '13:00', messages: 1160 },
  { time: '14:00', messages: 1290 },
  { time: '15:00', messages: 1380 },
];

export const sentVsReceived = [
  { time: '08:00', sent: 360, received: 360 },
  { time: '09:00', sent: 430, received: 430 },
  { time: '10:00', sent: 470, received: 470 },
  { time: '11:00', sent: 540, received: 540 },
  { time: '12:00', sent: 605, received: 605 },
  { time: '13:00', sent: 580, received: 580 },
  { time: '14:00', sent: 645, received: 645 },
  { time: '15:00', sent: 690, received: 690 },
];

export const messageTypeDistribution = [
  { type: 'Heartbeat', value: 2400 },
  { type: 'Task', value: 2050 },
  { type: 'Status', value: 1680 },
  { type: 'Collision', value: 950 },
  { type: 'Coordination', value: 1560 },
];

export const messagesByAMR = [
  { amr: 'AMR-01', messages: 2310 },
  { amr: 'AMR-02', messages: 2180 },
  { amr: 'AMR-03', messages: 2070 },
  { amr: 'AMR-04', messages: 2080 },
];

export const messageRateOverTime = [
  { time: '08:00', rate: 20.0 },
  { time: '09:00', rate: 21.5 },
  { time: '10:00', rate: 23.2 },
  { time: '11:00', rate: 25.1 },
  { time: '12:00', rate: 27.0 },
  { time: '13:00', rate: 25.8 },
  { time: '14:00', rate: 28.1 },
  { time: '15:00', rate: 30.0 },
];

export const communicationMatrix = [
  { from: 'AMR-01', to: 'AMR-01', value: 0 },
  { from: 'AMR-01', to: 'AMR-02', value: 310 },
  { from: 'AMR-01', to: 'AMR-03', value: 280 },
  { from: 'AMR-01', to: 'AMR-04', value: 260 },

  { from: 'AMR-02', to: 'AMR-01', value: 295 },
  { from: 'AMR-02', to: 'AMR-02', value: 0 },
  { from: 'AMR-02', to: 'AMR-03', value: 270 },
  { from: 'AMR-02', to: 'AMR-04', value: 255 },

  { from: 'AMR-03', to: 'AMR-01', value: 275 },
  { from: 'AMR-03', to: 'AMR-02', value: 265 },
  { from: 'AMR-03', to: 'AMR-03', value: 0 },
  { from: 'AMR-03', to: 'AMR-04', value: 290 },

  { from: 'AMR-04', to: 'AMR-01', value: 250 },
  { from: 'AMR-04', to: 'AMR-02', value: 260 },
  { from: 'AMR-04', to: 'AMR-03', value: 285 },
  { from: 'AMR-04', to: 'AMR-04', value: 0 },
];

export const p2pData = messageTrafficOverTime;

export const _internalCheck = {
  robots: ROBOT_IDS,
  sumByAMR: 2310 + 2180 + 2070 + 2080,
  sumTypes: 2400 + 2050 + 1680 + 950 + 1560,
  sent: 4320,
  received: 4320,
};