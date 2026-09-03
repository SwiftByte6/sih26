'use client';

import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useTaskStore } from '../../store/taskStore';
import { Cpu, ClipboardList, Activity, Navigation, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const Fleet2DControlPanel: React.FC = () => {
  const robots = useWarehouseStore((s) => s.robots);
  const selectedItemId = useWarehouseStore((s) => s.selectedItemId);
  const setSelectedItem = useWarehouseStore((s) => s.setSelectedItem);
  const tasks = useTaskStore((s) => s.tasks);

  // Dynamic Fleet Statistics
  const totalRobots = robots.length;
  const onlineRobots = robots.filter((r) => r.isOnline ?? true).length;
  const movingRobots = robots.filter((r) => r.state === 'MOVING').length;
  const waitingRobots = robots.filter((r) => r.state === 'WAITING' || r.state === 'WAITING_FOR_PATH_CLEARANCE').length;
  const idleRobots = robots.filter((r) => r.state === 'IDLE').length;

  // Dynamic Task Statistics
  const activeTasks = tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS');
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  // Selected Robot
  const selectedRobot = robots.find((r) => r.id === selectedItemId);

  return (
    <div className="absolute right-3 top-3 bottom-3 w-72 bg-[#161D21]/95 backdrop-blur-md border border-[#30363A] rounded-lg shadow-2xl p-3 flex flex-col gap-3 text-[#F1F5F6] z-30 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#30363A] pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="text-[#42BFE5]" size={16} />
          <span className="font-bold text-[12px] tracking-wide uppercase text-[#F1F5F6]">Fleet Control</span>
        </div>
        <span className="text-[10px] font-mono bg-[#4CCB8A]/10 text-[#4CCB8A] px-2 py-0.5 rounded border border-[#4CCB8A]/30">
          ● ONLINE
        </span>
      </div>

      {/* Fleet Overview Stats Grid */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#11171A] p-2 rounded-md border border-[#30363A] text-center">
        <div>
          <div className="text-[13px] font-bold text-[#F1F5F6]">{String(onlineRobots).padStart(2, '0')}</div>
          <div className="text-[8px] font-semibold text-[#778287] uppercase">Online</div>
        </div>
        <div>
          <div className="text-[13px] font-bold text-[#42BFE5]">{String(movingRobots).padStart(2, '0')}</div>
          <div className="text-[8px] font-semibold text-[#778287] uppercase">Moving</div>
        </div>
        <div>
          <div className="text-[13px] font-bold text-[#E5B84B]">{String(waitingRobots).padStart(2, '0')}</div>
          <div className="text-[8px] font-semibold text-[#778287] uppercase">Waiting</div>
        </div>
        <div>
          <div className="text-[13px] font-bold text-[#AAB4B8]">{String(idleRobots).padStart(2, '0')}</div>
          <div className="text-[8px] font-semibold text-[#778287] uppercase">Idle</div>
        </div>
      </div>

      {/* Task Overview Stats Bar */}
      <div className="flex items-center justify-between bg-[#11171A] px-3 py-1.5 rounded-md border border-[#30363A] text-[10px]">
        <div className="flex items-center gap-1.5 text-[#42BFE5]">
          <Activity size={12} />
          <span className="font-bold">{activeTasks.length} Active</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#E5B84B]">
          <Clock size={12} />
          <span className="font-bold">{pendingTasks.length} Pending</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#4CCB8A]">
          <CheckCircle2 size={12} />
          <span className="font-bold">{completedTasks.length} Done</span>
        </div>
      </div>

      {/* Selected Robot Telemetry Box */}
      {selectedRobot ? (
        <div className="bg-[#20282C] border border-[#42BFE5]/40 rounded-md p-2.5 flex flex-col gap-1.5 relative">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[13px] text-[#42BFE5]">{selectedRobot.id}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              selectedRobot.state === 'MOVING' ? 'bg-[#42BFE5]/20 text-[#42BFE5]' :
              selectedRobot.state === 'WAITING' ? 'bg-[#E5B84B]/20 text-[#E5B84B]' : 'bg-[#778287]/20 text-[#AAB4B8]'
            }`}>
              ● {selectedRobot.state}
            </span>
          </div>

          <div className="text-[10px] text-[#AAB4B8] flex flex-col gap-0.5 mt-1">
            <div className="flex justify-between">
              <span className="text-[#778287]">Current Task:</span>
              <span className="font-medium text-[#F1F5F6] truncate max-w-[150px]">
                {selectedRobot.currentTask || 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#778287]">Destination:</span>
              <span className="font-medium text-[#F1F5F6]">
                {selectedRobot.dropPoint?.label || selectedRobot.pickupPoint?.label || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#778287]">Battery Level:</span>
              <span className="font-medium text-[#4CCB8A]">{Math.round(selectedRobot.battery)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#11171A] border border-[#30363A] rounded-md p-2.5 text-center text-[10px] text-[#778287]">
          Click any robot on the map or list to inspect live telemetry
        </div>
      )}

      {/* Compact Robot Fleet List */}
      <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto pr-1">
        <div className="text-[10px] font-bold tracking-wide uppercase text-[#778287] mb-1 flex items-center gap-1">
          <Navigation size={11} />
          <span>Active AMRs ({totalRobots})</span>
        </div>
        {robots.map((robot) => {
          const isSelected = selectedItemId === robot.id;
          const statusColor =
            robot.state === 'MOVING' ? '#42BFE5' :
            robot.state === 'WAITING' ? '#E5B84B' :
            robot.state === 'CHARGING' ? '#4CCB8A' : '#778287';

          return (
            <button
              key={robot.id}
              onClick={() => setSelectedItem(robot.id, 'ROBOT')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] transition-all text-left ${
                isSelected
                  ? 'bg-[#42BFE5]/15 border border-[#42BFE5] text-[#F1F5F6]'
                  : 'bg-[#11171A] border border-[#30363A] hover:bg-[#20282C] text-[#AAB4B8]'
              }`}
            >
              <span className="font-mono font-bold">{robot.id}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                <span className="text-[10px] font-semibold" style={{ color: statusColor }}>
                  {robot.state}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
