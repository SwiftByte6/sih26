'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, ChevronDown, Eye, Video, Compass, Check } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { CameraMode, RobotState } from '../../types/warehouse';

const STATE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  MOVING: { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-400' },
  WAITING: { bg: 'bg-purple-100 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-400' },
  CHARGING: { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-400' },
  ERROR: { bg: 'bg-rose-100 dark:bg-rose-950/50', text: 'text-rose-700 dark:text-rose-400' },
  IDLE: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
};

export const RobotCameraOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const robots = useWarehouseStore((s) => s.robots);
  const cameraMode = useWarehouseStore((s) => s.cameraMode);
  const selectedCameraRobotId = useWarehouseStore((s) => s.selectedCameraRobotId);
  const setCameraMode = useWarehouseStore((s) => s.setCameraMode);
  const setSelectedCameraRobotId = useWarehouseStore((s) => s.setSelectedCameraRobotId);

  const selectedRobot = robots.find((r) => r.id === selectedCameraRobotId);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRobot = (robotId: string, mode?: CameraMode) => {
    const targetMode = mode ?? (cameraMode === 'OVERVIEW' ? 'FOLLOW' : cameraMode);
    setCameraMode(targetMode, robotId);
  };

  const handleModeChange = (mode: CameraMode) => {
    if (mode === 'OVERVIEW') {
      setCameraMode('OVERVIEW');
    } else {
      if (selectedCameraRobotId) {
        setCameraMode(mode, selectedCameraRobotId);
      } else if (robots.length > 0) {
        setCameraMode(mode, robots[0].id);
      }
    }
  };

  const getButtonLabel = () => {
    if (cameraMode === 'OVERVIEW' || !selectedRobot) {
      return 'Overview Camera';
    }
    const modeLabel = cameraMode === 'FOLLOW' ? 'Follow' : 'POV';
    return `${selectedRobot.label || selectedRobot.id} [${modeLabel}]`;
  };

  return (
    <div ref={containerRef} className="absolute top-3 left-3 z-30 select-none">
      <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-border shadow-md rounded-md p-1">
        {/* Main Camera Button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all ${
            cameraMode !== 'OVERVIEW'
              ? 'bg-accent text-white shadow-xs ring-1 ring-accent/40'
              : 'bg-app text-text hover:bg-toolbar border border-border/60'
          }`}
          title="3D Robot Camera Controls"
        >
          <Camera size={14} className={cameraMode !== 'OVERVIEW' ? 'animate-pulse' : ''} />
          <span className="max-w-[130px] truncate">{getButtonLabel()}</span>
          <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Mode Quick Switch Bar */}
        <div className="flex bg-app border border-border/80 rounded p-0.5 gap-0.5">
          <button
            onClick={() => handleModeChange('OVERVIEW')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
              cameraMode === 'OVERVIEW'
                ? 'bg-white text-accent shadow-xs border border-border/40'
                : 'text-muted hover:text-text'
            }`}
            title="Overview Mode (Free Camera Orbit)"
          >
            <Compass size={11} />
            Overview
          </button>
          <button
            onClick={() => handleModeChange('FOLLOW')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
              cameraMode === 'FOLLOW'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-text'
            }`}
            title="Follow Robot Mode (3rd Person View)"
          >
            <Video size={11} />
            Follow
          </button>
          <button
            onClick={() => handleModeChange('POV')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
              cameraMode === 'POV'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-text'
            }`}
            title="Robot POV Mode (1st Person Front View)"
          >
            <Eye size={11} />
            Robot POV
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-[260px] bg-white backdrop-blur-lg border border-border shadow-xl rounded-md overflow-hidden flex flex-col z-40 text-text">
          <div className="px-3 py-2 bg-app border-b border-border flex justify-between items-center">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Select Robot Camera
            </span>
            <span className="text-[10px] font-medium text-muted">
              {robots.length} {robots.length === 1 ? 'robot' : 'robots'} active
            </span>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-1 divide-y divide-border/40">
            {/* Overview item */}
            <button
              onClick={() => {
                handleModeChange('OVERVIEW');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors ${
                cameraMode === 'OVERVIEW'
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'hover:bg-slate-100 text-text'
              }`}
            >
              <div className="flex items-center gap-2">
                <Compass size={14} className={cameraMode === 'OVERVIEW' ? 'text-accent' : 'text-muted'} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold">Overview Mode</span>
                  <span className="text-[9px] text-muted">Free Orbit Controls</span>
                </div>
              </div>
              {cameraMode === 'OVERVIEW' && <Check size={13} className="text-accent" />}
            </button>

            {/* Robot items */}
            {robots.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-muted italic">
                No active robots in simulation
              </div>
            ) : (
              robots.map((r) => {
                const isSelected = selectedCameraRobotId === r.id && cameraMode !== 'OVERVIEW';
                const badgeStyle = STATE_BADGE_COLORS[r.state] || STATE_BADGE_COLORS.IDLE;

                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-1.5 rounded transition-colors ${
                      isSelected ? 'bg-accent/10 border border-accent/20' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => {
                        handleSelectRobot(r.id);
                        setIsOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2 text-left min-w-0 pr-2"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          r.state === 'MOVING'
                            ? 'bg-emerald-500 animate-pulse'
                            : r.state === 'CHARGING'
                            ? 'bg-amber-500'
                            : r.state === 'ERROR'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold truncate">
                          {r.label || r.id}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${badgeStyle.bg} ${badgeStyle.text}`}
                          >
                            {r.state}
                          </span>
                          {r.battery !== undefined && (
                            <span className="text-[9px] text-muted">
                              {Math.round(r.battery)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Mode buttons for this robot */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          handleSelectRobot(r.id, 'FOLLOW');
                          setIsOpen(false);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                          isSelected && cameraMode === 'FOLLOW'
                            ? 'bg-accent text-white border-accent'
                            : 'border-border/60 text-muted hover:text-text hover:bg-slate-100'
                        }`}
                        title="Follow Mode"
                      >
                        Follow
                      </button>
                      <button
                        onClick={() => {
                          handleSelectRobot(r.id, 'POV');
                          setIsOpen(false);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                          isSelected && cameraMode === 'POV'
                            ? 'bg-accent text-white border-accent'
                            : 'border-border/60 text-muted hover:text-text hover:bg-slate-100'
                        }`}
                        title="POV Mode"
                      >
                        POV
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
