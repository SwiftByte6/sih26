'use client';

import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useP2PStore } from '../../store/p2pStore';
import { Activity, Battery, Gauge, MapPin, Signal, Thermometer, ShieldCheck, Cpu, Box, Radio } from 'lucide-react';

export const RobotMonitoringSubTab: React.FC = () => {
  const { robots, selectedItemId, setSelectedItem } = useWarehouseStore();
  const p2pNodes = useP2PStore((state) => state.nodes);

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-workspace">
      <div className="bg-white border border-border rounded-md shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-app border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accent" />
            <h2 className="font-bold text-[14px] text-text">AMR Fleet Real-Time Telemetry Monitor</h2>
          </div>
          <span className="text-[11px] text-muted font-mono">{robots.length} AMRs Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse font-mono">
            <thead>
              <tr className="bg-toolbar border-b border-border text-muted font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">AMR ID</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Current Task</th>
                <th className="py-2.5 px-3">Battery</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3">Load / Cap</th>
                <th className="py-2.5 px-3">Signal</th>
                <th className="py-2.5 px-3">Temp</th>
                <th className="py-2.5 px-3">P2P Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {robots.map((robot) => {
                const isSelected = selectedItemId === robot.id;
                const p2pNode = p2pNodes[robot.id];
                const isOnline = p2pNode ? p2pNode.isOnline : (robot.isOnline ?? true);

                return (
                  <tr
                    key={robot.id}
                    onClick={() => setSelectedItem(robot.id, 'ROBOT')}
                    className={`hover:bg-app/60 cursor-pointer transition-colors ${
                      isSelected ? 'bg-accent/10 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-text font-mono flex items-center gap-1.5">
                      <Cpu size={14} className="text-accent" />
                      {robot.id}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        robot.state === 'MOVING' ? 'bg-accent text-white' :
                        robot.state === 'WAITING' ? 'bg-warning text-white' :
                        robot.state === 'CHARGING' ? 'bg-success text-white' : 'bg-muted text-white'
                      }`}>
                        {robot.state}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {robot.currentTask || robot.currentTaskId ? (
                        <span className="bg-workspace px-2 py-0.5 border border-border rounded text-[10px] text-accent font-semibold">
                          {robot.currentTask || robot.currentTaskId}
                        </span>
                      ) : (
                        <span className="text-muted italic">N/A (Idle)</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-2.5 bg-app rounded-sm overflow-hidden border border-border">
                          <div
                            className={`h-full ${robot.battery > 50 ? 'bg-success' : robot.battery > 20 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${Math.max(0, Math.min(100, robot.battery))}%` }}
                          />
                        </div>
                        <span className="font-bold">{Math.round(robot.battery)}%</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">{robot.speed} m/s</td>
                    <td className="py-3 px-3">({robot.col}, {robot.row})</td>

                    <td className="py-3 px-3">
                      {robot.currentLoad ?? 0}kg / {robot.payloadCapacity ?? 20}kg
                    </td>

                    <td className="py-3 px-3 text-emerald-600 font-bold">
                      {robot.signalStrength ?? 94}%
                    </td>

                    <td className="py-3 px-3 text-amber-600 font-bold">
                      {robot.temperature ?? 36}°C
                    </td>

                    <td className="py-3 px-3">
                      {isOnline ? (
                        <span className="text-success font-bold flex items-center gap-1">
                          <ShieldCheck size={13} /> CONNECTED
                        </span>
                      ) : (
                        <span className="text-danger font-bold">DISCONNECTED</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
