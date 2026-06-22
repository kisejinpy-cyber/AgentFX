import { NextResponse } from 'next/server';
import { AUTO_ESCROW_ADDRESS, USDC_ADDRESS } from '@/lib/constants';
import { executeUserTransaction } from '@/lib/circleUserWallets';
import { isRateLimited, getClientIp } from '@/lib/rateLimit';
import { trackMetric } from '@/app/api/metrics/route';

export async function POST(req: Request) {
  try {
    trackMetric('POST', '/api/sponsor');
    const ip = getClientIp(req);
    
    if (isRateLimited(ip, 'sponsor', { windowMs: 60 * 1000, maxRequests: 10 })) {
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

    console.log(`⛽ Sponsoring transaction for ${email} targeting contract: ${tx.to}`);
    
    // Execute the user's transaction using real Circle Developer-Controlled Wallet or fallback
    const txHash = await executeUserTransaction(email, pin, tx.to, tx.data);

    console.log(`✅ Sponsored transaction broadcasted successfully. Hash: ${txHash}`);
    return NextResponse.json({
      success: true,
      hash: txHash,
    });
  } catch (error: any) {
    console.error('Sponsor API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
