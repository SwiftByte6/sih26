'use client';

import React from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';

export const SimulationControls: React.FC = () => {
  const appMode = useWarehouseStore((s) => s.appMode);
  const startSimulation = useWarehouseStore((s) => s.startSimulation);
  const pauseSimulation = useWarehouseStore((s) => s.pauseSimulation);
  const stopSimulation = useWarehouseStore((s) => s.stopSimulation);
  const resetSimulation = useWarehouseStore((s) => s.resetSimulation);

  const play = appMode === 'PLAY';

  return (
    <div className="h-[36px] bg-toolbar border-t border-border flex items-center justify-between px-4">
      
    </div>
  );
};
