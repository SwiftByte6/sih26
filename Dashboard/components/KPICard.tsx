import React from 'react';
import clsx from 'clsx';

export const KPICard: React.FC<{
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  accent?: boolean;
  gradient?: boolean;
}> = ({ label, value, unit, accent, gradient }) => (
  <div
    className={clsx(
      'rounded-[20px] border p-5 shadow-[0_2px_12px_rgba(91,141,239,0.06)] transition-all',
      'border-[#C9D7E4] bg-white',
      gradient &&
        'bg-gradient-to-br from-[#6F9DF0] to-[#8ABCEB] border-transparent text-white shadow-[0_8px_22px_rgba(91,141,239,0.18)]',
    )}
  >
    <div
      className={clsx(
        'text-[11px] font-semibold uppercase tracking-[0.12em]',
        gradient ? 'text-white/85' : 'text-[#64748B]',
      )}
    >
      {label}
    </div>
    <div className="mt-3 flex items-baseline gap-1.5">
      <div
        className={clsx(
          'text-[28px] md:text-[30px] font-bold leading-none tracking-tight',
          gradient ? 'text-white' : accent ? 'text-[#5B8DEF]' : 'text-[#17263A]',
        )}
      >
        {value}
      </div>
      {unit && (
        <div
          className={clsx(
            'text-[12px] font-medium',
            gradient ? 'text-white/85' : 'text-[#64748B]',
          )}
        >
          {unit}
        </div>
      )}
    </div>
  </div>
);