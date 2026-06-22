import { NextResponse } from 'next/server';
import { verifyTypedData } from 'viem';
import crypto from 'crypto';

// Global state for user nanopayment reserves (in-memory)
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
  usedNonces?: Set<string>;
};

if (!globalWithReserves.usedNonces) {
  globalWithReserves.usedNonces = new Set<string>();
}

if (!globalWithReserves.gatewayReserves) {
  globalWithReserves.gatewayReserves = {
    // Initial default address has some pre-funded reserves for testing
    'default': 0.05, 
  };
}

if (!globalWithReserves.agentEarnings) {
  globalWithReserves.agentEarnings = 0.00245;
}

if (!globalWithReserves.billingLogs) {
  globalWithReserves.billingLogs = [
    { id: 'tx-nano-1', timestamp: Date.now() - 3600000 * 2, user: 'default', recipient: '0x1087E71CD83101adF154d8215522EadA51Bf891E', amount: 0.00001, status: 'Settled' },
    { id: 'tx-nano-2', timestamp: Date.now() - 3600000 * 1, user: 'default', recipient: '0x1087E71CD83101adF154d8215522EadA51Bf891E', amount: 0.00001, status: 'Settled' },
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
      id: `tx-nano-${crypto.randomUUID().substring(0, 8)}`,
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
 * x402 HTTP Payment middleware handler with real EIP-712 auth verification
 */
export async function handleX402Middleware(req: Request, userAddress: string) {
  const authHeader = req.headers.get('X-402-Payment-Authorization') || req.headers.get('Authorization');
  const cost = 0.00001; // $0.00001 USDC per call

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

  // Parse header: Bearer signature:address:costUnits:nonce:validUntil
  const token = authHeader.substring(7);
  const parts = token.split(':');
  if (parts.length !== 5) {
    return NextResponse.json(
      { error: 'Malformed payment authorization header' },
      { status: 402 }
    );
  }

  const [signature, payerAddress, amountStr, nonceStr, validUntilStr] = parts;

  const nonceKey = `${payerAddress.toLowerCase()}:${nonceStr}`;
  if (globalWithReserves.usedNonces!.has(nonceKey)) {
    return NextResponse.json(
      { error: 'Payment signature nonce already used (replay protection)' },
      { status: 402 }
    );
  }

  // Validate EIP-712 signature
  try {
    const domain = {
      name: 'x402 Micropayment Protocol',
      version: '1.0.0',
      chainId: 5042002, // Arc Testnet
      verifyingContract: '0x1087E71CD83101adF154d8215522EadA51Bf891E' as const,
    };

    const types = {
      Micropayment: [
        { name: 'payer', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'validUntil', type: 'uint256' },
      ],
    } as const;

    const isValid = await verifyTypedData({
      address: payerAddress as `0x${string}`,
      domain,
      types,
      primaryType: 'Micropayment',
      message: {
        payer: payerAddress as `0x${string}`,
        recipient: '0x1087E71CD83101adF154d8215522EadA51Bf891E' as const,
        amount: BigInt(amountStr),
        nonce: BigInt(nonceStr),
        validUntil: BigInt(validUntilStr),
      },
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid EIP-712 payment signature' }, { status: 402 });
    }

    if (payerAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Payer address mismatch' }, { status: 402 });
    }

    const expiry = Number(validUntilStr);
    if (Date.now() / 1000 > expiry) {
      return NextResponse.json({ error: 'Payment signature expired' }, { status: 402 });
    }

    // Mark nonce as used once validation is successful
    globalWithReserves.usedNonces!.add(nonceKey);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Payment signature validation failed: ${err.message || err}` },
      { status: 402 }
    );
  }

  // Deduct from reserves
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

  return null; // Validated and deducted successfully
}
