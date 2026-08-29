'use client';

import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useP2PStore } from '../../store/p2pStore';
import { Bot, Wifi, WifiOff, BatteryCharging, Zap } from 'lucide-react';

export const RobotCommunicationSubTab: React.FC = () => {
  const { robots, selectedItemId, setSelectedItem } = useWarehouseStore();
  const p2pNodes = useP2PStore((state) => state.nodes);

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'MOVING':
        return 'bg-accent text-white';
      case 'WAITING':
        return 'bg-warning text-white';
      case 'CHARGING':
        return 'bg-success text-white';
      case 'ERROR':
        return 'bg-danger text-white';
      default:
        return 'bg-muted text-white';
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-workspace">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {robots.map((robot) => {
          const isSelected = selectedItemId === robot.id;
          const p2pNode = p2pNodes[robot.id];
          const isOnline = p2pNode ? p2pNode.isOnline : (robot.isOnline ?? true);
          const history = p2pNode ? p2pNode.history : [];

          return (
            <div
              key={robot.id}
              onClick={() => setSelectedItem(robot.id, 'ROBOT')}
              className={`bg-white border rounded-md shadow-sm flex flex-col overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                isSelected ? 'border-accent ring-2 ring-accent/30' : 'border-border'
              }`}
            >
              {/* Card Header */}
              <div className="bg-app px-3 py-2 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-workspace rounded border border-border">
                    <Bot size={16} className="text-accent" />
                  </div>
                  <div>
                    <div className="font-bold text-[13px] text-text font-mono">{robot.id}</div>
                    <div className="text-[10px] text-muted font-mono">
                      Pos: ({robot.col}, {robot.row})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadge(robot.state)}`}>
                    {robot.state}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {isOnline ? (
                      <span className="flex items-center gap-1 text-success font-semibold">
                        <Wifi size={12} /> ONLINE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-danger font-semibold">
                        <WifiOff size={12} /> OFFLINE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body & Telemetry Strip */}
              <div className="px-3 py-2 border-b border-border/60 bg-white flex items-center justify-between text-[11px] font-mono text-muted">
                <div className="flex items-center gap-1">
                  <BatteryCharging size={13} className={robot.battery < 20 ? 'text-danger' : 'text-success'} />
                  <span className="font-semibold text-text">{Math.round(robot.battery)}%</span>
                </div>
                <div>Speed: <span className="text-text font-semibold">{robot.speed} m/s</span></div>
                <div>Cap: <span className="text-text font-semibold">{robot.payloadCapacity ?? 20}kg</span></div>
              </div>

              {/* Local Peer Knowledge Table (Independent Peer Position Knowledge) */}
              {p2pNode && Object.keys(p2pNode.peerList).length > 0 && (
                <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[9.5px] font-mono text-slate-300">
                  <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Local Peer Knowledge Table:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(p2pNode.peerList).map((peer) => (
                      <span key={peer.robotId} className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700/80">
                        <span className="font-bold text-cyan-300">{peer.robotId}</span>:{' '}
                        {peer.status === 'ONLINE' ? (
                          <span className="text-emerald-300">
                            {peer.lastKnownPosition ? `(${peer.lastKnownPosition.col},${peer.lastKnownPosition.row})` : 'ONLINE'}
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold">OFFLINE</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual AMR Communication Area */}
              <div className="p-2 bg-[#1E293B] flex-1 flex flex-col min-h-[160px] max-h-[200px]">

                <div className="text-[9px] font-bold tracking-wider text-slate-400 uppercase mb-1 flex justify-between items-center">
                  <span>{robot.id} P2P Direct Log</span>
                  <span className="text-emerald-400 font-mono text-[9px]">{history.length} msgs</span>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-1 font-mono text-[10px] pr-1">
                  {history.length === 0 ? (
                    <div className="text-slate-500 italic text-center mt-6 text-[10px]">
                      No P2P communications for {robot.id} yet.
                    </div>
                  ) : (
                    history.map((msg) => {
                      const isOutgoing = msg.senderId === robot.id;
                      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false });
                      const recipientStr = msg.receiverId === 'ALL' ? 'TO ALL' : isOutgoing ? `TO ${msg.receiverId}` : `FROM ${msg.senderId}`;

                      return (
                        <div
                          key={msg.id}
                          className={`p-1 rounded text-[9.5px] border ${
                            isOutgoing
                              ? 'bg-slate-800/80 border-cyan-800 text-cyan-200'
                              : 'bg-slate-800/40 border-emerald-800 text-emerald-200'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[8.5px] opacity-75 font-semibold">
                            <span>[{timeStr}] {recipientStr}</span>
                            <span className="uppercase text-[8px] px-1 bg-slate-900/60 rounded text-amber-300">{msg.type}</span>
                          </div>
                          <div className="mt-0.5 text-slate-100 font-sans text-[10px]">
                            {msg.payload?.body || msg.payload?.status || JSON.stringify(msg.payload || {})}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
