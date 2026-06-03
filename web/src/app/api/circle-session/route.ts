import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseEther, keccak256, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

// USDC Contract for Faucet Funding
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  }
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, pin, tx } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Derive private key from email and pin deterministically
    const seed = `${email.toLowerCase()}-${pin || 'default-pin-1234'}`;
    const derivedKey = keccak256(stringToHex(seed));
    const account = privateKeyToAccount(derivedKey);

    const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http() });
    const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport: http() });

    // Handle authentication / login
    if (action === 'login') {
      console.log(`🔐 Logging in user: ${email} -> Derived Address: ${account.address}`);
      
      // Auto-fund new account with Faucet USDC & gas if empty
      try {
        const gasBalance = await publicClient.getBalance({ address: account.address });
        
        // If gas balance is less than 0.5 USDC, send some gas from seed wallet if available
        if (gasBalance < parseEther('0.5')) {
          const faucetKey = process.env.PRIVATE_KEY as `0x${string}`;
          if (faucetKey) {
            const faucetAccount = privateKeyToAccount(faucetKey);
            const faucetWallet = createWalletClient({ account: faucetAccount, chain: ARC_TESTNET, transport: http() });
            
            console.log(`🎁 Funding gas for new user: ${account.address}`);
            // Send 1.0 USDC for gas
            const hash = await faucetWallet.sendTransaction({
              to: account.address,
              value: parseEther('1.0'),
            });
            await publicClient.waitForTransactionReceipt({ hash });
            
            // Also transfer some USDC tokens
            const usdcWallet = createWalletClient({ account: faucetAccount, chain: ARC_TESTNET, transport: http() });
            const usdcHash = await usdcWallet.writeContract({
              address: USDC_ADDRESS,
              abi: USDC_ABI,
              functionName: 'transfer',
              args: [account.address, BigInt(100000000)], // 100 USDC (6 decimals)
            });
            await publicClient.waitForTransactionReceipt({ hash: usdcHash });
          }
        }
      } catch (err) {
        console.warn('Faucet funding failed:', err);
      }

      return NextResponse.json({
        success: true,
        address: account.address,
        userToken: `mock-token-${derivedKey.substring(2, 12)}`,
        encryptionKey: `mock-enc-key-${derivedKey.substring(12, 22)}`,
        message: 'Circle user session provisioned successfully',
      });
    }

    // Handle transaction signing / execution
    if (action === 'sign-transaction') {
      if (!tx) {
        return NextResponse.json({ error: 'Transaction payload is required' }, { status: 400 });
      }

      console.log(`✍️ Signing transaction for ${email} to ${tx.to}`);

      // Estimate gas and send transaction
      const txHash = await walletClient.sendTransaction({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: tx.value ? BigInt(tx.value) : undefined,
      });

      console.log(`✅ Tx broadcasted successfully: ${txHash}`);
      return NextResponse.json({
        success: true,
        hash: txHash,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Circle Session API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
