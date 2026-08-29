'use client';

import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Obstacle as ObstacleType } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';

interface ObstacleProps {
  obstacle: ObstacleType;
}

export const Obstacle: React.FC<ObstacleProps> = ({ obstacle }) => {
  const { updateObstacle, selectedItemId, setSelectedItem } = useWarehouseStore();
  const isSelected = selectedItemId === obstacle.id;

  const handleDragEnd = (e: any) => {
    const { cellSize } = useWarehouseStore.getState();
    // Snap to grid cells
    let newCol = Math.round(e.target.x() / cellSize);
    let newRow = Math.round(e.target.y() / cellSize);
    
    // Update position in store
    updateObstacle(obstacle.id, { col: newCol, row: newRow });
  };

  const { cellSize } = useWarehouseStore();

  return (
    <Group 
      x={obstacle.col * cellSize} 
      y={obstacle.row * cellSize}
      draggable
      onDragEnd={handleDragEnd}
      onClick={() => setSelectedItem(obstacle.id, 'OBSTACLE')}
      onTap={() => setSelectedItem(obstacle.id, 'OBSTACLE')}
    >
      <Rect
        width={obstacle.width * cellSize}
        height={obstacle.height * cellSize}
        fill="#fdf5f5"
        stroke={isSelected ? "#008CC9" : "#C83E3E"}
        strokeWidth={isSelected ? 3 : 2}
        dash={isSelected ? [] : [4, 2]}
      />
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={(obstacle.width * cellSize) + 8}
          height={(obstacle.height * cellSize) + 8}
          stroke="#008CC9"
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}
      <Text
        text="!"
        width={obstacle.width * cellSize}
        height={obstacle.height * cellSize}
        align="center"
        verticalAlign="middle"
        fill="#C83E3E"
        fontSize={20}
        fontStyle="bold"
      />
      <Text
        text="OBSTACLE"
        y={(obstacle.height * cellSize) + 4}
        width={obstacle.width * cellSize}
        align="center"
        fill="#C83E3E"
        fontSize={8}
        fontStyle="bold"
      />
    </Group>
  );
};
