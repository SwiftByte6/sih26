'use client';

import React, { useState } from 'react';
import {
  Box, Car, ShieldAlert, MapPin, Download, BatteryCharging, Layers, PackageOpen, Bot, LayoutGrid, Star,
  Truck, Cpu, Navigation, Cog, Zap, Target, FolderOpen
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

  // 3D Model Assets - Robots
  { icon: Bot, label: 'Home Robot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/cute_home_robot.glb', fullName: 'cute_home_robot.glb' },
  { icon: Cpu, label: 'Cyber Robot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/cyberpunk_robot.glb', fullName: 'cyberpunk_robot.glb' },
  { icon: Navigation, label: 'Delivery Bot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/zeery_autonomous_delivery_robot.glb', fullName: 'zeery_autonomous_delivery_robot.glb' },
  { icon: Zap, label: 'LDR Robot', type: 'ROBOT', category: 'ROBOTS', assetUrl: '/assets/robot_love_death_and_robots.glb', fullName: 'robot_love_death_and_robots.glb', isNew: true },

  // 3D Model Assets - Obstacles & Structures
  { icon: PackageOpen, label: 'Whse Shelving', type: 'SHELF', category: 'OBSTACLES', assetUrl: '/assets/warehouse_shelving_unit.glb', fullName: 'warehouse_shelving_unit.glb' },
  { icon: PackageOpen, label: 'Worn Shelf', type: 'SHELF', category: 'OBSTACLES', assetUrl: '/assets/worn_warehouse_shelf.glb', fullName: 'worn_warehouse_shelf.glb' },
  { icon: PackageOpen, label: 'Roundwood', type: 'OBSTACLE', category: 'OBSTACLES', assetUrl: '/assets/roundwood_warehouse.glb', fullName: 'roundwood_warehouse.glb' },
  { icon: BatteryCharging, label: 'EV Station', type: 'CHARGER', category: 'OBSTACLES', assetUrl: '/assets/electric_vehicle_charging_point_trydan.glb', fullName: 'electric_vehicle_charging_point_trydan.glb' },

  // 3D Model Assets - Machinery & Logistics
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

  const categoriesConfig: { key: Category; label: string; icon: any; count: number }[] = [
    { key: 'ALL', label: 'All Components', icon: LayoutGrid, count: ITEMS.length },
    { key: 'STARRED', label: 'Favorites', icon: Star, count: starredLabels.length },
    { key: 'ROBOTS', label: 'Robots & Fleet', icon: Bot, count: ITEMS.filter((i) => i.category === 'ROBOTS').length },
    { key: 'OBSTACLES', label: 'Obstacles & Shelves', icon: Box, count: ITEMS.filter((i) => i.category === 'OBSTACLES').length },
    { key: 'DECORATIONS', label: 'Decorations & Machinery', icon: Layers, count: ITEMS.filter((i) => i.category === 'DECORATIONS').length },
  ];

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
    <div className="w-full bg-panel border-t border-border shadow-md px-3.5 py-2.5 flex items-center gap-3.5 z-20 select-none h-[64px]">
      {/* Icon-Only Category Selector */}
      <div className="bg-app border border-border rounded-lg px-2.5 py-1.5 flex items-center gap-2 h-full flex-shrink-0">
        <span className="text-[9px] font-bold tracking-wider uppercase text-muted pr-2 border-r border-border flex items-center gap-1.5">
          <FolderOpen size={14} className="text-accent" />
          <span className="hidden md:inline">Library</span>
        </span>

        {categoriesConfig.map((cat) => {
          const isActive = activeCategory === cat.key;
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`p-1.5 px-2 rounded-md transition-all relative flex items-center justify-center gap-1 ${
                isActive
                  ? 'bg-accent text-white shadow-xs border border-accent'
                  : 'text-text hover:bg-panel hover:text-accent bg-panel border border-border'
              }`}
              title={`${cat.label} (${cat.count})`}
            >
              <Icon size={15} className={isActive ? 'text-white' : 'text-accent'} />
              {cat.count > 0 && (
                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full font-mono leading-none ${
                  isActive ? 'bg-white text-accent' : 'bg-accent/15 text-accent border border-accent/30'
                }`}>
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Files & Models inside Selected Category */}
      <div className="flex-1 bg-app border border-border rounded-lg p-1.5 px-3 flex items-center justify-between h-full overflow-hidden min-w-0">
        <div className="hidden lg:flex flex-col justify-center px-2 flex-shrink-0 border-r border-border mr-2 max-w-[140px]">
          <span className="text-[9px] font-bold tracking-wider uppercase text-muted truncate">
            {categoriesConfig.find((c) => c.key === activeCategory)?.label}
          </span>
          <span className="text-[8px] text-muted truncate mt-0.5">
            {filteredItems.length} items available
          </span>
        </div>

        <div className="flex-1 flex items-center gap-2.5 overflow-x-auto overflow-y-hidden py-0.5 px-1" style={{ scrollbarWidth: 'thin' }}>
          {filteredItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[10px] text-muted italic px-3 text-center">
              No items in category. Click ⭐ on any card to add to Favorites.
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
                  className={`min-w-[92px] h-[42px] px-2.5 py-1 bg-panel border rounded-lg flex items-center gap-2 flex-shrink-0 cursor-grab hover:border-accent hover:bg-white hover:shadow-xs transition-all relative select-none ${
                    isSelected
                      ? 'border-accent bg-white ring-2 ring-accent/30 shadow-xs'
                      : item.isNew
                      ? 'border-accent/60 bg-accent/5 hover:bg-white'
                      : 'border-border'
                  }`}
                  title={item.fullName || item.label}
                >
                  {/* Star Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(item.label);
                    }}
                    className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-app transition-colors z-10"
                    title={isStarred ? "Remove from Favorites" : "Mark as Favorite"}
                  >
                    <Star
                      size={10}
                      className={isStarred ? "fill-amber-400 text-amber-500" : "text-muted/30 hover:text-amber-500"}
                    />
                  </button>

                  <div className="p-1 rounded-md bg-app flex items-center justify-center flex-shrink-0">
                    <item.icon size={15} className={item.isNew ? "text-accent" : "text-text"} />
                  </div>

                  <span className="text-[9px] font-bold text-text truncate max-w-[54px] leading-tight">
                    {item.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
