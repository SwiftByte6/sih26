'use client';

import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Pallet } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';

export const Pallet2D: React.FC<{ pallet: Pallet }> = ({ pallet }) => {
  const { selectedItemId, setSelectedItem, updatePallet, cellSize, appMode } = useWarehouseStore();
  const isSelected = selectedItemId === pallet.id;
  const builder = appMode === 'BUILDER';

  return (
    <Group
      x={pallet.col * cellSize}
      y={pallet.row * cellSize}
      draggable={builder}
      onDragEnd={(e) => {
        if (!builder) return;
        updatePallet(pallet.id, {
          col: Math.round(e.target.x() / cellSize),
          row: Math.round(e.target.y() / cellSize),
        });
      }}
      onClick={() => setSelectedItem(pallet.id, 'PALLET')}
      onTap={() => setSelectedItem(pallet.id, 'PALLET')}
    >
      <Rect
        width={pallet.width * cellSize}
        height={pallet.height * cellSize}
        fill="#c4a574"
        stroke={isSelected ? '#008CC9' : '#8a6a3d'}
        strokeWidth={isSelected ? 3 : 1}
      />
      <Text
        text="PALLET"
        width={pallet.width * cellSize}
        height={pallet.height * cellSize}
        align="center"
        verticalAlign="middle"
        fill="#3f2d14"
        fontSize={8}
        fontStyle="bold"
      />
    </Group>
  );
};
