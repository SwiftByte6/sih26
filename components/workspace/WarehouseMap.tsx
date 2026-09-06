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
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

export const WarehouseMap: React.FC = () => {
  const {
    shelves, paths, pois, robots, obstacles, intersections, pallets, walls,
    selectedItemId, setSelectedItem, scale, pan, showGrid, gridRows, gridCols, cellSize,
    activeCommLinks, placeAtCell, pendingPlaceType, appMode, activeTool, setPan, setScale,
    zoomIn, zoomOut, zoomFit,
  } = useWarehouseStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isMiddleMouseDown, setIsMiddleMouseDown] = useState(false);

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

  // Figma-style keyboard shortcuts & navigation
  useEffect(() => {
    const isEditingText = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (active as HTMLElement).isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingText()) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Figma Zoom shortcuts: Ctrl + '+' / '-' / '0'
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          zoomFit();
        }
      }

      // Figma View shortcuts: Shift + 1 (Fit View), Shift + 0 (Reset 100%)
      if (e.shiftKey) {
        if (e.key === '1' || e.code === 'Digit1') {
          e.preventDefault();
          zoomFit();
        } else if (e.key === '0' || e.code === 'Digit0') {
          e.preventDefault();
          setPan({ x: 40, y: 40 });
          setScale(1);
        }
      }

      // Arrow keys & WASD canvas panning
      const step = 40;
      if (e.code === 'ArrowLeft' || (e.code === 'KeyA' && !e.ctrlKey && !e.metaKey)) {
        setPan({ x: pan.x + step, y: pan.y });
      } else if (e.code === 'ArrowRight' || (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey)) {
        setPan({ x: pan.x - step, y: pan.y });
      } else if (e.code === 'ArrowUp' || (e.code === 'KeyW' && !e.ctrlKey && !e.metaKey)) {
        setPan({ x: pan.x, y: pan.y + step });
      } else if (e.code === 'ArrowDown' || (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey)) {
        setPan({ x: pan.x, y: pan.y - step });
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
  }, [pan, zoomIn, zoomOut, zoomFit, setPan, setScale]);

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

  const isPanActive = activeTool === 'pan' || isSpacePressed || isMiddleMouseDown;

  return (
    <div ref={containerRef} className="w-full h-full bg-[#e2e8f0] overflow-hidden relative">
      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-3 left-3 bg-panel/90 backdrop-blur-md border border-border rounded-md p-1 flex items-center gap-1 z-30 shadow-md">
        <button
          onClick={zoomIn}
          title="Zoom In (Ctrl + / =)"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out (Ctrl -)"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={zoomFit}
          title="Fit Map to View (Shift 1)"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors"
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={() => {
            setPan({ x: 40, y: 40 });
            setScale(1);
          }}
          title="Reset View (Shift 0)"
          className="p-1.5 text-text hover:text-accent hover:bg-app rounded-sm transition-colors border-l border-border pl-2"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          style={{
            background: '#e2e8f0',
            cursor: isPanActive ? (isMouseDown ? 'grabbing' : 'grab') : 'default',
          }}
          scale={{ x: scale, y: scale }}
          x={pan.x}
          y={pan.y}
          draggable={isPanActive}
          onMouseDown={(e) => {
            setIsMouseDown(true);
            if (e.evt.button === 1) {
              e.evt.preventDefault();
              setIsMiddleMouseDown(true);
            }
          }}
          onMouseUp={() => {
            setIsMouseDown(false);
            setIsMiddleMouseDown(false);
          }}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage()) {
              setPan({ x: e.target.x(), y: e.target.y() });
              setIsMouseDown(false);
            }
          }}
          onWheel={(e) => {
            e.evt.preventDefault();
            if (e.evt.shiftKey && !e.evt.ctrlKey) {
              setPan({ x: pan.x - e.evt.deltaY, y: pan.y - e.evt.deltaX });
              return;
            }
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

            {(() => {
              const uniqueLinksMap = new Map<string, { from: string; to: string; expires: number }>();
              activeCommLinks
                .filter((l) => l.to !== 'ALL' && l.to !== 'SYSTEM' && l.from !== l.to)
                .forEach((link) => {
                  const pairKey = [link.from, link.to].sort().join('<->');
                  const existing = uniqueLinksMap.get(pairKey);
                  if (!existing || link.expires > existing.expires) {
                    uniqueLinksMap.set(pairKey, link);
                  }
                });

              return Array.from(uniqueLinksMap.entries()).map(([pairKey, link], idx) => {
                const fromRobot = robots.find((r) => r.id === link.from);
                const toRobot = robots.find((r) => r.id === link.to);
                if (!fromRobot || !toRobot) return null;
                return (
                  <Line
                    key={`comm-link-${pairKey}-${link.expires}-${idx}`}
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
              });
            })()}
          </Layer>
        </Stage>
      )}
    </div>
  );
};
