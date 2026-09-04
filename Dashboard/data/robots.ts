export const ROBOT_IDS = ['AMR-01', 'AMR-02', 'AMR-03', 'AMR-04'] as const;

export type RobotId = (typeof ROBOT_IDS)[number];

export const robots = ROBOT_IDS.map((id) => ({
  id,
  label: id,
}));

export const TOTAL_ROBOTS = ROBOT_IDS.length;