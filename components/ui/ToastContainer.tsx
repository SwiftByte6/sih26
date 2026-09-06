'use client';

import React from 'react';
import { useToastStore } from '../../store/toastStore';
import { BatteryCharging, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isWarning = t.type === 'warning';
        const isError = t.type === 'error';

        const bg = isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/30'
          : isWarning
          ? 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-950/30'
          : isError
          ? 'bg-red-950/90 border-red-500/50 text-red-200 shadow-red-950/30'
          : 'bg-slate-900/90 border-blue-500/50 text-blue-200 shadow-blue-950/30';

        const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : isError ? AlertTriangle : BatteryCharging;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border backdrop-blur-md shadow-xl text-[12px] font-semibold tracking-wide transition-all transform translate-y-0 animate-in fade-in slide-in-from-top-2 duration-200 ${bg}`}
          >
            <div className="flex items-center gap-2.5">
              <Icon size={16} className="shrink-0" />
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:opacity-70 text-current rounded shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
