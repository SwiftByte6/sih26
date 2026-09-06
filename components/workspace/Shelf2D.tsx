'use client';

import React from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import { Shelf } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSvgImage } from '../../lib/useSvgImage';

export const Shelf2D: React.FC<{ shelf: Shelf }> = ({ shelf }) => {
  const { selectedItemId, setSelectedItem, updateShelf, cellSize, appMode } = useWarehouseStore();
  const shelfImg = useSvgImage('/assets/warehouse/shelf.svg');
  const isSelected = selectedItemId === shelf.id;
  const builder = appMode === 'BUILDER';
  const w = shelf.width * cellSize;
  const h = shelf.height * cellSize;

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
      {shelfImg ? (
        <KonvaImage image={shelfImg} x={w} width={h} height={w} rotation={90} />
      ) : (
        <Rect width={w} height={h} fill="#30363A" stroke="#454C50" strokeWidth={1} cornerRadius={2} />
      )}
      <Text
        text={shelf.id}
        width={w}
        height={h}
        align="center"
        verticalAlign="middle"
        fill="#F1F5F6"
        fontSize={11}
        fontStyle="bold"
        shadowColor="black"
        shadowBlur={3}
      />
    </Group>
  );
};
