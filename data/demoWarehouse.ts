import { Robot, Shelf, Obstacle, Intersection, Path, PointOfInterest } from '../types/warehouse';

export const demoWarehouse = {
  shelves: [
    { id: 'S1', x: 100, y: 100, width: 120, height: 40 },
    { id: 'S2', x: 260, y: 100, width: 120, height: 40 },
    { id: 'S3', x: 420, y: 100, width: 120, height: 40 },
    { id: 'S4', x: 100, y: 300, width: 120, height: 40 },
    { id: 'S5', x: 260, y: 300, width: 120, height: 40 },
    { id: 'S6', x: 420, y: 300, width: 120, height: 40 },
  ] as Shelf[],

  intersections: [
    { id: 'I1', x: 160, y: 220 },
    { id: 'I2', x: 320, y: 220 },
    { id: 'I3', x: 480, y: 220 },
    { id: 'I4', x: 160, y: 420 },
    { id: 'I5', x: 320, y: 420 },
    { id: 'I6', x: 480, y: 420 },
  ] as Intersection[],

  paths: [
    { id: 'P1', startId: 'I1', endId: 'I2' },
    { id: 'P2', startId: 'I2', endId: 'I3' },
    { id: 'P3', startId: 'I4', endId: 'I5' },
    { id: 'P4', startId: 'I5', endId: 'I6' },
    { id: 'P5', startId: 'I1', endId: 'I4' },
    { id: 'P6', startId: 'I2', endId: 'I5' },
    { id: 'P7', startId: 'I3', endId: 'I6' },
  ] as Path[],

  obstacles: [
    { id: 'O1', x: 300, y: 310, width: 40, height: 40 }
  ] as Obstacle[],

  pois: [
    { id: 'POI1', type: 'PICKUP', x: 160, y: 500, label: 'PICKUP A' },
    { id: 'POI2', type: 'DROP', x: 480, y: 500, label: 'DROP B' },
    { id: 'POI3', type: 'CHARGER', x: 60, y: 220, label: 'CHARGER 1' },
  ] as PointOfInterest[],

  robots: [
    {
      id: 'R1',
      label: 'AMR-01',
      x: 200,
      y: 220,
      state: 'MOVING',
      battery: 78,
      speed: 1.4,
      currentTask: 'PICK-4',
      path: [{ x: 200, y: 220 }, { x: 320, y: 220 }]
    },
    {
      id: 'R2',
      label: 'AMR-02',
      x: 320,
      y: 350,
      state: 'WAITING',
      battery: 45,
      speed: 0,
      currentTask: null,
      path: []
    },
    {
      id: 'R3',
      label: 'AMR-03',
      x: 60,
      y: 220,
      state: 'CHARGING',
      battery: 99,
      speed: 0,
      currentTask: null,
      path: []
    }
  ] as Robot[]
};
