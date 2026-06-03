import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseEther, keccak256, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AUTO_ESCROW_ADDRESS, USDC_ADDRESS } from '@/lib/constants';

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

// In-memory rate limiting map
const ipLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 sponsored txs per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = ipLimits.get(ip);

  if (!limit) {
    ipLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > limit.resetAt) {
    ipLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  limit.count += 1;
  return false;
}

export async function POST(req: Request) {
  try {
    // Get IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Sponsored transactions are rate-limited to prevent abuse.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, pin, tx } = body;

    if (!email || !tx) {
      return NextResponse.json({ error: 'Email and transaction payload are required' }, { status: 400 });
    }

    // Security check: Validate destination contract address to prevent balance draining
    const allowedAddresses = [
      USDC_ADDRESS.toLowerCase(),
      AUTO_ESCROW_ADDRESS.toLowerCase(),
    ];

    if (!tx.to || !allowedAddresses.includes(tx.to.toLowerCase())) {
      console.warn(`🛑 Blocked unauthorized transaction sponsor request to: ${tx.to}`);
      return NextResponse.json(
        { error: 'Unauthorized destination. Sponsoring is only allowed for USDC and Meridian Escrow contracts.' },
        { status: 403 }
      );
    }

    // Derive private key from email and pin deterministically
    const seed = `${email.toLowerCase()}-${pin || 'default-pin-1234'}`;
    const derivedKey = keccak256(stringToHex(seed));
    const account = privateKeyToAccount(derivedKey);

    const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http() });
    const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport: http() });

    console.log(`⛽ Sponsoring transaction for ${email} (${account.address}) targeting ${tx.to}`);

    // Auto-refuel gas balance of user if less than 0.2 USDC
    try {
      const balance = await publicClient.getBalance({ address: account.address });
      if (balance < parseEther('0.2')) {
        const faucetKey = process.env.PRIVATE_KEY as `0x${string}`;
        if (faucetKey) {
          const faucetAccount = privateKeyToAccount(faucetKey);
          const faucetWallet = createWalletClient({ account: faucetAccount, chain: ARC_TESTNET, transport: http() });
          
          console.log(`🎁 Gas Station refueling: sending 0.5 USDC gas to ${account.address}`);
          const refuelHash = await faucetWallet.sendTransaction({
            to: account.address,
            value: parseEther('0.5'),
          });
          await publicClient.waitForTransactionReceipt({ hash: refuelHash });
        }
      }
    } catch (err) {
      console.error('Gas station auto-refuel failed:', err);
    }

    // Broadcast the sponsored transaction
    const txHash = await walletClient.sendTransaction({
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value ? BigInt(tx.value) : undefined,
    });

    console.log(`✅ Sponsored transaction broadcasted: ${txHash}`);
    return NextResponse.json({
      success: true,
      hash: txHash,
    });
  } catch (error: any) {
    console.error('Sponsor API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
