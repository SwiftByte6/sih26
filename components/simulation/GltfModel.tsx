'use client';

import React, { useMemo, useEffect } from 'react';
import { Center, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

interface Props {
  url: string;
  targetSize: number;
  rotation?: [number, number, number];
  extraScale?: [number, number, number];
  castShadow?: boolean;
  animationState?: 'IDLE' | 'MOVING' | 'WAITING' | 'CHARGING' | 'ERROR';
  speed?: number;
}

function selectClip(clips: THREE.AnimationClip[], state: 'IDLE' | 'MOVING' | 'WAITING' | 'CHARGING' | 'ERROR') {
  if (!clips || clips.length === 0) return null;
  if (clips.length === 1) return clips[0];

  const isMoving = state === 'MOVING';
  const lowerNames = clips.map((c) => c.name.toLowerCase());

  if (isMoving) {
    const moveIdx = lowerNames.findIndex((n) =>
      n.includes('walk') || n.includes('run') || n.includes('move') || n.includes('drive') || n.includes('roll') || n.includes('step') || n.includes('track')
    );
    if (moveIdx !== -1) return clips[moveIdx];
    // Return second clip if available, else null to avoid forcing incorrect non-walk clip
    return clips[1] || null;
  } else {
    const idleIdx = lowerNames.findIndex((n) =>
      n.includes('idle') || n.includes('stand') || n.includes('wait') || n.includes('stop') || n.includes('pause')
    );
    if (idleIdx !== -1) return clips[idleIdx];
    return clips[0];
  }
}

export const GltfModel: React.FC<Props> = ({
  url,
  targetSize,
  rotation = [0, 0, 0],
  extraScale = [1, 1, 1],
  castShadow = true,
  animationState,
  speed,
}) => {
  const gltf = useGLTF(url) as any;
  const scene = gltf.scene;

  useEffect(() => {
    if (gltf.animations) {
      if (gltf.animations.length === 0) {
        console.warn(`[ROBOT GLB] ${url}: This GLB has no animation clips`);
      } else {
        console.log(`[ROBOT GLB] ${url} ANIMATIONS:`, gltf.animations.map((a: any) => a.name));
      }
    }
  }, [url, gltf.animations]);

  const clone = useMemo(() => {
    try {
      return SkeletonUtils.clone(scene);
    } catch {
      return scene.clone(true);
    }
  }, [scene]);

  const mixer = useMemo(() => {
    if (gltf.animations && gltf.animations.length > 0) {
      return new THREE.AnimationMixer(clone);
    }
    return null;
  }, [clone, gltf.animations]);

  const currentActionRef = React.useRef<THREE.AnimationAction | null>(null);
  const activeClipNameRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!mixer || !gltf.animations || gltf.animations.length === 0) return;

    if (gltf.animations.length > 1 && animationState) {
      const targetClip = selectClip(gltf.animations, animationState);
      if (targetClip && activeClipNameRef.current !== targetClip.name) {
        const nextAction = mixer.clipAction(targetClip);
        const timeScale = animationState === 'MOVING' ? Math.max(0.8, (speed ?? 1.2) * 0.8) : 1;
        
        nextAction.reset().setEffectiveTimeScale(timeScale).fadeIn(0.2).play();

        if (currentActionRef.current && currentActionRef.current !== nextAction) {
          currentActionRef.current.fadeOut(0.2);
        }

        currentActionRef.current = nextAction;
        activeClipNameRef.current = targetClip.name;
      }
    } else {
      gltf.animations.forEach((clip: THREE.AnimationClip) => {
        const action = mixer.clipAction(clip);
        if (!action.isRunning()) {
          action.play();
        }
      });
    }
  }, [mixer, gltf.animations, animationState, speed]);

  useEffect(() => {
    return () => {
      if (mixer) {
        mixer.stopAllAction();
      }
    };
  }, [mixer]);

  useFrame((_state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
  });

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
    return targetSize / maxDim;
  }, [clone, targetSize]);

  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = true;
    }
  });

  return (
    <Center top>
      <group rotation={rotation} scale={[fit * extraScale[0], fit * extraScale[1], fit * extraScale[2]]}>
        <primitive object={clone} />
      </group>
    </Center>
  );
};

export const ASSET_URLS = {
  robot: '/assets/cyberpunk_robot.glb',
  shelf: '/assets/warehouse_shelving_unit.glb',
  shelfWorn: '/assets/worn_warehouse_shelf.glb',
  charger: '/assets/electric_vehicle_charging_point_trydan.glb',
  pallet: '/assets/pallet.glb',
  oilDrums: '/assets/oil_drums.glb',
  palletBarrels: '/assets/pallet_barrels.glb',
  concreteBags: '/assets/concrete_bags_and_pallet.glb',
  industrialAssets: '/assets/industrial_assets.glb',
  robotMachine: '/assets/real_time_simulation_robot_machine.glb',
  ldrRobot: '/assets/robot_love_death_and_robots.glb',
  laserRobot: '/assets/simulation_laser_cutting_robot_systems.glb',
} as const;

useGLTF.preload(ASSET_URLS.robot);
useGLTF.preload(ASSET_URLS.shelf);
useGLTF.preload(ASSET_URLS.shelfWorn);
useGLTF.preload(ASSET_URLS.charger);
useGLTF.preload(ASSET_URLS.pallet);
useGLTF.preload(ASSET_URLS.oilDrums);
useGLTF.preload(ASSET_URLS.palletBarrels);
useGLTF.preload(ASSET_URLS.concreteBags);
useGLTF.preload(ASSET_URLS.industrialAssets);
useGLTF.preload(ASSET_URLS.robotMachine);
useGLTF.preload(ASSET_URLS.ldrRobot);
useGLTF.preload(ASSET_URLS.laserRobot);
