'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Car, ShieldAlert, MapPin, Download, BatteryCharging, Layers, PackageOpen, Bot, LayoutGrid, Star,
  Truck, Cpu, Navigation, Cog, Zap, Target
} from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { PlaceableType } from '../../types/warehouse';

export type Category = 'ALL' | 'STARRED' | 'ROBOTS' | 'OBSTACLES' | 'DECORATIONS';

export interface PaletteItem {
  icon: any;
  label: string;
  type: PlaceableType;
  category: Exclude<Category, 'ALL' | 'STARRED'>;
  assetUrl?: string;
  fullName?: string;
  isNew?: boolean;
}

const ITEMS: PaletteItem[] = [
  // Built-in standard components
  { icon: Car, label: 'AMR Robot', type: 'ROBOT', category: 'ROBOTS' },
  { icon: Box, label: 'Shelf', type: 'SHELF', category: 'OBSTACLES' },
  { icon: ShieldAlert, label: 'Obstacle', type: 'OBSTACLE', category: 'OBSTACLES' },
  { icon: BatteryCharging, label: 'Charger', type: 'CHARGER', category: 'OBSTACLES' },
  { icon: Download, label: 'Pickup Point', type: 'PICKUP', category: 'DECORATIONS' },
  { icon: MapPin, label: 'Drop Point', type: 'DROP', category: 'DECORATIONS' },
  { icon: Layers, label: 'Pallet', type: 'PALLET', category: 'DECORATIONS' },

  // 3D Model Assets - Robots (each with distinct icon)
  { icon: Bot, label: 'Home Robot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/cute_home_robot.glb', fullName: 'cute_home_robot.glb' },
  { icon: Cpu, label: 'Cyber Robot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/cyberpunk_robot.glb', fullName: 'cyberpunk_robot.glb' },
  { icon: Navigation, label: 'Delivery Bot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/zeery_autonomous_delivery_robot.glb', fullName: 'zeery_autonomous_delivery_robot.glb' },
  { icon: Zap, label: 'LDR Robot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/robot_love_death_and_robots.glb', fullName: 'robot_love_death_and_robots.glb', isNew: true },

  // 3D Model Assets - Obstacles & Structures
  { icon: PackageOpen, label: 'Whse Shelving', type: 'SHELF', category: 'OBSTACLES', assetUrl: '/assets/warehouse_shelving_unit.glb', fullName: 'warehouse_shelving_unit.glb' },
  { icon: PackageOpen, label: 'Worn Shelf', type: 'SHELF', category: 'OBSTACLES', assetUrl: '/assets/worn_warehouse_shelf.glb', fullName: 'worn_warehouse_shelf.glb' },
  { icon: PackageOpen, label: 'Roundwood', type: 'OBSTACLE', category: 'OBSTACLES', assetUrl: '/assets/roundwood_warehouse.glb', fullName: 'roundwood_warehouse.glb' },
  { icon: BatteryCharging, label: 'EV Station', type: 'CHARGER', category: 'OBSTACLES', assetUrl: '/assets/electric_vehicle_charging_point_trydan.glb', fullName: 'electric_vehicle_charging_point_trydan.glb' },

  // 3D Model Assets - Decorations, Machinery & Logistics
  { icon: Cog, label: 'Sim Machine', type: 'OBSTACLE', category: 'DECORATIONS', assetUrl: '/assets/real_time_simulation_robot_machine.glb', fullName: 'real_time_simulation_robot_machine.glb', isNew: true },
  { icon: Target, label: 'Laser Machine', type: 'OBSTACLE', category: 'DECORATIONS', assetUrl: '/assets/simulation_laser_cutting_robot_systems.glb', fullName: 'simulation_laser_cutting_robot_systems.glb', isNew: true },
  { icon: Truck, label: 'Forklift', type: 'OBSTACLE', category: 'DECORATIONS', assetUrl: '/assets/warehouse_forklift_gameready.glb', fullName: 'warehouse_forklift_gameready.glb' },
  { icon: PackageOpen, label: 'Ind. Assets', type: 'OBSTACLE', category: 'DECORATIONS', assetUrl: '/assets/industrial_assets.glb', fullName: 'industrial_assets.glb', isNew: true },
  { icon: Layers, label: 'Concrete Bags', type: 'PALLET', category: 'DECORATIONS', assetUrl: '/assets/concrete_bags_and_pallet.glb', fullName: 'concrete_bags_and_pallet.glb' },
  { icon: PackageOpen, label: 'Container', type: 'OBSTACLE', category: 'DECORATIONS', assetUrl: '/assets/container.glb', fullName: 'container.glb' },
  { icon: PackageOpen, label: 'Conveyors', type: 'OBSTACLE', category: 'DECORATIONS', assetUrl: '/assets/conveyors_and_manipulator.glb', fullName: 'conveyors_and_manipulator.glb' },
  { icon: PackageOpen, label: 'Oil Drums', type: 'OBSTACLE', category: 'DECORATIONS', assetUrl: '/assets/oil_drums.glb', fullName: 'oil_drums.glb' },
  { icon: Layers, label: 'Pallet Barrels', type: 'PALLET', category: 'DECORATIONS', assetUrl: '/assets/pallet_barrels.glb', fullName: 'pallet_barrels.glb' },
  { icon: Layers, label: 'Std Pallet', type: 'PALLET', category: 'DECORATIONS', assetUrl: '/assets/pallet.glb', fullName: 'pallet.glb' },
];

const STARRED_STORAGE_KEY = 'amr-starred-models';

export const ComponentPalette: React.FC = () => {
  const appMode = useWarehouseStore((s) => s.appMode);
  const pendingPlaceType = useWarehouseStore((s) => s.pendingPlaceType);
  const pendingAssetUrl = useWarehouseStore((s) => s.pendingAssetUrl);
  const setPendingPlaceType = useWarehouseStore((s) => s.setPendingPlaceType);
  const [activeCategory, setActiveCategory] = useState<Category>('ALL');

  // Starred / Favorite models state
  const [starredLabels, setStarredLabels] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STARRED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleStar = (label: string) => {
    setStarredLabels((prev) => {
      const next = prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label];
      try {
        localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  if (appMode !== 'BUILDER') {
    return null;
  }

  const filteredItems = activeCategory === 'ALL'
    ? ITEMS
    : activeCategory === 'STARRED'
    ? ITEMS.filter((item) => starredLabels.includes(item.label))
    : ITEMS.filter((item) => item.category === activeCategory);

  const handleDragStart = (e: React.DragEvent, type: PlaceableType, assetUrl?: string) => {
    e.dataTransfer.setData('application/amr-type', type);
    if (assetUrl) {
      e.dataTransfer.setData('application/amr-asset-url', assetUrl);
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="max-w-4xl mx-auto my-1 bg-panel border border-border rounded-md shadow-md p-2 flex flex-col gap-1.5 z-20">
      {/* Top Header & Tabs */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
          Component Palette
          {ITEMS.some((i) => i.isNew) && (
            <span className="bg-accent text-white text-[8px] font-extrabold px-1 rounded-xs uppercase tracking-tight">
              +4 NEW MODELS
            </span>
          )}
        </span>

        {/* Categories */}
        <div className="flex items-center gap-1 bg-app border border-border rounded-sm p-0.5">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
              activeCategory === 'ALL' ? 'bg-accent text-white' : 'text-muted hover:text-text'
            }`}
          >
            <LayoutGrid size={11} /> All ({ITEMS.length})
          </button>
          <button
            onClick={() => setActiveCategory('STARRED')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
              activeCategory === 'STARRED' ? 'bg-amber-500 text-white' : 'text-muted hover:text-amber-600'
            }`}
          >
            <Star size={11} className={starredLabels.length > 0 ? "fill-amber-400 text-amber-400" : ""} /> Favorites ({starredLabels.length})
          </button>
          <button
            onClick={() => setActiveCategory('ROBOTS')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
              activeCategory === 'ROBOTS' ? 'bg-accent text-white' : 'text-muted hover:text-text'
            }`}
          >
            <Bot size={11} /> Robots
          </button>
          <button
            onClick={() => setActiveCategory('OBSTACLES')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
              activeCategory === 'OBSTACLES' ? 'bg-accent text-white' : 'text-muted hover:text-text'
            }`}
          >
            <Box size={11} /> Obstacles
          </button>
          <button
            onClick={() => setActiveCategory('DECORATIONS')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
              activeCategory === 'DECORATIONS' ? 'bg-accent text-white' : 'text-muted hover:text-text'
            }`}
          >
            <Layers size={11} /> Decorations
          </button>
        </div>
      </div>

      {/* Component Grid / Items */}
      <div className="flex gap-2 overflow-x-auto pb-1 max-w-full" style={{ scrollbarWidth: 'thin' }}>
        {filteredItems.length === 0 ? (
          <div className="text-[11px] text-muted italic px-4 py-3 text-center w-full">
            No models found in this category. Click the ⭐ icon on any item card to add it to Favorites.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isSelected = pendingPlaceType === item.type && pendingAssetUrl === (item.assetUrl || null);
            const isStarred = starredLabels.includes(item.label);

            return (
              <div
                key={`${item.label}-${idx}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item.type, item.assetUrl)}
                onClick={() => setPendingPlaceType(isSelected ? null : item.type, item.assetUrl)}
                className={`w-[88px] h-[55px] bg-workspace border rounded-sm flex flex-col items-center justify-center gap-0.5 flex-shrink-0 cursor-grab hover:border-accent hover:bg-white transition-all relative select-none ${
                  isSelected
                    ? 'border-accent bg-white ring-1 ring-accent'
                    : item.isNew
                    ? 'border-accent/60 bg-accent/5 hover:bg-white'
                    : 'border-border'
                }`}
                title={item.fullName || `Click to place ${item.label} or drag onto map`}
              >
                {/* NEW Model Highlight Badge */}
                {item.isNew && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[7px] font-extrabold px-1 rounded-xs uppercase tracking-tighter border border-white shadow-xs z-10">
                    NEW
                  </span>
                )}

                {/* Star Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(item.label);
                  }}
                  className="absolute top-0.5 left-0.5 p-0.5 rounded-full hover:bg-app transition-colors z-10"
                  title={isStarred ? "Remove from Favorites" : "Mark as Favorite (Star)"}
                >
                  <Star
                    size={11}
                    className={isStarred ? "fill-amber-400 text-amber-500" : "text-muted/40 hover:text-amber-500"}
                  />
                </button>

                <item.icon size={16} className={item.isNew ? "text-accent" : "text-text"} />
                <span className="text-[9px] font-semibold text-text text-center px-1 truncate w-full">
                  {item.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
