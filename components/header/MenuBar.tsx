'use client';

import React from 'react';

const MENU_ITEMS = ['File', 'Edit', 'View', 'Warehouse', 'Robot', 'Simulation', 'Tools', 'Help'];

export const MenuBar: React.FC = () => {
  return (
    <div className="h-[30px] bg-toolbar flex items-center px-2 border-b border-border">
      {MENU_ITEMS.map((item) => (
        <button
          key={item}
          className="px-3 py-1 text-[12px] text-text hover:bg-app rounded-sm transition-colors"
        >
          {item}
        </button>
      ))}
    </div>
  );
};

