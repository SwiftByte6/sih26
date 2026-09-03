'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useP2PStore } from '../../store/p2pStore';
import {
  X,
  Search,
  Bot,
  ChevronRight,
  ArrowLeft,
  MapPin
} from 'lucide-react';
import { RobotState } from '../../types/warehouse';

export const ManageRobotsModal: React.FC = () => {
  const isOpen = useWarehouseStore((s) => s.isManageRobotsOpen);
  const selectedRobotId = useWarehouseStore((s) => s.manageRobotsSelectedRobotId);
  const setSelectedRobotId = useWarehouseStore((s) => s.selectRobotForManagement);
  const closeModal = useWarehouseStore((s) => s.closeManageRobots);
  const robots = useWarehouseStore((s) => s.robots);
  const setSelectedItem = useWarehouseStore((s) => s.setSelectedItem);
  const p2pNodes = useP2PStore((s) => s.nodes);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Draggable window state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 100, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Center modal on initial open
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const modalWidth = 720;
      const modalHeight = 540;
      const initialX = Math.max(20, Math.round((window.innerWidth - modalWidth) / 2));
      const initialY = Math.max(60, Math.round((window.innerHeight - modalHeight) / 2));
      setPosition({ x: initialX, y: initialY });
    }
  }, [isOpen]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const modalWidth = 720;
      const modalHeight = 520;
      const maxX = Math.max(10, window.innerWidth - modalWidth - 10);
      const maxY = Math.max(10, window.innerHeight - modalHeight - 10);
      setPosition({
        x: Math.max(10, Math.min(maxX, newX)),
        y: Math.max(10, Math.min(maxY, newY)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  const totalRobots = robots.length;
  const onlineCount = robots.filter((r) => r.state === 'MOVING' || r.state === 'IDLE' || r.state === 'WAITING').length;
  const idleCount = robots.filter((r) => r.state === 'IDLE' || r.state === 'WAITING').length;
  const errorCount = robots.filter((r) => r.state === 'ERROR' || r.state === 'CHARGING').length;

  const filteredRobots = robots.filter((r) => {
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'MOVING' && r.state !== 'MOVING') return false;
      if (filterStatus === 'WAITING' && r.state !== 'WAITING' && r.state !== 'IDLE') return false;
      if (filterStatus === 'CHARGING' && r.state !== 'CHARGING') return false;
      if (filterStatus === 'ERROR' && r.state !== 'ERROR') return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return r.id.toLowerCase().includes(q) || (r.label && r.label.toLowerCase().includes(q));
    }
    return true;
  });

  const selectedRobot = selectedRobotId ? robots.find((r) => r.id === selectedRobotId) : null;
  const selectedP2PNode = selectedRobot ? p2pNodes[selectedRobot.id] : null;

  const getStatusBadge = (state: RobotState) => {
    switch (state) {
      case 'MOVING':
        return { label: 'ONLINE / MOVING', color: 'bg-accent text-white' };
      case 'WAITING':
      case 'IDLE':
        return { label: 'IDLE / WAITING', color: 'bg-warning text-white' };
      case 'CHARGING':
        return { label: 'CHARGING', color: 'bg-info text-white' };
      case 'ERROR':
        return { label: 'ERROR', color: 'bg-danger text-white' };
      default:
        return { label: state, color: 'bg-muted text-white' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Draggable Translucent Modal Container */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="absolute w-[720px] max-h-[580px] bg-panel/90 backdrop-blur-md border border-border shadow-2xl rounded-md flex flex-col pointer-events-auto overflow-hidden text-text"
      >
        {/* Header - Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="h-[38px] bg-app/80 border-b border-border flex items-center justify-between px-3 cursor-grab active:cursor-grabbing border-t rounded-t-md"
        >
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-accent" />
            <span className="text-[12px] font-bold text-text tracking-wider uppercase">
              Robot Management
            </span>
            <span className="text-[10px] font-mono text-muted bg-workspace px-1.5 py-0.5 rounded-xs border border-border">
              {totalRobots} Fleet AMRs
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={closeModal}
              className="p-1 text-muted hover:text-text hover:bg-toolbar rounded-xs transition-colors"
              title="Close Panel"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col p-3 overflow-hidden gap-3 min-h-[460px]">
          {selectedRobot ? (
            /* ================= ROBOT DETAILS VIEW ================= */
            <div className="flex-1 flex flex-col overflow-y-auto gap-3 text-[12px]">
              {/* Back Header */}
              <div className="flex items-center justify-between border-b border-border pb-2">
                <button
                  onClick={() => setSelectedRobotId(null)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
                >
                  <ArrowLeft size={14} /> Back to Fleet List
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[13px]">{selectedRobot.id}</span>
                  <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${getStatusBadge(selectedRobot.state).color}`}>
                    {getStatusBadge(selectedRobot.state).label}
                  </span>
                </div>
              </div>

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-2 gap-3">
                {/* SPECIFICATIONS PANEL */}
                <div className="bg-workspace/80 p-3 border border-border rounded-xs flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border pb-1 mb-1">
                    Robot Specifications
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Model / Label:</span>
                    <span className="font-mono font-bold">{selectedRobot.label || selectedRobot.id}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Node ID:</span>
                    <span className="font-mono text-muted">{selectedP2PNode?.nodeId || `amr-node-${selectedRobot.id.toLowerCase()}`}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Footprint / Size:</span>
                    <span className="font-mono">1x1 Cell (0.8m × 0.8m)</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Max Payload:</span>
                    <span className="font-mono">{selectedRobot.payloadCapacity ?? 20} kg</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Max Speed:</span>
                    <span className="font-mono">{selectedRobot.speed ?? 1.2} m/s</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Sensing Radius:</span>
                    <span className="font-mono">{selectedRobot.sensingRadius ?? 5} m</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Drive / Capability:</span>
                    <span className="font-bold text-accent">{selectedRobot.deliveryCapability || 'Standard Transport'}</span>
                  </div>
                </div>

                {/* CURRENT LIVE STATE */}
                <div className="bg-workspace/80 p-3 border border-border rounded-xs flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border pb-1 mb-1">
                    Live Operational State
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Grid Position:</span>
                    <span className="font-mono font-bold text-accent">Col: {selectedRobot.col}, Row: {selectedRobot.row}</span>
                  </div>
                  <div className="flex flex-col gap-1 py-1 border-b border-border/50">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted font-semibold">Battery Charge:</span>
                      <span className="font-mono font-bold">{Math.round(selectedRobot.battery)}%</span>
                    </div>
                    <div className="w-full h-2 bg-app rounded-xs border border-border overflow-hidden">
                      <div className="h-full bg-success" style={{ width: `${selectedRobot.battery}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Current Task:</span>
                    <span className="font-mono text-text font-bold truncate max-w-[160px]">{selectedRobot.currentTask || 'Idle / Unassigned'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Pickup Station:</span>
                    <span className="font-mono">{selectedRobot.pickupPoint ? selectedRobot.pickupPoint.label : 'None'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">Drop Station:</span>
                    <span className="font-mono">{selectedRobot.dropPoint ? selectedRobot.dropPoint.label : 'None'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/50 text-[11px]">
                    <span className="text-muted font-semibold">P2P Signal / Temp:</span>
                    <span className="font-mono">{selectedRobot.signalStrength ?? 95}% / {selectedRobot.temperature ?? 36}°C</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center bg-app/80 p-2.5 border border-border rounded-xs mt-auto">
                <span className="text-[11px] text-muted font-mono">
                  Target Path Points: {selectedRobot.path?.length || 0} cells remaining
                </span>
                <button
                  onClick={() => {
                    setSelectedItem(selectedRobot.id, 'ROBOT');
                    closeModal();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-accent text-white rounded-xs font-semibold text-[11px] hover:brightness-110 shadow-xs"
                >
                  <MapPin size={13} /> Focus on Map
                </button>
              </div>
            </div>
          ) : (
            /* ================= FLEET LIST VIEW ================= */
            <>
              {/* Fleet Summary Bar */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-workspace/90 border border-border p-2 rounded-xs flex flex-col items-center">
                  <span className="text-[18px] font-extrabold font-mono text-text">{totalRobots}</span>
                  <span className="text-[9px] font-bold text-muted tracking-wider uppercase">TOTAL ROBOTS</span>
                </div>
                <div className="bg-workspace/90 border border-border p-2 rounded-xs flex flex-col items-center">
                  <span className="text-[18px] font-extrabold font-mono text-accent">{onlineCount}</span>
                  <span className="text-[9px] font-bold text-muted tracking-wider uppercase">ONLINE</span>
                </div>
                <div className="bg-workspace/90 border border-border p-2 rounded-xs flex flex-col items-center">
                  <span className="text-[18px] font-extrabold font-mono text-warning">{idleCount}</span>
                  <span className="text-[9px] font-bold text-muted tracking-wider uppercase">IDLE / WAITING</span>
                </div>
                <div className="bg-workspace/90 border border-border p-2 rounded-xs flex flex-col items-center">
                  <span className="text-[18px] font-extrabold font-mono text-danger">{errorCount}</span>
                  <span className="text-[9px] font-bold text-muted tracking-wider uppercase">CHARGING / ERROR</span>
                </div>
              </div>

              {/* Search & Status Filter Bar */}
              <div className="flex items-center justify-between gap-2 bg-app p-1.5 border border-border rounded-xs">
                <div className="flex items-center gap-1 bg-workspace border border-border rounded-xs px-2 py-1 flex-1">
                  <Search size={13} className="text-muted" />
                  <input
                    type="text"
                    placeholder="Search by Robot ID or label..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent text-[11px] text-text outline-none w-full font-mono placeholder:text-muted"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(['ALL', 'MOVING', 'WAITING', 'CHARGING', 'ERROR'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-xs transition-colors ${
                        filterStatus === st ? 'bg-accent text-white' : 'text-muted hover:text-text hover:bg-toolbar'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Robot Cards List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {filteredRobots.length === 0 ? (
                  <div className="text-center text-muted italic text-[11px] py-8">
                    No robots found matching current filter criteria.
                  </div>
                ) : (
                  filteredRobots.map((r) => {
                    const badge = getStatusBadge(r.state);
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRobotId(r.id)}
                        className="bg-workspace/80 border border-border hover:border-accent hover:bg-white p-2.5 rounded-xs flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-accent group-hover:scale-110 transition-transform" />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[12px] text-text">{r.id}</span>
                              <span className={`px-1.5 py-0.2 rounded-xs text-[9px] font-bold ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted font-mono">
                              P2P Node: amr-node-{r.id.toLowerCase()} | Loc: ({r.col}, {r.row})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-mono text-muted">
                              Task: <span className="font-bold text-text">{r.currentTask || 'Idle'}</span>
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-16 h-1.5 bg-app rounded-xs overflow-hidden border border-border">
                                <div className="h-full bg-success" style={{ width: `${r.battery}%` }} />
                              </div>
                              <span className="text-[10px] font-mono font-bold">{Math.round(r.battery)}%</span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRobotId(r.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent hover:text-white border border-accent/30 rounded-xs transition-colors"
                          >
                            View Details <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
