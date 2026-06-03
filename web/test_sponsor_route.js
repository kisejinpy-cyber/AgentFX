const { keccak256, stringToHex } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const AUTO_ESCROW_ADDRESS = "0x075Fa0B39Fc72dAf3795B39a6E7D0816759bBe0b";
const MALICIOUS_ADDRESS = "0xde7094c50c7f6c69e66b6eb713b8044fc5ccea0066";

// Local simulation of backend sponsor validation logic
function validateDestination(to) {
  const allowed = [
    USDC_ADDRESS.toLowerCase(),
    AUTO_ESCROW_ADDRESS.toLowerCase()
  ];
  return allowed.includes(to.toLowerCase());
}

// In-memory rate limiting test simulation
let requestCount = 0;
const MAX_REQUESTS = 5;

function checkRateLimit() {
  requestCount++;
  return requestCount > MAX_REQUESTS;
}

async function runTest() {
  console.log('🧪 Running Circle Gas Station Sponsor Proxy Tests...');

  // Test Case 1: Validate Authorized Destination (USDC approval or Escrow locking)
  console.log('\n1. Testing Destination Validation for Authorized Targets:');
  const isUsdcAllowed = validateDestination(USDC_ADDRESS);
  const isEscrowAllowed = validateDestination(AUTO_ESCROW_ADDRESS);
  
  console.log(`   - USDC Contract allowed? ${isUsdcAllowed ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   - AutoEscrow Contract allowed? ${isEscrowAllowed ? 'YES ✅' : 'NO ❌'}`);
  
  if (!isUsdcAllowed || !isEscrowAllowed) {
    throw new Error('❌ Allowed target check failed!');
  }

  // Test Case 2: Block Unauthorized Destinations (Malicious Balance Draining)
  console.log('\n2. Testing Security Block for Unauthorized Targets:');
  const isMaliciousAllowed = validateDestination(MALICIOUS_ADDRESS);
  console.log(`   - Malicious Contract allowed? ${isMaliciousAllowed ? 'YES ❌' : 'NO ✅'}`);
  
  if (isMaliciousAllowed) {
    throw new Error('❌ Security check failed! Malicious address was not blocked.');
  }
  console.log('   ✅ Unauthorized address security block works perfectly.');

  // Test Case 3: Test Rate Limiting
  console.log('\n3. Testing Rate Limiting thresholds:');
  for (let i = 1; i <= 7; i++) {
    const limited = checkRateLimit();
    console.log(`   - Request #${i}: ${limited ? 'RATE LIMITED (429) 🛑' : 'Passed ✅'}`);
    if (i > MAX_REQUESTS && !limited) {
      throw new Error(`❌ Rate limiting failed to trigger at request #${i}!`);
    }
  }
  console.log('   ✅ Rate limiting logic triggers correctly.');

  console.log('\n🎉 ALL GASLESS TRANSACTION SPONSOR TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
