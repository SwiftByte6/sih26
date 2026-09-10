'use client';

import React, { useState } from 'react';
import { Bot, Mail, Lock, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    let valid = true;

    if (!email.trim()) {
      setEmailError('Email address is required.');
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address (e.g. user@domain.com).');
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (!PASSWORD_REGEX.test(password)) {
      setPasswordError('Password must be at least 6 characters with at least 1 letter and 1 number.');
      valid = false;
    } else {
      setPasswordError(null);
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMsg(null);

    if (!validate()) return;

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setApiError(error.message);
        } else {
          setSuccessMsg('Signed in successfully!');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setApiError(error.message);
        } else {
          if (data.session) {
            setSuccessMsg('Account created and signed in successfully!');
          } else {
            setSuccessMsg('Account created! Please check your inbox to confirm your email.');
          }
        }
      }
    } catch (err: any) {
      setApiError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-workspace text-text flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
      {/* Clean Light Card */}
      <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-sm p-8 z-10">
        {/* Logo & Title Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-3">
            <Bot size={28} />
          </div>
          <h1 className="text-xl font-bold text-text tracking-tight">AMR Fleet Simulator</h1>
          <p className="text-xs text-muted mt-1 font-mono">Industrial Autonomous Mobile Robot Platform</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-workspace border border-border p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setApiError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setApiError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 text-xs flex items-center gap-2">
            <ShieldCheck size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* API Error Alert */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Email ID</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-2.5 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="operator@amr-fleet.io"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                  emailError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-accent'
                } rounded-lg text-text focus:outline-hidden focus:ring-1 transition-all`}
              />
            </div>
            {emailError && (
              <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-2.5 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                  passwordError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-accent'
                } rounded-lg text-text focus:outline-hidden focus:ring-1 transition-all`}
              />
            </div>
            {passwordError ? (
              <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{passwordError}</span>
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-muted">
                Must be at least 6 characters (minimum 1 letter and 1 number).
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white font-semibold text-xs rounded-lg hover:bg-accent/90 focus:outline-hidden transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Account'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border text-center text-[10px] text-muted font-mono flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-accent" />
          <span>Secured via Supabase Authentication & Regex Validation</span>
        </div>
      </div>
    </div>
  );
};
