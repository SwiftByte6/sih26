'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderKanban,
  Edit3,
  Eye,
  Map as MapIcon,
  Cpu,
  ClipboardList,
  PlayCircle,
  BarChart2,
  HelpCircle,
  Check,
  LayoutGrid,
 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTaskStore } from '../../store/taskStore';
import { useWarehouseStore } from '../../store/warehouseStore';

interface MenuItem {
  label: string;
  action?: () => void;
  shortcut?: string;
  divider?: boolean;
  checked?: boolean;
}

const MENU_CONFIG = [
  { name: 'Project', icon: FolderKanban },
  { name: 'Edit', icon: Edit3 },
  { name: 'View', icon: Eye },
  { name: 'Map', icon: MapIcon },
  { name: 'Robots', icon: Cpu },
  { name: 'Tasks', icon: ClipboardList },
  { name: 'Simulation', icon: PlayCircle },
  { name: 'Analytics', icon: BarChart2 },
  { name: 'Help', icon: HelpCircle },
];

export const MenuBar: React.FC = () => {
  const activeView = useTaskStore((state) => state.activeView);
  const setActiveView = useTaskStore((state) => state.setActiveView);
  
  const setViewMode = useWarehouseStore((s) => s.setViewMode);
  const viewMode = useWarehouseStore((s) => s.viewMode);
  const showGrid = useWarehouseStore((s) => s.showGrid);
  const toggleGrid = useWarehouseStore((s) => s.toggleGrid);
  const showSensors = useWarehouseStore((s) => s.showSensors);
  const toggleSensors = useWarehouseStore((s) => s.toggleSensors);
  const undo = useWarehouseStore((s) => s.undo);
  const redo = useWarehouseStore((s) => s.redo);
  const zoomIn = useWarehouseStore((s) => s.zoomIn);
  const zoomOut = useWarehouseStore((s) => s.zoomOut);
  const zoomFit = useWarehouseStore((s) => s.zoomFit);
  const deleteSelected = useWarehouseStore((s) => s.deleteSelected);
  const duplicateSelected = useWarehouseStore((s) => s.duplicateSelected);
  const isRunning = useWarehouseStore((s) => s.isRunning);
  const toggleSimulation = useWarehouseStore((s) => s.toggleSimulation);
  const resetSimulation = useWarehouseStore((s) => s.resetSimulation);
  const openManageRobots = useWarehouseStore((s) => s.openManageRobots);
  const setSimSpeed = useWarehouseStore((s) => s.setSimSpeed);
  const simSpeed = useWarehouseStore((s) => s.simSpeed);
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuHover = (menu: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  const executeAction = (action?: () => void) => {
    if (action) action();
    setActiveMenu(null);
  };

  const MENUS: Record<string, MenuItem[]> = {
    Project: [
      {
        label: 'New Scenario',
        shortcut: 'Ctrl+N',
        action: () => {
          if (typeof window !== 'undefined' && confirm('Reset layout to default scenario?')) {
            localStorage.removeItem('amr-warehouse-layout');
            window.location.reload();
          }
        },
      },
      {
        label: 'Open Scenario...',
        shortcut: 'Ctrl+O',
        action: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (parsed && parsed.shelves && parsed.robots) {
                  useWarehouseStore.getState().loadLayout(parsed);
                } else {
                  alert('Invalid scenario file format');
                }
              } catch (err) {
                alert('Failed to load file');
              }
            }
          };
          input.click();
        },
      },
      {
        label: 'Save Scenario',
        shortcut: 'Ctrl+S',
        action: () => {
          const snap = useWarehouseStore.getState().getSnapshot();
          const json = JSON.stringify(snap, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'amr-warehouse-scenario.json';
          a.click();
          URL.revokeObjectURL(url);
        },
      },
      { divider: true, label: '' },
      {
        label: 'Import Map Image...',
        action: () => {
          alert('Click "Import Map" in the toolbar to load custom CAD/PNG layouts.');
        },
      },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: undo },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: redo },
      { divider: true, label: '' },
      { label: 'Auto-Rearrange Layout (Fix Overlaps)', action: () => useWarehouseStore.getState().rearrangeLayout() },
      { label: 'Duplicate Selected', action: duplicateSelected },
      { label: 'Delete Selected', shortcut: 'Del', action: deleteSelected },
    ],
    View: [
      {
        label: '2D Top-Down View',
        checked: viewMode === '2D',
        action: () => setViewMode('2D'),
      },
      {
        label: '3D Simulation View',
        checked: viewMode === '3D',
        action: () => setViewMode('3D'),
      },
      { divider: true, label: '' },
      {
        label: 'Grid Lines Overlay',
        checked: showGrid,
        action: toggleGrid,
      },
      {
        label: 'Sensor Visualization',
        checked: showSensors,
        action: toggleSensors,
      },
      { divider: true, label: '' },
      { label: 'Zoom In', shortcut: '+', action: zoomIn },
      { label: 'Zoom Out', shortcut: '-', action: zoomOut },
      { label: 'Fit to Screen', action: zoomFit },
    ],
    Map: [
      { label: '2D Grid Boundary', checked: true },
      { label: 'Wall Alignment' },
      { label: 'Storage Aisle Zones' },
      { label: 'Pickup / Drop Stations' },
      { label: 'Obstacles & Pillars' },
    ],
    Robots: [
      {
        label: 'Robot Fleet',
        action: () => setActiveView('ROBOTS'),
      },
      {
        label: 'Manage Robots',
        action: () => openManageRobots(),
      },
      {
        label: 'Add Robot',
        action: () => {
          useWarehouseStore.getState().addRobot({});
          openManageRobots();
        },
      },
      {
        label: 'Robot Specifications',
        action: () => {
          const rId = useWarehouseStore.getState().robots[0]?.id || null;
          openManageRobots(rId);
        },
      },
    ],
    Tasks: [
      {
        label: 'Task Management Panel',
        action: () => setActiveView('TASKS'),
      },
      { label: 'Create New Task' },
      { label: 'Decentralized P2P Bidding' },
      { label: 'Conflict & Collision Avoidance' },
    ],
    Simulation: [
      {
        label: isRunning ? 'Pause Simulation' : 'Run Simulation',
        action: toggleSimulation,
      },
      { label: 'Reset Simulation', action: resetSimulation },
      { divider: true, label: '' },
      { label: 'Speed 0.5x', checked: simSpeed === 0.5, action: () => setSimSpeed(0.5) },
      { label: 'Speed 1.0x', checked: simSpeed === 1.0, action: () => setSimSpeed(1.0) },
      { label: 'Speed 2.0x', checked: simSpeed === 2.0, action: () => setSimSpeed(2.0) },
      { label: 'Speed 4.0x', checked: simSpeed === 4.0, action: () => setSimSpeed(4.0) },
    ],
    Analytics: [
      { label: 'Fleet Throughput & Efficiency', action: () => router.push('/analytics/fleet-throughput') },
      { label: 'Task Execution Latency', action: () => router.push('/analytics/task-latency') },
      { label: 'P2P Network Messages', action: () => router.push('/analytics/p2p-messages') },
      { label: 'Collision Avoidance Performance', action: () => router.push('/analytics/collision-performance') },
    ],
    Help: [
      {
        label: 'Documentation & Guide',
        action: () => alert('AMR Warehouse Simulator\nBuilt with Next.js, Konva 2D, Three.js 3D & P2P Consensus Engine.'),
      },
      {
        label: 'Keyboard Shortcuts',
        action: () => alert('Shortcuts:\nCtrl+Z: Undo\nCtrl+Y: Redo\nDel: Delete Object\n+: Zoom In\n-: Zoom Out\nSpace / Drag: Pan'),
      },
      { divider: true, label: '' },
      { label: 'About AMR Simulator v2.4' },
    ],
  };

  const MENU_NAMES = ['Project', 'Edit', 'View', 'Map', 'Robots', 'Tasks', 'Simulation', 'Analytics', 'Help'];

  return (
    <div ref={navRef} className="h-[54px] bg-toolbar flex items-center px-3 border-b border-border justify-between select-none relative z-40">
      {/* Primary AMR Domain Navigation (Big Icons Stacked Above Text) */}
      <div className="flex items-center gap-1.5">
        {MENU_CONFIG.map(({ name, icon: Icon }) => {
          const isOpen = activeMenu === name;
          return (
            <div key={name} className="relative">
              <button
                onClick={() => handleMenuClick(name)}
                onMouseEnter={() => handleMenuHover(name)}
                className={`px-3 py-1 text-[10px] font-medium transition-all rounded-md flex flex-col items-center justify-center min-w-[56px] ${
                  isOpen
                    ? 'bg-accent/15 text-accent font-semibold shadow-2xs border border-accent/30'
                    : 'text-text hover:bg-accent/10 hover:text-accent'
                }`}
              >
                <Icon size={20} strokeWidth={1.8} className={isOpen ? 'text-accent' : 'text-muted group-hover:text-accent'} />
                <span className="mt-0.5 leading-none">{name}</span>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-[210px] bg-panel border border-border shadow-lg rounded-md py-1 z-50 flex flex-col">
                  {MENUS[name]?.map((item, idx) => {
                    if (item.divider) {
                      return <div key={idx} className="my-1 border-t border-border" />;
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => executeAction(item.action)}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-text hover:bg-accent hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-3 flex justify-center">
                            {item.checked && <Check size={12} className="group-hover:text-white text-accent" />}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.shortcut && (
                          <span className="text-[10px] text-muted group-hover:text-white/80 font-mono">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Workspace View Tabs (Big Icons Stacked Above Text) */}
      <div className="flex items-center bg-app rounded-md p-1 border border-border gap-1">
        <button
          onClick={() => setActiveView('WAREHOUSE')}
          className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all flex flex-col items-center justify-center min-w-[72px] ${
            activeView === 'WAREHOUSE'
              ? 'bg-accent text-white shadow-xs'
              : 'text-muted hover:text-text hover:bg-toolbar'
          }`}
        >
          <LayoutGrid size={18} strokeWidth={1.8} />
          <span className="mt-0.5 leading-none">Canvas</span>
        </button>
        <button
          onClick={() => setActiveView('TASKS')}
          className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all flex flex-col items-center justify-center min-w-[72px] ${
            activeView === 'TASKS'
              ? 'bg-accent text-white shadow-xs'
              : 'text-muted hover:text-text hover:bg-toolbar'
          }`}
        >
          <ClipboardList size={18} strokeWidth={1.8} />
          <span className="mt-0.5 leading-none">Tasks</span>
        </button>
        <button
          onClick={() => setActiveView('ROBOTS')}
          className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all flex flex-col items-center justify-center min-w-[72px] ${
            activeView === 'ROBOTS'
              ? 'bg-accent text-white shadow-xs'
              : 'text-muted hover:text-text hover:bg-toolbar'
          }`}
        >
          <Cpu size={18} strokeWidth={1.8} />
          <span className="mt-0.5 leading-none">Robots</span>
        </button>
      </div>
    </div>
  );
};



