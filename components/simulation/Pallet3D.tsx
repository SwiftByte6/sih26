'use client';

import React from 'react';
import { Pallet } from '../../types/warehouse';
import { GltfModel, ASSET_URLS } from './GltfModel';
import { BuilderObject3D } from './BuilderObject3D';

interface Props {
  pallet: Pallet;
  cellSize: number;
  onOrbitLock?: (locked: boolean) => void;
}

export const Pallet3D: React.FC<Props> = ({ pallet, cellSize, onOrbitLock }) => {
  const size = Math.max(pallet.width, pallet.height) * cellSize;
  return (
    <BuilderObject3D
      id={pallet.id}
      type="PALLET"
      row={pallet.row}
      col={pallet.col}
      width={pallet.width}
      height={pallet.height}
      cellSize={cellSize}
      posY={pallet.posY}
      rotY={pallet.rotY}
      rotX={pallet.rotX}
      rotZ={pallet.rotZ}
      scale={pallet.scale}
      onOrbitLock={onOrbitLock}
    >
      <GltfModel url={ASSET_URLS.pallet} targetSize={size * 1.1} extraScale={[pallet.scale.x, pallet.scale.y, pallet.scale.z]} />
    </BuilderObject3D>
  );
};
