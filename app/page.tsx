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
import { RobotFleetSection } from '../components/robot/RobotFleetSection';
import { ManageRobotsModal } from '../components/robot/ManageRobotsModal';
import { ToastContainer } from '../components/ui/ToastContainer';
import { AnalyticsPanel } from '../components/dashboard/AnalyticsPanel';
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
        <Toolbar />
        <MenuBar />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-text select-none">
      <ToastContainer />
      <TitleBar />
     
      <Toolbar />
       <MenuBar />
      <ManageRobotsModal />
      
      <div className="flex-1 flex overflow-hidden relative">
        <WarehouseWorkspace />
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

        {activeView === 'ANALYSIS' && (
          <div className="absolute inset-0 z-30 bg-workspace flex flex-col overflow-hidden">
            <AnalyticsPanel />
          </div>
        )}

      </div>
      
      {activeView === 'WAREHOUSE' && <ComponentPalette />}
      <SimulationControls />
    </div>
  );
}


