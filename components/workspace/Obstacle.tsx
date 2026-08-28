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
    // Snap to 20px grid
    let newX = Math.round(e.target.x() / 20) * 20;
    let newY = Math.round(e.target.y() / 20) * 20;
    
    // Update position in store
    updateObstacle(obstacle.id, { x: newX, y: newY });
  };

  return (
    <Group 
      x={obstacle.x} 
      y={obstacle.y}
      draggable
      onDragEnd={handleDragEnd}
      onClick={() => setSelectedItem(obstacle.id, 'OBSTACLE')}
      onTap={() => setSelectedItem(obstacle.id, 'OBSTACLE')}
    >
      <Rect
        width={obstacle.width}
        height={obstacle.height}
        fill="#fdf5f5"
        stroke={isSelected ? "#008CC9" : "#C83E3E"}
        strokeWidth={isSelected ? 3 : 2}
        dash={isSelected ? [] : [4, 2]}
      />
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={obstacle.width + 8}
          height={obstacle.height + 8}
          stroke="#008CC9"
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}
      <Text
        text="!"
        width={obstacle.width}
        height={obstacle.height}
        align="center"
        verticalAlign="middle"
        fill="#C83E3E"
        fontSize={20}
        fontStyle="bold"
      />
      <Text
        text="OBSTACLE"
        y={obstacle.height + 4}
        width={obstacle.width}
        align="center"
        fill="#C83E3E"
        fontSize={8}
        fontStyle="bold"
      />
    </Group>
  );
};
