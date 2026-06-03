import { NextResponse } from 'next/server';
import { AUTO_ESCROW_ADDRESS } from '@/lib/constants';
import { executeContractCall } from '@/lib/circleAgentWallet';

const AUTO_ESCROW_ABI = [
  {
    name: 'settleJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
  }
];

import { handleX402Middleware, reservesDb } from '@/app/api/middleware/x402';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'provision') {
      // Simulate/direct fallback to provision endpoint
      return NextResponse.json({
        address: '0x1087E71CD83101adF154d8215522EadA51Bf891E',
        message: 'Agent provisioned successfully',
      });
    }

    if (action === 'get-nanopayments') {
      const { userAddress } = body;
      const balance = reservesDb.getBalance(userAddress || 'default');
      const earnings = reservesDb.getEarnings();
      const logs = reservesDb.getLogs();
      return NextResponse.json({ balance, earnings, logs });
    }

    if (action === 'topup-nanopayments') {
      const { userAddress, amount } = body;
      if (!userAddress || !amount) return NextResponse.json({ error: 'Missing userAddress or amount' }, { status: 400 });
      reservesDb.topup(userAddress, parseFloat(amount));
      return NextResponse.json({ success: true, balance: reservesDb.getBalance(userAddress) });
    }

    if (action === 'claim-earnings') {
      reservesDb.claimEarnings();
      return NextResponse.json({ success: true, earnings: 0 });
    }

    if (action === 'verify') {
      const { escrowId, userAddress } = body;
      if (escrowId === undefined) return NextResponse.json({ error: 'Missing escrowId' }, { status: 400 });

      // Run x402 Payment Middleware
      const addr = userAddress || req.headers.get('X-User-Address') || 'default';
      const paymentResponse = handleX402Middleware(req, addr);
      if (paymentResponse) {
        return paymentResponse;
      }

      // Simulate AI verifying off-chain
      await new Promise(r => setTimeout(r, 2000));

      // Execute transaction via Developer-Controlled HSM / Circle Wallet
      const hash = await executeContractCall(
        'agent-wallet-main',
        AUTO_ESCROW_ADDRESS,
        AUTO_ESCROW_ABI,
        'settleJob',
        [BigInt(escrowId)]
      );

      return NextResponse.json({
        success: true,
        txHash: hash,
        agentAddress: '0x1087E71CD83101adF154d8215522EadA51Bf891E',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
