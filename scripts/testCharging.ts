import { runChargingSystemTestSuite } from '../engine/p2p/ChargingSystemTestSuite';

console.log('=== RUNNING AMR CHARGING SYSTEM TEST SUITE ===');
const summary = runChargingSystemTestSuite();
console.log(JSON.stringify(summary, null, 2));

if (summary.failCount > 0) {
  console.error(`FAILED: ${summary.failCount} / ${summary.totalTests} tests failed.`);
  process.exit(1);
} else {
  console.log(`SUCCESS: All ${summary.totalTests} tests passed!`);
  process.exit(0);
}
