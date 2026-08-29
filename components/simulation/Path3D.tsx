'use client';

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';

interface Props {
  robotId: string;
  path: { row: number; col: number }[];
  currentRow: number;
  currentCol: number;
  cellSize: number;
}

// Color palette for different robots
const ROBOT_PATH_COLORS: Record<string, string> = {
  R1: '#0ea5e9', // sky blue
  R2: '#f97316', // orange
  R3: '#a855f7', // purple
  R4: '#22c55e', // green
};

export const Path3D: React.FC<Props> = ({ robotId, path, currentRow, currentCol, cellSize }) => {
  const color = ROBOT_PATH_COLORS[robotId] || '#0ea5e9';

  const points = useMemo(() => {
    const pts: [number, number, number][] = [
      [currentCol * cellSize + cellSize / 2, 1.5, currentRow * cellSize + cellSize / 2],
    ];
    for (const p of path) {
      pts.push([p.col * cellSize + cellSize / 2, 1.5, p.row * cellSize + cellSize / 2]);
    }
    return pts;
  }, [path, currentRow, currentCol, cellSize]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      dashed
      dashScale={8}
      dashSize={3}
      gapSize={2}
    />
  );
};
