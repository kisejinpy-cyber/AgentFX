import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const AUTO_ESCROW_ADDRESS = '0x08818076dCDbFe5b6ca0e4471c1fF8b11e568774';
const AUTO_ESCROW_ABI = [
  {
    name: 'releaseAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_escrowId', type: 'uint256' }],
    outputs: [],
  }
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      return NextResponse.json({ error: 'AGENT_PRIVATE_KEY not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey);

    if (action === 'provision') {
      // Return the agent's wallet address
      return NextResponse.json({
        address: account.address,
        message: 'Agent provisioned successfully',
      });
    }

    if (action === 'verify') {
      const { escrowId } = body;
      if (escrowId === undefined) return NextResponse.json({ error: 'Missing escrowId' }, { status: 400 });

      const client = createPublicClient({ chain: ARC_TESTNET, transport: http() });
      const wallet = createWalletClient({ account, chain: ARC_TESTNET, transport: http() });

      // Simulate AI verifying off-chain
      await new Promise(r => setTimeout(r, 2000));

      const { request } = await client.simulateContract({
        account,
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: 'releaseAll',
        args: [BigInt(escrowId)],
      });

      const hash = await wallet.writeContract(request);
      await client.waitForTransactionReceipt({ hash });

      return NextResponse.json({ success: true, txHash: hash, agentAddress: account.address });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
