'use client';

import React from 'react';

import { useTaskStore } from '../../store/taskStore';

const MENU_ITEMS = ['File', 'Edit', 'View', 'Warehouse', 'Robot', 'Simulation', 'Tools', 'Help'];

export const MenuBar: React.FC = () => {
  const activeView = useTaskStore((state) => state.activeView);
  const setActiveView = useTaskStore((state) => state.setActiveView);

  return (
    <div className="h-[30px] bg-toolbar flex items-center px-2 border-b border-border justify-between">
      <div className="flex items-center">
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            className="px-3 py-1 text-[12px] text-text hover:bg-app rounded-sm transition-colors"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Smallest possible tab navigation addition */}
      <div className="flex items-center bg-app rounded p-0.5 border border-border mr-2">
        <button
          onClick={() => setActiveView('WAREHOUSE')}
          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-sm transition-colors ${
            activeView === 'WAREHOUSE' ? 'bg-white text-accent shadow-sm' : 'text-muted hover:text-text'
          }`}
        >
          Warehouse Canvas
        </button>
        <button
          onClick={() => setActiveView('TASKS')}
          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-sm transition-colors ${
            activeView === 'TASKS' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-text'
          }`}
        >
          Task Management
        </button>
      </div>
    </div>
  );
};


