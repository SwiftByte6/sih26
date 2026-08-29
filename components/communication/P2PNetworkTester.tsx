'use client';

import React, { useState } from 'react';
import { useP2PStore } from '../../store/p2pStore';
import { Network, CheckCircle2, XCircle, Play, RefreshCw, Send, Radio, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

import { runTaskEvaluationTestSuite, EvaluationTestSummary } from '../../engine/evaluation/TaskEvaluator';
import { runTaskAnnouncementTestSuite, AnnouncementTestSummary } from '../../engine/p2p/TaskAnnouncementTestSuite';

export const P2PNetworkTester: React.FC = () => {
  const { nodes, testSummary, setRobotOnlineStatus, sendDirectMessage, broadcastMessage, runP2PTestSuite, resetP2PNetwork } = useP2PStore();
  const [activeTab, setActiveTab] = useState<'TESTS' | 'EVAL_TESTS' | 'ANNOUNCE_TESTS' | 'NODES' | 'SEND'>('TESTS');
  const [evalTestSummary, setEvalTestSummary] = useState<EvaluationTestSummary | null>(null);
  const [announceTestSummary, setAnnounceTestSummary] = useState<AnnouncementTestSummary | null>(null);

  // Custom Message Form State
  const [senderId, setSenderId] = useState('AMR-01');
  const [receiverId, setReceiverId] = useState('AMR-02');
  const [msgText, setMsgText] = useState('Hello from P2P');
  const [sendSuccessNote, setSendSuccessNote] = useState<string | null>(null);

  const nodeList = Object.values(nodes);

  const handleSendDirect = () => {
    const success = sendDirectMessage(senderId, receiverId, 'TEXT', { body: msgText });
    setSendSuccessNote(success ? `Sent direct to ${receiverId}` : `Failed: Node offline`);
    setTimeout(() => setSendSuccessNote(null), 3000);
  };

  const handleBroadcast = () => {
    const success = broadcastMessage(senderId, 'TEXT', { body: msgText });
    setSendSuccessNote(success ? `Broadcast sent to ALL` : `Failed: Sender offline`);
    setTimeout(() => setSendSuccessNote(null), 3000);
  };

  return (
    <div className="flex flex-col flex-1 bg-panel text-[11px] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-app">
        <button
          onClick={() => setActiveTab('TESTS')}
          className={`flex-1 py-1.5 px-2 font-semibold text-[10px] tracking-wide border-r border-border transition-colors ${
            activeTab === 'TESTS' ? 'bg-panel text-accent border-b-2 border-b-accent' : 'text-muted hover:text-text'
          }`}
        >
          P2P TESTS
        </button>
        <button
          onClick={() => setActiveTab('EVAL_TESTS')}
          className={`flex-1 py-1.5 px-2 font-semibold text-[10px] tracking-wide border-r border-border transition-colors ${
            activeTab === 'EVAL_TESTS' ? 'bg-panel text-accent border-b-2 border-b-accent' : 'text-muted hover:text-text'
          }`}
        >
          EVAL (4A)
        </button>
        <button
          onClick={() => setActiveTab('ANNOUNCE_TESTS')}
          className={`flex-1 py-1.5 px-2 font-semibold text-[10px] tracking-wide border-r border-border transition-colors ${
            activeTab === 'ANNOUNCE_TESTS' ? 'bg-panel text-accent border-b-2 border-b-accent' : 'text-muted hover:text-text'
          }`}
        >
          ANNOUNCE (4B)
        </button>
        <button
          onClick={() => setActiveTab('NODES')}
          className={`flex-1 py-1.5 px-2 font-semibold text-[10px] tracking-wide border-r border-border transition-colors ${
            activeTab === 'NODES' ? 'bg-panel text-accent border-b-2 border-b-accent' : 'text-muted hover:text-text'
          }`}
        >
          AMR NODES ({nodeList.length})
        </button>
        <button
          onClick={() => setActiveTab('SEND')}
          className={`flex-1 py-1.5 px-2 font-semibold text-[10px] tracking-wide transition-colors ${
            activeTab === 'SEND' ? 'bg-panel text-accent border-b-2 border-b-accent' : 'text-muted hover:text-text'
          }`}
        >
          SEND MSG
        </button>
      </div>

      {/* Main Tab View Area */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {/* TASK ANNOUNCEMENT LAB TAB (PHASE 4B) */}
        {activeTab === 'ANNOUNCE_TESTS' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-workspace p-2 border border-border rounded-sm">
              <div className="flex items-center gap-1.5">
                <Network size={14} className="text-accent" />
                <span className="font-bold">Phase 4B Task Announcement Test Suite</span>
              </div>
              <button
                onClick={() => setAnnounceTestSummary(runTaskAnnouncementTestSuite())}
                className="flex items-center gap-1 px-2 py-1 bg-accent text-white rounded-sm hover:bg-opacity-90 transition-colors font-medium text-[10px]"
              >
                <Play size={11} />
                Run Announce Suite
              </button>
            </div>

            {announceTestSummary ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center bg-app p-1.5 border border-border rounded-sm">
                  <span className="font-mono text-[10px]">Passed: {announceTestSummary.passCount} / {announceTestSummary.totalTests}</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded-sm text-[9px] ${
                    announceTestSummary.failCount === 0 ? 'bg-success text-white' : 'bg-danger text-white'
                  }`}>
                    {announceTestSummary.failCount === 0 ? 'ALL 8 TESTS PASSED' : `${announceTestSummary.failCount} FAILED`}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {announceTestSummary.results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-2 border rounded-sm flex flex-col gap-1 ${
                        res.passed ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900' : 'bg-rose-50/50 border-rose-300 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {res.passed ? <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> : <XCircle size={13} className="text-rose-600 flex-shrink-0" />}
                        <span>{res.testName}</span>
                      </div>
                      <div className="text-[10px] text-muted font-mono leading-tight pl-4">{res.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted italic my-4 text-[10px]">
                Click "Run Announce Suite" to verify task announcement broadcasts from TASK_DISPATCH, independent local task storage (knownTasks), automatic Phase 4A local evaluation, deduplication, and zero central winner selection (TEST 1 - TEST 8).
              </div>
            )}
          </div>
        )}

        {/* TASK EVALUATION LAB TAB */}
        {activeTab === 'EVAL_TESTS' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-workspace p-2 border border-border rounded-sm">
              <div className="flex items-center gap-1.5">
                <Network size={14} className="text-accent" />
                <span className="font-bold">Phase 4A Task Evaluation Test Suite</span>
              </div>
              <button
                onClick={() => setEvalTestSummary(runTaskEvaluationTestSuite())}
                className="flex items-center gap-1 px-2 py-1 bg-accent text-white rounded-sm hover:bg-opacity-90 transition-colors font-medium text-[10px]"
              >
                <Play size={11} />
                Run Eval Suite
              </button>
            </div>

            {evalTestSummary ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center bg-app p-1.5 border border-border rounded-sm">
                  <span className="font-mono text-[10px]">Passed: {evalTestSummary.passCount} / {evalTestSummary.totalTests}</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded-sm text-[9px] ${
                    evalTestSummary.failCount === 0 ? 'bg-success text-white' : 'bg-danger text-white'
                  }`}>
                    {evalTestSummary.failCount === 0 ? 'ALL 7 TESTS PASSED' : `${evalTestSummary.failCount} FAILED`}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {evalTestSummary.results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-2 border rounded-sm flex flex-col gap-1 ${
                        res.passed ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900' : 'bg-rose-50/50 border-rose-300 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {res.passed ? <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> : <XCircle size={13} className="text-rose-600 flex-shrink-0" />}
                        <span>{res.testName}</span>
                      </div>
                      <div className="text-[10px] text-muted font-mono leading-tight pl-4">{res.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted italic my-4 text-[10px]">
                Click "Run Eval Suite" to verify local task evaluation eligibility rules (payload capacity, capability levels, battery reserve, offline state) and independent multi-robot suitability scoring (TEST 1 - TEST 7).
              </div>
            )}
          </div>
        )}

        {/* TEST SUITE TAB */}
        {activeTab === 'TESTS' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-workspace p-2 border border-border rounded-sm">
              <div className="flex items-center gap-1.5">
                <Network size={14} className="text-accent" />
                <span className="font-bold">Phase 1 P2P Test Suite</span>
              </div>
              <button
                onClick={() => runP2PTestSuite()}
                className="flex items-center gap-1 px-2 py-1 bg-accent text-white rounded-sm hover:bg-opacity-90 transition-colors font-medium text-[10px]"
              >
                <Play size={11} />
                Run All Tests
              </button>
            </div>

            {testSummary ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center bg-app p-1.5 border border-border rounded-sm">
                  <span className="font-mono text-[10px]">Passed: {testSummary.passCount} / {testSummary.totalTests}</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded-sm text-[9px] ${
                    testSummary.failCount === 0 ? 'bg-success text-white' : 'bg-danger text-white'
                  }`}>
                    {testSummary.failCount === 0 ? 'ALL PASSED' : `${testSummary.failCount} FAILED`}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {testSummary.results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-2 border rounded-sm flex flex-col gap-1 ${
                        res.passed ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900' : 'bg-rose-50/50 border-rose-300 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {res.passed ? <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> : <XCircle size={13} className="text-rose-600 flex-shrink-0" />}
                        <span>{res.testName}</span>
                      </div>
                      <div className="text-[10px] text-muted font-mono leading-tight pl-4">{res.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted italic my-4 text-[10px]">
                Click "Run All Tests" to verify Test 1 (Unicast), Test 2 (Broadcast), Test 3 (Failure Detection), Test 4 (Recovery), and Test 5 (Reset).
              </div>
            )}
          </div>
        )}

        {/* AMR NODES TAB */}
        {activeTab === 'NODES' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase">P2P Peer Mesh Status</span>
              <button
                onClick={resetP2PNetwork}
                className="flex items-center gap-1 text-[10px] text-muted hover:text-text"
                title="Reset P2P State"
              >
                <RefreshCw size={11} /> Reset P2P
              </button>
            </div>

            {nodeList.map((node) => (
              <div key={node.robotId} className="bg-workspace border border-border p-2 rounded-sm flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-border/50 pb-1">
                  <div className="flex items-center gap-1.5">
                    {node.isOnline ? <Wifi size={13} className="text-success" /> : <WifiOff size={13} className="text-danger" />}
                    <span className="font-bold font-mono text-[11px]">{node.robotId}</span>
                    <span className="text-[9px] text-muted font-mono">({node.nodeId})</span>
                  </div>
                  <button
                    onClick={() => setRobotOnlineStatus(node.robotId, !node.isOnline)}
                    className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold transition-colors ${
                      node.isOnline ? 'bg-success/10 text-success hover:bg-danger/20 hover:text-danger' : 'bg-danger/10 text-danger hover:bg-success/20 hover:text-success'
                    }`}
                  >
                    {node.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </button>
                </div>

                {/* Peer List */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-muted">Known Peer Table:</span>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.values(node.peerList).map((peer) => (
                      <div key={peer.robotId} className="flex items-center justify-between bg-app px-1.5 py-0.5 rounded-sm border border-border/40 font-mono text-[9px]">
                        <span>{peer.robotId}</span>
                        <span className={`font-bold ${peer.status === 'ONLINE' ? 'text-success' : 'text-danger'}`}>
                          {peer.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node Message Stats */}
                <div className="flex justify-between text-[9px] text-muted font-mono pt-0.5 border-t border-border/30">
                  <span>Sent: {node.stats.messagesSent}</span>
                  <span>Inbox: {node.inbox.length}</span>
                  <span>Recv: {node.stats.messagesReceived}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEND MESSAGE TAB */}
        {activeTab === 'SEND' && (
          <div className="flex flex-col gap-2 bg-workspace border border-border p-2 rounded-sm">
            <span className="font-bold text-[10px] text-muted uppercase">Simulated Direct / Broadcast Sender</span>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted">Sender Node:</label>
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="bg-app border border-border rounded-sm p-1 text-[11px] font-mono"
              >
                {nodeList.map((n) => (
                  <option key={n.robotId} value={n.robotId}>
                    {n.robotId} ({n.isOnline ? 'ONLINE' : 'OFFLINE'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted">Recipient Node:</label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="bg-app border border-border rounded-sm p-1 text-[11px] font-mono"
              >
                <option value="ALL">ALL (Broadcast)</option>
                {nodeList.map((n) => (
                  <option key={n.robotId} value={n.robotId}>
                    {n.robotId} ({n.isOnline ? 'ONLINE' : 'OFFLINE'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted">Payload Message:</label>
              <input
                type="text"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                className="bg-app border border-border rounded-sm p-1 text-[11px]"
                placeholder="Type test message..."
              />
            </div>

            <div className="flex gap-2 mt-1">
              {receiverId === 'ALL' ? (
                <button
                  onClick={handleBroadcast}
                  className="flex-1 py-1 bg-accent text-white rounded-sm font-bold flex items-center justify-center gap-1 hover:bg-opacity-90"
                >
                  <Radio size={12} /> Broadcast
                </button>
              ) : (
                <button
                  onClick={handleSendDirect}
                  className="flex-1 py-1 bg-accent text-white rounded-sm font-bold flex items-center justify-center gap-1 hover:bg-opacity-90"
                >
                  <Send size={12} /> Direct Unicast
                </button>
              )}
            </div>

            {sendSuccessNote && (
              <div className="text-center font-bold text-[10px] text-accent mt-1 animate-pulse">
                {sendSuccessNote}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
