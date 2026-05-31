'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Zap, ArrowRight, Check, Loader2, AlertTriangle, Info } from 'lucide-react';
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  USDC_ABI,
  AUTO_ESCROW_ADDRESS,
  AUTO_ESCROW_ABI,
  isValidAddress,
  truncateAddress,
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

type TxStep = 'idle' | 'approving' | 'approved' | 'creating' | 'confirmed';

export function EscrowForm() {
  const { address, isConnected } = useAccount();
  const { addToast, updateToast } = useToast();

  const [sellerAddress, setSellerAddress] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [txStep, setTxStep] = useState<TxStep>('idle');

  const { writeContractAsync } = useWriteContract();

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const formattedBalance = usdcBalance
    ? Number(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  // Validation
  const parsedAmount = amount ? Number(amount) : 0;
  const hasInsufficientBalance = usdcBalance
    ? parseUnits(amount || '0', USDC_DECIMALS) > (usdcBalance as bigint)
    : false;
  const isSellerValid = sellerAddress === '' || isValidAddress(sellerAddress);
  const isAgentValid = agentAddress === '' || isValidAddress(agentAddress);
  const canSubmit =
    isConnected &&
    parsedAmount > 0 &&
    isValidAddress(sellerAddress) &&
    isValidAddress(agentAddress) &&
    !hasInsufficientBalance &&
    txStep === 'idle';

  const handleCreateEscrow = useCallback(async () => {
    if (!canSubmit || !address) return;

    const parsedValue = parseUnits(amount, USDC_DECIMALS);
    let toastId = '';

    try {
      // Step 1: Approve
      setTxStep('approving');
      toastId = addToast({
        type: 'loading',
        title: 'Step 1/2: Approving USDC',
        message: `Requesting approval for ${Number(amount).toLocaleString()} USDC`,
      });

      const approveTxHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [AUTO_ESCROW_ADDRESS, parsedValue],
      });

      updateToast(toastId, {
        type: 'loading',
        title: 'Step 1/2: Waiting for confirmation',
        message: 'Approve transaction submitted...',
        txHash: approveTxHash,
      });

      // Wait for approve to be mined (critical fix for the race condition)
      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http(),
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });

      setTxStep('approved');
      updateToast(toastId, {
        type: 'success',
        title: 'Step 1/2: USDC Approved',
        message: 'Now creating escrow...',
        txHash: approveTxHash,
        duration: 3000,
      });

      // Step 2: Create Escrow
      setTxStep('creating');
      const createToastId = addToast({
        type: 'loading',
        title: 'Step 2/2: Creating Escrow',
        message: `Locking ${Number(amount).toLocaleString()} USDC with agent verification`,
      });

      const escrowTxHash = await writeContractAsync({
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: 'createSimpleEscrow',
        args: [sellerAddress as `0x${string}`, agentAddress as `0x${string}`, parsedValue],
      });

      await publicClient.waitForTransactionReceipt({ hash: escrowTxHash });

      setTxStep('confirmed');
      updateToast(createToastId, {
        type: 'success',
        title: 'Escrow Created Successfully',
        message: `${Number(amount).toLocaleString()} USDC locked. Agent can release upon delivery.`,
        txHash: escrowTxHash,
      });

      // Reset form
      setAmount('');
      setSellerAddress('');
      setAgentAddress('');
      setTimeout(() => setTxStep('idle'), 2000);
    } catch (err: unknown) {
      setTxStep('idle');
      const message = err instanceof Error ? err.message : 'Unknown error';

      // Parse common wallet errors
      let userMessage = message;
      if (message.includes('User rejected') || message.includes('user rejected')) {
        userMessage = 'Transaction was rejected in your wallet.';
      } else if (message.includes('insufficient funds')) {
        userMessage = 'Insufficient USDC balance or gas to complete this transaction.';
      } else if (message.includes('execution reverted')) {
        userMessage = 'Smart contract execution failed. Check approval amount and balances.';
      }

      if (toastId) {
        updateToast(toastId, {
          type: 'error',
          title: 'Transaction Failed',
          message: userMessage,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Transaction Failed',
          message: userMessage,
        });
      }
    }
  }, [canSubmit, address, amount, sellerAddress, agentAddress, writeContractAsync, addToast, updateToast]);

  const stepLabels: Record<TxStep, string> = {
    idle: 'Deploy Escrow',
    approving: 'Approving USDC...',
    approved: 'Approved ✓',
    creating: 'Creating Escrow...',
    confirmed: 'Escrow Created ✓',
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-4.5 h-4.5 text-cyan-400" />
          Agentic Escrow
        </h2>
      </div>
      <p className="text-gray-500 text-xs mb-5">
        Lock USDC into agent-verified smart escrow on Arc.
      </p>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </label>
            {isConnected && (
              <button
                onClick={() => {
                  if (usdcBalance) setAmount(formatUnits(usdcBalance as bigint, USDC_DECIMALS));
                }}
                className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors font-medium"
              >
                Max: ${formattedBalance}
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d{0,6}$/.test(val) || val === '') setAmount(val);
              }}
              className={`
                w-full bg-[var(--bg-input)] border rounded-xl px-4 py-3 text-lg font-mono
                focus:outline-none focus:ring-2 transition-all duration-200 placeholder-gray-700
                ${hasInsufficientBalance ? 'border-red-500/60 focus:ring-red-500/40' : 'border-gray-800/60 focus:ring-cyan-500/40'}
              `}
              placeholder="0.00"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-500 bg-cyan-950/40 px-2 py-0.5 rounded">
              USDC
            </div>
          </div>
          {hasInsufficientBalance && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Insufficient balance
            </p>
          )}
        </div>

        {/* Seller Address */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Seller Address
          </label>
          <input
            type="text"
            value={sellerAddress}
            onChange={(e) => setSellerAddress(e.target.value.trim())}
            className={`
              w-full bg-[var(--bg-input)] border rounded-xl px-4 py-2.5 text-sm font-mono
              focus:outline-none focus:ring-2 transition-all duration-200 placeholder-gray-700
              ${sellerAddress && !isSellerValid ? 'border-red-500/60 focus:ring-red-500/40' : 'border-gray-800/60 focus:ring-cyan-500/40'}
            `}
            placeholder="0x..."
          />
          {sellerAddress && !isSellerValid && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Invalid Ethereum address
            </p>
          )}
        </div>

        {/* Agent Address */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            AI Agent Address
            <span className="text-cyan-500/70 normal-case tracking-normal">(ERC-8183)</span>
          </label>
          <input
            type="text"
            value={agentAddress}
            onChange={(e) => setAgentAddress(e.target.value.trim())}
            className={`
              w-full bg-[var(--bg-input)] border rounded-xl px-4 py-2.5 text-sm font-mono
              focus:outline-none focus:ring-2 transition-all duration-200 placeholder-gray-700
              ${agentAddress && !isAgentValid ? 'border-red-500/60 focus:ring-red-500/40' : 'border-gray-800/60 focus:ring-cyan-500/40'}
            `}
            placeholder="0x..."
          />
          {agentAddress && !isAgentValid && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Invalid Ethereum address
            </p>
          )}
        </div>

        {/* Transaction Preview */}
        {canSubmit && (
          <div className="bg-gray-950/50 border border-gray-800/40 rounded-xl p-3 space-y-1.5 animate-fade-in">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium flex items-center gap-1">
              <Info className="w-3 h-3" />
              Transaction Preview
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">You lock</span>
              <span className="font-mono text-gray-200">{Number(amount).toLocaleString()} USDC</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Released to</span>
              <span className="font-mono text-gray-400">{truncateAddress(sellerAddress)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Verified by</span>
              <span className="font-mono text-gray-400">{truncateAddress(agentAddress)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Gas paid in</span>
              <span className="font-mono text-cyan-400">USDC (Native)</span>
            </div>
          </div>
        )}

        {/* Multi-Step Progress */}
        {txStep !== 'idle' && txStep !== 'confirmed' && (
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${txStep === 'approving' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {txStep === 'approving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </div>
            <span className="text-gray-400">Approve</span>
            <ArrowRight className="w-3 h-3 text-gray-600" />
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${txStep === 'creating' ? 'bg-cyan-500/20 text-cyan-400' : txStep === 'approved' ? 'bg-gray-800 text-gray-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {txStep === 'creating' ? <Loader2 className="w-3 h-3 animate-spin" /> : txStep === 'approved' ? '2' : <Check className="w-3 h-3" />}
            </div>
            <span className="text-gray-400">Lock Escrow</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleCreateEscrow}
          disabled={!canSubmit}
          className={`
            w-full mt-2 font-semibold py-3 rounded-xl transition-all duration-300 text-sm
            ${canSubmit
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[var(--glow-cyan)] hover:shadow-[var(--glow-cyan-strong)]'
              : 'bg-gray-800/60 text-gray-500 cursor-not-allowed'
            }
            flex items-center justify-center gap-2
          `}
        >
          {txStep !== 'idle' && txStep !== 'confirmed' && <Loader2 className="w-4 h-4 animate-spin" />}
          {txStep === 'confirmed' && <Check className="w-4 h-4" />}
          {stepLabels[txStep]}
        </button>

        {/* Not Connected */}
        {!isConnected && (
          <p className="text-center text-xs text-gray-600 mt-2">
            Connect your wallet to create an escrow
          </p>
        )}
      </div>
    </div>
  );
}
