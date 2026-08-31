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
                <th className="py-2.5 px-3">Failure Status</th>
                <th className="py-2.5 px-3">Recovery State</th>
                <th className="py-2.5 px-3">P2P Status</th>
                <th className="py-2.5 px-3">Failure Simulation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {robots.map((robot) => {
                const isSelected = selectedItemId === robot.id;
                const p2pNode = p2pNodes[robot.id];
                const isOnline = p2pNode ? p2pNode.isOnline : (robot.isOnline ?? true);
                const failStatus = robot.failureStatus || (robot.state === 'ERROR' ? 'ERROR' : isOnline ? 'NORMAL' : 'OFFLINE');
                const recStatus = robot.recoveryStatus || 'NONE';

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
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${
                          robot.state === 'MOVING' ? 'bg-accent text-white' :
                          robot.state === 'WAITING' ? 'bg-warning text-white' :
                          robot.state === 'WAITING_FOR_PATH_CLEARANCE' ? 'bg-amber-600 text-white font-mono' :
                          robot.state === 'CHARGING' ? 'bg-success text-white' : 'bg-red-600 text-white'
                        }`}>
                          {robot.state === 'WAITING_FOR_PATH_CLEARANCE' ? 'PATH BLOCKED (YIELDING)' : robot.state}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase w-fit ${
                          robot.state === 'ERROR' || !isOnline ? 'bg-red-100 text-red-800 border border-red-300' :
                          robot.state === 'MOVING' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          robot.state === 'CHARGING' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-400 font-bold'
                        }`}>
                          {robot.state === 'ERROR' || !isOnline ? 'FAILED' : robot.state === 'MOVING' ? 'BUSY' : robot.state === 'CHARGING' ? 'CHARGING' : 'AVAILABLE'}
                        </span>
                      </div>
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
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        failStatus === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' :
                        failStatus === 'OFFLINE' ? 'bg-red-100 text-red-800' :
                        failStatus === 'COMMUNICATION_LOST' ? 'bg-amber-100 text-amber-800' : 'bg-red-200 text-red-900'
                      }`}>
                        {failStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        recStatus === 'NONE' ? 'bg-gray-100 text-gray-700' :
                        recStatus === 'RECOVERY_IN_PROGRESS' ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {recStatus === 'RECOVERY_IN_PROGRESS' ? 'IN PROGRESS' : recStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {isOnline && robot.state !== 'ERROR' ? (
                        <span className="text-success font-bold flex items-center gap-1">
                          <ShieldCheck size={13} /> CONNECTED
                        </span>
                      ) : (
                        <span className="text-danger font-bold">DISCONNECTED</span>
                      )}
                    </td>

                    <td className="py-3 px-3 flex gap-1">
                      {failStatus === 'NORMAL' ? (
                        <>
                          {(robot.currentTask || robot.currentTaskId) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const requestTaskHandover = require('../../engine/recovery/TaskHandoverManager').requestTaskHandover;
                                requestTaskHandover(robot.id, 'VOLUNTARY');
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-[9px] font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1"
                            >
                              🤝 Handover
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const triggerRobotFailure = require('../../engine/recovery/FailureRecoveryManager').triggerRobotFailure;
                              triggerRobotFailure(robot.id, 'OFFLINE');
                            }}
                            className="px-2 py-1 bg-red-500 text-white rounded text-[9px] font-bold hover:bg-red-600"
                          >
                            Fail Offline
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const triggerRobotFailure = require('../../engine/recovery/FailureRecoveryManager').triggerRobotFailure;
                              triggerRobotFailure(robot.id, 'ERROR');
                            }}
                            className="px-2 py-1 bg-amber-500 text-white rounded text-[9px] font-bold hover:bg-amber-600"
                          >
                            Fail Error
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const restoreRobot = require('../../engine/recovery/FailureRecoveryManager').restoreRobot;
                            restoreRobot(robot.id);
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-[9px] font-bold hover:bg-emerald-700"
                        >
                          Restore AMR
                        </button>
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
