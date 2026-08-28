'use client';

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWarehouseStore } from '../../store/warehouseStore';

// Dynamically import Konva component to avoid SSR issues
const WarehouseMap = dynamic(() => import('./WarehouseMap').then(mod => mod.WarehouseMap), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center text-muted">Loading map engine...</div>
});

export const WarehouseWorkspace: React.FC = () => {
  const { addObstacle, scale, pan, removeObstacle, selectedItemId, selectedItemType } = useWarehouseStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  
  const [dragPreview, setDragPreview] = useState<{ x: number, y: number, type: string } | null>(null);

  // Keyboard shortcut for deleting selected object
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId && selectedItemType === 'OBSTACLE') {
          removeObstacle(selectedItemId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, selectedItemType, removeObstacle]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    if (e.dataTransfer.types.includes('application/amr-type')) {
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (rect) {
        // Calculate preview position in DOM coordinates relative to the workspace container
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDragPreview({ x, y, type: 'OBSTACLE' });
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragPreview(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);
    
    const type = e.dataTransfer.getData('application/amr-type');
    
    if (type === 'OBSTACLE' && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      
      // Calculate coordinates relative to the MAP container (where Konva Stage starts)
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      
      // If dropped outside the actual map, ignore
      if (pointerX < 0 || pointerY < 0 || pointerX > rect.width || pointerY > rect.height) {
        return;
      }
      
      // Convert to Konva world coordinates based on pan and scale
      let worldX = (pointerX - pan.x) / scale;
      let worldY = (pointerY - pan.y) / scale;
      
      // Offset by half of obstacle width/height (40x40) to center it on the cursor
      worldX -= 20;
      worldY -= 20;
      
      // Snap to 20px grid
      const snapX = Math.round(worldX / 20) * 20;
      const snapY = Math.round(worldY / 20) * 20;

      addObstacle({
        x: snapX,
        y: snapY,
        width: 40,
        height: 40
      });
    }
  };

  return (
    <div 
      className="flex-1 bg-workspace relative overflow-hidden" 
      style={{
        backgroundImage: 'linear-gradient(var(--color-toolbar) 1px, transparent 1px), linear-gradient(90deg, var(--color-toolbar) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
      ref={workspaceRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div ref={mapContainerRef} className="pointer-events-auto shadow-sm border border-border bg-white w-[800px] h-[600px]">
          <WarehouseMap />
        </div>
      </div>
      
      {/* HTML-based drag preview over the workspace */}
      {dragPreview && (
        <div 
          className="absolute pointer-events-none opacity-50 z-50 flex flex-col items-center justify-center"
          style={{
            left: dragPreview.x - 20, // Center the 40x40 obstacle on mouse
            top: dragPreview.y - 20,
            width: 40,
            height: 40,
            backgroundColor: '#fdf5f5',
            border: '2px dashed #C83E3E',
          }}
        >
          <span className="text-danger font-bold text-[20px] leading-none">!</span>
          <span className="text-danger font-bold text-[8px] absolute -bottom-4 bg-white px-1 whitespace-nowrap">DROP LOCATION</span>
        </div>
      )}
    </div>
  );
};
