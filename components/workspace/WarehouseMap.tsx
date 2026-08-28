'use client';

import React from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group } from 'react-konva';
import { useWarehouseStore } from '../../store/warehouseStore';
import { Obstacle } from './Obstacle';

export const WarehouseMap: React.FC = () => {
  const { shelves, paths, pois, robots, obstacles, intersections, selectedItemId, setSelectedItem, scale, pan } = useWarehouseStore();

  const handleSelect = (id: string, type: any) => {
    setSelectedItem(id, type);
  };

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
        {/* Paths */}
        {paths.map(path => {
          const start = intersections.find(i => i.id === path.startId);
          const end = intersections.find(i => i.id === path.endId);
          if (!start || !end) return null;
          return (
            <Line
              key={path.id}
              points={[start.x, start.y, end.x, end.y]}
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
            x={intersection.x}
            y={intersection.y}
            radius={4}
            fill="#9AA7B2"
          />
        ))}

        {/* Shelves */}
        {shelves.map(shelf => (
          <Group key={shelf.id} x={shelf.x} y={shelf.y}>
            <Rect
              width={shelf.width}
              height={shelf.height}
              fill="#D9E1E8"
              stroke="#9AA7B2"
              strokeWidth={1}
            />
            <Text
              text="SHELF"
              width={shelf.width}
              height={shelf.height}
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
          <Group key={poi.id} x={poi.x} y={poi.y}>
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
        {robots.map(robot => {
          const isSelected = selectedItemId === robot.id;
          return (
            <Group 
              key={robot.id} 
              x={robot.x} 
              y={robot.y}
              onClick={() => handleSelect(robot.id, 'ROBOT')}
              onTap={() => handleSelect(robot.id, 'ROBOT')}
            >
              {/* Path projection */}
              {robot.path.length > 0 && (
                <Line
                  points={[0, 0, ...robot.path.flatMap(p => [p.x - robot.x, p.y - robot.y])]}
                  stroke="#008CC9"
                  strokeWidth={2}
                  opacity={0.6}
                />
              )}
              <Rect
                x={-15}
                y={-15}
                width={30}
                height={30}
                fill={isSelected ? '#008CC9' : '#17212B'}
                cornerRadius={4}
                shadowColor="black"
                shadowBlur={isSelected ? 4 : 2}
                shadowOpacity={0.2}
              />
              <Circle x={0} y={-15} radius={4} fill={isSelected ? '#008CC9' : '#17212B'} />
              <Text
                text={robot.id}
                x={-15}
                y={-5}
                width={30}
                align="center"
                fill="white"
                fontSize={10}
                fontStyle="bold"
              />
              <Text
                text={robot.label}
                x={-30}
                y={18}
                width={60}
                align="center"
                fill="#17212B"
                fontSize={9}
                fontStyle="bold"
              />
              <Text
                text={robot.state}
                x={-30}
                y={28}
                width={60}
                align="center"
                fill={robot.state === 'MOVING' ? '#008CC9' : robot.state === 'WAITING' ? '#D99A00' : '#2E8B57'}
                fontSize={8}
                fontStyle="bold"
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
};
