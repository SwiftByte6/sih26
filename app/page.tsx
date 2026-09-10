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
  const [projectStarted, setProjectStarted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('amr_project_started') === 'true';
    }
    return false;
  });

  useEffect(() => {
    setMounted(true);

    // Sync persistent state from localStorage
    if (typeof window !== 'undefined') {
      const savedProjectState = localStorage.getItem('amr_project_started');
      if (savedProjectState === 'true') {
        setProjectStarted(true);
      }
    }

    // Fast initial auth check from Supabase session storage
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        }
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === 'SIGNED_OUT') {
        setProjectStarted(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('amr_project_started');
        }
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleStartProject = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('amr_project_started', 'true');
    }
    setProjectStarted(true);
  };

  const handleReturnToProjectLauncher = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('amr_project_started');
    }
    setProjectStarted(false);
  };

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
    return <ProjectLauncher onStartProject={handleStartProject} />;
  }

  // 3. Authenticated & Project Selected -> Main Simulator Page
  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-text select-none">
      <ToastContainer />
      <TitleBar />
      <Toolbar />
      <MenuBar onReturnToProjectLauncher={handleReturnToProjectLauncher} />
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
