import { runCollisionAvoidanceTestSuite } from '../engine/coordination/CollisionAvoidanceTestSuite';
import { runTaskAnnouncementTestSuite } from '../engine/p2p/TaskAnnouncementTestSuite';
import { runTaskBidExchangeTestSuite } from '../engine/p2p/TaskBidExchangeTestSuite';
import { runTaskConsensusTestSuite } from '../engine/p2p/TaskConsensusTestSuite';
import { runTaskDeleteTestSuite } from '../engine/p2p/TaskDeleteTestSuite';
import { runStatusThrottleTestSuite } from '../engine/p2p/StatusThrottleTestSuite';
import { runDecentralizedAllocationEndToEndTestSuite } from '../engine/p2p/DecentralizedAllocationEndToEndTestSuite';
import { runChargingSystemTestSuite } from '../engine/p2p/ChargingSystemTestSuite';
import { SimulatedP2PNetwork } from '../engine/p2p/SimulatedP2PNetwork';
import { getVirtualMacAddress } from '../engine/p2p/SimulatedEspNowTransport';

console.log('================================================================');
console.log('=== SIMULATED ESP-NOW TRANSPORT & PROTOCOL VALIDATION SUITE ===');
console.log('================================================================\n');

// 1. ESP-NOW Virtual Hardware & Transport Test
console.log('--- 1. ESP-NOW Virtual Device & MAC Address Verification ---');
const network = new SimulatedP2PNetwork();
const node1 = network.registerNode('AMR-01');
const node2 = network.registerNode('AMR-02');
const node3 = network.registerNode('AMR-03');

const mac1 = getVirtualMacAddress('AMR-01');
const mac2 = getVirtualMacAddress('AMR-02');
const macBcast = getVirtualMacAddress('ALL');

console.log(`AMR-01 Virtual MAC: ${mac1} (Expected: 30:AE:A4:01:00:01) -> ${mac1 === '30:AE:A4:01:00:01' ? '✓ PASS' : '✗ FAIL'}`);
console.log(`AMR-02 Virtual MAC: ${mac2} (Expected: 30:AE:A4:01:00:02) -> ${mac2 === '30:AE:A4:01:00:02' ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Broadcast Virtual MAC: ${macBcast} (Expected: FF:FF:FF:FF:FF:FF) -> ${macBcast === 'FF:FF:FF:FF:FF:FF' ? '✓ PASS' : '✗ FAIL'}`);

// Test Unicast Frame
network.sendDirectMessage('AMR-01', 'AMR-02', 'PATH_INTENT', {
  body: 'Trajectory intent corridor reserved along column 10',
});

const receivedMsg = node2.inbox[node2.inbox.length - 1];
console.log(`ESP-NOW Packet Metadata Attached: ${Boolean(receivedMsg?.espNow)}`);
console.log(`  Protocol: ${receivedMsg?.espNow?.protocol}`);
console.log(`  Source MAC: ${receivedMsg?.espNow?.srcMac}`);
console.log(`  Destination MAC: ${receivedMsg?.espNow?.dstMac}`);
console.log(`  Delivery Mode: ${receivedMsg?.espNow?.deliveryMode}`);
console.log(`  Delivery Status: ${receivedMsg?.espNow?.deliveryStatus}\n`);

// 2. Collision Avoidance Test Suite (Must remain 11/11 PASS)
console.log('--- 2. Running CollisionAvoidanceTestSuite (Frozen Invariant) ---');
const collisionSummary = runCollisionAvoidanceTestSuite();
console.log(`Collision Tests: ${collisionSummary.passCount} / ${collisionSummary.totalTests} Passed (${collisionSummary.failCount} Failed)`);

// 3. P2P Task Lifecycle Test Suites
console.log('\n--- 3. Running P2P Task Lifecycle Test Suites ---');
const announceSummary = runTaskAnnouncementTestSuite();
console.log(`Task Announcement Tests: ${announceSummary.passCount} / ${announceSummary.totalTests} Passed`);

const bidSummary = runTaskBidExchangeTestSuite();
console.log(`Task Bid Exchange Tests: ${bidSummary.passCount} / ${bidSummary.totalTests} Passed`);

const consensusSummary = runTaskConsensusTestSuite();
console.log(`Task Consensus Tests: ${consensusSummary.passCount} / ${consensusSummary.totalTests} Passed`);

const deleteSummary = runTaskDeleteTestSuite();
console.log(`Task Delete Tests: ${deleteSummary.passCount} / ${deleteSummary.totalTests} Passed`);

const throttleSummary = runStatusThrottleTestSuite();
console.log(`Status Throttle Tests: ${throttleSummary.passCount} / ${throttleSummary.totalTests} Passed`);

const e2eSummary = runDecentralizedAllocationEndToEndTestSuite();
console.log(`Decentralized Allocation E2E Tests: ${e2eSummary.passCount} / ${e2eSummary.totalTests} Passed`);

const chargingSummary = runChargingSystemTestSuite();
console.log(`Charging System Tests: ${chargingSummary.passCount} / ${chargingSummary.totalTests} Passed`);

[
  collisionSummary,
  announceSummary,
  bidSummary,
  consensusSummary,
  deleteSummary,
  throttleSummary,
  e2eSummary,
  chargingSummary,
].forEach((s) => {
  s.results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.error(`FAILED TEST: ${r.testName} -> ${r.details}`);
    });
});

console.log('\n================================================================');
const totalFails =
  collisionSummary.failCount +
  announceSummary.failCount +
  bidSummary.failCount +
  consensusSummary.failCount +
  deleteSummary.failCount +
  throttleSummary.failCount +
  e2eSummary.failCount +
  chargingSummary.failCount;

if (totalFails === 0) {
  console.log('✓ ALL TEST SUITES PASSED CLEANLY WITH ZERO FAILURES!');
  console.log('================================================================');
  process.exit(0);
} else {
  console.error(`✗ ${totalFails} TOTAL FAILURES DETECTED!`);
  console.log('================================================================');
  process.exit(1);
}
