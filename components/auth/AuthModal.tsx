'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    let valid = true;

    // Email Regex Check
    if (!email.trim()) {
      setEmailError('Email address is required.');
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com).');
      valid = false;
    } else {
      setEmailError(null);
    }

    // Password Regex Check
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
          setSuccessMsg('Successfully signed in!');
          setTimeout(() => {
            onClose();
          }, 800);
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
            setTimeout(() => {
              onClose();
            }, 800);
          } else {
            setSuccessMsg('Account created! Please check your email to confirm registration.');
          }
        }
      }
    } catch (err: any) {
      setApiError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-panel border border-border rounded-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-text transition-colors p-1 rounded-md hover:bg-toolbar"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={24} className="text-accent" />
          <h2 className="text-lg font-bold text-text">
            {mode === 'signin' ? 'Sign In to Account' : 'Create New Account'}
          </h2>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-workspace border border-border p-1 rounded-md mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setApiError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'signup'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-emerald-600 text-xs flex items-center gap-2">
            <ShieldCheck size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* API Error Alert */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-600 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-medium text-text mb-1">Email ID</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-2.5 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="user@example.com"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-workspace border ${
                  emailError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-accent'
                } rounded-md text-text focus:outline-hidden focus:ring-1 transition-all`}
              />
            </div>
            {emailError && (
              <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-medium text-text mb-1">Password</label>
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
                className={`w-full pl-9 pr-3 py-2 text-xs bg-workspace border ${
                  passwordError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-accent'
                } rounded-md text-text focus:outline-hidden focus:ring-1 transition-all`}
              />
            </div>
            {passwordError ? (
              <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{passwordError}</span>
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-muted">
                Must be at least 6 characters (1+ letter, 1+ number).
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-accent text-white font-semibold text-xs rounded-md hover:bg-accent/90 focus:outline-hidden transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-4 text-center text-[10px] text-muted">
          Powered by Supabase Auth &bull; Secure Email/Password Authentication
        </div>
      </div>
    </div>
  );
};
