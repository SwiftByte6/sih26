import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useP2PStore } from '../../store/p2pStore';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const p2pNodes = useP2PStore((state) => state.nodes);
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
  const duplicateSelected = useWarehouseStore((s) => s.duplicateSelected);

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
          <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
            Position & Coordinates
          </div>
          <div className="grid grid-cols-3 gap-1">
            <Num label="World X" value={Number(world.x.toFixed(1))} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { col: Math.round(v / cellSize - width / 2) })} />
            <Num label="World Y" value={t.posY ?? 0} step={0.5} onChange={(v) => applyTransform(kind, id, { posY: Math.max(0, v) })} />
            <Num label="World Z" value={Number(world.z.toFixed(1))} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { row: Math.round(v / cellSize - height / 2) })} />
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1.5">
            <Num label="Grid Col" value={col} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { col: v })} />
            <Num label="Grid Row" value={row} disabled={lockPos} onChange={(v) => applyTransform(kind, id, { row: v })} />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
            Rotation (°)
          </div>
          <div className="grid grid-cols-3 gap-1">
            <Num label="X" value={t.rotX ?? 0} onChange={(v) => applyTransform(kind, id, { rotX: v })} />
            <Num label="Y" value={t.rotY ?? 0} onChange={(v) => applyTransform(kind, id, { rotY: v })} />
            <Num label="Z" value={t.rotZ ?? 0} onChange={(v) => applyTransform(kind, id, { rotZ: v })} />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
            Scale Factors
          </div>
          <div className="grid grid-cols-3 gap-1">
            <Num label="X" value={scale.x} step={0.1} onChange={(v) => applyTransform(kind, id, { scale: { ...scale, x: Math.max(0.2, v) } })} />
            <Num label="Y" value={scale.y} step={0.1} onChange={(v) => applyTransform(kind, id, { scale: { ...scale, y: Math.max(0.2, v) } })} />
            <Num label="Z" value={scale.z} step={0.1} onChange={(v) => applyTransform(kind, id, { scale: { ...scale, z: Math.max(0.2, v) } })} />
          </div>
        </div>
      </div>
    );
  };

  const p2pNode = selectedRobot ? p2pNodes[selectedRobot.id] : null;
  const nodeId = p2pNode ? p2pNode.nodeId : `amr-node-${selectedRobot?.id.toLowerCase()}`;

  return (
    <div
      className={`bg-panel border-l border-border flex flex-col flex-shrink-0 relative transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isCollapsed ? 'w-[36px]' : 'w-[240px]'
      }`}
    >
      <div className="h-[30px] border-b border-border flex items-center justify-between px-2 bg-app select-none overflow-hidden">
        {!isCollapsed && (
          <span className="text-[11px] font-bold text-text tracking-wider truncate">INSPECTOR</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-toolbar text-muted hover:text-text transition-colors flex items-center justify-center ml-auto"
          title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {isCollapsed ? (
        <div
          className="flex-1 flex flex-col items-center py-4 cursor-pointer text-muted hover:text-text select-none"
          onClick={() => setIsCollapsed(false)}
          title="Click to expand Inspector"
        >
          <span className="text-[10px] font-bold tracking-widest uppercase [writing-mode:vertical-lr] rotate-180">
            INSPECTOR
          </span>
        </div>
      ) : (
        <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-4 text-[12px] text-text">
        {builder && (
          <div className="flex flex-col gap-2 pb-3 border-b border-border">
            <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-1">
              Transform Gizmo & Snap
            </div>
            <div className="flex gap-1">
              {(['translate', 'rotate', 'scale'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTransformMode(m)}
                  className={`flex-1 px-1 py-1 text-[10px] rounded-sm border capitalize font-semibold transition-colors ${
                    transformMode === m ? 'bg-accent text-white border-accent' : 'bg-workspace border-border text-muted hover:text-text'
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
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Selected Object
              </div>
              <div className="font-bold text-[14px] text-accent">FLOOR / CANVAS</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Dimensions
              </div>
              <div className="flex flex-col gap-2">
                <Num label="Width (cells)" value={gridCols} disabled={!builder} onChange={(v) => setWarehouseSize(v, gridRows)} />
                <Num label="Depth (cells)" value={gridRows} disabled={!builder} onChange={(v) => setWarehouseSize(gridCols, v)} />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-1">
                Constraints & Boundary
              </div>
              <div className="text-[10px] text-muted leading-relaxed">
                Outer walls automatically align to grid edges. Placed objects are clamped within boundary.
              </div>
            </div>
          </div>
        )}

        {selectedWall && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Selected Object
              </div>
              <div className="font-bold text-[14px]">WALL ({selectedWall.side})</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Dimensions
              </div>
              <div className="flex flex-col gap-2">
                <Num label="Height" value={selectedWall.height} disabled={!builder} onChange={(v) => updateWall(selectedWall.id, { height: v })} />
                <Num label="Thickness" value={selectedWall.thickness} disabled={!builder} onChange={(v) => updateWall(selectedWall.id, { thickness: v })} />
              </div>
            </div>
          </div>
        )}

        {selectedRobot && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Selected Object
              </div>
              <div className="font-bold text-[14px] text-accent">ROBOT</div>
              <div className="font-mono mt-1 font-bold">ID: {selectedRobot.id}</div>
              <div className="font-mono text-[11px] text-muted">Node ID: {nodeId}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Status & Telemetry
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted font-semibold">State:</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${selectedRobot.state === 'MOVING' ? 'bg-accent' : selectedRobot.state === 'WAITING' ? 'bg-warning' : 'bg-success'}`} />
                  <span className="capitalize font-mono font-bold">{selectedRobot.state.toLowerCase()}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 mb-2">
                <span className="text-[10px] text-muted font-semibold">Battery</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-app rounded-xs overflow-hidden border border-border">
                    <div
                      className={`h-full ${selectedRobot.battery > 50 ? 'bg-success' : selectedRobot.battery > 20 ? 'bg-warning' : 'bg-danger'}`}
                      style={{ width: `${selectedRobot.battery}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-bold">{Math.round(selectedRobot.battery)}%</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted font-semibold">Current Task</span>
                <div className="font-mono bg-workspace p-1.5 border border-border rounded-xs mt-0.5 text-[11px] truncate">{selectedRobot.currentTask || 'Idle / Unassigned'}</div>
              </div>
              {selectedRobot.targetChargerId && (
                <div className="mt-2 text-[10px] font-mono bg-purple-50 p-1.5 border border-purple-200 rounded text-purple-800">
                  ⚡ Target Charger: <span className="font-bold">{selectedRobot.targetChargerId}</span>
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Hardware Capabilities
              </div>
              <div className="flex flex-col gap-1 text-[11px] font-mono bg-workspace p-2 border border-border rounded-xs">
                <div className="flex justify-between"><span>Capability:</span> <span className="font-bold">{selectedRobot.deliveryCapability || 'Transport'}</span></div>
                <div className="flex justify-between"><span>Payload Cap:</span> <span>{selectedRobot.payloadCapacity ?? 20} kg</span></div>
                <div className="flex justify-between"><span>Current Load:</span> <span>{selectedRobot.currentLoad ?? 0} kg</span></div>
                <div className="flex justify-between"><span>Sensing Range:</span> <span>{selectedRobot.sensingRadius ?? 5} m</span></div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                P2P Network Telemetry
              </div>
              <div className="flex flex-col gap-1 text-[11px] font-mono bg-workspace p-2 border border-border rounded-xs">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className="font-bold text-success">CONNECTED</span>
                </div>
                <div className="flex justify-between">
                  <span>Signal Quality:</span>
                  <span>{selectedRobot.signalStrength ?? 95}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Core Temp:</span>
                  <span>{selectedRobot.temperature ?? 36}°C</span>
                </div>
              </div>
            </div>
            {transformFields('ROBOT', selectedRobot.id, selectedRobot.row, selectedRobot.col, 1, 1, selectedRobot)}
          </div>
        )}

        {selectedObstacle && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Selected Object
              </div>
              <div className="font-bold text-[14px]">OBSTACLE</div>
              <div className="font-mono mt-1">ID: {selectedObstacle.id}</div>
            </div>
            {transformFields('OBSTACLE', selectedObstacle.id, selectedObstacle.row, selectedObstacle.col, selectedObstacle.width, selectedObstacle.height, selectedObstacle)}
          </div>
        )}

        {selectedShelf && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Selected Object
              </div>
              <div className="font-bold text-[14px]">STORAGE SHELF</div>
              <div className="font-mono mt-1">ID: {selectedShelf.id}</div>
            </div>
            {transformFields('SHELF', selectedShelf.id, selectedShelf.row, selectedShelf.col, selectedShelf.width, selectedShelf.height, selectedShelf)}
          </div>
        )}

        {selectedPoi && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Selected Object
              </div>
              <div className="font-bold text-[14px]">{selectedPoi.type}</div>
              <div className="font-mono mt-1">{selectedPoi.label}</div>
            </div>
            {selectedPoi.type === 'CHARGER' && (
              <div className="text-[11px] font-mono bg-workspace p-2 border border-border rounded-xs flex flex-col gap-1">
                <div className="text-[10px] font-bold text-muted tracking-wider uppercase mb-1">Charger Telemetry</div>
                {(() => {
                  const charger = useWarehouseStore.getState().chargers.find(c => c.id === selectedPoi.id);
                  return (
                    <>
                      <div className="flex justify-between"><span>Status:</span> <span className="font-bold text-accent">{charger?.state || 'AVAILABLE'}</span></div>
                      <div className="flex justify-between"><span>Reserved By:</span> <span>{charger?.reservedBy || 'None'}</span></div>
                      <div className="flex justify-between"><span>Occupied By:</span> <span>{charger?.occupiedBy || 'None'}</span></div>
                    </>
                  );
                })()}
              </div>
            )}
            {transformFields('POI', selectedPoi.id, selectedPoi.row, selectedPoi.col, 1, 1, selectedPoi)}
          </div>
        )}

        {selectedPallet && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-bold text-muted tracking-wider uppercase border-b border-border pb-1 mb-2">
                Selected Object
              </div>
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
          <div className="flex gap-2 w-full mt-4 pt-2 border-t border-border">
            <button onClick={duplicateSelected} className="px-3 py-1.5 bg-workspace border border-border text-text rounded-xs hover:bg-app font-semibold text-[11px] w-full transition-colors">
              Duplicate
            </button>
            <button onClick={deleteSelected} className="px-3 py-1.5 bg-danger text-white rounded-xs hover:bg-opacity-90 font-semibold text-[11px] w-full transition-colors">
              Delete
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
