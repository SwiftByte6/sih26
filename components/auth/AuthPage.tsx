'use client';

import React, { useState } from 'react';
import { Bot, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { localAuth } from '../../lib/localAuth';

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
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
        const { error } = await localAuth.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setApiError(error.message);
        } else {
          setSuccessMsg('Signed in successfully!');
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

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setApiError(null);
    setSuccessMsg(null);
    setEmailError(null);
    setPasswordError(null);
  };

  return (
    <div className="h-screen w-screen bg-workspace text-text flex flex-col md:flex-row select-none relative overflow-hidden font-sans">
      {/* Full-height Left Video Panel */}
      <div className="relative md:w-1/2 w-full h-48 md:h-full bg-text overflow-hidden flex flex-col justify-between p-6 md:p-12 lg:p-16 shrink-0">
        {/* Muted Stock Video Loop */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <source src="/auto.mp4" type="video/mp4" />
        </video>

        {/* Clean Theme Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#17212B]/90 via-[#17212B]/50 to-[#17212B]/70 pointer-events-none" />

        {/* Top Text Content */}
        <div className="relative z-10 max-w-lg">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            Convert your ideas<br />
            into successful<br />
            business.
          </h2>
        </div>

        {/* Bottom System Label */}
        <div className="relative z-10 hidden md:flex items-center gap-2 text-xs text-slate-300 font-mono bg-[#17212B]/80 px-3.5 py-2 rounded-lg border border-border/40 w-fit">
          <Bot size={16} className="text-accent" />
          <span>Industrial Autonomous Mobile Robot Platform</span>
        </div>
      </div>

      {/* Full-height Right Form Area */}
      <div className="md:w-1/2 w-full h-full bg-workspace flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-xs">
          
          {/* Brand Icon */}
          <div className="mb-4">
            <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Bot size={24} />
            </div>
          </div>

          {/* Form Header matching image info */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text tracking-tight">
              {mode === 'signup' ? 'Get Started' : 'Welcome Back'}
            </h1>
            <p className="text-xs text-muted mt-1 font-medium">
              {mode === 'signup'
                ? "Welcome to Hostfully - let's get started"
                : "Welcome back - sign in to your account"}
            </p>
          </div>

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* API Error Alert */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
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
                className={`w-full px-3.5 py-2.5 text-xs bg-workspace border ${
                  emailError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'
                } rounded-lg text-text placeholder:text-muted/60 focus:outline-hidden focus:ring-1 transition-all`}
              />
              {emailError && (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
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
                className={`w-full px-3.5 py-2.5 text-xs bg-workspace border ${
                  passwordError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'
                } rounded-lg text-text placeholder:text-muted/60 focus:outline-hidden focus:ring-1 transition-all`}
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

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create new account' : 'Login'}</span>
              )}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="mt-6 text-center text-xs text-muted">
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
