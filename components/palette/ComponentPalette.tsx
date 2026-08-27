'use client';

import React from 'react';
import { Box, Car, ShieldAlert, MapPin, Download, BatteryCharging, Circle, AlignJustify, Spline } from 'lucide-react';

const PALETTE_ITEMS = [
  { icon: Car, label: 'AMR' },
  { icon: Box, label: 'SHELF' },
  { icon: ShieldAlert, label: 'OBSTACLE' },
  { icon: Download, label: 'PICKUP' },
  { icon: MapPin, label: 'DROP' },
  { icon: BatteryCharging, label: 'CHARGER' },
  { icon: Circle, label: 'INTERSECTION' },
  { icon: AlignJustify, label: 'WALL' },
  { icon: Spline, label: 'PATH' }
];

export const ComponentPalette: React.FC = () => {
  return (
    <div className="h-[100px] bg-panel border-t border-border p-2 flex flex-col">
      <div className="text-[10px] font-bold text-muted mb-2 tracking-wider">COMPONENTS</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PALETTE_ITEMS.map((item) => (
          <div 
            key={item.label}
            className="w-[80px] h-[55px] bg-workspace border border-border rounded-sm flex flex-col items-center justify-center gap-1 cursor-grab hover:border-accent hover:bg-white transition-colors flex-shrink-0"
          >
            <item.icon size={18} className="text-text" />
            <span className="text-[9px] font-semibold text-text">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

