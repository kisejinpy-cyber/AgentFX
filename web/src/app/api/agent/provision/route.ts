import { NextResponse } from 'next/server';
import { provisionAgentWallet } from '@/lib/circleAgentWallet';

export async function POST(req: Request) {
  try {
    // Generate a unique idempotency/wallet set tag
    const walletSetId = 'meridian-agent-fleet';
    const wallet = await provisionAgentWallet(walletSetId);

    console.log(`🤖 Dynamic Agent provisioned via Circle DCW. Wallet ID: ${wallet.id}, Address: ${wallet.address}`);

    return NextResponse.json({
      success: true,
      id: wallet.id,
      address: wallet.address,
      message: 'Developer-Controlled Agent Wallet provisioned successfully',
    });
  } catch (error: any) {
    console.error('Agent Wallet Provision API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
