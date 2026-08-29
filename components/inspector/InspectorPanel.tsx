'use client';

import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { simulationToWorld } from '../../lib/coords';
import { ObjectTransform } from '../../types/warehouse';

function Num({
  label,
  value,
  onChange,
  step = 1,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-0.5 text-[10px] text-muted font-semibold">
      {label}
      <input
        type="number"
        step={step}
        disabled={disabled}
        className="font-mono bg-workspace p-1.5 border border-border rounded-sm text-text text-[12px] disabled:opacity-50"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export const InspectorPanel: React.FC = () => {
  const selectedItemId = useWarehouseStore((s) => s.selectedItemId);
  const selectedItemType = useWarehouseStore((s) => s.selectedItemType);
  const robots = useWarehouseStore((s) => s.robots);
  const obstacles = useWarehouseStore((s) => s.obstacles);
  const shelves = useWarehouseStore((s) => s.shelves);
  const pois = useWarehouseStore((s) => s.pois);
  const pallets = useWarehouseStore((s) => s.pallets);
  const walls = useWarehouseStore((s) => s.walls);
  const cellSize = useWarehouseStore((s) => s.cellSize);
  const gridCols = useWarehouseStore((s) => s.gridCols);
  const gridRows = useWarehouseStore((s) => s.gridRows);
  const appMode = useWarehouseStore((s) => s.appMode);
  const transformMode = useWarehouseStore((s) => s.transformMode);
  const setTransformMode = useWarehouseStore((s) => s.setTransformMode);
  const gridSnap = useWarehouseStore((s) => s.gridSnap);
  const setGridSnap = useWarehouseStore((s) => s.setGridSnap);
  const setWarehouseSize = useWarehouseStore((s) => s.setWarehouseSize);
  const updateWall = useWarehouseStore((s) => s.updateWall);
  const updateShelf = useWarehouseStore((s) => s.updateShelf);
  const updateObstacle = useWarehouseStore((s) => s.updateObstacle);
  const updatePallet = useWarehouseStore((s) => s.updatePallet);
  const updatePoi = useWarehouseStore((s) => s.updatePoi);
  const updateRobot = useWarehouseStore((s) => s.updateRobot);
  const deleteSelected = useWarehouseStore((s) => s.deleteSelected);

  const selectedRobot = selectedItemType === 'ROBOT' ? robots.find((r) => r.id === selectedItemId) : null;
  const selectedObstacle = selectedItemType === 'OBSTACLE' ? obstacles.find((o) => o.id === selectedItemId) : null;
  const selectedShelf = selectedItemType === 'SHELF' ? shelves.find((s) => s.id === selectedItemId) : null;
  const selectedPoi = selectedItemType === 'POI' ? pois.find((p) => p.id === selectedItemId) : null;
  const selectedPallet = selectedItemType === 'PALLET' ? pallets.find((p) => p.id === selectedItemId) : null;
  const selectedWall = selectedItemType === 'WALL' ? walls.find((w) => w.id === selectedItemId) : null;
  const selectedFloor = selectedItemType === 'FLOOR';

  const builder = appMode === 'BUILDER';
  const playLocksMove = appMode === 'PLAY';

  const applyTransform = (
    kind: 'SHELF' | 'OBSTACLE' | 'PALLET' | 'POI' | 'ROBOT',
    id: string,
    patch: Partial<ObjectTransform> & { row?: number; col?: number }
  ) => {
    if (kind === 'SHELF') updateShelf(id, patch);
    if (kind === 'OBSTACLE') updateObstacle(id, patch);
    if (kind === 'PALLET') updatePallet(id, patch);
    if (kind === 'POI') updatePoi(id, patch);
    if (kind === 'ROBOT') updateRobot(id, patch);
  };

  const transformFields = (
    kind: 'SHELF' | 'OBSTACLE' | 'PALLET' | 'POI' | 'ROBOT',
    id: string,
    row: number,
    col: number,
    width: number,
    height: number,
    t: Partial<ObjectTransform>
  ) => {
    const world = simulationToWorld(row, col, cellSize, { width, height });
    const scale = t.scale ?? { x: 1, y: 1, z: 1 };
    const lockPos = playLocksMove && kind === 'ROBOT';
    return (
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-[10px] text-muted font-semibold mb-1">Position (world / grid)</div>
          <div className="grid grid-cols-3 gap-1">
            <Num label="X" value={Number(world.x.toFixed(1))} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { col: Math.round(v / cellSize - width / 2) })} />
            <Num label="Y" value={t.posY ?? 0} step={0.5} onChange={(v) => applyTransform(kind, id, { posY: Math.max(0, v) })} />
            <Num label="Z" value={Number(world.z.toFixed(1))} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { row: Math.round(v / cellSize - height / 2) })} />
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <Num label="Col" value={col} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { col: v })} />
            <Num label="Row" value={row} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { row: v })} />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted font-semibold mb-1">Rotation (°)</div>
          <div className="grid grid-cols-3 gap-1">
            <Num label="X" value={t.rotX ?? 0} onChange={(v) => applyTransform(kind, id, { rotX: v })} />
            <Num label="Y" value={t.rotY ?? 0} onChange={(v) => applyTransform(kind, id, { rotY: v })} />
            <Num label="Z" value={t.rotZ ?? 0} onChange={(v) => applyTransform(kind, id, { rotZ: v })} />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted font-semibold mb-1">Scale</div>
          <div className="grid grid-cols-3 gap-1">
            <Num label="X" value={scale.x} step={0.1} onChange={(v) => applyTransform(kind, id, { scale: { ...scale, x: Math.max(0.2, v) } })} />
            <Num label="Y" value={scale.y} step={0.1} onChange={(v) => applyTransform(kind, id, { scale: { ...scale, y: Math.max(0.2, v) } })} />
            <Num label="Z" value={scale.z} step={0.1} onChange={(v) => applyTransform(kind, id, { scale: { ...scale, z: Math.max(0.2, v) } })} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[240px] bg-panel border-l border-border flex flex-col flex-shrink-0">
      <div className="h-[30px] border-b border-border flex items-center px-3 bg-app">
        <span className="text-[11px] font-bold text-text tracking-wider">INSPECTOR</span>
      </div>

      <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-4 text-[12px] text-text">
        {builder && (
          <div className="flex flex-col gap-2 pb-3 border-b border-border">
            <div className="text-[10px] text-muted font-semibold">Gizmo</div>
            <div className="flex gap-1">
              {(['translate', 'rotate', 'scale'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTransformMode(m)}
                  className={`flex-1 px-1 py-1 text-[10px] rounded-sm border capitalize ${
                    transformMode === m ? 'bg-accent text-white border-accent' : 'bg-workspace border-border'
                  }`}
                >
                  {m === 'translate' ? 'Move' : m === 'rotate' ? 'Rotate' : 'Scale'}
                </button>
              ))}
            </div>
            <Num label="Grid snap (cells)" value={gridSnap} onChange={setGridSnap} />
          </div>
        )}

        {selectedFloor && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">FLOOR</div>
            </div>
            <Num label="Warehouse width (cells)" value={gridCols} disabled={!builder} onChange={(v) => setWarehouseSize(v, gridRows)} />
            <Num label="Warehouse depth (cells)" value={gridRows} disabled={!builder} onChange={(v) => setWarehouseSize(gridCols, v)} />
            <div className="text-[10px] text-muted">Walls stay aligned to this boundary. Objects are clamped inside.</div>
          </div>
        )}

        {selectedWall && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">WALL {selectedWall.side}</div>
            </div>
            <Num label="Height" value={selectedWall.height} disabled={!builder} onChange={(v) => updateWall(selectedWall.id, { height: v })} />
            <Num label="Thickness" value={selectedWall.thickness} disabled={!builder} onChange={(v) => updateWall(selectedWall.id, { thickness: v })} />
          </div>
        )}

        {selectedRobot && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">ROBOT</div>
              <div className="font-mono mt-1">ID: {selectedRobot.id}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Status</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${selectedRobot.state === 'MOVING' ? 'bg-accent' : selectedRobot.state === 'WAITING' ? 'bg-warning' : 'bg-success'}`} />
                <span className="capitalize">{selectedRobot.state.toLowerCase()}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Battery</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-app rounded-sm overflow-hidden border border-border">
                  <div className="h-full bg-success" style={{ width: `${selectedRobot.battery}%` }} />
                </div>
                <span className="font-mono text-[11px]">{Math.round(selectedRobot.battery)}%</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Current Task</div>
              <div className="font-mono bg-workspace p-1.5 border border-border rounded-sm">{selectedRobot.currentTask || 'None'}</div>
            </div>
            {transformFields('ROBOT', selectedRobot.id, selectedRobot.row, selectedRobot.col, 1, 1, selectedRobot)}
          </div>
        )}

        {selectedObstacle && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">OBSTACLE</div>
              <div className="font-mono mt-1">ID: {selectedObstacle.id}</div>
            </div>
            {transformFields('OBSTACLE', selectedObstacle.id, selectedObstacle.row, selectedObstacle.col, selectedObstacle.width, selectedObstacle.height, selectedObstacle)}
          </div>
        )}

        {selectedShelf && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">SHELF</div>
              <div className="font-mono mt-1">ID: {selectedShelf.id}</div>
            </div>
            {transformFields('SHELF', selectedShelf.id, selectedShelf.row, selectedShelf.col, selectedShelf.width, selectedShelf.height, selectedShelf)}
          </div>
        )}

        {selectedPoi && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">{selectedPoi.type}</div>
              <div className="font-mono mt-1">{selectedPoi.label}</div>
            </div>
            {transformFields('POI', selectedPoi.id, selectedPoi.row, selectedPoi.col, 1, 1, selectedPoi)}
          </div>
        )}

        {selectedPallet && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">PALLET</div>
              <div className="font-mono mt-1">ID: {selectedPallet.id}</div>
            </div>
            {transformFields('PALLET', selectedPallet.id, selectedPallet.row, selectedPallet.col, selectedPallet.width, selectedPallet.height, selectedPallet)}
          </div>
        )}

        {!selectedRobot && !selectedObstacle && !selectedShelf && !selectedPoi && !selectedPallet && !selectedWall && !selectedFloor && (
          <div className="text-center text-muted text-[12px] italic mt-6">Select an object on the map to inspect properties.</div>
        )}

        {builder && selectedItemId && selectedItemType && selectedItemType !== 'FLOOR' && selectedItemType !== 'WALL' && (
          <button onClick={deleteSelected} className="px-4 py-1.5 bg-danger text-white rounded-sm hover:bg-opacity-80 font-medium w-full transition-colors">
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
