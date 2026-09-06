'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useWarehouseStore } from '../../store/warehouseStore';
import { simulationToWorld, worldToSimulation } from '../../lib/coords';
import { SelectedItemType } from '../../types/warehouse';

interface Props {
  id: string;
  type: SelectedItemType;
  row: number;
  col: number;
  width: number;
  height: number;
  cellSize: number;
  posY?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scale?: { x: number; y: number; z: number };
  children: React.ReactNode;
  onOrbitLock?: (locked: boolean) => void;
}

export const BuilderObject3D: React.FC<Props> = ({
  id,
  type,
  row,
  col,
  width,
  height,
  cellSize,
  posY = 0,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  scale = { x: 1, y: 1, z: 1 },
  children,
  onOrbitLock,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  const selectedItemId = useWarehouseStore((s) => s.selectedItemId);
  const setSelectedItem = useWarehouseStore((s) => s.setSelectedItem);
  const appMode = useWarehouseStore((s) => s.appMode);
  const transformMode = useWarehouseStore((s) => s.transformMode);
  const updateShelf = useWarehouseStore((s) => s.updateShelf);
  const updateObstacle = useWarehouseStore((s) => s.updateObstacle);
  const updatePallet = useWarehouseStore((s) => s.updatePallet);
  const updatePoi = useWarehouseStore((s) => s.updatePoi);
  const updateRobot = useWarehouseStore((s) => s.updateRobot);

  const world = simulationToWorld(row, col, cellSize, { width, height });
  const selected = selectedItemId === id;
  const builder = appMode === 'BUILDER';
  const showGizmo = builder && selected && !!object;

  useEffect(() => {
    setObject(groupRef.current);
  }, [selected, builder]);

  const commit = () => {
    const group = groupRef.current;
    if (!group || !type) return;
    const pos = group.position;
    const snapped = worldToSimulation(pos.x, pos.z, cellSize, { width, height });
    const nextRow = Math.round(snapped.row);
    const nextCol = Math.round(snapped.col);
    const deg = (rad: number) => Math.round((rad * 180) / Math.PI);
    const updates = {
      row: nextRow,
      col: nextCol,
      posY: pos.y < 0.8 ? 0 : Math.max(0, pos.y),
      rotX: deg(group.rotation.x),
      rotY: deg(group.rotation.y),
      rotZ: deg(group.rotation.z),
      scale: { x: group.scale.x, y: group.scale.y, z: group.scale.z },
    };
    if (type === 'SHELF') updateShelf(id, updates);
    else if (type === 'OBSTACLE') updateObstacle(id, updates);
    else if (type === 'PALLET') updatePallet(id, updates);
    else if (type === 'POI') updatePoi(id, { row: nextRow, col: nextCol, posY: updates.posY, rotY: updates.rotY, scale: updates.scale });
    else if (type === 'ROBOT') updateRobot(id, { row: nextRow, col: nextCol, posY: updates.posY, rotY: updates.rotY, scale: updates.scale });
  };

  return (
    <>
      <group
        ref={groupRef}
        position={[world.x, posY, world.z]}
        rotation={[(rotX * Math.PI) / 180, (rotY * Math.PI) / 180, (rotZ * Math.PI) / 180]}
        scale={[scale.x, scale.y, scale.z]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setSelectedItem(id, type);
        }}
      >
        {children}
        {selected && (
          <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(width, height) * cellSize * 0.35, Math.max(width, height) * cellSize * 0.42, 32]} />
            <meshBasicMaterial color="#008CC9" side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
      {showGizmo && (
        <TransformControls
          object={object}
          mode={transformMode}
          onMouseDown={() => onOrbitLock?.(true)}
          onMouseUp={() => {
            onOrbitLock?.(false);
            commit();
          }}
        />
      )}
    </>
  );
};
