'use client';

import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWarehouseStore } from '../../store/warehouseStore';

interface Props {
  width: number;
  depth: number;
}

export const WarehouseFloor: React.FC<Props> = ({ width, depth }) => {
  const floorTexture = useTexture('/assets/floorTexture.jfif');
  const placeAtCell = useWarehouseStore((s) => s.placeAtCell);
  const pendingPlaceType = useWarehouseStore((s) => s.pendingPlaceType);
  const setSelectedItem = useWarehouseStore((s) => s.setSelectedItem);
  const cellSize = useWarehouseStore((s) => s.cellSize);
  const appMode = useWarehouseStore((s) => s.appMode);

  const texture = useMemo(() => {
    const tex = floorTexture.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(Math.max(1, width / 80), Math.max(1, depth / 80));
    tex.needsUpdate = true;
    return tex;
  }, [floorTexture, width, depth]);

  const handlePointerDown = (e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    e.stopPropagation();
    const col = Math.floor(e.point.x / cellSize);
    const row = Math.floor(e.point.z / cellSize);
    if (appMode === 'BUILDER' && pendingPlaceType) {
      placeAtCell(pendingPlaceType, row, col);
      return;
    }
    setSelectedItem('FLOOR', 'FLOOR');
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[width / 2, 0, depth / 2]}
      receiveShadow
      onPointerDown={handlePointerDown}
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.85}
        metalness={0.05}
        color="#d4d4d4"
      />
    </mesh>
  );
};
