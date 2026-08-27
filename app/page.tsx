'use client';

import React from 'react';
import { TitleBar } from '../components/header/TitleBar';
import { MenuBar } from '../components/header/MenuBar';
import { Toolbar } from '../components/header/Toolbar';
import { WarehouseWorkspace } from '../components/workspace/WarehouseWorkspace';
import { ComponentPalette } from '../components/palette/ComponentPalette';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { SimulationControls } from '../components/simulation/SimulationControls';

export default function SimulatorPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-text select-none">
      <TitleBar />
      <MenuBar />
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <WarehouseWorkspace />
        <InspectorPanel />
      </div>
      
      <ComponentPalette />
      <SimulationControls />
    </div>
  );
}
