import { Robot, Shelf, Obstacle, Intersection, Path, PointOfInterest } from '../types/warehouse';

export const demoWarehouse = {
  shelves: [
    { id: 'S1', col: 5, row: 5, width: 6, height: 2 },
    { id: 'S2', col: 13, row: 5, width: 6, height: 2 },
    { id: 'S3', col: 21, row: 5, width: 6, height: 2 },
    { id: 'S4', col: 5, row: 15, width: 6, height: 2 },
    { id: 'S5', col: 13, row: 15, width: 6, height: 2 },
    { id: 'S6', col: 21, row: 15, width: 6, height: 2 },
  ] as Shelf[],

  intersections: [
    { id: 'I1', col: 8, row: 11 },
    { id: 'I2', col: 16, row: 11 },
    { id: 'I3', col: 24, row: 11 },
    { id: 'I4', col: 8, row: 21 },
    { id: 'I5', col: 16, row: 21 },
    { id: 'I6', col: 24, row: 21 },
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
    { id: 'O1', col: 15, row: 15, width: 2, height: 2 }
  ] as Obstacle[],

  pois: [
    { id: 'POI1', type: 'PICKUP', col: 8, row: 25, label: 'PICKUP A' },
    { id: 'POI2', type: 'DROP', col: 24, row: 25, label: 'DROP B' },
    { id: 'POI3', type: 'CHARGER', col: 3, row: 11, label: 'CHARGER 1' },
  ] as PointOfInterest[],

  robots: [
    {
      id: 'R1',
      label: 'AMR-01',
      col: 10,
      row: 11,
      state: 'MOVING',
      battery: 78,
      speed: 1.4,
      currentTask: 'PICK-4',
      path: [{ col: 10, row: 11 }, { col: 16, row: 11 }]
    },
    {
      id: 'R2',
      label: 'AMR-02',
      col: 16,
      row: 17,
      state: 'WAITING',
      battery: 45,
      speed: 0,
      currentTask: null,
      path: []
    },
    {
      id: 'R3',
      label: 'AMR-03',
      col: 3,
      row: 11,
      state: 'CHARGING',
      battery: 99,
      speed: 0,
      currentTask: null,
      path: []
    }
  ] as Robot[]
};
