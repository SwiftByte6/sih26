'use client';

import React from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import { Pallet } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSvgImage } from '../../lib/useSvgImage';

export const Pallet2D: React.FC<{ pallet: Pallet }> = ({ pallet }) => {
  const { selectedItemId, setSelectedItem, updatePallet, cellSize, appMode } = useWarehouseStore();
  const palletImg = useSvgImage('/assets/warehouse/pallet.svg');
  const boxImg = useSvgImage('/assets/warehouse/box.svg');
  const isSelected = selectedItemId === pallet.id;
  const builder = appMode === 'BUILDER';
  const w = pallet.width * cellSize;
  const h = pallet.height * cellSize;

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
      {isSelected && (
        <Rect x={-2} y={-2} width={w + 4} height={h + 4} stroke="#42BFE5" strokeWidth={2} dash={[4, 4]} />
      )}
      {palletImg ? (
        <KonvaImage image={palletImg} width={w} height={h} />
      ) : (
        <Rect width={w} height={h} fill="#30363A" stroke="#454C50" strokeWidth={1} />
      )}
      {boxImg && (
        <KonvaImage image={boxImg} x={w * 0.15} y={h * 0.15} width={w * 0.7} height={h * 0.7} />
      )}
    </Group>
  );
};
