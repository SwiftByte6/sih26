'use client';

import React from 'react';
import { Group, Circle, Text, Image as KonvaImage } from 'react-konva';
import { PointOfInterest } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSvgImage } from '../../lib/useSvgImage';

export const Poi2D: React.FC<{ poi: PointOfInterest }> = ({ poi }) => {
  const { selectedItemId, setSelectedItem, updatePoi, cellSize, appMode, chargers } = useWarehouseStore();
  const pickupImg = useSvgImage('/assets/warehouse/pickup.svg');
  const dropImg = useSvgImage('/assets/warehouse/drop.svg');

  const isSelected = selectedItemId === poi.id;
  const builder = appMode === 'BUILDER';
  const isPickup = poi.type === 'PICKUP';
  const isDrop = poi.type === 'DROP';
  const isCharger = poi.type === 'CHARGER';

  const chargerInfo = isCharger ? chargers.find((c) => c.id === poi.id) : null;
  const chargerState = chargerInfo?.state || 'AVAILABLE';

  const chargerColor = chargerState === 'AVAILABLE' ? '#4CCB8A' : chargerState === 'RESERVED' ? '#E5B84B' : '#42BFE5';
  const fill = isPickup ? '#42BFE5' : isDrop ? '#4CCB8A' : chargerColor;

  const svgImage = isPickup ? pickupImg : isDrop ? dropImg : null;
  const iconSize = cellSize * 1.6;

  return (
    <Group
      x={poi.col * cellSize + cellSize / 2}
      y={poi.row * cellSize + cellSize / 2}
      draggable={builder}
      onDragEnd={(e) => {
        if (!builder) return;
        updatePoi(poi.id, {
          col: Math.round((e.target.x() - cellSize / 2) / cellSize),
          row: Math.round((e.target.y() - cellSize / 2) / cellSize),
        });
      }}
      onClick={() => setSelectedItem(poi.id, 'POI')}
      onTap={() => setSelectedItem(poi.id, 'POI')}
    >
      {/* Outer Selection Highlight Ring */}
      {isSelected && (
        <Circle radius={iconSize * 0.65} stroke="#42BFE5" strokeWidth={2} dash={[4, 3]} />
      )}

      {/* Charger Glow Ring */}
      {isCharger && (
        <Circle radius={iconSize * 0.55} fill={chargerColor} opacity={chargerState === 'OCCUPIED' ? 0.4 : 0.2} />
      )}

      {/* Render Dedicated Pickup or Drop SVG Asset */}
      {svgImage ? (
        <KonvaImage
          image={svgImage}
          x={-iconSize / 2}
          y={-iconSize / 2}
          width={iconSize}
          height={iconSize}
        />
      ) : (
        <>
          <Circle radius={14} fill={fill} opacity={0.25} />
          <Circle radius={10} fill={fill} />
          <Text
            text={isPickup ? 'P' : isDrop ? 'D' : '⚡'}
            x={-10}
            y={-5}
            width={20}
            align="center"
            fill="#11171A"
            fontSize={11}
            fontStyle="bold"
          />
        </>
      )}

      {/* Station Label */}
      <Text
        text={isCharger ? `${poi.label} (${chargerState[0]})` : poi.label}
        x={-40}
        y={iconSize * 0.5 + 2}
        width={80}
        align="center"
        fill="#F1F5F6"
        fontSize={9}
        fontStyle="bold"
        shadowColor="black"
        shadowBlur={3}
      />
    </Group>
  );
};
