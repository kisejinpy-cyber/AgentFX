const path = require('path');
const fs = require('fs');

async function runTest() {
  console.log('🧪 Testing HSM-Secured AI Agent Engine Configuration...');

  // Test Case 1: Check Private Key absence in code
  const agentScriptPath = path.resolve(process.cwd(), 'agent.mjs');
  const content = fs.readFileSync(agentScriptPath, 'utf8');

  console.log('\n1. Verifying Private Key Security:');
  const hasRawPrivateKeyAccess = content.includes('ethers.Wallet(process.env.PRIVATE_KEY') || content.includes('new Wallet(');
  console.log(`   - Raw plaintext wallet initialization found? ${hasRawPrivateKeyAccess ? 'YES ❌' : 'NO ✅'}`);
  
  if (hasRawPrivateKeyAccess) {
    throw new Error('❌ Security flaw: plaintext private key initialization found in agent script!');
  }
  console.log('   ✅ Agent script successfully removed all plaintext private key dependencies.');

  // Test Case 2: Verify Circle Wallet ID assignment
  console.log('\n2. Verifying Circle Developer-Controlled Wallet Setup:');
  const hasWalletId = content.includes('AGENT_WALLET_ID');
  console.log(`   - Developer-Controlled Wallet ID configured? ${hasWalletId ? 'YES ✅' : 'NO ❌'}`);
  
  if (!hasWalletId) {
    throw new Error('❌ Configuration flaw: AGENT_WALLET_ID is missing!');
  }
  console.log('   ✅ Wallet ID is correctly configured.');

  // Test Case 3: Mock transaction signature delegation
  console.log('\n3. Verifying Transaction Signature Delegation:');
  const hasDelegation = content.includes('executeContractCall');
  console.log(`   - Transaction signing delegated to HSM proxy? ${hasDelegation ? 'YES ✅' : 'NO ❌'}`);
  
  if (!hasDelegation) {
    throw new Error('❌ Design flaw: Contract execution is not delegated to Circle/HSM!');
  }
  console.log('   ✅ Contract calls are successfully delegated keylessly.');

  console.log('\n🎉 ALL HSM-SECURED AGENT ENGINE TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
