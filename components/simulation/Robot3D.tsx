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
  const isInitializedRef = useRef(false);
  const [animState, setAnimState] = React.useState<'IDLE' | 'MOVING' | 'WAITING' | 'CHARGING' | 'ERROR'>('IDLE');

  const target = simulationToWorld(robot.row, robot.col, cellSize);
  const statusColor = STATE_COLORS[robot.state] || '#6b7280';

  const nextWaypointTarget = useMemo(() => {
    if (robot.path && robot.path.length > 0) {
      return simulationToWorld(robot.path[0].row, robot.path[0].col, cellSize);
    }
    return target;
  }, [robot.path, robot.row, robot.col, cellSize, target]);

  const obstacleAhead = useMemo(() => {
    if (!robot.path?.length) return false;
    const next = robot.path[0];
    return !isWalkable({ gridRows, gridCols, obstacles, shelves, pallets }, next.row, next.col);
  }, [robot.path, gridRows, gridCols, obstacles, shelves, pallets]);

  useFrame((_state, delta) => {
    if (appMode === 'BUILDER') return;
    if (!groupRef.current) return;
    const group = groupRef.current;
    const pos = group.position;

    // Prevent initial spawn jump/spin
    if (!isInitializedRef.current) {
      pos.x = target.x;
      pos.z = target.z;
      isInitializedRef.current = true;
    }

    const distToTarget = Math.hypot(target.x - pos.x, target.z - pos.z);
    const hasTask = !!(robot.currentTask || robot.currentTaskId);
    const hasPath = !!(robot.path && robot.path.length > 0);

    // STEP 3: DERIVE VISUAL STATE
    let targetAnimState: 'IDLE' | 'MOVING' | 'WAITING' | 'CHARGING' | 'ERROR' = 'IDLE';
    if (robot.state === 'CHARGING') {
      targetAnimState = 'CHARGING';
    } else if (robot.state === 'ERROR') {
      targetAnimState = 'ERROR';
    } else if (!hasTask && !hasPath && distToTarget < 0.15) {
      targetAnimState = 'IDLE';
    } else if ((robot.state === 'MOVING' || hasPath) && (distToTarget > 0.1 || hasPath)) {
      targetAnimState = 'MOVING';
    } else if (hasTask) {
      targetAnimState = 'WAITING';
    } else {
      targetAnimState = 'IDLE';
    }

    // STEP 4 & STEP 9: POSITION MOVEMENT
    if (targetAnimState === 'MOVING') {
      const moveFactor = Math.min(delta * (robot.speed ? robot.speed * 6 : 6), 1);
      pos.x = THREE.MathUtils.lerp(pos.x, target.x, moveFactor);
      pos.z = THREE.MathUtils.lerp(pos.z, target.z, moveFactor);
    } else {
      // Hold final position stationary
      pos.x = target.x;
      pos.z = target.z;
    }

    // STEP 5: ROTATION CALCULATIONS
    let dx = 0;
    let dz = 0;

    if (distToTarget > 0.2) {
      dx = target.x - pos.x;
      dz = target.z - pos.z;
    } else if (hasPath) {
      dx = nextWaypointTarget.x - target.x;
      dz = nextWaypointTarget.z - target.z;
    }

    if (Math.hypot(dx, dz) > 0.05) {
      const targetAngle = Math.atan2(dx, dz);
      const currentAngle = group.rotation.y;
      
      const diff = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
      const rotateFactor = Math.min(delta * 10, 1);
      group.rotation.y += diff * rotateFactor;
    }

    if (targetAnimState !== animState) {
      setAnimState(targetAnimState);
      console.log(`[ROBOT DEBUG ${robot.id}] State: ${targetAnimState} | Task: ${robot.currentTaskId || 'none'} | PathRemaining: ${robot.path?.length || 0} | Position: (${robot.col}, ${robot.row})`);
    }
  });

  const visuals = (
    <>
      <GltfModel
        url={robot.assetUrl || ASSET_URLS.robot}
        targetSize={cellSize * 1.4}
        extraScale={[robot.scale?.x ?? 1, robot.scale?.y ?? 1, robot.scale?.z ?? 1]}
        animationState={animState}
        speed={robot.speed}
      />
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
    <group name={`robot-${robot.id}`} ref={groupRef} position={[target.x, robot.posY ?? 0, target.z]} scale={[robot.scale?.x ?? 1, robot.scale?.y ?? 1, robot.scale?.z ?? 1]}>
      {visuals}
    </group>
  );
};
