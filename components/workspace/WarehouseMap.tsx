'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Image as KonvaImage } from 'react-konva';
import { useWarehouseStore } from '../../store/warehouseStore';
import { Obstacle } from './Obstacle';
import { AmrRobot } from './AmrRobot';
import { Shelf2D } from './Shelf2D';
import { Poi2D } from './Poi2D';
import { Pallet2D } from './Pallet2D';
import { useSvgImage } from '../../lib/useSvgImage';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Hand } from 'lucide-react';

export const WarehouseMap: React.FC = () => {
  const {
    shelves, paths, pois, robots, obstacles, intersections, pallets, walls,
    selectedItemId, setSelectedItem, scale, pan, showGrid, gridRows, gridCols, cellSize,
    activeCommLinks, placeAtCell, pendingPlaceType, appMode, activeTool, setActiveTool, setPan, setScale,
    zoomIn, zoomOut, zoomFit,
  } = useWarehouseStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const bgPng = useSvgImage('/warehouse/warehose-background.png');
  const bgAssetPng = useSvgImage('/assets/warehouse/warehose-background.png');
  const floorPng = bgPng || bgAssetPng;
  const wallImg = useSvgImage('/assets/warehouse/wall-segment.svg');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Handle Spacebar for temporary pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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

  const isPlacing = appMode === 'BUILDER' && Boolean(pendingPlaceType);
  const isPanActive = activeTool === 'pan' || isSpacePressed;
  const canDragStage = !isPlacing;

  const getCursor = () => {
    if (isDraggingStage) return 'grabbing';
    if (isPlacing) return 'crosshair';
    if (isPanActive) return 'grab';
    if (appMode === 'PLAY') return 'grab';
    return 'default';
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#e2e8f0] overflow-hidden relative select-none">
      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-3 left-3 bg-panel/90 backdrop-blur-md border border-border rounded-md p-1 flex items-center gap-1 z-30 shadow-md">
        <button
          onClick={() => setActiveTool(activeTool === 'pan' ? 'select' : 'pan')}
          title={activeTool === 'pan' ? "Pan Tool Active (Click to switch to Select - V)" : "Pan Tool (Drag Map) - Shortcut: H or hold Space"}
          className={`p-1.5 rounded-sm transition-colors ${
            activeTool === 'pan' ? 'bg-accent text-white shadow-xs' : 'text-text hover:text-accent hover:bg-app'
          }`}
        >
          <Hand size={16} />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          onClick={zoomIn}
          title="Zoom In (+)"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out (-)"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={zoomFit}
          title="Fit Map to View"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors"
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={() => {
            setPan({ x: 40, y: 40 });
            setScale(1);
          }}
          title="Reset View"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors border-l border-border pl-2"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Map Drag & Interaction Hint */}
      <div className="absolute bottom-2 right-3 z-30 pointer-events-none bg-panel/80 backdrop-blur-xs border border-border/80 rounded px-2 py-0.5 text-[10px] text-muted flex items-center gap-2 shadow-xs">
        <span>🖱️ Drag canvas / Hold Space to pan</span>
        <span className="text-border">|</span>
        <span>🔍 Scroll to zoom</span>
      </div>

      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          style={{
            background: '#e2e8f0',
            cursor: getCursor(),
          }}
          scale={{ x: scale, y: scale }}
          x={pan.x}
          y={pan.y}
          draggable={canDragStage}
          onDragStart={(e) => {
            if (e.target === e.target.getStage()) {
              setIsDraggingStage(true);
            }
          }}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage()) {
              setIsDraggingStage(false);
              setPan({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onWheel={(e) => {
            e.evt.preventDefault();
            const scaleBy = 1.08;
            const stage = e.target.getStage();
            if (!stage) return;
            const oldScale = scale;
            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            const mousePointTo = {
              x: (pointer.x - pan.x) / oldScale,
              y: (pointer.y - pan.y) / oldScale,
            };

            const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
            const clampedScale = Math.max(0.3, Math.min(3, newScale));

            const newPan = {
              x: pointer.x - mousePointTo.x * clampedScale,
              y: pointer.y - mousePointTo.y * clampedScale,
            };

            setScale(clampedScale);
            setPan(newPan);
          }}
          onClick={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedItem(null, null);
            }
          }}
        >
          {/* LAYER 1: WAREHOUSE FLOOR BACKGROUND PNG */}
          <Layer>
            {floorPng ? (
              <KonvaImage
                image={floorPng}
                x={0}
                y={0}
                width={mapW}
                height={mapH}
                onClick={(e) => {
                  if (e.target.getStage()?.isDragging()) return;
                  if (activeTool === 'pan' || isSpacePressed) return;
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
            ) : (
              <Rect
                x={0}
                y={0}
                width={mapW}
                height={mapH}
                fill="#cbd5e1"
                onClick={(e) => {
                  if (e.target.getStage()?.isDragging()) return;
                  if (activeTool === 'pan' || isSpacePressed) return;
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
            )}
            {showGrid && gridLines}
          </Layer>

          {/* LAYER 2: WAREHOUSE BOUNDARY WALLS */}
          <Layer>
            {north && (
              wallImg ? (
                <KonvaImage image={wallImg} x={0} y={-north.thickness} width={mapW} height={north.thickness} />
              ) : (
                <Rect x={0} y={-north.thickness} width={mapW} height={north.thickness} fill={selectedItemId === north.id ? '#42BFE5' : '#3A4145'} />
              )
            )}
            {south && (
              wallImg ? (
                <KonvaImage image={wallImg} x={0} y={mapH} width={mapW} height={south.thickness} />
              ) : (
                <Rect x={0} y={mapH} width={mapW} height={south.thickness} fill={selectedItemId === south.id ? '#42BFE5' : '#3A4145'} />
              )
            )}
            {west && (
              wallImg ? (
                <KonvaImage image={wallImg} x={-west.thickness} y={0} width={west.thickness} height={mapH} />
              ) : (
                <Rect x={-west.thickness} y={0} width={west.thickness} height={mapH} fill={selectedItemId === west.id ? '#42BFE5' : '#3A4145'} />
              )
            )}
            {east && (
              wallImg ? (
                <KonvaImage image={wallImg} x={mapW} y={0} width={east.thickness} height={mapH} />
              ) : (
                <Rect x={mapW} y={0} width={east.thickness} height={mapH} fill={selectedItemId === east.id ? '#42BFE5' : '#3A4145'} />
              )
            )}
          </Layer>

          {/* LAYER 3: SHELVES */}
          <Layer>
            {shelves.map((shelf) => (
              <Shelf2D key={shelf.id} shelf={shelf} />
            ))}
          </Layer>

          {/* LAYER 4: PALLETS & BOXES */}
          <Layer>
            {pallets.map((pallet) => (
              <Pallet2D key={pallet.id} pallet={pallet} />
            ))}
          </Layer>

          {/* LAYER 5: OBSTACLES */}
          <Layer>
            {obstacles.map((obstacle) => (
              <Obstacle key={obstacle.id} obstacle={obstacle} />
            ))}
          </Layer>

          {/* LAYER 6 & 7: PLANNED & ACTIVE ROUTES */}
          <Layer>
            {paths.map((path) => {
              const start = intersections.find((i) => i.id === path.startId);
              const end = intersections.find((i) => i.id === path.endId);
              if (!start || !end) return null;
              return (
                <Line
                  key={path.id}
                  points={[start.col * cellSize, start.row * cellSize, end.col * cellSize, end.row * cellSize]}
                  stroke="#454C50"
                  strokeWidth={1.5}
                  dash={[4, 4]}
                  opacity={0.4}
                />
              );
            })}

            {intersections.map((intersection) => (
              <Circle
                key={intersection.id}
                x={intersection.col * cellSize}
                y={intersection.row * cellSize}
                radius={3}
                fill="#3A4145"
              />
            ))}
          </Layer>

          {/* LAYER 8: PICKUP & DROP POIS */}
          <Layer>
            {pois.map((poi) => (
              <Poi2D key={poi.id} poi={poi} />
            ))}
          </Layer>

          {/* LAYER 9, 10, 11: ROBOTS, LABELS & SELECTION HIGHLIGHT OVERLAYS */}
          <Layer>
            {robots.map((robot) => (
              <AmrRobot key={robot.id} robot={robot} />
            ))}

            {activeCommLinks.filter((l) => l.to !== 'ALL' && l.to !== 'SYSTEM').map((link, idx) => {
              const fromRobot = robots.find((r) => r.id === link.from);
              const toRobot = robots.find((r) => r.id === link.to);
              if (!fromRobot || !toRobot) return null;
              return (
                <Line
                  key={`${link.from}-${link.to}-${link.expires}-${idx}`}
                  points={[
                    fromRobot.col * cellSize + cellSize / 2,
                    fromRobot.row * cellSize + cellSize / 2,
                    toRobot.col * cellSize + cellSize / 2,
                    toRobot.row * cellSize + cellSize / 2,
                  ]}
                  stroke="#42BFE5"
                  strokeWidth={1.5}
                  opacity={0.6}
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
