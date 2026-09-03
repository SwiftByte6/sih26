'use client';

import React from 'react';
import { Group, Circle, Line, Text, Image as KonvaImage } from 'react-konva';
import { Robot } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSvgImage } from '../../lib/useSvgImage';

interface AmrRobotProps {
  robot: Robot;
}

export const AmrRobot: React.FC<AmrRobotProps> = ({ robot }) => {
  const { selectedItemId, setSelectedItem, cellSize, activeCommLinks, appMode, updateRobot } = useWarehouseStore();
  const robotImg = useSvgImage('/assets/warehouse/robot.svg');
  const isSelected = selectedItemId === robot.id;
  const isCommunicating = activeCommLinks.some(l => l.from === robot.id);
  const builder = appMode === 'BUILDER';
  
  // Calculate position
  const x = robot.col * cellSize + cellSize / 2;
  const y = robot.row * cellSize + cellSize / 2;
  const size = cellSize * 1.5;
  
  const handleSelect = () => {
    setSelectedItem(robot.id, 'ROBOT');
  };

  // Determine status color per specs
  const statusColor = 
    robot.state === 'MOVING' ? '#42BFE5' : 
    robot.state === 'WAITING' ? '#E5B84B' : 
    robot.state === 'CHARGING' ? '#2E8B57' : 
    robot.state === 'ERROR' ? '#E45C5C' : '#AAB4B8';

  // Rotation: Calculate rotation from travel path direction
  let rotation = 0;
  if (robot.path && robot.path.length > 0) {
    const nextPoint = robot.path[0];
    const dx = nextPoint.col - robot.col;
    const dy = nextPoint.row - robot.row;
    rotation = Math.atan2(dy, dx) * (180 / Math.PI);
  } else {
    rotation = 0; 
  }

  return (
    <Group 
      x={x} 
      y={y}
      draggable={builder}
      onDragEnd={(e) => {
        if (!builder) return;
        updateRobot(robot.id, {
          col: Math.round((e.target.x() - cellSize / 2) / cellSize),
          row: Math.round((e.target.y() - cellSize / 2) / cellSize),
        });
      }}
      onClick={handleSelect}
      onTap={handleSelect}
    >
      {/* Sensor / Safety Radius */}
      <Circle 
        radius={cellSize * 1.6} 
        fill={statusColor} 
        opacity={isSelected ? 0.2 : 0.06} 
        stroke={statusColor}
        strokeWidth={1}
        dash={[4, 4]}
      />

      {/* Robot SVG Model Centered & Rotated */}
      <Group rotation={rotation}>
        {robotImg ? (
          <KonvaImage
            image={robotImg}
            x={-size / 2}
            y={-size / 2}
            width={size}
            height={size}
          />
        ) : (
          <Circle radius={size * 0.4} fill="#20282C" stroke={statusColor} strokeWidth={2} />
        )}
        
        {/* Status Indicator LED */}
        <Circle 
          x={size * 0.3} 
          y={0} 
          radius={4} 
          fill={statusColor} 
          shadowColor={statusColor}
          shadowBlur={6}
        />
      </Group>

      {/* Selection Ring Overlay */}
      {isSelected && (
        <Circle
          radius={size * 0.75}
          stroke="#42BFE5"
          strokeWidth={1.5}
          dash={[5, 3]}
        />
      )}

      {/* Robot ID Label */}
      <Text
        text={robot.id}
        x={-cellSize}
        y={size * 0.5 + 2}
        width={cellSize * 2}
        align="center"
        fill="#F1F5F6"
        fontSize={11}
        fontStyle="bold"
        opacity={isSelected ? 1 : 0.85}
      />
      
      {/* Robot Status Label */}
      <Text
        text={`● ${robot.state}`}
        x={-cellSize}
        y={size * 0.5 + 16}
        width={cellSize * 2}
        align="center"
        fill={statusColor}
        fontSize={9}
        fontStyle="bold"
        opacity={isSelected ? 1 : 0.75}
      />
      
      {/* Communication Link Ripples */}
      {isCommunicating && (
        <>
          <Circle radius={cellSize * 1.2} stroke={statusColor} strokeWidth={1} opacity={0.4} />
          <Circle radius={cellSize * 1.5} stroke={statusColor} strokeWidth={1} opacity={0.25} />
          <Circle radius={cellSize * 1.8} stroke={statusColor} strokeWidth={1} opacity={0.1} />
        </>
      )}

      {/* Active Route Projection Line */}
      {robot.path && robot.path.length > 0 && (
        <Line
          points={[0, 0, ...robot.path.flatMap(p => [(p.col - robot.col) * cellSize, (p.row - robot.row) * cellSize])]}
          stroke={isSelected ? "#42BFE5" : "#454C50"}
          strokeWidth={isSelected ? 2.5 : 1.5}
          opacity={isSelected ? 0.9 : 0.5}
          dash={isSelected ? [6, 3] : [4, 4]}
          lineCap="round"
          lineJoin="round"
        />
      )}
    </Group>
  );
};
