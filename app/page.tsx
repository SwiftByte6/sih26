'use client';

import React from 'react';
import { TitleBar } from '../components/header/TitleBar';
import { MenuBar } from '../components/header/MenuBar';
import { Toolbar } from '../components/header/Toolbar';
import { WarehouseWorkspace } from '../components/workspace/WarehouseWorkspace';
import { ComponentPalette } from '../components/palette/ComponentPalette';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { SimulationControls } from '../components/simulation/SimulationControls';
import { RobotCommunicationPanel } from '../components/communication/RobotCommunicationPanel';
import { TaskManagementPanel } from '../components/task/TaskManagementPanel';
import { RobotFleetSection } from '../components/robot/RobotFleetSection';
import { useTaskStore } from '../store/taskStore';

export default function SimulatorPage() {
  const activeView = useTaskStore((state) => state.activeView);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-text select-none">
        <TitleBar />
        <MenuBar />
        <Toolbar />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-text select-none">
      <TitleBar />
      <MenuBar />
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden relative">
        <WarehouseWorkspace />
        <RobotCommunicationPanel />
        <InspectorPanel />

        {activeView === 'TASKS' && (


          <div className="absolute inset-0 z-30 bg-workspace flex flex-col overflow-hidden">
            <TaskManagementPanel />
          </div>
        )}

        {activeView === 'ROBOTS' && (
          <div className="absolute inset-0 z-30 bg-workspace flex flex-col overflow-hidden">
            <RobotFleetSection />
          </div>
        )}

      </div>
      
      {activeView === 'WAREHOUSE' && <ComponentPalette />}
      <SimulationControls />
    </div>
  );
}


