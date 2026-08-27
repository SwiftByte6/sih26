'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Konva component to avoid SSR issues
const WarehouseMap = dynamic(() => import('./WarehouseMap').then(mod => mod.WarehouseMap), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center text-muted">Loading map engine...</div>
});

export const WarehouseWorkspace: React.FC = () => {
  return (
    <div className="flex-1 bg-workspace relative overflow-hidden" 
         style={{
           backgroundImage: 'linear-gradient(var(--color-toolbar) 1px, transparent 1px), linear-gradient(90deg, var(--color-toolbar) 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto shadow-sm border border-border bg-white">
          <WarehouseMap />
        </div>
      </div>
    </div>
  );
};
