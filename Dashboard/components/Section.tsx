import React from 'react';
import clsx from 'clsx';

export const Section: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <section className={clsx('mb-6 md:mb-8', className)}>{children}</section>
);

export const KPIRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 md:mb-8">
    {children}
  </div>
);

export const TwoColGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
    {children}
  </div>
);