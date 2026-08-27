'use client';

import React from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';

export const SimulationControls: React.FC = () => {
  const { isRunning, toggleSimulation, stopSimulation, resetSimulation } = useWarehouseStore();

  return (
    <div className="h-[36px] bg-toolbar border-t border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-1">
        <button 
          className="flex items-center gap-1 px-3 py-1 bg-accent text-white rounded-sm text-[11px] font-medium hover:bg-opacity-80"
          onClick={toggleSimulation}
        >
          <Play size={12} className="fill-current" /> RUN
        </button>
        <button className="flex items-center gap-1 px-3 py-1 bg-app text-text border border-border rounded-sm text-[11px] font-medium hover:bg-toolbar">
          <Pause size={12} className="fill-current" /> PAUSE
        </button>
        <button 
          className="flex items-center gap-1 px-3 py-1 bg-app text-text border border-border rounded-sm text-[11px] font-medium hover:bg-toolbar"
          onClick={stopSimulation}
        >
          <Square size={12} className="fill-current" /> STOP
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button 
          className="flex items-center gap-1 px-3 py-1 text-muted hover:text-text text-[11px] font-medium"
          onClick={resetSimulation}
        >
          <RotateCcw size={12} /> RESET
        </button>
        <span className="text-[11px] font-mono text-muted ml-2">SPEED: 1x</span>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-mono text-text">
        <div className="flex items-center gap-1"><span className="text-muted">Robots:</span> 3</div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1"><span className="text-muted">Active:</span> 3</div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1"><span className="text-muted">Tasks:</span> 8</div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1"><span className="text-muted">Completed:</span> 5</div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1"><span className="text-muted">Collisions:</span> <span className="text-success">0</span></div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1"><span className="text-muted">Efficiency:</span> <span className="text-success">+24%</span></div>
      </div>
    </div>
  );
};

