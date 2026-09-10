'use client';

import React, { useState, useEffect } from 'react';
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
import { AuthPage } from '../components/auth/AuthPage';
import { ProjectLauncher } from '../components/project/ProjectLauncher';
import { useTaskStore } from '../store/taskStore';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function SimulatorPage() {
  const activeView = useTaskStore((state) => state.activeView);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projectStarted, setProjectStarted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initial auth check
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setProjectStarted(false); // Reset project setup state on sign out
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!mounted || authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-app text-text select-none">
        <Loader2 size={32} className="animate-spin text-accent mb-3" />
        <span className="text-xs font-mono text-muted">Initializing AMR Fleet Platform...</span>
      </div>
    );
  }

  // 1. Unauthenticated -> Full-Screen Dedicated Login Page
  if (!user) {
    return <AuthPage />;
  }

  // 2. Authenticated, Project Not Selected -> Project Setup Launcher
  if (!projectStarted) {
    return <ProjectLauncher onStartProject={() => setProjectStarted(true)} />;
  }

  // 3. Authenticated & Project Selected -> Main Simulator Page
  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-text select-none">
      <ToastContainer />
      <TitleBar />
      <Toolbar />
      <MenuBar onReturnToProjectLauncher={() => setProjectStarted(false)} />
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
