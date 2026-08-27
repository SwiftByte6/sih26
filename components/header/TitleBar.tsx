'use client';

import React from 'react';

export const TitleBar: React.FC = () => {
  return (
    <div className="h-8 bg-app flex items-center px-4 border-b border-border">
      <span className="text-[14px] font-semibold text-text">AMR Warehouse Simulator</span>
    </div>
  );
};

