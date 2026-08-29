'use client';

import React from 'react';
import { TitleBar } from '../components/header/TitleBar';
import { MenuBar } from '../components/header/MenuBar';
import { Toolbar } from '../components/header/Toolbar';
import { WarehouseWorkspace } from '../components/workspace/WarehouseWorkspace';
import { ComponentPalette } from '../components/palette/ComponentPalette';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { SimulationControls } from '../components/simulation/SimulationControls';
import { TaskManagementPanel } from '../components/task/TaskManagementPanel';
import { useTaskStore } from '../store/taskStore';

export default function SimulatorPage() {
  const activeView = useTaskStore((state) => state.activeView);

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-text select-none">
      <TitleBar />
      <MenuBar />
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden relative">
        <WarehouseWorkspace />
        <InspectorPanel />

        {activeView === 'TASKS' && (
          <div className="absolute inset-0 z-30 bg-workspace flex flex-col overflow-hidden">
            <TaskManagementPanel />
          </div>
        )}
      </div>
      
      {activeView === 'WAREHOUSE' && <ComponentPalette />}
      <SimulationControls />
    </div>
  );
}

