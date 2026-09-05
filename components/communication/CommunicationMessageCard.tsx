'use client';

import React from 'react';
import { CommunicationMessage } from '../../types/warehouse';
import { ArrowRight } from 'lucide-react';

interface CommunicationMessageCardProps {
  msg: CommunicationMessage;
}

export const CommunicationMessageCard: React.FC<CommunicationMessageCardProps> = ({ msg }) => {
  const time = new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const priorityStyles: Record<string, { border: string; icon: string; bg: string }> = {
    NORMAL: { border: 'border-border', icon: '●', bg: 'bg-panel' },
    IMPORTANT: { border: 'border-accent/40', icon: '◆', bg: 'bg-accent/5' },
    WARNING: { border: 'border-warning/50', icon: '⚠', bg: 'bg-warning/5' },
    CRITICAL: { border: 'border-danger/60', icon: '✖', bg: 'bg-danger/10' },
  };

  const style = priorityStyles[msg.priority] || priorityStyles.NORMAL;

  const categoryColor: Record<string, string> = {
    NAVIGATION: 'text-accent',
    TASK: 'text-success font-semibold',
    COORDINATION: 'text-sky-600 dark:text-sky-400 font-semibold',
    SAFETY: 'text-warning font-semibold',
    OBSTACLE: 'text-danger font-semibold',
    BATTERY: 'text-amber-500 font-semibold',
    FAILURE: 'text-danger font-bold',
    RECOVERY: 'text-teal-600 font-semibold',
    SYSTEM: 'text-muted',
  };

  return (
    <div className={`${style.bg} border ${style.border} rounded-md p-2 text-[11px] leading-relaxed shadow-sm transition-all hover:shadow`}>
      <div className="flex items-center justify-between mb-1 pb-1 border-b border-border/40">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className={`text-[10px] ${msg.priority === 'CRITICAL' ? 'text-danger font-bold' : msg.priority === 'WARNING' ? 'text-warning' : msg.priority === 'IMPORTANT' ? 'text-accent' : 'text-muted'}`}>
            {style.icon}
          </span>
          <span className="font-bold text-text">{msg.sender}</span>
          <ArrowRight size={10} className="text-muted" />
          <span className={`font-semibold ${msg.receiver === 'ALL' ? 'text-amber-600 dark:text-amber-400' : 'text-text'}`}>{msg.receiver}</span>
        </div>
        <span className="text-muted font-mono text-[9px]">{time}</span>
      </div>
      <div className="text-text font-mono text-[10.5px] pl-1 break-words">{msg.message}</div>
      <div className={`pl-1 mt-1 text-[8.5px] uppercase tracking-wider ${categoryColor[msg.category] || 'text-muted'}`}>
        {msg.category}
      </div>
    </div>
  );
};
