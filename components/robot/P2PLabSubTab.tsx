'use client';

import React from 'react';
import { P2PNetworkTester } from '../communication/P2PNetworkTester';
import { FlaskConical } from 'lucide-react';

export const P2PLabSubTab: React.FC = () => {
  return (
    <div className="flex-1 p-4 overflow-y-auto bg-workspace flex flex-col gap-3">
      <div className="bg-white border border-border p-3 rounded-md shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-accent" />
          <div>
            <h2 className="font-bold text-[14px] text-text">P2P Developer Laboratory & Testing</h2>
            <div className="text-[10px] text-muted font-mono">
              Developer tools to execute P2P test suites, inspect AMR agent communication nodes, and send manual direct/broadcast test messages.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-border rounded-md shadow-sm overflow-hidden flex flex-col">
        <P2PNetworkTester />
      </div>
    </div>
  );
};
