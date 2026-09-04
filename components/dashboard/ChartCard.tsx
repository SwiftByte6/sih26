'use client';
import React from 'react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
    <h2 className="text-lg font-medium text-text mb-2">{title}</h2>
    <div className="w-full h-64">{children}</div>
  </div>
);
