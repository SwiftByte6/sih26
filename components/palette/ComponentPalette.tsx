'use client';

import React from 'react';
import { Box, Car, ShieldAlert, MapPin, Download, BatteryCharging, Circle, AlignJustify, Spline } from 'lucide-react';

const PALETTE_ITEMS = [
  { icon: Car, label: 'AMR', type: 'ROBOT' },
  { icon: Box, label: 'SHELF', type: 'SHELF' },
  { icon: ShieldAlert, label: 'OBSTACLE', type: 'OBSTACLE', draggable: true },
  { icon: Download, label: 'PICKUP', type: 'POI' },
  { icon: MapPin, label: 'DROP', type: 'POI' },
  { icon: BatteryCharging, label: 'CHARGER', type: 'POI' },
  { icon: Circle, label: 'INTERSECTION', type: 'INTERSECTION' },
  { icon: AlignJustify, label: 'WALL', type: 'WALL' },
  { icon: Spline, label: 'PATH', type: 'PATH' }
];

export const ComponentPalette: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/amr-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-[100px] bg-panel border-t border-border p-2 flex flex-col">
      <div className="text-[10px] font-bold text-muted mb-2 tracking-wider">COMPONENTS</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PALETTE_ITEMS.map((item) => (
          <div 
            key={item.label}
            draggable={item.draggable}
            onDragStart={(e) => item.draggable && handleDragStart(e, item.type)}
            className={`w-[80px] h-[55px] bg-workspace border border-border rounded-sm flex flex-col items-center justify-center gap-1 hover:border-accent hover:bg-white transition-colors flex-shrink-0 ${item.draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-50'}`}
            title={!item.draggable ? 'Not implemented for demo' : 'Drag to add'}
          >
            <item.icon size={18} className="text-text" />
            <span className="text-[9px] font-semibold text-text">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
