'use client';

import React from 'react';
import { Bot } from 'lucide-react';

export const TitleBar: React.FC = () => {
  return (
    <div className="h-7 bg-app flex items-center justify-between px-3 border-b border-border select-none">
      <div className="flex items-center gap-2">
        <Bot size={15} className="text-accent" />
        <span className="text-[12px] font-bold text-text tracking-wide">AMR Fleet & Warehouse Simulator</span>
        <span className="text-[10px] text-muted font-mono bg-workspace px-1.5 py-0.2 border border-border rounded-xs">v2.4</span>
      </div>
      <div className="text-[10px] text-muted font-mono">
        Industrial Autonomous Mobile Robot Platform
      </div>
    </div>
  );
};

