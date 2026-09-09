'use client';

import React from 'react';
import { BarChart2, Clock, Network, ShieldAlert, X } from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { FleetDashboard } from '../../Dashboard/pages/FleetDashboard';
import { LatencyDashboard } from '../../Dashboard/pages/LatencyDashboard';
import { P2PDashboard } from '../../Dashboard/pages/P2PDashboard';
import { CollisionDashboard } from '../../Dashboard/pages/CollisionDashboard';

export const AnalyticsPanel: React.FC = () => {
  const analyticsTab = useTaskStore((state) => state.analyticsTab);
  const setAnalyticsTab = useTaskStore((state) => state.setAnalyticsTab);
  const setActiveView = useTaskStore((state) => state.setActiveView);

  const tabs = [
    { id: 'fleet', label: 'Fleet Throughput & Efficiency', icon: BarChart2 },
    { id: 'latency', label: 'Task Execution Latency', icon: Clock },
    { id: 'p2p', label: 'P2P Network Messages', icon: Network },
    { id: 'collision', label: 'Collision Avoidance', icon: ShieldAlert },
  ] as const;

  return (
    <div className="w-full h-full flex flex-col bg-[#F7F9FC] overflow-hidden">
      {/* Analytics Sub-Header / Tab Navigation Bar */}
      <div className="bg-white border-b border-border px-4 py-2.5 flex items-center justify-between shadow-2xs select-none shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent/10 rounded-md text-accent">
            <BarChart2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text leading-tight">Analytics & Intelligence</h2>
            <p className="text-[11px] text-muted leading-none">AMR Fleet metrics, task latency, P2P network & collision logs</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-slate-200/80 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = analyticsTab === id;
            return (
              <button
                key={id}
                onClick={() => setAnalyticsTab(id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-white text-accent shadow-xs border border-slate-200'
                    : 'text-muted hover:text-text hover:bg-slate-200/50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-accent' : 'text-muted'} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={() => setActiveView('WAREHOUSE')}
          className="p-1.5 rounded-md text-muted hover:text-text hover:bg-slate-100 transition-colors"
          title="Close Analytics View"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto">
        {analyticsTab === 'fleet' && <FleetDashboard />}
        {analyticsTab === 'latency' && <LatencyDashboard />}
        {analyticsTab === 'p2p' && <P2PDashboard />}
        {analyticsTab === 'collision' && <CollisionDashboard />}
      </div>
    </div>
  );
};
