import { parseUnits } from 'viem';

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

/**
 * Poll Circle Attestation API for CCTP signature
 */
export async function pollCircleAttestation(messageHash: string): Promise<string> {
  const sandboxUrl = `https://iris-api-sandbox.circle.com/attestations/${messageHash}`;
  
  // Try calling real sandbox API
  try {
    const response = await fetch(sandboxUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'complete' && data.attestation) {
        return data.attestation;
      }
    }
  } catch (error) {
    console.warn('Sandbox attestation service poll failed, falling back to simulator:', error);
  }

  // Fallback simulator delay
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * Executes a simulated or real CCTP bridge transaction from Sepolia to Arc Testnet
 */
export async function executeCctpBridge(options: {
  amount: string;
  userAddress: string;
  onStateChange: (state: BridgeState) => void;
  onSuccess: () => void;
}) {
  const { amount, userAddress, onStateChange, onSuccess } = options;

  try {
    // --- STEP 1: BURN ---
    onStateChange({
      step: 'BURNING',
      message: `Approving and burning ${amount} USDC on Ethereum Sepolia...`,
    });

    // Simulate burn delay
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const burnTxHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
    
    // Simulate transaction event parse to get message hash
    const messageHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    // Deduct Sepolia balance
    adjustSepoliaUSDCBalance(-parseFloat(amount));

    onStateChange({
      step: 'ATTESTING',
      message: 'USDC burned. Polling Circle Attestation service (Ethereum Sepolia ➡️ Arc Testnet)...',
      txHash: burnTxHash,
      messageHash: messageHash,
    });

    // --- STEP 2: POLL ATTESTATION ---
    const attestationSig = await pollCircleAttestation(messageHash);

    onStateChange({
      step: 'MINTING',
      message: 'Attestation signature retrieved. Triggering receiveMessage() on Arc Testnet...',
      txHash: burnTxHash,
      messageHash,
      attestation: attestationSig,
    });

    // --- STEP 3: MINT ON ARC ---
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    const mintTxHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    onStateChange({
      step: 'DONE',
      message: `Successfully bridged ${amount} USDC. Mint transaction confirmed on Arc Testnet.`,
      txHash: mintTxHash,
    });

    onSuccess();
  } catch (error: any) {
    console.error('CCTP Bridge failed:', error);
    onStateChange({
      step: 'FAILED',
      message: `Bridge failed: ${error?.message || 'Attestation retrieval timeout'}`,
      error: error?.message || 'CCTP attestation failure',
      canRecover: true,
    });
  }
}
