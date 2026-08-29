'use client';

import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { PlaceableType } from '../../types/warehouse';

export const BuilderSidebar: React.FC = () => {
  const appMode = useWarehouseStore((s) => s.appMode);
  const pendingPlaceType = useWarehouseStore((s) => s.pendingPlaceType);
  const setPendingPlaceType = useWarehouseStore((s) => s.setPendingPlaceType);
  const applyLayout = useWarehouseStore((s) => s.applyLayout);
  const validationIssues = useWarehouseStore((s) => s.validationIssues);
  const viewMode = useWarehouseStore((s) => s.viewMode);

  if (appMode !== 'BUILDER') return null;

  const handleDragStart = (e: React.DragEvent, type: PlaceableType) => {
    e.dataTransfer.setData('application/amr-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const draggables: { id: PlaceableType; label: string; icon: string; color: string }[] = [
    { id: 'SHELF', label: 'Shelf (6x2)', icon: 'S', color: '#9AA7B2' },
    { id: 'ROBOT', label: 'Robot AMR', icon: 'R', color: '#22c55e' },
    { id: 'CHARGER', label: 'Charger', icon: 'C', color: '#eab308' },
    { id: 'PICKUP', label: 'Pickup Point', icon: 'P', color: '#3b82f6' },
    { id: 'DROP', label: 'Drop Point', icon: 'D', color: '#10b981' },
    { id: 'OBSTACLE', label: 'Obstacle (2x2)', icon: '!', color: '#C83E3E' },
    { id: 'PALLET', label: 'Pallet', icon: '=', color: '#c4a574' },
  ];

  const errors = validationIssues.filter((i) => i.severity === 'error');
  const warnings = validationIssues.filter((i) => i.severity === 'warning');

  return (
    <div className="w-56 bg-panel border-r border-border p-3 overflow-y-auto flex flex-col gap-3 flex-shrink-0">
      <h2 className="text-text font-bold text-[11px] tracking-wide uppercase">Warehouse Builder</h2>
      <p className="text-[11px] text-muted">
        {viewMode === '3D'
          ? 'Click an item, then click the floor. Drag gizmos to move. Snap is grid-based.'
          : 'Drag items onto the 2D map. They snap to the grid and stay inside the warehouse.'}
      </p>

      <div className="flex flex-col gap-2">
        {draggables.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onClick={() => setPendingPlaceType(pendingPlaceType === item.id ? null : item.id)}
            className={`flex items-center gap-2 p-2 bg-workspace border rounded cursor-grab ${
              pendingPlaceType === item.id ? 'border-accent' : 'border-border'
            }`}
          >
            <div className="w-7 h-7 rounded flex items-center justify-center font-bold text-white text-[11px]" style={{ backgroundColor: item.color }}>
              {item.icon}
            </div>
            <span className="text-[12px] font-medium text-text">{item.label}</span>
          </div>
        ))}
      </div>

      <button
        className="mt-2 px-3 py-2 bg-success text-white text-[12px] font-semibold rounded-sm hover:bg-opacity-90"
        onClick={() => applyLayout()}
      >
        APPLY LAYOUT / PLAY
      </button>

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="flex flex-col gap-1.5 mt-1">
          {errors.map((issue, i) => (
            <div key={`e-${i}`} className="text-[11px] text-danger bg-white border border-danger/40 p-2 rounded-sm">
              {issue.message}
            </div>
          ))}
          {warnings.map((issue, i) => (
            <div key={`w-${i}`} className="text-[11px] text-warning bg-white border border-warning/40 p-2 rounded-sm">
              {issue.message}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted mt-2">
        Select an object, then press Delete. Play mode locks editing; simulation owns robot motion.
      </p>
    </div>
  );
};
