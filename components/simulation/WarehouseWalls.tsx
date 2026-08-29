'use client';

import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Wall } from '../../types/warehouse';
import { useWarehouseStore } from '../../store/warehouseStore';

interface Props {
  width: number;
  depth: number;
  walls: Wall[];
}

export const WarehouseWalls: React.FC<Props> = ({ width, depth, walls }) => {
  const wallTexture = useTexture('/assets/wallTexture.jfif');
  const selectedItemId = useWarehouseStore((s) => s.selectedItemId);
  const setSelectedItem = useWarehouseStore((s) => s.setSelectedItem);

  const makeTex = (repeatX: number, repeatY: number) => {
    const tex = wallTexture.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
    tex.needsUpdate = true;
    return tex;
  };

  const bySide = useMemo(() => {
    const map = Object.fromEntries(walls.map((w) => [w.side, w])) as Record<string, Wall>;
    return map;
  }, [walls]);

  const north = bySide.NORTH ?? { id: 'WALL-NORTH', side: 'NORTH' as const, height: 60, thickness: 3 };
  const south = bySide.SOUTH ?? { id: 'WALL-SOUTH', side: 'SOUTH' as const, height: 60, thickness: 3 };
  const west = bySide.WEST ?? { id: 'WALL-WEST', side: 'WEST' as const, height: 60, thickness: 3 };
  const east = bySide.EAST ?? { id: 'WALL-EAST', side: 'EAST' as const, height: 60, thickness: 3 };

  const texNorth = useMemo(() => makeTex(width / 80, north.height / 40), [wallTexture, width, north.height]);
  const texSouth = useMemo(() => makeTex(width / 80, south.height / 40), [wallTexture, width, south.height]);
  const texWest = useMemo(() => makeTex(depth / 80, west.height / 40), [wallTexture, depth, west.height]);
  const texEast = useMemo(() => makeTex(depth / 80, east.height / 40), [wallTexture, depth, east.height]);

  const renderWall = (
    wall: Wall,
    position: [number, number, number],
    args: [number, number, number],
    map: THREE.Texture
  ) => {
    const selected = selectedItemId === wall.id;
    return (
      <mesh
        key={wall.id}
        position={position}
        receiveShadow
        castShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          setSelectedItem(wall.id, 'WALL');
        }}
      >
        <boxGeometry args={args} />
        <meshStandardMaterial
          map={map}
          color={selected ? '#8ecae6' : '#b8b8b8'}
          roughness={0.9}
          emissive={selected ? '#008CC9' : '#000000'}
          emissiveIntensity={selected ? 0.15 : 0}
        />
      </mesh>
    );
  };

  return (
    <group>
      {renderWall(north, [width / 2, north.height / 2, -north.thickness / 2], [width + north.thickness * 2, north.height, north.thickness], texNorth)}
      {renderWall(south, [width / 2, south.height / 2, depth + south.thickness / 2], [width + south.thickness * 2, south.height, south.thickness], texSouth)}
      {renderWall(west, [-west.thickness / 2, west.height / 2, depth / 2], [west.thickness, west.height, depth], texWest)}
      {renderWall(east, [width + east.thickness / 2, east.height / 2, depth / 2], [east.thickness, east.height, depth], texEast)}
    </group>
  );
};
