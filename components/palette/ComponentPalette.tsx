'use client';

import React from 'react';
import { Box, Car, ShieldAlert, MapPin, Download, BatteryCharging, Layers } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { PlaceableType } from '../../types/warehouse';

const PALETTE_ITEMS: { icon: typeof Car; label: string; type: PlaceableType }[] = [
  { icon: Car, label: 'AMR', type: 'ROBOT' },
  { icon: Box, label: 'SHELF', type: 'SHELF' },
  { icon: ShieldAlert, label: 'OBSTACLE', type: 'OBSTACLE' },
  { icon: Download, label: 'PICKUP', type: 'PICKUP' },
  { icon: MapPin, label: 'DROP', type: 'DROP' },
  { icon: BatteryCharging, label: 'CHARGER', type: 'CHARGER' },
  { icon: Layers, label: 'PALLET', type: 'PALLET' },
];

export const ComponentPalette: React.FC = () => {
  const appMode = useWarehouseStore((s) => s.appMode);
  const pendingPlaceType = useWarehouseStore((s) => s.pendingPlaceType);
  const setPendingPlaceType = useWarehouseStore((s) => s.setPendingPlaceType);
  const enabled = appMode === 'BUILDER';

  const handleDragStart = (e: React.DragEvent, type: PlaceableType) => {
    if (!enabled) return;
    e.dataTransfer.setData('application/amr-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-[100px] bg-panel border-t border-border p-2 flex flex-col">
      <div className="text-[10px] font-bold text-muted mb-2 tracking-wider">
        COMPONENTS {enabled ? '— drag onto 2D map or click then place on floor' : '— locked in Play'}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.label}
            draggable={enabled}
            onDragStart={(e) => handleDragStart(e, item.type)}
            onClick={() => enabled && setPendingPlaceType(pendingPlaceType === item.type ? null : item.type)}
            className={`w-[80px] h-[55px] bg-workspace border rounded-sm flex flex-col items-center justify-center gap-1 flex-shrink-0 ${
              enabled ? 'cursor-grab hover:border-accent hover:bg-white' : 'cursor-not-allowed opacity-50'
            } ${pendingPlaceType === item.type ? 'border-accent bg-white' : 'border-border'}`}
            title={enabled ? 'Drag to add, or click then click the floor' : 'Switch to Builder to place objects'}
          >
            <item.icon size={18} className="text-text" />
            <span className="text-[9px] font-semibold text-text">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
