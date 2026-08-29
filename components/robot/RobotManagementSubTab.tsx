'use client';

import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useP2PStore } from '../../store/p2pStore';
import { Robot } from '../../types/warehouse';
import { AddRobotModal } from './AddRobotModal';
import { EditRobotModal } from './EditRobotModal';
import { Plus, Trash2, Edit3, Bot, Settings, ShieldCheck, Wifi, WifiOff, Cpu } from 'lucide-react';

export const RobotManagementSubTab: React.FC = () => {
  const { robots, removeRobot, setSelectedItem } = useWarehouseStore();
  const p2pNodes = useP2PStore((state) => state.nodes);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null);

  const handleDelete = (id: string) => {
    if (confirm(`Are you sure you want to delete AMR "${id}"? This will unregister it from the fleet and P2P communication mesh.`)) {
      removeRobot(id);
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-workspace flex flex-col gap-4">
      {/* Header bar */}
      <div className="bg-white border border-border p-3 rounded-md shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-accent" />
          <div>
            <h2 className="font-bold text-[14px] text-text">AMR Fleet Configuration & Management</h2>
            <div className="text-[10px] text-muted font-mono">Add, edit, or remove hardware AMRs registered in the P2P mesh network.</div>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-sm text-[11px] font-bold hover:bg-opacity-90 transition-colors shadow-sm"
        >
          <Plus size={14} /> ADD ROBOT
        </button>
      </div>

      {/* Fleet Management Table */}
      <div className="bg-white border border-border rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse font-mono">
            <thead>
              <tr className="bg-toolbar border-b border-border text-muted font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">AMR ID</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Mesh P2P Status</th>
                <th className="py-2.5 px-3">Max Speed</th>
                <th className="py-2.5 px-3">Battery</th>
                <th className="py-2.5 px-3">Sensing Radius</th>
                <th className="py-2.5 px-3">Payload Capacity</th>
                <th className="py-2.5 px-3">Capability</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {robots.map((robot) => {
                const p2pNode = p2pNodes[robot.id];
                const isOnline = p2pNode ? p2pNode.isOnline : (robot.isOnline ?? true);

                return (
                  <tr key={robot.id} className="hover:bg-app/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-text flex items-center gap-1.5">
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
                      {isOnline ? (
                        <span className="text-success font-bold flex items-center gap-1">
                          <Wifi size={13} /> ONLINE
                        </span>
                      ) : (
                        <span className="text-danger font-bold flex items-center gap-1">
                          <WifiOff size={13} /> OFFLINE
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">{robot.speed} m/s</td>
                    <td className="py-3 px-3">{Math.round(robot.battery)}%</td>
                    <td className="py-3 px-3">{robot.sensingRadius ?? 5} m</td>
                    <td className="py-3 px-3">{robot.payloadCapacity ?? 20} kg</td>
                    <td className="py-3 px-3 text-muted">{robot.deliveryCapability || 'Standard Transport'}</td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedItem(robot.id, 'ROBOT');
                            setEditingRobot(robot);
                          }}
                          className="px-2 py-1 bg-app border border-border rounded text-[10px] font-semibold text-text hover:bg-toolbar flex items-center gap-1"
                          title="Edit Configuration"
                        >
                          <Edit3 size={12} /> Edit
                        </button>

                        <button
                          onClick={() => handleDelete(robot.id)}
                          className="px-2 py-1 bg-danger/10 border border-danger/30 rounded text-[10px] font-semibold text-danger hover:bg-danger hover:text-white flex items-center gap-1 transition-colors"
                          title="Delete AMR from Fleet"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddRobotModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditRobotModal robot={editingRobot} onClose={() => setEditingRobot(null)} />
    </div>
  );
};
