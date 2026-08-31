'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { CommunicationMessageCard } from './CommunicationMessageCard';
import { CommunicationFilters } from './CommunicationFilters';
import { Trash2, Pause, Play, ArrowDownToLine } from 'lucide-react';

export const RobotCommunicationPanel: React.FC = () => {
  const { robots, communications, clearCommunications } = useWarehouseStore();
  
  const [selectedRobot, setSelectedRobot] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [paused, setPaused] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  const robotIds = robots.map(r => r.id);

  // Filter messages
  const filtered = communications.filter(msg => {
    if (selectedRobot !== 'ALL') {
      if (msg.sender !== selectedRobot && msg.receiver !== selectedRobot && msg.receiver !== 'ALL') {
        return false;
      }
    }
    if (selectedCategory !== 'ALL') {
      if (msg.category !== selectedCategory) return false;
    }
    return true;
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll && !paused && scrollRef.current && filtered.length > prevLengthRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = filtered.length;
  }, [filtered.length, autoScroll, paused]);

  // Status colors
  const statusDot = (state: string) => {
    if (state === 'MOVING') return 'bg-accent';
    if (state === 'WAITING') return 'bg-warning';
    if (state === 'CHARGING') return 'bg-success';
    if (state === 'ERROR') return 'bg-danger';
    return 'bg-muted';
  };

  return (
    <div className="w-[280px] bg-panel border-l border-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="h-[30px] border-b border-border flex items-center px-3 bg-app">
        <span className="text-[11px] font-bold text-text tracking-wider">COMMUNICATION FEED</span>
      </div>

      {/* Robot Status Strip */}
      <div className="px-2 py-1.5 border-b border-border bg-toolbar flex flex-col gap-1">
        {robots.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRobot(selectedRobot === r.id ? 'ALL' : r.id)}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-[10px] font-mono transition-colors w-full text-left ${
              selectedRobot === r.id ? 'bg-accent text-white' : 'hover:bg-app'
            }`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(r.state)}`} />
            <span className="font-bold">{r.id}</span>
            <span className={`uppercase text-[9px] ${selectedRobot === r.id ? 'text-white/80' : 'text-muted'}`}>{r.state}</span>
            <span className={`ml-auto text-[9px] ${selectedRobot === r.id ? 'text-white/70' : 'text-muted'}`}>({r.row},{r.col})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <CommunicationFilters
        robotIds={robotIds}
        selectedRobot={selectedRobot}
        onSelectRobot={setSelectedRobot}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Messages */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5"
        style={{ minHeight: 0 }}
      >
        {!paused && filtered.length === 0 && (
          <div className="text-center text-muted text-[11px] italic mt-8">
            No communications yet.<br />Run the simulation to see robot messages.
          </div>
        )}
        {!paused && filtered.map(msg => (
          <CommunicationMessageCard key={msg.id} msg={msg} />
        ))}
        {paused && (
          <div className="text-center text-muted text-[11px] italic mt-8">
            Communication display paused.<br />Simulation is still running.
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-[32px] border-t border-border flex items-center justify-between px-2 bg-app">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto Scroll"
            className={`p-1 rounded-sm text-[10px] transition-colors ${autoScroll ? 'bg-accent text-white' : 'text-muted hover:text-text hover:bg-toolbar'}`}
          >
            <ArrowDownToLine size={12} />
          </button>
          <button
            onClick={() => setPaused(!paused)}
            title={paused ? 'Resume Display' : 'Pause Display'}
            className={`p-1 rounded-sm text-[10px] transition-colors ${paused ? 'bg-warning text-white' : 'text-muted hover:text-text hover:bg-toolbar'}`}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-muted">{filtered.length} msgs</span>
          <button
            onClick={clearCommunications}
            title="Clear Log"
            className="p-1 rounded-sm text-muted hover:text-danger hover:bg-toolbar transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
