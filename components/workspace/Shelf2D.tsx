'use client';

import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Shelf } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';

export const Shelf2D: React.FC<{ shelf: Shelf }> = ({ shelf }) => {
  const { selectedItemId, setSelectedItem, updateShelf, cellSize, appMode } = useWarehouseStore();
  const isSelected = selectedItemId === shelf.id;
  const builder = appMode === 'BUILDER';

  return (
    <Group
      x={shelf.col * cellSize}
      y={shelf.row * cellSize}
      draggable={builder}
      onDragEnd={(e) => {
        if (!builder) return;
        updateShelf(shelf.id, {
          col: Math.round(e.target.x() / cellSize),
          row: Math.round(e.target.y() / cellSize),
        });
      }}
      onClick={() => setSelectedItem(shelf.id, 'SHELF')}
      onTap={() => setSelectedItem(shelf.id, 'SHELF')}
    >
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={shelf.width * cellSize + 8}
          height={shelf.height * cellSize + 8}
          stroke="#008CC9"
          strokeWidth={2}
          dash={[6, 4]}
        />
      )}
      <Rect
        width={shelf.width * cellSize}
        height={shelf.height * cellSize}
        fill="#D9E1E8"
        stroke={isSelected ? '#008CC9' : '#9AA7B2'}
        strokeWidth={isSelected ? 3 : 1}
      />
      <Text
        text={`SHELF ${shelf.id}`}
        width={shelf.width * cellSize}
        height={shelf.height * cellSize}
        align="center"
        verticalAlign="middle"
        fill="#52606D"
        fontSize={10}
        fontStyle="bold"
      />
    </Group>
  );
};
