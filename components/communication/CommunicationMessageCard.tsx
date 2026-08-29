'use client';

import React from 'react';
import { CommunicationMessage } from '../../types/warehouse';

interface CommunicationMessageCardProps {
  msg: CommunicationMessage;
}

export const CommunicationMessageCard: React.FC<CommunicationMessageCardProps> = ({ msg }) => {
  const time = new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const priorityStyles: Record<string, { border: string; icon: string; bg: string }> = {
    NORMAL: { border: 'border-border', icon: '●', bg: 'bg-panel' },
    IMPORTANT: { border: 'border-accent', icon: '◆', bg: 'bg-panel' },
    WARNING: { border: 'border-warning', icon: '⚠', bg: 'bg-[#fdf8e8]' },
    CRITICAL: { border: 'border-danger', icon: '✖', bg: 'bg-[#fdf0f0]' },
  };

  const style = priorityStyles[msg.priority] || priorityStyles.NORMAL;

  const categoryColor: Record<string, string> = {
    NAVIGATION: 'text-accent',
    TASK: 'text-success',
    COORDINATION: 'text-path',
    SAFETY: 'text-warning',
    OBSTACLE: 'text-danger',
    BATTERY: 'text-warning',
    FAILURE: 'text-danger',
    RECOVERY: 'text-success',
    SYSTEM: 'text-muted',
  };

  return (
    <div className={`${style.bg} border ${style.border} rounded-sm p-2 text-[11px] leading-relaxed`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] ${msg.priority === 'CRITICAL' ? 'text-danger font-bold' : msg.priority === 'WARNING' ? 'text-warning' : 'text-muted'}`}>
            {style.icon}
          </span>
          <span className="font-bold text-text">{msg.sender}</span>
          <span className="text-muted">→</span>
          <span className="font-semibold text-text">{msg.receiver}</span>
        </div>
        <span className="text-muted font-mono text-[9px]">{time}</span>
      </div>
      <div className="text-text ml-4">{msg.message}</div>
      <div className={`ml-4 mt-0.5 text-[9px] font-semibold uppercase tracking-wider ${categoryColor[msg.category] || 'text-muted'}`}>
        {msg.category}
      </div>
    </div>
  );
};
