import React from 'react';
import clsx from 'clsx';

export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  height?: number;
  hero?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, height = 260, hero, children }) => (
  <div
    className={clsx(
      'rounded-[20px] border bg-white border-[#C9D7E4] shadow-[0_2px_12px_rgba(91,141,239,0.06)]',
      'p-5 md:p-6',
    )}
  >
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h3
          className={clsx(
            'font-bold text-[#17263A] leading-tight',
            hero ? 'text-[18px] md:text-[19px]' : 'text-[15px] md:text-[16px]',
          )}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-[12px] text-[#64748B]">{subtitle}</p>
        )}
      </div>
    </div>
    <div style={{ width: '100%', height }}>{children}</div>
  </div>
);