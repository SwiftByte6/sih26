'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Robot } from '../../types/warehouse';
import * as THREE from 'three';
import { GltfModel, ASSET_URLS } from './GltfModel';
import { BuilderObject3D } from './BuilderObject3D';
import { simulationToWorld } from '../../lib/coords';
import { useWarehouseStore } from '../../store/warehouseStore';
import { isWalkable } from '../../engine/pathfinding';

interface Props {
  robot: Robot;
  cellSize: number;
  onOrbitLock?: (locked: boolean) => void;
}

const STATE_COLORS: Record<string, string> = {
  MOVING: '#22c55e',
  WAITING: '#8b5cf6',
  CHARGING: '#eab308',
  ERROR: '#ef4444',
  IDLE: '#6b7280',
};

export const Robot3D: React.FC<Props> = ({ robot, cellSize, onOrbitLock }) => {
  const appMode = useWarehouseStore((s) => s.appMode);
  const showSensors = useWarehouseStore((s) => s.showSensors);
  const shelves = useWarehouseStore((s) => s.shelves);
  const obstacles = useWarehouseStore((s) => s.obstacles);
  const pallets = useWarehouseStore((s) => s.pallets);
  const gridRows = useWarehouseStore((s) => s.gridRows);
  const gridCols = useWarehouseStore((s) => s.gridCols);
  const groupRef = useRef<THREE.Group>(null);
  const prevPos = useRef({ x: 0, z: 0 });

  const target = simulationToWorld(robot.row, robot.col, cellSize);
  const statusColor = STATE_COLORS[robot.state] || '#6b7280';

  const obstacleAhead = useMemo(() => {
    if (!robot.path?.length) return false;
    const next = robot.path[0];
    return !isWalkable({ gridRows, gridCols, obstacles, shelves, pallets }, next.row, next.col);
  }, [robot.path, gridRows, gridCols, obstacles, shelves, pallets]);

  useFrame((_state, delta) => {
    if (appMode === 'BUILDER') return;
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const lerpSpeed = Math.min(delta * 8, 1);
    pos.x = THREE.MathUtils.lerp(pos.x, target.x, lerpSpeed);
    pos.z = THREE.MathUtils.lerp(pos.z, target.z, lerpSpeed);
    const dx = pos.x - prevPos.current.x;
    const dz = pos.z - prevPos.current.z;
    if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
      const targetAngle = Math.atan2(dx, dz);
      let currentAngle = groupRef.current.rotation.y;
      let diff = targetAngle - currentAngle;
      diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * lerpSpeed;
    }
    prevPos.current.x = pos.x;
    prevPos.current.z = pos.z;
  });

  const visuals = (
    <>
      <GltfModel url={ASSET_URLS.robot} targetSize={cellSize * 1.4} extraScale={[robot.scale?.x ?? 1, robot.scale?.y ?? 1, robot.scale?.z ?? 1]} />
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[cellSize * 0.35, cellSize * 0.42, 32]} />
        <meshBasicMaterial color={statusColor} side={THREE.DoubleSide} />
      </mesh>
      <Billboard position={[0, cellSize * 1.6, 0]}>
        <Text
          fontSize={cellSize * 0.28}
          color={statusColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={cellSize * 0.02}
          outlineColor="#000000"
        >
          {robot.id} [{robot.state}]
        </Text>
        <Text
          fontSize={cellSize * 0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          position={[0, -cellSize * 0.38, 0]}
          outlineWidth={cellSize * 0.015}
          outlineColor="#000000"
        >
          {Math.round(robot.battery)}%
        </Text>
      </Billboard>
      {robot.state === 'CHARGING' && (
        <pointLight position={[0, 10, 0]} color="#eab308" intensity={0.8} distance={50} />
      )}
      {robot.state === 'ERROR' && (
        <pointLight position={[0, 10, 0]} color="#ef4444" intensity={1.2} distance={60} />
      )}
      {showSensors && (
        <>
          <mesh position={[0, cellSize * 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[cellSize * 1.4, cellSize * 1.55, 48]} />
            <meshBasicMaterial color={obstacleAhead ? '#ef4444' : '#0ea5e9'} transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
          {obstacleAhead && (
            <Billboard position={[0, cellSize * 2.4, 0]}>
              <Text fontSize={cellSize * 0.22} color="#ef4444" anchorX="center" outlineWidth={0.4} outlineColor="#000">
                OBSTACLE DETECTED
              </Text>
            </Billboard>
          )}
        </>
      )}
    </>
  );

  if (appMode === 'BUILDER') {
    return (
      <BuilderObject3D
        id={robot.id}
        type="ROBOT"
        row={robot.row}
        col={robot.col}
        width={1}
        height={1}
        cellSize={cellSize}
        posY={robot.posY}
        rotY={robot.rotY}
        scale={robot.scale}
        onOrbitLock={onOrbitLock}
      >
        {visuals}
      </BuilderObject3D>
    );
  }

  return (
    <group ref={groupRef} position={[target.x, robot.posY ?? 0, target.z]}>
      {visuals}
    </group>
  );
};
