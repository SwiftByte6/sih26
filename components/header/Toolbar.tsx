'use client';

import React, { useState } from 'react';
import { File, FolderOpen, Save, Undo, Redo, MousePointer2, Move, ZoomIn, ZoomOut, Maximize, Grid3X3, Play, Upload } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';

const TOOLBAR_GROUPS = [
  [
    { icon: File, label: 'New' },
    { icon: FolderOpen, label: 'Open' },
    { icon: Save, label: 'Save' }
  ],
  [
    { icon: Undo, label: 'Undo' },
    { icon: Redo, label: 'Redo' }
  ],
  [
    { icon: MousePointer2, label: 'Select' },
    { icon: Move, label: 'Pan' },
    { icon: ZoomIn, label: 'Zoom +' },
    { icon: ZoomOut, label: 'Zoom -' },
    { icon: Maximize, label: 'Fit' },
    { icon: Grid3X3, label: 'Grid' }
  ]
];

export const Toolbar: React.FC = () => {
  const toggleSimulation = useWarehouseStore(state => state.toggleSimulation);
  const isRunning = useWarehouseStore(state => state.isRunning);
  const [showImport, setShowImport] = useState(false);
  const [showReconstruction, setShowReconstruction] = useState(false);

  const handlePreview = () => {
    setShowImport(false);
    setShowReconstruction(true);
  };

  const handleNativeImport = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const file = await open({
        multiple: false,
        filters: [{
          name: 'Map Images',
          extensions: ['png', 'jpg', 'jpeg', 'pdf', 'svg']
        }]
      });
      if (file) {
        handlePreview();
      }
    } catch (e) {
      setShowImport(true);
    }
  };

  const handleToolbarClick = async (label: string) => {
    try {
      if (label === 'Open') {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const file = await open({
          filters: [{ name: 'Config', extensions: ['json'] }]
        });
        if (file) {
           const { readTextFile } = await import('@tauri-apps/plugin-fs');
           // file is string or object depending on Tauri v1/v2, usually object in v2. 
           // In Tauri v2 it might return an object with a path property, or string.
           const path = typeof file === 'string' ? file : (file as any).path;
           if (path) {
             const content = await readTextFile(path);
             console.log("Loaded content:", content.substring(0, 50));
           }
        }
      } else if (label === 'Save') {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const file = await save({
          filters: [{ name: 'Config', extensions: ['json'] }]
        });
        if (file) {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(file, JSON.stringify({ demo: "data" }));
          console.log("Saved");
        }
      }
    } catch (e) {
      console.log("Native API failed (fallback or not in Tauri):", e);
    }
  };

  return (
    <>
      <div className="h-[36px] bg-toolbar flex items-center px-2 border-b border-border gap-2">
        {TOOLBAR_GROUPS.map((group, groupIdx) => (
          <React.Fragment key={groupIdx}>
            <div className="flex items-center gap-1">
              {group.map((tool) => (
                <button
                  key={tool.label}
                  className="flex items-center justify-center p-1.5 hover:bg-app rounded-sm text-muted hover:text-text"
                  title={tool.label}
                  onClick={() => handleToolbarClick(tool.label)}
                >
                  <tool.icon size={16} />
                </button>
              ))}
            </div>
            {groupIdx < TOOLBAR_GROUPS.length - 1 && (
              <div className="w-px h-5 bg-border mx-1" />
            )}
          </React.Fragment>
        ))}
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] font-medium text-text hover:bg-app transition-colors"
          onClick={handleNativeImport}
        >
          <Upload size={14} />
          Import Map
        </button>
        
        <div className="flex-1" />
        
        <button 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] font-medium transition-colors mr-2 ${
            isRunning 
              ? 'bg-danger hover:bg-opacity-80 text-white' 
              : 'bg-accent hover:bg-opacity-80 text-white'
          }`}
          onClick={toggleSimulation}
        >
          <Play size={14} className={isRunning ? 'fill-current' : ''} />
          {isRunning ? 'Stop' : 'Run'}
        </button>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="w-[400px] bg-workspace border border-border shadow-lg flex flex-col">
            <div className="h-[30px] bg-app border-b border-border flex items-center px-3 font-semibold text-[12px] tracking-wide text-text">
              IMPORT WAREHOUSE MAP
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="h-[120px] border-2 border-dashed border-border bg-white flex flex-col items-center justify-center text-muted cursor-pointer hover:border-accent">
                <span className="text-[12px] font-medium">Drop map here</span>
                <span className="text-[11px]">or Browse Files</span>
              </div>
              <div className="text-[11px] text-muted text-center">
                Supported: PNG JPG PDF SVG
              </div>
              <div className="flex justify-between mt-2">
                <button 
                  className="px-4 py-1.5 bg-app border border-border rounded-sm text-[12px] hover:bg-toolbar font-medium"
                  onClick={() => setShowImport(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-1.5 bg-accent text-white rounded-sm text-[12px] hover:bg-opacity-80 font-medium"
                  onClick={handlePreview}
                >
                  Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReconstruction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="w-[600px] bg-workspace border border-border shadow-lg flex flex-col">
            <div className="h-[30px] bg-app border-b border-border flex items-center px-3 font-semibold text-[12px] tracking-wide text-text">
              MAP RECONSTRUCTION
            </div>
            <div className="flex-1 flex border-b border-border">
              <div className="flex-1 border-r border-border p-3 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-muted tracking-wider">ORIGINAL</div>
                <div className="flex-1 bg-[#e0e0e0] border border-border min-h-[150px] flex items-center justify-center text-muted text-[12px]">
                  [floor plan image]
                </div>
              </div>
              <div className="flex-1 p-3 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-muted tracking-wider">RECREATED</div>
                <div className="flex-1 bg-white border border-border min-h-[150px] flex items-center justify-center text-accent font-medium text-[12px]">
                  [warehouse graph]
                </div>
              </div>
            </div>
            <div className="p-3 flex justify-between items-center bg-[#fdfdfd]">
              <div className="text-[11px] text-text">
                <span className="font-semibold text-muted mr-2">Detected:</span>
                Walls: 24 <span className="text-border mx-1">|</span> Shelves: 16 <span className="text-border mx-1">|</span> Aisles: 8
              </div>
              <div className="flex gap-2">
                <button 
                  className="px-4 py-1.5 bg-app border border-border rounded-sm text-[12px] hover:bg-toolbar font-medium"
                  onClick={() => setShowReconstruction(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-1.5 bg-success text-white rounded-sm text-[12px] hover:bg-opacity-80 font-medium"
                  onClick={() => setShowReconstruction(false)}
                >
                  Use Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

