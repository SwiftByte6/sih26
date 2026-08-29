'use client';

import React from 'react';
import { Group, Circle, Text } from 'react-konva';
import { PointOfInterest } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';

export const Poi2D: React.FC<{ poi: PointOfInterest }> = ({ poi }) => {
  const { selectedItemId, setSelectedItem, updatePoi, cellSize, appMode } = useWarehouseStore();
  const isSelected = selectedItemId === poi.id;
  const builder = appMode === 'BUILDER';
  const fill = poi.type === 'PICKUP' ? '#008CC9' : poi.type === 'DROP' ? '#2E8B57' : '#D99A00';

  return (
    <Group
      x={poi.col * cellSize}
      y={poi.row * cellSize}
      draggable={builder}
      onDragEnd={(e) => {
        if (!builder) return;
        updatePoi(poi.id, {
          col: Math.round(e.target.x() / cellSize),
          row: Math.round(e.target.y() / cellSize),
        });
      }}
      onClick={() => setSelectedItem(poi.id, 'POI')}
      onTap={() => setSelectedItem(poi.id, 'POI')}
    >
      {isSelected && (
        <Circle radius={18} stroke="#008CC9" strokeWidth={2} dash={[4, 3]} />
      )}
      <Circle radius={12} fill={fill} />
      <Text
        text={poi.type === 'PICKUP' ? 'P' : poi.type === 'DROP' ? 'D' : 'C'}
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
        x={-36}
        y={16}
        width={72}
        align="center"
        fill="#17212B"
        fontSize={9}
        fontStyle="bold"
      />
    </Group>
  );
};
