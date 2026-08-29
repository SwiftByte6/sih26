'use client';

import React from 'react';

interface CommunicationFiltersProps {
  robotIds: string[];
  selectedRobot: string;
  onSelectRobot: (id: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

const CATEGORIES = ['ALL', 'NAVIGATION', 'TASK', 'COORDINATION', 'SAFETY', 'OBSTACLE', 'BATTERY', 'FAILURE'];

export const CommunicationFilters: React.FC<CommunicationFiltersProps> = ({
  robotIds,
  selectedRobot,
  onSelectRobot,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex flex-col gap-1.5 px-2 py-1.5 border-b border-border bg-app">
      {/* Robot filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onSelectRobot('ALL')}
          className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold transition-colors ${
            selectedRobot === 'ALL' ? 'bg-accent text-white' : 'bg-toolbar text-muted hover:text-text'
          }`}
        >ALL</button>
        {robotIds.map(id => (
          <button
            key={id}
            onClick={() => onSelectRobot(id)}
            className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold transition-colors ${
              selectedRobot === id ? 'bg-accent text-white' : 'bg-toolbar text-muted hover:text-text'
            }`}
          >{id}</button>
        ))}
      </div>
      {/* Category filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-1.5 py-0.5 rounded-sm text-[9px] font-semibold tracking-wide transition-colors ${
              selectedCategory === cat ? 'bg-text text-white' : 'bg-toolbar text-muted hover:text-text'
            }`}
          >{cat}</button>
        ))}
      </div>
    </div>
  );
};
