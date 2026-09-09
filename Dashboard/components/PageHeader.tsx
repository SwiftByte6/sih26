import React from 'react';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  context?: string;
}> = ({ title, subtitle, context }) => (
  <div className="mb-8">
    {context && (
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5B8DEF] mb-2">
        {context}
      </div>
    )}
    <h1 className="text-[28px] md:text-[32px] font-bold text-[#17263A] leading-tight">
      {title}
    </h1>
    {subtitle && (
      <p className="mt-2 text-sm md:text-[15px] text-[#64748B] max-w-2xl">
        {subtitle}
      </p>
    )}
  </div>
);