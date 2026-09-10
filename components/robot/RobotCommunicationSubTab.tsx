'use client';

import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useP2PStore } from '../../store/p2pStore';
import { Bot, Wifi, WifiOff, BatteryCharging, Copy, Check, ArrowRight, Radio } from 'lucide-react';
import { P2PMessage } from '../../types/p2p';

export const RobotCommunicationSubTab: React.FC = () => {
  const { robots, selectedItemId, setSelectedItem } = useWarehouseStore();
  const p2pNodes = useP2PStore((state) => state.nodes);
  const [copiedRobotId, setCopiedRobotId] = useState<string | null>(null);

  const getMsgTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'TASK_ANNOUNCEMENT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'TASK_BID':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'TASK_WINNER_PROPOSAL':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'CONSENSUS':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'TASK_CLAIMED':
        return 'bg-emerald-600/30 text-emerald-200 border-emerald-500/60 font-bold';
      case 'TASK_COMPLETED':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'PATH_INTENT':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'CONFLICT_DETECTED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'YIELD_REQUEST':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'YIELD_RESPONSE':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'REPLANNING':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'PATH_UPDATED':
      case 'PATH_DECONFLICT':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold';
      case 'EMERGENCY':
      case 'ROBOT_FAILURE':
        return 'bg-red-500/30 text-red-200 border-red-500/60 font-bold';
      default:
        return 'bg-slate-700/60 text-slate-300 border-slate-600/50';
    }
  };

  const formatMessageSummary = (msg: P2PMessage) => {
    const payload = msg.payload || {};
    const type = msg.type;

    if (type === 'TASK_ANNOUNCEMENT') {
      const taskId = payload.task?.task_id || payload.taskId || 'Task';
      const priority = payload.task?.priority || payload.priority || 'NORMAL';
      const pickup = payload.task?.pickup_point || '';
      const drop = payload.task?.drop_point || '';
      const routeStr = pickup && drop ? ` | ${pickup} → ${drop}` : '';
      return `${taskId} | ${priority}${routeStr}`;
    }

    if (type === 'TASK_BID') {
      const taskId = payload.taskId || 'Task';
      if (payload.eligible === false) {
        return `${taskId} | Score: 0 (Ineligible)`;
      }
      const score = payload.suitabilityScore !== undefined ? payload.suitabilityScore : '?';
      const dist = payload.distanceToPickup !== undefined && payload.distanceToPickup !== null ? ` | Dist: ${payload.distanceToPickup}m` : '';
      return `${taskId} | Score: ${score}${dist}`;
    }

    if (type === 'TASK_WINNER_PROPOSAL') {
      const taskId = payload.taskId || 'Task';
      const winner = payload.proposedWinnerId || '?';
      return `${taskId} | Proposed Winner: ${winner}`;
    }

    if (type === 'CONSENSUS') {
      const taskId = payload.taskId || 'Task';
      return `${taskId} | ACCEPT`;
    }

    if (type === 'TASK_CLAIMED') {
      const taskId = payload.taskId || 'Task';
      const owner = payload.ownerRobotId || msg.senderId;
      return `${taskId} | Claimed by ${owner}`;
    }

    if (type === 'TASK_COMPLETED') {
      const taskId = payload.taskId || 'Task';
      const loc = payload.dropPoint || '';
      return `Task [${taskId}] completed${loc ? ` at ${loc}` : ''}`;
    }

    if (type === 'PATH_INTENT') {
      return payload.body || `Trajectory intent shared by ${msg.senderId}`;
    }

    if (type === 'CONFLICT_DETECTED') {
      const loc = payload.conflictLocation ? `Cell (${payload.conflictLocation.col},${payload.conflictLocation.row})` : '';
      const tick = payload.conflictTick ? ` in t+${payload.conflictTick}` : '';
      return `${loc || 'Trajectory conflict'}${tick}`;
    }

    if (type === 'YIELD_REQUEST') {
      return payload.body || 'Requesting path clearance';
    }

    if (type === 'YIELD_RESPONSE') {
      return payload.body || 'Yield acknowledged / path cleared';
    }

    if (type === 'REPLANNING') {
      return payload.body || 'Recalculating deconflicted route...';
    }

    if (type === 'PATH_UPDATED' || type === 'PATH_DECONFLICT') {
      const yielder = payload.yieldingRobotId || msg.senderId;
      const priority = payload.priorityRobotId || msg.receiverId;
      return payload.body || `${yielder} rerouted around ${priority}`;
    }

    return payload.body || payload.status || (typeof payload === 'string' ? payload : JSON.stringify(payload));
  };

  const copyDirectLog = (robotId: string, historyMsgs: P2PMessage[]) => {
    const lines = [
      `========================================`,
      `${robotId} P2P COMMUNICATION LOG`,
      `========================================`,
    ];
    historyMsgs.forEach((msg) => {
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false });
      const summary = formatMessageSummary(msg);
      lines.push(`[${timeStr}] ${msg.senderId} → ${msg.receiverId} | [${msg.type}] ${summary}`);
    });
    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedRobotId(robotId);
    setTimeout(() => setCopiedRobotId(null), 2000);
  };

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
    <div className="flex-1 p-4 overflow-y-auto bg-workspace flex flex-col gap-3">
      {/* ESP-NOW Simulation Header Banner */}
      <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-md shadow-sm flex items-center justify-between text-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/40">
            <Radio size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[13px] text-white tracking-wide">SIMULATED ESP-NOW TRANSPORT</h2>
              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SOFTWARE VIRTUALIZATION
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Virtual ESP32 2.4GHz Direct Transport • Deterministic MAC • Selective Decentralized Routing • Zero Server Dependency
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {robots.map((robot) => {
          const isSelected = selectedItemId === robot.id;
          const p2pNode = p2pNodes[robot.id];
          const isOnline = p2pNode ? p2pNode.isOnline : (robot.isOnline ?? true);
          const virtualMac = p2pNode?.macAddress || `30:AE:A4:01:00:${robot.id.replace(/\D/g, '').padStart(2, '0')}`;

          // Filter history to ONLY show messages directly associated with this specific robot
          const history = p2pNode
            ? p2pNode.history.filter(
                (m) =>
                  (m.senderId === robot.id || m.receiverId === robot.id || (m.receiverId === 'ALL' && (m.type === 'TASK_ANNOUNCEMENT' || m.type === 'EMERGENCY' || m.type === 'TASK_CLAIMED'))) &&
                  m.type !== 'HEARTBEAT' &&
                  (m.type !== 'STATUS_UPDATE' || m.payload?.body)
              )
            : [];

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
                    <div className="font-bold text-[13px] text-text font-mono flex items-center gap-1.5">
                      {robot.id}
                      <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-normal">
                        ({virtualMac})
                      </span>
                    </div>
                    <div className="text-[10px] text-muted font-mono">
                      Pos: ({robot.col}, {robot.row}) • Ch 1 (-55 dBm)
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

              {/* Local Peer Knowledge Table (ESP-NOW Virtual Device Table) */}
              {p2pNode && Object.keys(p2pNode.peerList).length > 0 && (
                <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[9.5px] font-mono text-slate-300">
                  <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Radio size={10} />
                      ESP-NOW Local Peer Table:
                    </span>
                    <span className="text-slate-500 text-[8px]">ESP32-WROOM-32</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(p2pNode.peerList).map((peer) => (
                      <span key={peer.robotId} className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700/80 flex items-center gap-1">
                        <span className="font-bold text-cyan-300">{peer.robotId}</span>
                        <span className="text-[8px] text-slate-400">({peer.macAddress?.slice(-5) || '..'})</span>:{' '}
                        {peer.status === 'ONLINE' ? (
                          <span className="text-emerald-300">
                            {peer.lastKnownPosition ? `(${peer.lastKnownPosition.col},${peer.lastKnownPosition.row})` : 'PAIRED'}
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
              <div className="p-2 bg-[#0F172A] flex-1 flex flex-col min-h-[170px] max-h-[220px]">
                <div className="text-[9px] font-bold tracking-wider text-slate-400 uppercase mb-1.5 flex justify-between items-center">
                  <span className="text-cyan-400 font-semibold">{robot.id} ESP-NOW Feed</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-mono text-[9px]">{history.length} packets</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyDirectLog(robot.id, history);
                      }}
                      className="flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
                      title="Copy P2P Communication Log to Clipboard"
                    >
                      {copiedRobotId === robot.id ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check size={9} /> Copied!
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Copy size={9} /> COPY
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 font-mono text-[10px] pr-1">
                  {history.length === 0 ? (
                    <div className="text-slate-500 italic text-center mt-6 text-[10px]">
                      No ESP-NOW packets for {robot.id} yet.
                    </div>
                  ) : (
                    history.map((msg) => {
                      const isOutgoing = msg.senderId === robot.id;
                      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false });
                      const summary = formatMessageSummary(msg);
                      const badgeClass = getMsgTypeBadgeClass(msg.type);
                      const deliveryStatus = msg.espNow?.deliveryStatus || 'DELIVERED';

                      return (
                        <div
                          key={msg.id}
                          className={`p-1.5 rounded-md text-[9.5px] border transition-colors ${
                            isOutgoing
                              ? 'bg-slate-800/90 border-cyan-700/60 shadow-sm'
                              : 'bg-slate-850/80 border-slate-700/80'
                          }`}
                        >
                          {/* Header: SENDER → RECEIVER & Type Badge & Delivery State */}
                          <div className="flex justify-between items-center text-[9px] font-semibold mb-0.5">
                            <div className="flex items-center gap-1">
                              <span className={`font-bold ${isOutgoing ? 'text-cyan-300' : 'text-slate-300'}`}>
                                {msg.senderId}
                              </span>
                              <ArrowRight size={10} className="text-slate-500" />
                              <span className={`font-bold ${msg.receiverId === 'ALL' ? 'text-amber-400' : 'text-emerald-300'}`}>
                                {msg.receiverId}
                              </span>
                              <span className="text-[8px] text-slate-500">
                                {msg.espNow ? `(${msg.espNow.deliveryMode})` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`uppercase text-[8px] px-1.5 py-0.2 rounded border ${badgeClass}`}>
                                {msg.type}
                              </span>
                              <span className="text-emerald-400 text-[8px] font-bold">
                                {deliveryStatus}
                              </span>
                              <span className="text-slate-400 text-[8.5px]">{timeStr}</span>
                            </div>
                          </div>

                          {/* Body Content */}
                          <div className="mt-0.5 text-slate-100 font-sans text-[10px] leading-tight">
                            {summary}
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
