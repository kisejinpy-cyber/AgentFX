import { BridgeKit } from '@circle-fin/bridge-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';

export type BridgeStep = 'IDLE' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'DONE' | 'FAILED';

export interface BridgeState {
  step: BridgeStep;
  message: string;
  txHash?: string;
  messageHash?: string;
  attestation?: string;
  error?: string;
  canRecover?: boolean;
}

// In-memory Sepolia balance for bridge demo
let sepoliaUSDCBalance = '1000.00';

export function getSepoliaUSDCBalance(): string {
  return sepoliaUSDCBalance;
}

export function adjustSepoliaUSDCBalance(amount: number): string {
  const current = parseFloat(sepoliaUSDCBalance);
  sepoliaUSDCBalance = Math.max(0, current + amount).toFixed(2);
  return sepoliaUSDCBalance;
}

const bridgeKit = new BridgeKit();

/**
 * Executes a real CCTP bridge transaction from Sepolia/Base to Arc Testnet using Bridge Kit.
 */
export async function executeCctpBridge(options: {
  amount: string;
  userAddress: string;
  sourceChain: 'ethereum-sepolia' | 'base-sepolia' | 'arbitrum-sepolia';
  connector: any;
  onStateChange: (state: BridgeState) => void;
  onSuccess: () => void;
}) {
  const { amount, userAddress, sourceChain, connector, onStateChange, onSuccess } = options;

  let sdkSourceChain = 'Ethereum_Sepolia';
  if (sourceChain === 'base-sepolia') {
    sdkSourceChain = 'Base_Sepolia';
  } else if (sourceChain === 'arbitrum-sepolia') {
    sdkSourceChain = 'Arbitrum_Sepolia';
  }

  try {
    onStateChange({
      step: 'BURNING',
      message: 'Initializing Viem Adapter and preparing transaction approval...',
    });

    const provider = await connector.getProvider();
    const adapter = await createViemAdapterFromProvider({ provider });

    // Wire up SDK event listeners to progress state
    bridgeKit.on('approve', (payload) => {
      onStateChange({
        step: 'BURNING',
        message: 'Approving USDC spending allowance for Circle TokenMessenger...',
        txHash: payload.values?.txHash,
      });
    });

    bridgeKit.on('burn', (payload) => {
      onStateChange({
        step: 'ATTESTING',
        message: 'USDC burned. Polling Circle Attestation API for signatures (this may take up to 20s)...',
        txHash: payload.values?.txHash,
      });
    });

    bridgeKit.on('fetchAttestation', (payload) => {
      if (payload.values?.state === 'success') {
        onStateChange({
          step: 'MINTING',
          message: 'Attestation signature successfully retrieved. Preparing mint on Arc Testnet...',
          attestation: payload.values?.data?.attestation,
        });
      } else {
        onStateChange({
          step: 'ATTESTING',
          message: 'Circle Attestation pending. Waiting for validator signatures...',
        });
      }
    });

    bridgeKit.on('mint', (payload) => {
      onStateChange({
        step: 'DONE',
        message: `Successfully bridged ${amount} USDC. Mint transaction confirmed on Arc Testnet.`,
        txHash: payload.values?.txHash,
      });
    });

    const result = await bridgeKit.bridge({
      from: { adapter, chain: sdkSourceChain },
      to: { adapter, chain: 'Arc_Testnet' },
      amount: amount,
    } as any);

    // Remove listeners when finished to avoid leaks
    (bridgeKit as any).removeAllListeners?.();

    if (result.state === 'success') {
      // Deduct local Sepolia balance demo balance
      adjustSepoliaUSDCBalance(-parseFloat(amount));
      onSuccess();
    } else {
      const failedStep = result.steps.find((step) => step.state === 'error');
      throw new Error(failedStep?.error ? String(failedStep.error) : 'Bridge transaction failed');
    }
  } catch (error: any) {
    console.error('CCTP Bridge failed:', error);
    // Cleanup listeners
    (bridgeKit as any).removeAllListeners?.();

    onStateChange({
      step: 'FAILED',
      message: `Bridge failed: ${error?.message || 'CCTP attestation failure'}`,
      error: error?.message || 'CCTP failure',
      canRecover: true,
    });
  }
}
