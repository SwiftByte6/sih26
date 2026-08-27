'use client';

import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';

export const InspectorPanel: React.FC = () => {
  const { selectedItemId, selectedItemType, robots } = useWarehouseStore();

  const selectedRobot = selectedItemType === 'ROBOT' ? robots.find(r => r.id === selectedItemId) : null;

  return (
    <div className="w-[240px] bg-panel border-l border-border flex flex-col flex-shrink-0">
      <div className="h-[30px] border-b border-border flex items-center px-3 bg-app">
        <span className="text-[11px] font-bold text-text tracking-wider">INSPECTOR</span>
      </div>
      
      <div className="p-3 overflow-y-auto flex-1">
        {selectedRobot ? (
          <div className="flex flex-col gap-4 text-[12px] text-text">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Robot</div>
              <div className="font-bold text-[14px]">{selectedRobot.label}</div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Status</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${selectedRobot.state === 'MOVING' ? 'bg-accent' : selectedRobot.state === 'WAITING' ? 'bg-warning' : 'bg-success'}`} />
                <span className="capitalize">{selectedRobot.state.toLowerCase()}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Battery</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-app rounded-sm overflow-hidden border border-border">
                  <div 
                    className="h-full bg-success" 
                    style={{ width: `${selectedRobot.battery}%` }}
                  />
                </div>
                <span className="font-mono text-[11px]">{selectedRobot.battery}%</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Speed</div>
              <div className="font-mono">{selectedRobot.speed.toFixed(1)} m/s</div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Current Task</div>
              <div className="font-mono bg-workspace p-1.5 border border-border rounded-sm">
                {selectedRobot.currentTask || 'None'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Position</div>
              <div className="font-mono grid grid-cols-2 gap-2">
                <div className="bg-workspace p-1.5 border border-border rounded-sm">X: {selectedRobot.x.toFixed(1)}</div>
                <div className="bg-workspace p-1.5 border border-border rounded-sm">Y: {selectedRobot.y.toFixed(1)}</div>
              </div>
            </div>
            
            {/* Demo conflict state */}
            {selectedRobot.state === 'WAITING' && (
              <div className="mt-2 p-2 border border-danger bg-[#fdf5f5] rounded-sm">
                <div className="text-danger font-bold text-[10px] mb-1">⚠ CONFLICT DETECTED</div>
                <div className="text-[11px] mb-1">Location: I-04</div>
                <div className="text-[11px] mb-1">Robots: AMR-01, AMR-02</div>
                <div className="text-[11px] text-muted">Resolution: Rerouting...</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted text-[12px] italic mt-10">
            Select an object on the map to inspect properties.
          </div>
        )}
      </div>
    </div>
  );
};

