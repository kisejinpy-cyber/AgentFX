import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';

export type BridgeStep = 'IDLE' | 'DEPOSITING' | 'BRIDGING' | 'LOCKING' | 'COMPLETED' | 'FAILED';

export interface BridgeStatus {
  step: BridgeStep;
  message: string;
  txHash?: string;
  error?: string;
  canRecover?: boolean;
}

export interface ChainBalance {
  chainId: string;
  chainName: string;
  balance: string;
  icon: string;
  logoColor: string;
}

const kit = new AppKit();

/**
 * Fetch unified balances across chains
 */
export async function getUnifiedBalances(userAddress: string, realArcBalance: string): Promise<ChainBalance[]> {
  try {
    const balances = await kit.unifiedBalance.getBalances({
      sources: { address: userAddress },
      networkType: 'testnet',
    });

    const chainMap: Record<string, string> = {};
    if (balances && balances.breakdown) {
      for (const account of balances.breakdown) {
        if (account.breakdown) {
          for (const chainData of account.breakdown) {
            chainMap[chainData.chain] = chainData.confirmedBalance;
          }
        }
      }
    }

    return [
      {
        chainId: 'arc-testnet',
        chainName: 'Arc Testnet (Native)',
        balance: chainMap['Arc_Testnet'] || realArcBalance,
        icon: '⚡',
        logoColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
      },
      {
        chainId: 'base-sepolia',
        chainName: 'Base Sepolia',
        balance: chainMap['Base_Sepolia'] || '0.00',
        icon: '🔵',
        logoColor: 'text-blue-500 border-blue-500/30 bg-blue-500/5',
      },
      {
        chainId: 'ethereum-sepolia',
        chainName: 'Ethereum Sepolia',
        balance: chainMap['Ethereum_Sepolia'] || '0.00',
        icon: '♦️',
        logoColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5',
      },
      {
        chainId: 'solana-devnet',
        chainName: 'Solana Devnet',
        balance: chainMap['Solana_Devnet'] || '0.00',
        icon: '☀️',
        logoColor: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
      },
    ];
  } catch (error) {
    console.error('Error fetching unified balance:', error);
    return [
      {
        chainId: 'arc-testnet',
        chainName: 'Arc Testnet (Native)',
        balance: realArcBalance,
        icon: '⚡',
        logoColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
      },
      {
        chainId: 'base-sepolia',
        chainName: 'Base Sepolia',
        balance: '0.00',
        icon: '🔵',
        logoColor: 'text-blue-500 border-blue-500/30 bg-blue-500/5',
      },
      {
        chainId: 'ethereum-sepolia',
        chainName: 'Ethereum Sepolia',
        balance: '0.00',
        icon: '♦️',
        logoColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5',
      },
      {
        chainId: 'solana-devnet',
        chainName: 'Solana Devnet',
        balance: '0.00',
        icon: '☀️',
        logoColor: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
      },
    ];
  }
}

/**
 * Custom hook/helper to run the multi-chain Unified Balance cross-chain funding flow using App Kit.
 */
export async function executeUnifiedFunding(options: {
  sourceChain: string;
  amount: string;
  userAddress: string;
  jobId: number;
  connector: any;
  onStateChange: (status: BridgeStatus) => void;
  onSuccess: () => void;
}) {
  const { sourceChain, amount, userAddress, connector, onStateChange, onSuccess } = options;

  let sdkSourceChain = 'Ethereum_Sepolia';
  if (sourceChain === 'base-sepolia') {
    sdkSourceChain = 'Base_Sepolia';
  } else if (sourceChain === 'ethereum-sepolia') {
    sdkSourceChain = 'Ethereum_Sepolia';
  } else if (sourceChain === 'solana-devnet') {
    sdkSourceChain = 'Solana_Devnet';
  }

  try {
    console.log(`🚀 Starting App Kit Unified Balance routing for ${amount} USDC from ${sourceChain}...`);
    
    // --- STEP 1: DEPOSITING (Sweep on source chain) ---
    onStateChange({
      step: 'DEPOSITING',
      message: `Preparing Viem Adapter and initiating USDC sweep from ${sdkSourceChain}...`,
    });

    const provider = await connector.getProvider();
    const adapter = await createViemAdapterFromProvider({ provider });

    // --- STEP 2: BRIDGING (CCTP Attestation & Mint on Arc) ---
    onStateChange({
      step: 'BRIDGING',
      message: 'USDC sweep transaction submitted. Bridging to Arc Testnet via Circle Gateway...',
    });

    // Execute Unified Balance Spend to Arc Testnet with Forwarding Service
    const result = await kit.unifiedBalance.spend({
      from: {
        adapter,
        allocations: { amount: amount, chain: sdkSourceChain },
      },
      to: {
        chain: 'Arc_Testnet',
        recipientAddress: userAddress,
        useForwarder: true,
      },
      amount: amount,
    } as any);

    console.log(`✅ Cross-chain sweep completed. Tx Hash: ${result.txHash}`);

    // --- STEP 3: LOCKING (Deposit/Fund in AutoEscrow contract) ---
    onStateChange({
      step: 'LOCKING',
      message: 'USDC successfully bridged to Arc. Submitting fund/escrow transaction to contract...',
      txHash: result.txHash,
    });

    onSuccess();
  } catch (error: any) {
    console.error('Cross-chain funding failed:', error);
    onStateChange({
      step: 'FAILED',
      message: `Cross-chain funding failed: ${error?.message || 'Unknown bridging error'}`,
      error: error?.message || 'Attestation timeout',
      canRecover: true,
    });
  }
}
