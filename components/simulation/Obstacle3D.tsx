'use client';

import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import { Obstacle } from '../../types/warehouse';
import { GltfModel, ASSET_URLS } from './GltfModel';
import { BuilderObject3D } from './BuilderObject3D';

interface Props {
  obstacle: Obstacle;
  cellSize: number;
  onOrbitLock?: (locked: boolean) => void;
}

const OBSTACLE_ASSETS = [ASSET_URLS.oilDrums, ASSET_URLS.palletBarrels, ASSET_URLS.concreteBags];

export const Obstacle3D: React.FC<Props> = ({ obstacle, cellSize, onOrbitLock }) => {
  const width = obstacle.width * cellSize;
  const depth = obstacle.height * cellSize;
  let url = obstacle.assetUrl;
  if (!url) {
    const idx = Math.abs(obstacle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % OBSTACLE_ASSETS.length;
    url = OBSTACLE_ASSETS[idx];
  }

  const isMachine = url?.includes('machine') || url?.includes('laser') || url?.includes('industrial');
  const labelColor = isMachine ? '#0ea5e9' : '#ff4444';
  const labelText = isMachine ? `${obstacle.id} [SYSTEM]` : obstacle.id;

  return (
    <BuilderObject3D
      id={obstacle.id}
      type="OBSTACLE"
      row={obstacle.row}
      col={obstacle.col}
      width={obstacle.width}
      height={obstacle.height}
      cellSize={cellSize}
      posY={obstacle.posY}
      rotY={obstacle.rotY}
      rotX={obstacle.rotX}
      rotZ={obstacle.rotZ}
      scale={obstacle.scale}
      onOrbitLock={onOrbitLock}
    >
      <GltfModel url={url} targetSize={Math.max(width, depth)} extraScale={[obstacle.scale?.x ?? 1, obstacle.scale?.y ?? 1, obstacle.scale?.z ?? 1]} />
      <Billboard position={[0, Math.max(width, depth) * 0.7, 0]}>
        <Text fontSize={4.5} color={labelColor} anchorX="center" outlineWidth={0.3} outlineColor="#000000">
          {labelText}
        </Text>
      </Billboard>
    </BuilderObject3D>
  );
};
