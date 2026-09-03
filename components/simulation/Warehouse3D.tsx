'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useWarehouseStore } from '../../store/warehouseStore';
import { WarehouseFloor } from './WarehouseFloor';
import { WarehouseWalls } from './WarehouseWalls';
import { Robot3D } from './Robot3D';
import { Shelf3D } from './Shelf3D';
import { Obstacle3D } from './Obstacle3D';
import { POI3D } from './POI3D';
import { Path3D } from './Path3D';
import { Pallet3D } from './Pallet3D';
import { warehouseWorldSize } from '../../lib/coords';

export const Warehouse3D: React.FC = () => {
  const robots = useWarehouseStore((s) => s.robots);
  const shelves = useWarehouseStore((s) => s.shelves);
  const obstacles = useWarehouseStore((s) => s.obstacles);
  const pois = useWarehouseStore((s) => s.pois);
  const pallets = useWarehouseStore((s) => s.pallets);
  const walls = useWarehouseStore((s) => s.walls);
  const gridRows = useWarehouseStore((s) => s.gridRows);
  const gridCols = useWarehouseStore((s) => s.gridCols);
  const cellSize = useWarehouseStore((s) => s.cellSize);
  const appMode = useWarehouseStore((s) => s.appMode);
  const showGrid = useWarehouseStore((s) => s.showGrid);
  const [orbitLocked, setOrbitLocked] = useState(false);

  const { width: warehouseWidth, depth: warehouseDepth } = warehouseWorldSize(gridCols, gridRows, cellSize);
  const centerX = warehouseWidth / 2;
  const centerZ = warehouseDepth / 2;
  const camDistance = Math.max(warehouseWidth, warehouseDepth) * 0.9;

  const cameraPosition = useMemo(
    () => [centerX + camDistance * 0.5, camDistance * 0.55, centerZ + camDistance * 0.6] as [number, number, number],
    [centerX, centerZ, camDistance]
  );

  return (
    <div className="w-full h-full relative" style={{ background: '#e2e8f0' }}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#e2e8f0');
        }}
        onPointerMissed={() => useWarehouseStore.getState().setSelectedItem(null, null)}
      >
        <PerspectiveCamera
          makeDefault
          key={`${gridCols}-${gridRows}`}
          position={cameraPosition}
          fov={45}
          near={5}
          far={6000}
        />
        <OrbitControls
          target={[centerX, 0, centerZ]}
          enabled={!orbitLocked}
          enableRotate
          enablePan
          enableZoom
          minDistance={120}
          maxDistance={Math.max(warehouseWidth, warehouseDepth) * 3}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={0.15}
          panSpeed={0.8}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />

        {/* High Brightness Industrial Factory Lighting */}
        <ambientLight intensity={1.3} color="#ffffff" />
        <hemisphereLight color="#ffffff" groundColor="#94a3b8" intensity={0.8} />
        <directionalLight
          castShadow
          position={[centerX + 300, 600, centerZ + 200]}
          intensity={1.5}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-warehouseWidth * 0.6}
          shadow-camera-right={warehouseWidth * 0.6}
          shadow-camera-top={warehouseDepth * 0.6}
          shadow-camera-bottom={-warehouseDepth * 0.6}
          shadow-camera-near={1}
          shadow-camera-far={1500}
          shadow-bias={-0.001}
        />
        <directionalLight
          position={[centerX - 300, 400, centerZ - 200]}
          intensity={0.8}
          color="#f1f5f9"
        />

        <Suspense fallback={null}>
          <WarehouseFloor width={warehouseWidth} depth={warehouseDepth} />
          <WarehouseWalls width={warehouseWidth} depth={warehouseDepth} walls={walls} />

          {showGrid && (
            <Grid
              position={[centerX, 0.2, centerZ]}
              args={[warehouseWidth, warehouseDepth]}
              cellSize={cellSize}
              cellThickness={0.4}
              sectionSize={cellSize * 5}
              sectionThickness={0.8}
              fadeDistance={warehouseWidth * 1.4}
              infiniteGrid={false}
            />
          )}

          {shelves.map((shelf) => (
            <Shelf3D key={shelf.id} shelf={shelf} cellSize={cellSize} onOrbitLock={setOrbitLocked} />
          ))}
          {obstacles.map((obs) => (
            <Obstacle3D key={obs.id} obstacle={obs} cellSize={cellSize} onOrbitLock={setOrbitLocked} />
          ))}
          {pallets.map((pallet) => (
            <Pallet3D key={pallet.id} pallet={pallet} cellSize={cellSize} onOrbitLock={setOrbitLocked} />
          ))}
          {pois.map((poi) => (
            <POI3D key={poi.id} poi={poi} cellSize={cellSize} onOrbitLock={setOrbitLocked} />
          ))}
          {robots.map((robot) => (
            <React.Fragment key={robot.id}>
              <Robot3D robot={robot} cellSize={cellSize} onOrbitLock={setOrbitLocked} />
              {appMode === 'PLAY' && robot.path && robot.path.length > 0 && (
                <Path3D
                  robotId={robot.id}
                  path={robot.path}
                  currentRow={robot.row}
                  currentCol={robot.col}
                  cellSize={cellSize}
                />
              )}
            </React.Fragment>
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
};
