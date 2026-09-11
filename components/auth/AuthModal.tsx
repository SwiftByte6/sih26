'use client';

import React, { useState } from 'react';
import { X, Bot, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { localAuth } from '../../lib/localAuth';

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

    if (!email.trim()) {
      setEmailError('Email address is required.');
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com).');
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
        const { error } = await localAuth.auth.signInWithPassword({
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
        const { data, error } = await localAuth.auth.signUp({
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

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setApiError(null);
    setSuccessMsg(null);
    setEmailError(null);
    setPasswordError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-workspace border border-border rounded-2xl p-4 sm:p-6 shadow-lg flex flex-col md:flex-row gap-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 text-muted hover:text-text bg-white/80 hover:bg-white p-1 rounded-md transition-colors"
        >
          <X size={18} />
        </button>

        {/* Left Side: Video Panel */}
        <div className="relative md:w-1/2 w-full min-h-[220px] md:min-h-[380px] rounded-xl overflow-hidden flex flex-col justify-between p-6 bg-text">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          >
            <source src="/auto.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[#17212B]/90 via-[#17212B]/50 to-[#17212B]/70 pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              Convert your ideas<br />
              into successful<br />
              business.
            </h2>
          </div>

          <div className="relative z-10 flex items-center gap-1.5 text-[11px] text-slate-300 font-mono bg-[#17212B]/80 px-2.5 py-1 rounded-md border border-border/40 w-fit">
            <Bot size={14} className="text-accent" />
            <span>AMR Fleet Simulator</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 w-full flex flex-col justify-center px-1 sm:px-2 py-2">
          <div className="mb-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Bot size={20} />
            </div>
          </div>

          <div className="mb-4">
            <h1 className="text-xl font-bold text-text tracking-tight">
              {mode === 'signup' ? 'Get Started' : 'Welcome Back'}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {mode === 'signup'
                ? "Welcome to Hostfully - let's get started"
                : "Welcome back - sign in to your account"}
            </p>
          </div>

          {/* Alerts */}
          {successMsg && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
              <ShieldCheck size={15} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {apiError && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Your email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="higherharmuffs.in"
                className={`w-full px-3 py-2 text-xs bg-white border ${
                  emailError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'
                } rounded-lg text-text focus:outline-hidden focus:ring-1 transition-all`}
              />
              {emailError && (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                {mode === 'signup' ? 'Create new password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••"
                className={`w-full px-3 py-2 text-xs bg-white border ${
                  passwordError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'
                } rounded-lg text-text focus:outline-hidden focus:ring-1 transition-all`}
              />
              {passwordError ? (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{passwordError}</span>
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted">
                  Must be at least 6 characters (min 1 letter & 1 number).
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-accent hover:bg-accent/90 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create new account' : 'Login'}</span>
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-muted">
            {mode === 'signup' ? (
              <span>
                Already have account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Login
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Create new account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
