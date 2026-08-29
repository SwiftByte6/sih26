'use client';

import React from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group } from 'react-konva';
import { useWarehouseStore } from '../../store/warehouseStore';
import { Obstacle } from './Obstacle';
import { AmrRobot } from './AmrRobot';

export const WarehouseMap: React.FC = () => {
  const { shelves, paths, pois, robots, obstacles, intersections, selectedItemId, setSelectedItem, scale, pan, showGrid, gridRows, gridCols, cellSize, activeCommLinks } = useWarehouseStore();

  const handleSelect = (id: string, type: any) => {
    setSelectedItem(id, type);
  };

  // Pre-calculate grid lines
  const gridLines = [];
  if (showGrid) {
    // Vertical lines
    for (let i = 0; i <= gridCols; i++) {
      gridLines.push(
        <Line
          key={`v-${i}`}
          points={[i * cellSize, 0, i * cellSize, gridRows * cellSize]}
          stroke="#AEB0AD"
          strokeWidth={1}
        />
      );
    }
    // Horizontal lines
    for (let i = 0; i <= gridRows; i++) {
      gridLines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * cellSize, gridCols * cellSize, i * cellSize]}
          stroke="#AEB0AD"
          strokeWidth={1}
        />
      );
    }
  }

  return (
    <Stage 
      width={800} 
      height={600} 
      style={{ background: 'transparent' }}
      scale={{ x: scale, y: scale }}
      x={pan.x}
      y={pan.y}
      onClick={(e) => {
        // Deselect if clicking on empty space
        if (e.target === e.target.getStage()) {
          setSelectedItem(null, null);
        }
      }}
    >
      <Layer>
        {/* Grid Background */}
        {showGrid && (
          <Rect
            x={0}
            y={0}
            width={gridCols * cellSize}
            height={gridRows * cellSize}
            fill="#CCCDCA"
          />
        )}
        
        {/* Grid Lines */}
        {showGrid && gridLines}
        {/* Paths */}
        {paths.map(path => {
          const start = intersections.find(i => i.id === path.startId);
          const end = intersections.find(i => i.id === path.endId);
          if (!start || !end) return null;
          return (
            <Line
              key={path.id}
              points={[start.col * cellSize, start.row * cellSize, end.col * cellSize, end.row * cellSize]}
              stroke="#2878C8"
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.5}
            />
          );
        })}

        {/* Intersections */}
        {intersections.map(intersection => (
          <Circle
            key={intersection.id}
            x={intersection.col * cellSize}
            y={intersection.row * cellSize}
            radius={4}
            fill="#9AA7B2"
          />
        ))}

        {/* Shelves */}
        {shelves.map(shelf => (
          <Group key={shelf.id} x={shelf.col * cellSize} y={shelf.row * cellSize}>
            <Rect
              width={shelf.width * cellSize}
              height={shelf.height * cellSize}
              fill="#D9E1E8"
              stroke="#9AA7B2"
              strokeWidth={1}
            />
            <Text
              text="SHELF"
              width={shelf.width * cellSize}
              height={shelf.height * cellSize}
              align="center"
              verticalAlign="middle"
              fill="#52606D"
              fontSize={10}
              fontStyle="bold"
            />
          </Group>
        ))}

        {/* Obstacles */}
        {obstacles.map(obstacle => (
          <Obstacle key={obstacle.id} obstacle={obstacle} />
        ))}

        {/* POIs */}
        {pois.map(poi => (
          <Group key={poi.id} x={poi.col * cellSize} y={poi.row * cellSize}>
            <Circle radius={12} fill={poi.type === 'PICKUP' ? '#008CC9' : poi.type === 'DROP' ? '#2E8B57' : '#D99A00'} />
            <Text
              text={poi.type === 'PICKUP' ? 'P' : poi.type === 'DROP' ? 'D' : '⚡'}
              x={-12}
              y={-6}
              width={24}
              align="center"
              fill="white"
              fontSize={12}
              fontStyle="bold"
            />
            <Text
              text={poi.label}
              x={-30}
              y={16}
              width={60}
              align="center"
              fill="#17212B"
              fontSize={9}
              fontStyle="bold"
            />
          </Group>
        ))}

        {/* Robots */}
        {robots.map(robot => (
          <AmrRobot key={robot.id} robot={robot} />
        ))}

        {/* Communication Links - temporary visual lines between communicating robots */}
        {activeCommLinks.filter(l => l.to !== 'ALL' && l.to !== 'SYSTEM').map(link => {
          const fromRobot = robots.find(r => r.id === link.from);
          const toRobot = robots.find(r => r.id === link.to);
          if (!fromRobot || !toRobot) return null;
          return (
            <Line
              key={`${link.from}-${link.to}-${link.expires}`}
              points={[
                fromRobot.col * cellSize,
                fromRobot.row * cellSize,
                toRobot.col * cellSize,
                toRobot.row * cellSize
              ]}
              stroke="#008CC9"
              strokeWidth={1.5}
              opacity={0.5}
              dash={[6, 4]}
            />
          );
        })}
      </Layer>
    </Stage>
  );
};
