import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center">
    <span className="text-sm text-muted mb-1">{title}</span>
    <span className="text-xl font-semibold text-text">{value}</span>
  </div>
);
