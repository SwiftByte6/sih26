'use client';

import React from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import { Robot } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';

interface AmrRobotProps {
  robot: Robot;
}

export const AmrRobot: React.FC<AmrRobotProps> = ({ robot }) => {
  const { selectedItemId, setSelectedItem, cellSize, activeCommLinks, appMode, updateRobot } = useWarehouseStore();
  const isSelected = selectedItemId === robot.id;
  const isCommunicating = activeCommLinks.some(l => l.from === robot.id);
  const builder = appMode === 'BUILDER';
  
  // Calculate position
  const x = robot.col * cellSize;
  const y = robot.row * cellSize;
  
  const handleSelect = () => {
    setSelectedItem(robot.id, 'ROBOT');
  };

  // Determine status color
  const statusColor = robot.state === 'MOVING' ? '#008CC9' : 
                     robot.state === 'WAITING' ? '#D99A00' : 
                     robot.state === 'CHARGING' ? '#2E8B57' : 
                     robot.state === 'ERROR' ? '#C83E3E' : '#9AA7B2';

  // Rotation: If the robot has a path, make it face the next point. Otherwise default 0 (facing right or top)
  let rotation = 0;
  if (robot.path && robot.path.length > 0) {
    const nextPoint = robot.path[0];
    const dx = nextPoint.col - robot.col;
    const dy = nextPoint.row - robot.row;
    rotation = Math.atan2(dy, dx) * (180 / Math.PI);
  } else {
     // Default orientation (facing 'up' visually in this example)
     rotation = -90; 
  }

  return (
    <Group 
      x={x} 
      y={y}
      draggable={builder}
      onDragEnd={(e) => {
        if (!builder) return;
        updateRobot(robot.id, {
          col: Math.round(e.target.x() / cellSize),
          row: Math.round(e.target.y() / cellSize),
        });
      }}
      onClick={handleSelect}
      onTap={handleSelect}
    >
      {/* Sensor / Safety Radius */}
      <Circle 
        radius={cellSize * 1.8} 
        fill={statusColor} 
        opacity={isSelected ? 0.15 : 0.05} 
        stroke={statusColor}
        strokeWidth={1}
        dash={[4, 4]}
      />

      <Group rotation={rotation}>
        {/* Robot Body */}
        <Rect
          x={-cellSize * 0.7}
          y={-cellSize * 0.7}
          width={cellSize * 1.4}
          height={cellSize * 1.4}
          fill="#17212B"
          cornerRadius={4}
          shadowColor="black"
          shadowBlur={isSelected ? 6 : 2}
          shadowOpacity={0.3}
        />
        
        {/* Selection Highlight */}
        {isSelected && (
          <Rect
            x={-cellSize * 0.8}
            y={-cellSize * 0.8}
            width={cellSize * 1.6}
            height={cellSize * 1.6}
            stroke="#008CC9"
            strokeWidth={2}
            cornerRadius={6}
          />
        )}

        {/* Left Wheel */}
        <Rect
          x={-cellSize * 0.4}
          y={-cellSize * 0.8}
          width={cellSize * 0.8}
          height={cellSize * 0.2}
          fill="#52606D"
          cornerRadius={2}
        />
        
        {/* Right Wheel */}
        <Rect
          x={-cellSize * 0.4}
          y={cellSize * 0.6}
          width={cellSize * 0.8}
          height={cellSize * 0.2}
          fill="#52606D"
          cornerRadius={2}
        />

        {/* Front Direction Indicator (Arrow pointing Right in local coordinate system) */}
        <Line 
          points={[
            cellSize * 0.2, -cellSize * 0.3,
            cellSize * 0.5, 0,
            cellSize * 0.2, cellSize * 0.3
          ]} 
          stroke="white" 
          strokeWidth={2} 
          lineJoin="round" 
        />
        
        {/* Status Indicator LED */}
        <Circle 
          x={-cellSize * 0.3} 
          y={0} 
          radius={3} 
          fill={statusColor} 
          shadowColor={statusColor}
          shadowBlur={4}
        />
      </Group>

      {/* ID Label (Stays unrotated for readability) */}
      <Text
        text={robot.id}
        x={-cellSize}
        y={cellSize * 0.9}
        width={cellSize * 2}
        align="center"
        fill="#17212B"
        fontSize={10}
        fontStyle="bold"
      />
      
      {/* Status Label */}
      <Text
        text={robot.state}
        x={-cellSize}
        y={cellSize * 0.9 + 12}
        width={cellSize * 2}
        align="center"
        fill={statusColor}
        fontSize={8}
        fontStyle="bold"
      />
      
      {/* Communication Indicator ))) */}
      {isCommunicating && (
        <>
          <Circle
            radius={cellSize * 1.2}
            stroke={statusColor}
            strokeWidth={1}
            opacity={0.4}
          />
          <Circle
            radius={cellSize * 1.5}
            stroke={statusColor}
            strokeWidth={1}
            opacity={0.25}
          />
          <Circle
            radius={cellSize * 1.8}
            stroke={statusColor}
            strokeWidth={1}
            opacity={0.1}
          />
        </>
      )}

      {/* Path projection */}
      {robot.path && robot.path.length > 0 && (
        <Line
          points={[0, 0, ...robot.path.flatMap(p => [(p.col - robot.col) * cellSize, (p.row - robot.row) * cellSize])]}
          stroke="#008CC9"
          strokeWidth={2}
          opacity={0.6}
          dash={[4, 2]}
        />
      )}
    </Group>
  );
};
