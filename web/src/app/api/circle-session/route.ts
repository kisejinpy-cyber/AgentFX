import { NextResponse } from 'next/server';
import { getOrCreateUserWallet, executeUserTransaction } from '@/lib/circleUserWallets';
import { isRateLimited, getClientIp } from '@/lib/rateLimit';
import { trackMetric } from '@/app/api/metrics/route';

export async function POST(req: Request) {
  try {
    trackMetric('POST', '/api/circle-session');
    const ip = getClientIp(req);
    const body = await req.json();
    const { action, email, pin, tx } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid action parameter' }, { status: 400 });
    }

    // Handle authentication / login
    if (action === 'login') {
      if (isRateLimited(ip, 'session-login', { windowMs: 60 * 1000, maxRequests: 15 })) {
        return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
      }

      console.log(`🔐 Processing login/wallet-provisioning request for user: ${email}`);
      const wallet = await getOrCreateUserWallet(email, pin);
      
      return NextResponse.json({
        success: true,
        address: wallet.address,
        userToken: `token-${wallet.walletId}`,
        encryptionKey: `enc-${wallet.walletId.substring(0, 10)}`,
        message: wallet.isSimulated 
          ? 'Circle simulated user session provisioned successfully' 
          : 'Circle Developer-Controlled user wallet provisioned successfully',
      });
    }

    // Handle transaction signing / execution
    if (action === 'sign-transaction') {
      if (isRateLimited(ip, 'session-sign-transaction', { windowMs: 60 * 1000, maxRequests: 10 })) {
        return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
      }

      if (!tx) {
        return NextResponse.json({ error: 'Transaction payload is required' }, { status: 400 });
      }

      // Input validation for target transaction address
      if (!tx.to || typeof tx.to !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(tx.to)) {
        return NextResponse.json({ error: 'Invalid transaction destination address' }, { status: 400 });
      }

      console.log(`✍️ Signing transaction for ${email} targeting contract: ${tx.to}`);
      const txHash = await executeUserTransaction(email, pin, tx.to, tx.data);

      console.log(`✅ Transaction submitted successfully. Hash: ${txHash}`);
      return NextResponse.json({
        success: true,
        hash: txHash,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Circle Session API Error:', error);
    const isProd = process.env.NODE_ENV === 'production';
    const displayError = isProd ? 'An unexpected server error occurred.' : (error.message || 'Unknown error');
    return NextResponse.json({ error: displayError }, { status: 500 });
  }
}
