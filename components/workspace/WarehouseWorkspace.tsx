'use client';

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWarehouseStore } from '../../store/warehouseStore';
import { PlaceableType } from '../../types/warehouse';

const WarehouseMap = dynamic(() => import('./WarehouseMap').then((mod) => mod.WarehouseMap), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center text-muted">Loading map engine...</div>,
});

const Warehouse3D = dynamic(() => import('../simulation/Warehouse3D').then((mod) => mod.Warehouse3D), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center text-muted bg-[#1a1a2e]">Loading 3D warehouse...</div>,
});

export const WarehouseWorkspace: React.FC = () => {
  const placeAtCell = useWarehouseStore((s) => s.placeAtCell);
  const scale = useWarehouseStore((s) => s.scale);
  const pan = useWarehouseStore((s) => s.pan);
  const deleteSelected = useWarehouseStore((s) => s.deleteSelected);
  const viewMode = useWarehouseStore((s) => s.viewMode);
  const appMode = useWarehouseStore((s) => s.appMode);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; type: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected]);

  const isRunning = useWarehouseStore((state) => state.isRunning);
  const tick = useWarehouseStore((state) => state.tick);
  const simSpeed = useWarehouseStore((state) => state.simSpeed);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (isRunning && appMode === 'PLAY') {
      intervalId = setInterval(() => {
        tick();
      }, Math.max(80, 500 / simSpeed));
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, tick, simSpeed, appMode]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (e.dataTransfer.types.includes('application/amr-type')) {
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDragPreview({ x, y, type: 'OBJECT' });
      }
    }
  };

  const handleDragLeave = () => {
    setDragPreview(null);
  };

  const dropToCell = (e: React.DragEvent, type: PlaceableType, assetUrl?: string) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    if (pointerX < 0 || pointerY < 0 || pointerX > rect.width || pointerY > rect.height) return;
    const { cellSize, viewMode: vm } = useWarehouseStore.getState();
    if (vm === '3D') {
      placeAtCell(type, 10, 10, assetUrl);
      return;
    }
    const worldX = (pointerX - pan.x) / scale;
    const worldY = (pointerY - pan.y) / scale;
    const col = Math.round(worldX / cellSize);
    const row = Math.round(worldY / cellSize);
    placeAtCell(type, row, col, assetUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);
    const type = e.dataTransfer.getData('application/amr-type') as PlaceableType | 'OBSTACLE';
    const assetUrl = e.dataTransfer.getData('application/amr-asset-url');
    if (!type) return;
    if (appMode !== 'BUILDER') return;
    dropToCell(e, type as PlaceableType, assetUrl);
  };

  return (
    <div
      className="flex-1 bg-workspace relative overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(var(--color-toolbar) 1px, transparent 1px), linear-gradient(90deg, var(--color-toolbar) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      ref={workspaceRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute inset-2 pointer-events-none">
        <div ref={mapContainerRef} className="pointer-events-auto shadow-sm border border-border bg-white w-full h-full overflow-hidden">
          {viewMode === '3D' ? <Warehouse3D /> : <WarehouseMap />}
        </div>
      </div>

      {dragPreview && appMode === 'BUILDER' && (
        <div
          className="absolute pointer-events-none opacity-50 z-50 flex flex-col items-center justify-center"
          style={{
            left: dragPreview.x - 20,
            top: dragPreview.y - 20,
            width: 40,
            height: 40,
            backgroundColor: '#fdf5f5',
            border: '2px dashed #C83E3E',
          }}
        >
          <span className="text-danger font-bold text-[20px] leading-none">+</span>
        </div>
      )}
    </div>
  );
};
