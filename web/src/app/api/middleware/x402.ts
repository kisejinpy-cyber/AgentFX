import { NextResponse } from 'next/server';

// Global mock state for user nanopayment reserves (in-memory)
// Kept on the global object to persist across HMR reloads in dev
const globalWithReserves = global as typeof globalThis & {
  gatewayReserves?: Record<string, number>;
  agentEarnings?: number;
  billingLogs?: Array<{
    id: string;
    timestamp: number;
    user: string;
    recipient: string;
    amount: number;
    status: string;
  }>;
};

if (!globalWithReserves.gatewayReserves) {
  globalWithReserves.gatewayReserves = {
    // Initial demo address has some pre-funded reserves
    'default': 0.05, 
  };
}

if (!globalWithReserves.agentEarnings) {
  globalWithReserves.agentEarnings = 0.00245;
}

if (!globalWithReserves.billingLogs) {
  globalWithReserves.billingLogs = [
    { id: 'tx-nano-1', timestamp: Date.now() - 3600000 * 2, user: '0xBuyerAddress...', recipient: '0x1087E71C...', amount: 0.00001, status: 'Settled' },
    { id: 'tx-nano-2', timestamp: Date.now() - 3600000 * 1, user: '0xBuyerAddress...', recipient: '0x1087E71C...', amount: 0.00001, status: 'Settled' },
  ];
}

export const reservesDb = {
  getBalance(address: string): number {
    const addr = address.toLowerCase();
    if (globalWithReserves.gatewayReserves![addr] === undefined) {
      globalWithReserves.gatewayReserves![addr] = 0.0;
    }
    return globalWithReserves.gatewayReserves![addr];
  },
  topup(address: string, amount: number) {
    const addr = address.toLowerCase();
    const current = this.getBalance(addr);
    globalWithReserves.gatewayReserves![addr] = current + amount;
  },
  deduct(address: string, amount: number): boolean {
    const addr = address.toLowerCase();
    const current = this.getBalance(addr);
    if (current < amount) return false;
    globalWithReserves.gatewayReserves![addr] = current - amount;
    // Accrue to agent earnings
    globalWithReserves.agentEarnings = (globalWithReserves.agentEarnings || 0) + amount;
    // Add to billing logs
    globalWithReserves.billingLogs!.unshift({
      id: `tx-nano-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      user: addr,
      recipient: '0x1087E71CD83101adF154d8215522EadA51Bf891E',
      amount,
      status: 'Settled',
    });
    return true;
  },
  getEarnings(): number {
    return globalWithReserves.agentEarnings || 0;
  },
  claimEarnings() {
    globalWithReserves.agentEarnings = 0;
  },
  getLogs() {
    return globalWithReserves.billingLogs || [];
  }
};

/**
 * x402 HTTP Payment middleware handler
 */
export function handleX402Middleware(req: Request, userAddress: string) {
  const authHeader = req.headers.get('X-402-Payment-Authorization') || req.headers.get('Authorization');
  const cost = 0.00001; // $0.00001 USDC per call

  // Check if authorization proof is present
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        error: 'Payment Required',
        message: 'This endpoint requires a micro-payment authorization via the x402 protocol.',
      },
      {
        status: 402,
        headers: {
          'X-402-Payment-Required': 'true',
          'X-402-Payment-Cost': cost.toString(),
          'X-402-Payment-Recipient': '0x1087E71CD83101adF154d8215522EadA51Bf891E',
          'X-402-Payment-Channel': `channel-${userAddress.toLowerCase()}`,
        },
      }
    );
  }

  // User provided proof, let's verify reserve and deduct
  const success = reservesDb.deduct(userAddress, cost);
  if (!success) {
    return NextResponse.json(
      {
        error: 'Insufficient Nanopayment Balance',
        message: 'Your Circle Gateway Nanopayment reserves are empty. Please top-up.',
      },
      {
        status: 402,
        headers: {
          'X-402-Payment-Required': 'true',
          'X-402-Payment-Cost': cost.toString(),
          'X-402-Payment-Recipient': '0x1087E71CD83101adF154d8215522EadA51Bf891E',
          'X-402-Payment-Channel': `channel-${userAddress.toLowerCase()}`,
        },
      }
    );
  }

  return null; // Payment validated successfully
}
