'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWarehouseStore } from '../../store/warehouseStore';

interface Props {
  cellSize: number;
}

export const RobotCameraController: React.FC<Props> = ({ cellSize }) => {
  const cameraMode = useWarehouseStore((s) => s.cameraMode);
  const selectedCameraRobotId = useWarehouseStore((s) => s.selectedCameraRobotId);

  const currentCamPos = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const prevTargetRef = useRef<string | null>(null);
  const prevModeRef = useRef<string>('OVERVIEW');
  const targetWorldPos = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (cameraMode === 'OVERVIEW') {
      prevModeRef.current = 'OVERVIEW';
      prevTargetRef.current = null;
      return;
    }

    if (!selectedCameraRobotId) {
      useWarehouseStore.getState().setCameraMode('OVERVIEW');
      return;
    }

    const robotObj = state.scene.getObjectByName(`robot-${selectedCameraRobotId}`);
    if (!robotObj) {
      // Check if robot still exists in state
      const exists = useWarehouseStore.getState().robots.some((r) => r.id === selectedCameraRobotId);
      if (!exists) {
        useWarehouseStore.getState().setCameraMode('OVERVIEW');
      }
      return;
    }

    robotObj.getWorldPosition(targetWorldPos.current);
    const rotY = robotObj.rotation.y;

    const desiredCamPos = new THREE.Vector3();
    const desiredLookAt = new THREE.Vector3();

    if (cameraMode === 'FOLLOW') {
      const followDistance = cellSize * 3.8;
      const followHeight = cellSize * 2.5;
      desiredCamPos.set(
        targetWorldPos.current.x - Math.sin(rotY) * followDistance,
        targetWorldPos.current.y + followHeight,
        targetWorldPos.current.z - Math.cos(rotY) * followDistance
      );
      desiredLookAt.set(
        targetWorldPos.current.x,
        targetWorldPos.current.y + cellSize * 0.5,
        targetWorldPos.current.z
      );
    } else if (cameraMode === 'POV') {
      const frontOffset = cellSize * 0.35;
      const povHeight = cellSize * 0.7;
      desiredCamPos.set(
        targetWorldPos.current.x + Math.sin(rotY) * frontOffset,
        targetWorldPos.current.y + povHeight,
        targetWorldPos.current.z + Math.cos(rotY) * frontOffset
      );
      desiredLookAt.set(
        desiredCamPos.x + Math.sin(rotY) * 100,
        desiredCamPos.y,
        desiredCamPos.z + Math.cos(rotY) * 100
      );
    }

    // On mode or robot change, snap initial lerp positions to camera's current state to avoid sudden jump
    const isNewTarget = prevTargetRef.current !== selectedCameraRobotId || prevModeRef.current !== cameraMode;
    if (isNewTarget) {
      currentCamPos.current.copy(state.camera.position);
      // Derive lookAt vector from current camera direction
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
      currentLookAt.current.copy(state.camera.position).addScaledVector(forward, 50);
      prevTargetRef.current = selectedCameraRobotId;
      prevModeRef.current = cameraMode;
    }

    // Frame-rate independent smooth lerp
    const lerpFactor = 1 - Math.exp(-12 * delta);
    currentCamPos.current.lerp(desiredCamPos, lerpFactor);
    currentLookAt.current.lerp(desiredLookAt, lerpFactor);

    state.camera.position.copy(currentCamPos.current);
    state.camera.lookAt(currentLookAt.current);
    state.camera.updateProjectionMatrix();
  });

  return null;
};
