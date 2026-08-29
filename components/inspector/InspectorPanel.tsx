'use client';

import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useP2PStore } from '../../store/p2pStore';

export const InspectorPanel: React.FC = () => {
  const { selectedItemId, selectedItemType, robots, obstacles, removeObstacle } = useWarehouseStore();
  const p2pNodes = useP2PStore((state) => state.nodes);

  const selectedRobot = selectedItemType === 'ROBOT' ? robots.find(r => r.id === selectedItemId) : null;
  const selectedObstacle = selectedItemType === 'OBSTACLE' ? obstacles.find(o => o.id === selectedItemId) : null;

  const p2pNode = selectedRobot ? p2pNodes[selectedRobot.id] : null;
  const nodeId = p2pNode ? p2pNode.nodeId : `amr-node-${selectedRobot?.id.toLowerCase()}`;
  const isOnline = p2pNode ? p2pNode.isOnline : (selectedRobot?.isOnline ?? true);

  return (
    <div className="w-[240px] bg-panel border-l border-border flex flex-col flex-shrink-0">
      <div className="h-[30px] border-b border-border flex items-center px-3 bg-app">
        <span className="text-[11px] font-bold text-text tracking-wider">INSPECTOR</span>
      </div>
      
      <div className="p-3 overflow-y-auto flex-1">
        {selectedRobot && (
          <div className="flex flex-col gap-4 text-[12px] text-text">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">ROBOT</div>
              <div className="font-mono mt-1 font-bold">ID: {selectedRobot.id}</div>
              <div className="font-mono text-[11px] text-muted">Node ID: {nodeId}</div>
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
                <div className="bg-workspace p-1.5 border border-border rounded-sm">Col: {selectedRobot.col}</div>
                <div className="bg-workspace p-1.5 border border-border rounded-sm">Row: {selectedRobot.row}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Hardware Capabilities</div>
              <div className="flex flex-col gap-1 text-[11px] font-mono bg-workspace p-2 border border-border rounded-sm">
                <div>Capability: <span className="font-bold">{selectedRobot.deliveryCapability || 'Standard Transport'}</span></div>
                <div>Payload Cap: {selectedRobot.payloadCapacity ?? 20} kg</div>
                <div>Current Load: {selectedRobot.currentLoad ?? 0} kg</div>
                <div>Sensing Radius: {selectedRobot.sensingRadius ?? 5} m</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">P2P Connection & Telemetry</div>
              <div className="flex flex-col gap-1 text-[11px] font-mono bg-workspace p-2 border border-border rounded-sm">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className="font-bold text-success">CONNECTED</span>
                </div>
                <div className="flex justify-between">
                  <span>Signal:</span>
                  <span>{selectedRobot.signalStrength ?? 95}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Temp:</span>
                  <span>{selectedRobot.temperature ?? 36}°C</span>
                </div>
              </div>
            </div>
          </div>
        )}


        {selectedObstacle && (
          <div className="flex flex-col gap-4 text-[12px] text-text">
            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Selected Object</div>
              <div className="font-bold text-[14px]">OBSTACLE</div>
              <div className="font-mono mt-1">ID: {selectedObstacle.id}</div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Position</div>
              <div className="font-mono grid grid-cols-2 gap-2">
                <div className="bg-workspace p-1.5 border border-border rounded-sm">Col: {selectedObstacle.col}</div>
                <div className="bg-workspace p-1.5 border border-border rounded-sm">Row: {selectedObstacle.row}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-muted font-semibold mb-1">Width</div>
                <div className="font-mono bg-workspace p-1.5 border border-border rounded-sm">{selectedObstacle.width}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted font-semibold mb-1">Height</div>
                <div className="font-mono bg-workspace p-1.5 border border-border rounded-sm">{selectedObstacle.height}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-semibold mb-1">Rotation</div>
              <div className="font-mono bg-workspace p-1.5 border border-border rounded-sm">0°</div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex justify-center">
              <button 
                onClick={() => removeObstacle(selectedObstacle.id)}
                className="px-4 py-1.5 bg-danger text-white rounded-sm hover:bg-opacity-80 font-medium w-full transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {!selectedRobot && !selectedObstacle && (
          <div className="text-center text-muted text-[12px] italic mt-10">
            Select an object on the map to inspect properties.
          </div>
        )}
      </div>
    </div>
  );
};
