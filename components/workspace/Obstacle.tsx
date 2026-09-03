'use client';

import React from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import { Obstacle as ObstacleType } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSvgImage } from '../../lib/useSvgImage';

interface ObstacleProps {
  obstacle: ObstacleType;
}

export const Obstacle: React.FC<ObstacleProps> = ({ obstacle }) => {
  const { updateObstacle, selectedItemId, setSelectedItem, appMode, cellSize } = useWarehouseStore();
  const obstacleImg = useSvgImage('/assets/warehouse/obstacle.svg');
  const isSelected = selectedItemId === obstacle.id;
  const builder = appMode === 'BUILDER';
  const w = obstacle.width * cellSize;
  const h = obstacle.height * cellSize;

  return (
    <Group 
      x={obstacle.col * cellSize} 
      y={obstacle.row * cellSize}
      draggable={builder}
      onDragEnd={(e: any) => {
        if (!builder) return;
        let newCol = Math.round(e.target.x() / cellSize);
        let newRow = Math.round(e.target.y() / cellSize);
        updateObstacle(obstacle.id, { col: newCol, row: newRow });
      }}
      onClick={() => setSelectedItem(obstacle.id, 'OBSTACLE')}
      onTap={() => setSelectedItem(obstacle.id, 'OBSTACLE')}
    >
      {isSelected && (
        <Rect
          x={-3}
          y={-3}
          width={w + 6}
          height={h + 6}
          stroke="#42BFE5"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={2}
        />
      )}
      {obstacleImg ? (
        <KonvaImage image={obstacleImg} width={w} height={h} />
      ) : (
        <Rect
          width={w}
          height={h}
          fill="#20282C"
          stroke="#E45C5C"
          strokeWidth={1.5}
        />
      )}
      <Text
        text={obstacle.id}
        y={h + 2}
        width={w}
        align="center"
        fill="#E5B84B"
        fontSize={9}
        fontStyle="bold"
      />
    </Group>
  );
};
