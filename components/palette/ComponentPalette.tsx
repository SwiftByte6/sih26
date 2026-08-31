'use client';

import React from 'react';
import { Box, Car, ShieldAlert, MapPin, Download, BatteryCharging, Layers, PackageOpen } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { PlaceableType } from '../../types/warehouse';

const PALETTE_ITEMS: { icon: typeof Car; label: string; type: PlaceableType; assetUrl?: string; fullName?: string }[] = [
  { icon: Car, label: 'AMR', type: 'ROBOT' },
  { icon: Box, label: 'SHELF', type: 'SHELF' },
  { icon: ShieldAlert, label: 'OBSTACLE', type: 'OBSTACLE' },
  { icon: Download, label: 'PICKUP', type: 'PICKUP' },
  { icon: MapPin, label: 'DROP', type: 'DROP' },
  { icon: BatteryCharging, label: 'CHARGER', type: 'CHARGER' },
  { icon: Layers, label: 'PALLET', type: 'PALLET' },
];

const ASSET_ITEMS: { icon: typeof Car; label: string; type: PlaceableType; assetUrl: string; fullName: string }[] = [
  "concrete_bags_and_pallet.glb",
  "container.glb",
  "conveyors_and_manipulator.glb",
  "cute_home_robot.glb",
  "cyberpunk_robot.glb",
  "electric_vehicle_charging_point_trydan.glb",
  "oil_drums.glb",
  "pallet.glb",
  "pallet_barrels.glb",
  "roundwood_warehouse.glb",
  "warehouse_forklift_gameready.glb",
  "warehouse_shelving_unit.glb",
  "worn_warehouse_shelf.glb",
  "zeery_autonomous_delivery_robot.glb"
].map(file => ({
  icon: PackageOpen,
  label: file.replace('.glb', '').replace(/_/g, ' ').substring(0, 12) + (file.length > 15 ? '...' : ''),
  type: 'OBSTACLE' as PlaceableType,
  assetUrl: `/assets/${file}`,
  fullName: file
}));

const ALL_ITEMS = [...PALETTE_ITEMS, ...ASSET_ITEMS];

export const ComponentPalette: React.FC = () => {
  const appMode = useWarehouseStore((s) => s.appMode);
  const pendingPlaceType = useWarehouseStore((s) => s.pendingPlaceType);
  const pendingAssetUrl = useWarehouseStore((s) => s.pendingAssetUrl);
  const setPendingPlaceType = useWarehouseStore((s) => s.setPendingPlaceType);
  const enabled = appMode === 'BUILDER';

  const handleDragStart = (e: React.DragEvent, type: PlaceableType, assetUrl?: string) => {
    if (!enabled) return;
    e.dataTransfer.setData('application/amr-type', type);
    if (assetUrl) {
      e.dataTransfer.setData('application/amr-asset-url', assetUrl);
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-[100px] bg-panel border-t border-border p-2 flex flex-col">
      <div className="text-[10px] font-bold text-muted mb-2 tracking-wider">
        COMPONENTS {enabled ? '— drag onto 2D map or click then place on floor' : '— locked in Play'}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {ALL_ITEMS.map((item, idx) => {
          const isSelected = pendingPlaceType === item.type && pendingAssetUrl === (item.assetUrl || null);
          return (
            <div
              key={`${item.label}-${idx}`}
              draggable={enabled}
              onDragStart={(e) => handleDragStart(e, item.type, item.assetUrl)}
              onClick={() => enabled && setPendingPlaceType(isSelected ? null : item.type, item.assetUrl)}
              className={`w-[80px] h-[55px] bg-workspace border rounded-sm flex flex-col items-center justify-center gap-1 flex-shrink-0 ${
                enabled ? 'cursor-grab hover:border-accent hover:bg-white' : 'cursor-not-allowed opacity-50'
              } ${isSelected ? 'border-accent bg-white' : 'border-border'}`}
              title={enabled ? (item.fullName || 'Drag to add, or click then click the floor') : 'Switch to Builder to place objects'}
            >
              <item.icon size={18} className="text-text" />
              <span className="text-[9px] font-semibold text-text text-center px-1 truncate w-full">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
