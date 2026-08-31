'use client';

import React, { useMemo } from 'react';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  url: string;
  targetSize: number;
  rotation?: [number, number, number];
  extraScale?: [number, number, number];
  castShadow?: boolean;
}

export const GltfModel: React.FC<Props> = ({
  url,
  targetSize,
  rotation = [0, 0, 0],
  extraScale = [1, 1, 1],
  castShadow = true,
}) => {
  const gltf = useGLTF(url) as any;
  const scene = gltf.scene;
  const clone = useMemo(() => scene.clone(true), [scene]);

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
} as const;

useGLTF.preload(ASSET_URLS.robot);
useGLTF.preload(ASSET_URLS.shelf);
useGLTF.preload(ASSET_URLS.shelfWorn);
useGLTF.preload(ASSET_URLS.charger);
useGLTF.preload(ASSET_URLS.pallet);
useGLTF.preload(ASSET_URLS.oilDrums);
useGLTF.preload(ASSET_URLS.palletBarrels);
useGLTF.preload(ASSET_URLS.concreteBags);
