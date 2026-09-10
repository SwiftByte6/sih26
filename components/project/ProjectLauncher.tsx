'use client';

import React, { useRef, useState } from 'react';
import { PlusCircle, FolderOpen, Play, Bot, Upload, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { blankWarehouse, demoWarehouse } from '../../data/demoWarehouse';
import { UserDropdown } from '../auth/UserDropdown';

interface ProjectLauncherProps {
  onStartProject: () => void;
}

export const ProjectLauncher: React.FC<ProjectLauncherProps> = ({ onStartProject }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartNew = () => {
    try {
      useWarehouseStore.getState().loadLayout(blankWarehouse);
      onStartProject();
    } catch (err) {
      setErrorMsg('Failed to initialize blank layout.');
    }
  };

  const handleLoadDemo = () => {
    try {
      useWarehouseStore.getState().loadLayout(demoWarehouse);
      onStartProject();
    } catch (err) {
      setErrorMsg('Failed to load demo scenario.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed && (parsed.shelves || parsed.robots || parsed.walls || parsed.obstacles)) {
        useWarehouseStore.getState().loadLayout(parsed);
        onStartProject();
      } else {
        setErrorMsg('Invalid scenario layout format. Please select a valid JSON file.');
      }
    } catch (err) {
      setErrorMsg('Could not parse layout JSON file. Please verify file content.');
    }
  };

  return (
    <div className="h-screen w-screen bg-white text-text flex flex-col select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="h-11 bg-white border-b border-border px-5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Bot size={18} />
          </div>
          <span className="text-sm font-bold text-text tracking-wide">AMR Fleet Simulator</span>
          <span className="text-[10px] text-muted font-mono bg-workspace px-2 py-0.5 border border-border rounded-xs">v2.4</span>
        </div>
        <UserDropdown />
      </div>

      {/* Main Container - Clean Light Theme Canvas */}
      <div className="flex-1 bg-workspace flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        <div className="w-full max-w-4xl bg-white border border-border rounded-2xl p-8 shadow-sm">
          {/* Section Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text tracking-tight">Project Workspace Setup</h1>
            <p className="text-xs text-muted mt-2 max-w-md mx-auto">
              Select an option below to initialize your Autonomous Mobile Robot warehouse simulation canvas.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-xs flex items-center justify-between max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          {/* Clean 3-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Start New Project */}
            <div
              onClick={handleStartNew}
              className="bg-white border border-border hover:border-accent rounded-xl p-6 flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-md group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 group-hover:bg-accent group-hover:text-white transition-all">
                <PlusCircle size={26} />
              </div>
              <h2 className="text-sm font-bold text-text mb-2">Start New Project</h2>
              <p className="text-xs text-muted leading-relaxed mb-6">
                Clean blank canvas with only floor grid and outer perimeter boundary walls.
              </p>
              <button className="mt-auto w-full py-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-lg group-hover:bg-accent group-hover:text-white transition-all flex items-center justify-center gap-1.5">
                <span>Blank Canvas</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Card 2: Open Existing Project */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-border hover:border-accent rounded-xl p-6 flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-md group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 group-hover:bg-accent group-hover:text-white transition-all">
                <FolderOpen size={26} />
              </div>
              <h2 className="text-sm font-bold text-text mb-2">Open Existing Project</h2>
              <p className="text-xs text-muted leading-relaxed mb-6">
                Upload a saved layout JSON scenario file from your computer to restore workspace.
              </p>
              <button className="mt-auto w-full py-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-lg group-hover:bg-accent group-hover:text-white transition-all flex items-center justify-center gap-1.5">
                <Upload size={13} />
                <span>Upload JSON</span>
              </button>
            </div>

            {/* Card 3: Load Demo Scenario */}
            <div
              onClick={handleLoadDemo}
              className="bg-white border border-border hover:border-accent rounded-xl p-6 flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-md group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 group-hover:bg-accent group-hover:text-white transition-all">
                <Play size={26} />
              </div>
              <h2 className="text-sm font-bold text-text mb-2">Load Demo Scenario</h2>
              <p className="text-xs text-muted leading-relaxed mb-6">
                Pre-configured warehouse layout with 6 storage aisles and 3 active robots.
              </p>
              <button className="mt-auto w-full py-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-lg group-hover:bg-accent group-hover:text-white transition-all flex items-center justify-center gap-1.5">
                <span>Load Demo</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted font-mono flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} className="text-accent" />
            <span>You can switch layouts or export JSON anytime from the top <strong>Project</strong> menu.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
