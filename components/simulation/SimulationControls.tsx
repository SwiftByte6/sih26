'use client';

import React from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useTaskStore } from '../../store/taskStore';

export const SimulationControls: React.FC = () => {
  const isRunning = useWarehouseStore((s) => s.isRunning);
  const appMode = useWarehouseStore((s) => s.appMode);
  const startSimulation = useWarehouseStore((s) => s.startSimulation);
  const pauseSimulation = useWarehouseStore((s) => s.pauseSimulation);
  const stopSimulation = useWarehouseStore((s) => s.stopSimulation);
  const resetSimulation = useWarehouseStore((s) => s.resetSimulation);
  const simSpeed = useWarehouseStore((s) => s.simSpeed);
  const setSimSpeed = useWarehouseStore((s) => s.setSimSpeed);
  const robots = useWarehouseStore((s) => s.robots);
  const tasks = useTaskStore((s) => s.tasks);

  const play = appMode === 'PLAY';
  const active = robots.filter((r) => r.state === 'MOVING').length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="h-[36px] bg-toolbar border-t border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 px-3 py-1 bg-accent text-white rounded-sm text-[11px] font-medium hover:bg-opacity-80 disabled:opacity-40"
          onClick={startSimulation}
          disabled={!play && false}
          title={play ? 'Start simulation' : 'Validates layout, then starts Play'}
        >
          <Play size={12} className="fill-current" /> START
        </button>
        <button
          className="flex items-center gap-1 px-3 py-1 bg-app text-text border border-border rounded-sm text-[11px] font-medium hover:bg-toolbar disabled:opacity-40"
          onClick={pauseSimulation}
          disabled={!play}
        >
          <Pause size={12} className="fill-current" /> PAUSE
        </button>
        <button
          className="flex items-center gap-1 px-3 py-1 bg-app text-text border border-border rounded-sm text-[11px] font-medium hover:bg-toolbar"
          onClick={stopSimulation}
        >
          <Square size={12} className="fill-current" /> STOP
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button className="flex items-center gap-1 px-3 py-1 text-muted hover:text-text text-[11px] font-medium" onClick={resetSimulation}>
          <RotateCcw size={12} /> RESET
        </button>
        <span className="text-[11px] font-mono text-muted ml-2">SPEED</span>
        {([0.5, 1, 2, 4] as const).map((spd) => (
          <button
            key={spd}
            onClick={() => setSimSpeed(spd)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded-sm border ${
              simSpeed === spd ? 'bg-accent text-white border-accent' : 'border-border text-muted'
            }`}
          >
            {spd}x
          </button>
        ))}
        {isRunning && <span className="text-[10px] text-success ml-2">RUNNING</span>}
      </div>

      <div className="flex items-center gap-4 text-[11px] font-mono text-text">
        <div className="flex items-center gap-1">
          <span className="text-muted">Mode:</span> {appMode}
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1">
          <span className="text-muted">Robots:</span> {robots.length}
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1">
          <span className="text-muted">Active:</span> {active}
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1">
          <span className="text-muted">Tasks:</span> {tasks.length}
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1">
          <span className="text-muted">Completed:</span> {completed}
        </div>
      </div>
    </div>
  );
};
