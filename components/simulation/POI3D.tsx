'use client';

import React from 'react';
import { PointOfInterest } from '../../types/warehouse';
import { Billboard, Text } from '@react-three/drei';
import { GltfModel, ASSET_URLS } from './GltfModel';
import { BuilderObject3D } from './BuilderObject3D';

interface Props {
  poi: PointOfInterest;
  cellSize: number;
  onOrbitLock?: (locked: boolean) => void;
}

const POI_COLORS: Record<string, string> = {
  PICKUP: '#3b82f6',
  DROP: '#10b981',
  CHARGER: '#eab308',
};

export const POI3D: React.FC<Props> = ({ poi, cellSize, onOrbitLock }) => {
  const color = POI_COLORS[poi.type] || '#888888';

  return (
    <BuilderObject3D
      id={poi.id}
      type="POI"
      row={poi.row}
      col={poi.col}
      width={1}
      height={1}
      cellSize={cellSize}
      posY={poi.posY}
      rotY={poi.rotY}
      scale={poi.scale}
      onOrbitLock={onOrbitLock}
    >
      {poi.type === 'CHARGER' && (
        <GltfModel url={ASSET_URLS.charger} targetSize={cellSize * 2.4} />
      )}
      {poi.type === 'PICKUP' && (
        <GltfModel url={ASSET_URLS.pallet} targetSize={cellSize * 1.4} />
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <circleGeometry args={[cellSize * 0.6, 32]} />
        <meshBasicMaterial color={color} opacity={0.35} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
        <ringGeometry args={[cellSize * 0.55, cellSize * 0.65, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Billboard position={[0, cellSize * 1.8, 0]}>
        <Text fontSize={cellSize * 0.24} color={color} anchorX="center" outlineWidth={cellSize * 0.02} outlineColor="#000">
          {poi.label}
        </Text>
      </Billboard>
    </BuilderObject3D>
  );
};
