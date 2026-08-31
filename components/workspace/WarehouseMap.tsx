'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line } from 'react-konva';
import { useWarehouseStore } from '../../store/warehouseStore';
import { Obstacle } from './Obstacle';
import { AmrRobot } from './AmrRobot';
import { Shelf2D } from './Shelf2D';
import { Poi2D } from './Poi2D';
import { Pallet2D } from './Pallet2D';

export const WarehouseMap: React.FC = () => {
  const {
    shelves, paths, pois, robots, obstacles, intersections, pallets, walls,
    selectedItemId, setSelectedItem, scale, pan, showGrid, gridRows, gridCols, cellSize,
    activeCommLinks, placeAtCell, pendingPlaceType, appMode,
  } = useWarehouseStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gridLines = [];
  if (showGrid) {
    for (let i = 0; i <= gridCols; i++) {
      gridLines.push(
        <Line
          key={`v-${i}`}
          points={[i * cellSize, 0, i * cellSize, gridRows * cellSize]}
          stroke="#AEB0AD"
          strokeWidth={1}
        />
      );
    }
    for (let i = 0; i <= gridRows; i++) {
      gridLines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * cellSize, gridCols * cellSize, i * cellSize]}
          stroke="#AEB0AD"
          strokeWidth={1}
        />
      );
    }
  }

  const north = walls.find((w) => w.side === 'NORTH');
  const south = walls.find((w) => w.side === 'SOUTH');
  const west = walls.find((w) => w.side === 'WEST');
  const east = walls.find((w) => w.side === 'EAST');
  const mapW = gridCols * cellSize;
  const mapH = gridRows * cellSize;

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent overflow-hidden">
      {size.width > 0 && size.height > 0 && (
        <Stage
        width={size.width}
        height={size.height}
        style={{ background: 'transparent' }}
        scale={{ x: scale, y: scale }}
        x={pan.x}
        y={pan.y}
        onClick={(e) => {
          if (e.target === e.target.getStage()) {
            setSelectedItem(null, null);
          }
        }}
        onTap={(e) => {
          if (e.target === e.target.getStage()) {
            setSelectedItem(null, null);
          }
        }}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={mapW}
            height={mapH}
            fill="#CCCDCA"
            onClick={(e) => {
              e.cancelBubble = true;
              const pos = e.target.getStage()?.getPointerPosition();
              if (!pos) return;
              const col = Math.floor((pos.x - pan.x) / scale / cellSize);
              const row = Math.floor((pos.y - pan.y) / scale / cellSize);
              if (appMode === 'BUILDER' && pendingPlaceType) {
                const { pendingAssetUrl } = useWarehouseStore.getState();
                placeAtCell(pendingPlaceType, row, col, pendingAssetUrl);
                return;
              }
              setSelectedItem('FLOOR', 'FLOOR');
            }}
          />

          {showGrid && gridLines}

          {north && (
            <Rect x={0} y={-north.thickness} width={mapW} height={north.thickness} fill={selectedItemId === north.id ? '#008CC9' : '#8a8a8a'} onClick={() => setSelectedItem(north.id, 'WALL')} />
          )}
          {south && (
            <Rect x={0} y={mapH} width={mapW} height={south.thickness} fill={selectedItemId === south.id ? '#008CC9' : '#8a8a8a'} onClick={() => setSelectedItem(south.id, 'WALL')} />
          )}
          {west && (
            <Rect x={-west.thickness} y={0} width={west.thickness} height={mapH} fill={selectedItemId === west.id ? '#008CC9' : '#8a8a8a'} onClick={() => setSelectedItem(west.id, 'WALL')} />
          )}
          {east && (
            <Rect x={mapW} y={0} width={east.thickness} height={mapH} fill={selectedItemId === east.id ? '#008CC9' : '#8a8a8a'} onClick={() => setSelectedItem(east.id, 'WALL')} />
          )}

          {paths.map((path) => {
            const start = intersections.find((i) => i.id === path.startId);
            const end = intersections.find((i) => i.id === path.endId);
            if (!start || !end) return null;
            return (
              <Line
                key={path.id}
                points={[start.col * cellSize, start.row * cellSize, end.col * cellSize, end.row * cellSize]}
                stroke="#2878C8"
                strokeWidth={2}
                dash={[5, 5]}
                opacity={0.5}
              />
            );
          })}

          {intersections.map((intersection) => (
            <Circle
              key={intersection.id}
              x={intersection.col * cellSize}
              y={intersection.row * cellSize}
              radius={4}
              fill="#9AA7B2"
            />
          ))}

          {shelves.map((shelf) => (
            <Shelf2D key={shelf.id} shelf={shelf} />
          ))}

          {pallets.map((pallet) => (
            <Pallet2D key={pallet.id} pallet={pallet} />
          ))}

          {obstacles.map((obstacle) => (
            <Obstacle key={obstacle.id} obstacle={obstacle} />
          ))}

          {pois.map((poi) => (
            <Poi2D key={poi.id} poi={poi} />
          ))}

          {robots.map((robot) => (
            <AmrRobot key={robot.id} robot={robot} />
          ))}

          {activeCommLinks.filter((l) => l.to !== 'ALL' && l.to !== 'SYSTEM').map((link) => {
            const fromRobot = robots.find((r) => r.id === link.from);
            const toRobot = robots.find((r) => r.id === link.to);
            if (!fromRobot || !toRobot) return null;
            return (
              <Line
                key={`${link.from}-${link.to}-${link.expires}`}
                points={[
                  fromRobot.col * cellSize,
                  fromRobot.row * cellSize,
                  toRobot.col * cellSize,
                  toRobot.row * cellSize,
                ]}
                stroke="#008CC9"
                strokeWidth={1.5}
                opacity={0.5}
                dash={[6, 4]}
              />
            );
          })}
        </Layer>
      </Stage>
      )}
    </div>
  );
};
