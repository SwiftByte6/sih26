'use client';

import React, { useState } from 'react';
import { RobotCommunicationSubTab } from './RobotCommunicationSubTab';
import { RobotMonitoringSubTab } from './RobotMonitoringSubTab';
import { RobotManagementSubTab } from './RobotManagementSubTab';
import { P2PLabSubTab } from './P2PLabSubTab';
import { MessageSquare, Activity, Settings, FlaskConical, Bot } from 'lucide-react';

export const RobotFleetSection: React.FC = () => {
  const [subTab, setSubTab] = useState<'COMMUNICATION' | 'MONITORING' | 'MANAGEMENT' | 'P2P_LAB'>('COMMUNICATION');

  return (
    <div className="w-full h-full bg-workspace flex flex-col overflow-hidden">
      {/* Top Section Header & Sub-Tab Bar */}
      <div className="h-[42px] bg-app border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-accent text-white rounded">
            <Bot size={16} />
          </div>
          <span className="font-bold text-[13px] text-text tracking-wide">ROBOT FLEET CONTROL</span>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center bg-toolbar rounded p-0.5 border border-border gap-0.5">
          <button
            onClick={() => setSubTab('COMMUNICATION')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-sm transition-colors ${
              subTab === 'COMMUNICATION' ? 'bg-white text-accent shadow-sm' : 'text-muted hover:text-text'
            }`}
          >
            <MessageSquare size={13} />
            Robot Communication
          </button>
          <button
            onClick={() => setSubTab('MONITORING')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-sm transition-colors ${
              subTab === 'MONITORING' ? 'bg-white text-accent shadow-sm' : 'text-muted hover:text-text'
            }`}
          >
            <Activity size={13} />
            Robot Monitoring
          </button>
          <button
            onClick={() => setSubTab('MANAGEMENT')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-sm transition-colors ${
              subTab === 'MANAGEMENT' ? 'bg-white text-accent shadow-sm' : 'text-muted hover:text-text'
            }`}
          >
            <Settings size={13} />
            Robot Management
          </button>
          <button
            onClick={() => setSubTab('P2P_LAB')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-sm transition-colors ${
              subTab === 'P2P_LAB' ? 'bg-white text-accent shadow-sm' : 'text-muted hover:text-text'
            }`}
          >
            <FlaskConical size={13} />
            P2P Lab
          </button>
        </div>
      </div>

      {/* Sub-Tab View Content */}
      <div className="flex-1 flex overflow-hidden">
        {subTab === 'COMMUNICATION' && <RobotCommunicationSubTab />}
        {subTab === 'MONITORING' && <RobotMonitoringSubTab />}
        {subTab === 'MANAGEMENT' && <RobotManagementSubTab />}
        {subTab === 'P2P_LAB' && <P2PLabSubTab />}
      </div>
    </div>
  );
};
