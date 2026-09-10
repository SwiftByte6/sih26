'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, LogOut, Shield, ChevronDown, LogIn, Key, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthModal } from './AuthModal';
import type { User } from '@supabase/supabase-js';

export const UserDropdown: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'signin' | 'signup'>('signin');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get initial session
    const getInitialUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (err) {
        console.error('Failed to get Supabase user:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();

    // Subscribe to Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('amr_project_started');
    }
    await supabase.auth.signOut();
  };

  const handleOpenAuth = (mode: 'signin' | 'signup') => {
    setModalMode(mode);
    setModalOpen(true);
    setDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted">
        <div className="w-4 h-4 rounded-full bg-workspace animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left select-none">
      {user ? (
        /* Logged In Trigger Button */
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border transition-all ${
            dropdownOpen
              ? 'bg-accent/15 border-accent/40 text-accent font-medium'
              : 'bg-panel border-border text-text hover:bg-toolbar hover:border-border/80'
          }`}
          title={user.email || 'User Account'}
        >
          <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-[10px] font-bold uppercase">
            {user.email ? user.email.charAt(0) : <UserIcon size={12} />}
          </div>
          <span className="max-w-[110px] truncate text-[11px] font-medium hidden sm:inline-block">
            {user.email?.split('@')[0]}
          </span>
          <ChevronDown size={12} className={`text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-accent' : ''}`} />
        </button>
      ) : (
        /* Logged Out Trigger Button */
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenAuth('signin')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-accent bg-accent/10 border border-accent/30 hover:bg-accent hover:text-white rounded-md transition-all"
          >
            <UserIcon size={13} />
            <span>Sign In</span>
          </button>
        </div>
      )}

      {/* Dropdown Menu when Logged In */}
      {user && dropdownOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-panel border border-border shadow-xl rounded-md p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* User Info Header */}
          <div className="p-2 border-b border-border mb-1 bg-workspace/50 rounded-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs">
                {user.email ? user.email.charAt(0) : <UserIcon size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text truncate">{user.email}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono">
                  <Shield size={10} />
                  <span>Authenticated</span>
                </div>
              </div>
            </div>
            
            <div className="mt-2 space-y-1 text-[10px] text-muted font-mono bg-panel p-1.5 rounded-xs border border-border/60">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1"><Mail size={10}/> Email:</span>
                <span className="text-text font-medium truncate max-w-[120px]">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1"><Key size={10}/> User ID:</span>
                <span className="text-text font-medium truncate max-w-[100px]">{user.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="space-y-0.5">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-500/10 rounded-md flex items-center gap-2 transition-colors font-medium"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </div>
  );
};
