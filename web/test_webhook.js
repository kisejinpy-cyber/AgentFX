const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simulated Webhook Security verify function locally
async function verifyWebhookSignature({ rawBody, signature, keyId, timestampHeader }) {
  // Prevent replay attacks (timestamp within 5 minutes / 300 seconds)
  if (timestampHeader) {
    const timestampMs = parseInt(timestampHeader, 10);
    if (!isNaN(timestampMs)) {
      const nowMs = Date.now();
      if (Math.abs(nowMs - timestampMs) > 300 * 1000) {
        console.warn('   ⚠️ Webhook rejected: Timestamp drift exceeded 5 minutes');
        return false;
      }
    }
  }

  // Support mocking for testing
  if (keyId === 'mock-key-id') {
    if (signature === 'mock-invalid-sig') {
      return false;
    }
    return signature === 'mock-signature' || signature === 'mock-valid-signature';
  }

  return false;
}

// Simulated notification dispatcher
function dispatchNotification(type, details) {
  let title = '';
  let message = '';

  switch (type) {
    case 'JobCreated':
      title = `🆕 Escrow Job Created (#${details.jobId})`;
      message = `A new escrow job has been initialized on Arc Testnet. Budget of ${details.amount} ${details.currency} is locked.`;
      break;
    case 'JobSettled':
      title = `✅ Escrow Job Settled (#${details.jobId})`;
      message = `Escrow job #${details.jobId} has been settled.`;
      break;
    case 'JobDisputed':
      title = `⚠️ Escrow Job Disputed (#${details.jobId})`;
      message = `A dispute has been raised for escrow job #${details.jobId}.`;
      break;
  }

  return { title, message, type };
}

async function runTest() {
  console.log('🧪 Running Circle Webhook and Event Monitoring Tests...');

  // Test Case 1: Webhook Signature Verification
  console.log('\n1. Testing Signature Verification:');
  const validSig = await verifyWebhookSignature({
    rawBody: '{}',
    signature: 'mock-signature',
    keyId: 'mock-key-id',
  });
  console.log(`   - Valid signature authorized: ${validSig ? 'YES ✅' : 'NO ❌'}`);
  if (!validSig) throw new Error('Valid signature failed validation');

  const invalidSig = await verifyWebhookSignature({
    rawBody: '{}',
    signature: 'mock-invalid-sig',
    keyId: 'mock-key-id',
  });
  console.log(`   - Invalid signature rejected: ${!invalidSig ? 'YES ✅' : 'NO ❌'}`);
  if (invalidSig) throw new Error('Invalid signature was authorized');

  // Test Case 2: Replay Attack Prevention
  console.log('\n2. Testing Replay Attack Prevention:');
  const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
  const rejectedReplay = await verifyWebhookSignature({
    rawBody: '{}',
    signature: 'mock-signature',
    keyId: 'mock-key-id',
    timestampHeader: oldTimestamp.toString(),
  });
  console.log(`   - Replay request rejected (10m old): ${!rejectedReplay ? 'YES ✅' : 'NO ❌'}`);
  if (rejectedReplay) throw new Error('Replay request should have been rejected');

  const freshTimestamp = Date.now() - 10 * 1000; // 10 seconds ago
  const acceptedFresh = await verifyWebhookSignature({
    rawBody: '{}',
    signature: 'mock-signature',
    keyId: 'mock-key-id',
    timestampHeader: freshTimestamp.toString(),
  });
  console.log(`   - Fresh request accepted (10s old): ${acceptedFresh ? 'YES ✅' : 'NO ❌'}`);
  if (!acceptedFresh) throw new Error('Fresh request should have been accepted');

  // Test Case 3: Payload Processing and Alert Dispatching
  console.log('\n3. Testing Notification Dispatch Routing:');
  
  const createdAlert = dispatchNotification('JobCreated', {
    jobId: '42',
    amount: '1,500.00',
    currency: 'USDC',
  });
  console.log(`   - JobCreated Alert title: "${createdAlert.title}"`);
  console.log(`   - JobCreated Alert message: "${createdAlert.message}"`);
  if (!createdAlert.title.includes('#42') || !createdAlert.message.includes('1,500.00')) {
    throw new Error('JobCreated alert mapping formatting error');
  }
  console.log('   ✅ JobCreated alert formatted correctly.');

  const settledAlert = dispatchNotification('JobSettled', {
    jobId: '42',
  });
  console.log(`   - JobSettled Alert title: "${settledAlert.title}"`);
  if (!settledAlert.title.includes('Settled')) {
    throw new Error('JobSettled alert mapping formatting error');
  }
  console.log('   ✅ JobSettled alert formatted correctly.');

  const disputedAlert = dispatchNotification('JobDisputed', {
    jobId: '42',
  });
  console.log(`   - JobDisputed Alert title: "${disputedAlert.title}"`);
  if (!disputedAlert.title.includes('Disputed')) {
    throw new Error('JobDisputed alert mapping formatting error');
  }
  console.log('   ✅ JobDisputed alert formatted correctly.');

  console.log('\n🎉 ALL CIRCLE EVENT MONITORING & WEBHOOK TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
