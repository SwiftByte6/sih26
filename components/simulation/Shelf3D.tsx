'use client';

import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import { Shelf } from '../../types/warehouse';
import { GltfModel, ASSET_URLS } from './GltfModel';
import { BuilderObject3D } from './BuilderObject3D';

interface Props {
  shelf: Shelf;
  cellSize: number;
  onOrbitLock?: (locked: boolean) => void;
}

export const Shelf3D: React.FC<Props> = ({ shelf, cellSize, onOrbitLock }) => {
  const targetWidth = shelf.width * cellSize;
  const targetDepth = shelf.height * cellSize;
  const url = shelf.id.endsWith('2') || shelf.id.endsWith('5') ? ASSET_URLS.shelfWorn : ASSET_URLS.shelf;

  return (
    <BuilderObject3D
      id={shelf.id}
      type="SHELF"
      row={shelf.row}
      col={shelf.col}
      width={shelf.width}
      height={shelf.height}
      cellSize={cellSize}
      posY={shelf.posY}
      rotY={shelf.rotY}
      rotX={shelf.rotX}
      rotZ={shelf.rotZ}
      scale={shelf.scale}
      onOrbitLock={onOrbitLock}
    >
      <GltfModel url={url} targetSize={Math.max(targetWidth, targetDepth)} extraScale={[shelf.scale?.x ?? 1, shelf.scale?.y ?? 1, shelf.scale?.z ?? 1]} />
      <Billboard position={[0, 28, 0]}>
        <Text fontSize={5} color="#dbeafe" anchorX="center" outlineWidth={0.3} outlineColor="#000">
          {shelf.id}
        </Text>
      </Billboard>
    </BuilderObject3D>
  );
};
