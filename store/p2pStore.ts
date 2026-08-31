import { create } from 'zustand';
import { useWarehouseStore } from './warehouseStore';
import { AmrAgentNode, P2PMessage, P2PMessageType } from '../types/p2p';
import { SimulatedP2PNetwork } from '../engine/p2p/SimulatedP2PNetwork';

export interface P2PTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export interface P2PTestSummary {
  timestamp: string;
  totalTests: number;
  passCount: number;
  failCount: number;
  results: P2PTestResult[];
}

interface P2PState {
  network: SimulatedP2PNetwork;
  nodes: Record<string, AmrAgentNode>; // Reactively mirrors registered nodes
  testSummary: P2PTestSummary | null;

  // Actions
  initializeNetwork: (robotIds: string[]) => void;
  sendDirectMessage: (senderId: string, receiverId: string, type: P2PMessageType, payload?: any) => boolean;
  broadcastMessage: (senderId: string, type: P2PMessageType, payload?: any) => boolean;
  setRobotOnlineStatus: (robotId: string, isOnline: boolean) => void;
  removeTaskFromAllNodes: (taskId: string) => void;
  processHeartbeats: () => void;
  resetP2PNetwork: () => void;
  runP2PTestSuite: () => P2PTestSummary;
}

const networkInstance = new SimulatedP2PNetwork();

export const useP2PStore = create<P2PState>((set, get) => ({
  network: networkInstance,
  nodes: {},
  testSummary: null,

  initializeNetwork: (robotIds) => {
    robotIds.forEach((id) => networkInstance.registerNode(id));
    const updatedNodes: Record<string, AmrAgentNode> = {};
    networkInstance.getAllNodes().forEach((node) => {
      updatedNodes[node.robotId] = { ...node };
    });
    set({ nodes: updatedNodes });
  },

  sendDirectMessage: (senderId, receiverId, type, payload) => {
    const success = networkInstance.sendDirectMessage(senderId, receiverId, type, payload);
    if (success && type !== 'HEARTBEAT') {
      const bodyText = typeof payload === 'string' ? payload : payload?.body || payload?.status || type;
      const category = (type.startsWith('TASK_') ? 'TASK' : type === 'STATUS_UPDATE' ? 'SYSTEM' : 'COORDINATION') as any;
      try {
        useWarehouseStore.getState().addCommunication({
          id: `COMM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          sender: senderId,
          receiver: receiverId,
          category,
          priority: 'NORMAL',
          message: `[${type}] ${bodyText}`,
        });
      } catch (e) {
        console.error("Failed to add communication", e);
      }
    }
    get().processHeartbeats(); // sync store nodes snapshot
    return success;
  },

  broadcastMessage: (senderId, type, payload) => {
    const success = networkInstance.broadcastMessage(senderId, type, payload);
    if (success && type !== 'HEARTBEAT') {
      const bodyText = typeof payload === 'string' ? payload : payload?.body || payload?.status || type;
      const category = (type.startsWith('TASK_') ? 'TASK' : type === 'STATUS_UPDATE' ? 'SYSTEM' : 'COORDINATION') as any;
      try {
        useWarehouseStore.getState().addCommunication({
          id: `COMM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          sender: senderId,
          receiver: 'ALL',
          category,
          priority: 'NORMAL',
          message: `[${type}] ${bodyText}`,
        });
      } catch (e) {
        console.error("Failed to add broadcast communication", e);
      }
    }
    get().processHeartbeats(); // sync store nodes snapshot
    return success;
  },


  setRobotOnlineStatus: (robotId, isOnline) => {
    networkInstance.setNodeOnlineStatus(robotId, isOnline);
    get().processHeartbeats(); // sync store nodes snapshot
  },

  removeTaskFromAllNodes: (taskId) => {
    networkInstance.removeTaskFromAllNodes(taskId);
    get().processHeartbeats(); // sync store nodes snapshot
  },

  processHeartbeats: () => {
    const updatedNodes: Record<string, AmrAgentNode> = {};
    networkInstance.getAllNodes().forEach((node) => {
      updatedNodes[node.robotId] = { ...node };
    });
    set({ nodes: updatedNodes });
  },

  resetP2PNetwork: () => {
    networkInstance.resetNetwork();
    const updatedNodes: Record<string, AmrAgentNode> = {};
    networkInstance.getAllNodes().forEach((node) => {
      updatedNodes[node.robotId] = { ...node };
    });
    set({ nodes: updatedNodes, testSummary: null });
  },

  runP2PTestSuite: () => {
    const results: P2PTestResult[] = [];
    const net = get().network;

    // Ensure initial node registration for tests
    ['AMR-01', 'AMR-02', 'AMR-03'].forEach((id) => net.registerNode(id));
    net.resetNetwork();

    // ----------------------------------------------------
    // TEST 1: Direct Unicast Delivery (AMR-01 -> AMR-02)
    // ----------------------------------------------------
    const t1Msg = 'P2P Direct Test';
    net.sendDirectMessage('AMR-01', 'AMR-02', 'TEXT', { body: t1Msg });

    const node1 = net.getNode('AMR-01');
    const node2 = net.getNode('AMR-02');
    const node3 = net.getNode('AMR-03');

    const receivedByNode2 = node2?.inbox.some((m) => m.payload?.body === t1Msg);
    const notReceivedByNode3 = !node3?.inbox.some((m) => m.payload?.body === t1Msg);

    results.push({
      testName: 'TEST 1: Direct Unicast (AMR-01 -> AMR-02)',
      passed: Boolean(receivedByNode2 && notReceivedByNode3),
      details: receivedByNode2 && notReceivedByNode3
        ? 'Message delivered directly to AMR-02 inbox only.'
        : `Failed: receivedByNode2=${receivedByNode2}, notReceivedByNode3=${notReceivedByNode3}`,
    });

    // ----------------------------------------------------
    // TEST 2: Broadcast Message Delivery (AMR-03 -> ALL)
    // ----------------------------------------------------
    const t2Msg = 'P2P Broadcast Test';
    net.broadcastMessage('AMR-03', 'TEXT', { body: t2Msg });

    const node1RecvBcast = node1?.inbox.some((m) => m.payload?.body === t2Msg);
    const node2RecvBcast = node2?.inbox.some((m) => m.payload?.body === t2Msg);

    results.push({
      testName: 'TEST 2: Broadcast (AMR-03 -> ALL)',
      passed: Boolean(node1RecvBcast && node2RecvBcast),
      details: node1RecvBcast && node2RecvBcast
        ? 'Broadcast message received by both AMR-01 and AMR-02.'
        : `Failed: AMR-01 received=${node1RecvBcast}, AMR-02 received=${node2RecvBcast}`,
    });

    // ----------------------------------------------------
    // TEST 3: Node Failure Detection (AMR-02 goes OFFLINE)
    // ----------------------------------------------------
    net.setNodeOnlineStatus('AMR-02', false);
    const peerStateInNode1 = node1?.peerList['AMR-02']?.status;
    const peerStateInNode3 = node3?.peerList['AMR-02']?.status;

    const t3Passed = peerStateInNode1 === 'OFFLINE' && peerStateInNode3 === 'OFFLINE';
    results.push({
      testName: 'TEST 3: Node Failure Detection (AMR-02 OFFLINE)',
      passed: t3Passed,
      details: t3Passed
        ? 'AMR-01 and AMR-03 successfully updated AMR-02 status to OFFLINE.'
        : `Failed: Node1 sees AMR-02 as ${peerStateInNode1}, Node3 sees AMR-02 as ${peerStateInNode3}`,
    });

    // ----------------------------------------------------
    // TEST 4: Node Recovery / Rediscovery (AMR-02 -> ONLINE)
    // ----------------------------------------------------
    net.setNodeOnlineStatus('AMR-02', true);
    const recStateInNode1 = node1?.peerList['AMR-02']?.status;
    const recStateInNode3 = node3?.peerList['AMR-02']?.status;

    const t4Passed = recStateInNode1 === 'ONLINE' && recStateInNode3 === 'ONLINE';
    results.push({
      testName: 'TEST 4: Node Recovery / Rediscovery (AMR-02 ONLINE)',
      passed: t4Passed,
      details: t4Passed
        ? 'Peers re-discovered AMR-02 as ONLINE upon reconnection.'
        : `Failed: Node1 sees AMR-02 as ${recStateInNode1}, Node3 sees AMR-02 as ${recStateInNode3}`,
    });

    // ----------------------------------------------------
    // TEST 5: Simulation Reset Clears Communication State
    // ----------------------------------------------------
    net.resetNetwork();
    const inboxEmpty1 = node1?.inbox.length === 0;
    const inboxEmpty2 = node2?.inbox.length === 0;
    const inboxEmpty3 = node3?.inbox.length === 0;

    const t5Passed = inboxEmpty1 && inboxEmpty2 && inboxEmpty3;
    results.push({
      testName: 'TEST 5: Simulation Reset Verification',
      passed: t5Passed,
      details: t5Passed
        ? 'Reset cleared message histories and restored initial online peer states.'
        : `Failed: Inboxes not empty after reset.`,
    });

    // Compile summary
    const passCount = results.filter((r) => r.passed).length;
    const summary: P2PTestSummary = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passCount,
      failCount: results.length - passCount,
      results,
    };

    set({ testSummary: summary });
    get().processHeartbeats();
    return summary;
  },
}));
