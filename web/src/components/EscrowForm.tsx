'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Zap, ArrowRight, Check, Loader2, AlertTriangle, Info, Plus, Trash2, Shield } from 'lucide-react';
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  USDC_ABI,
  AUTO_ESCROW_ADDRESS,
  AUTO_ESCROW_ABI,
  EURC_ADDRESS,
  isValidAddress,
  truncateAddress,
  DISPUTE_DAO_ADDRESS,
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import { STATIC_AGENTS } from './AgentDirectory';
import { executeUnifiedFunding, BridgeStatus, BridgeStep } from '@/lib/appKitHelper';
import { Layers } from 'lucide-react';

type TxStep = 'idle' | 'approving' | 'approved' | 'creating' | 'confirmed';

interface EscrowFormProps {
  agentAddress: string;
  setAgentAddress: (address: string) => void;
}

export function EscrowForm({ agentAddress, setAgentAddress }: EscrowFormProps) {
  const { address, isConnected, connector } = useAccount();
  const { addToast, updateToast } = useToast();

  const [jobDescription, setJobDescription] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [milestones, setMilestones] = useState<{ description: string; amount: string }[]>([
    { description: 'Deliverable 1', amount: '' },
  ]);
  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [sourceChain, setSourceChain] = useState<'arc-testnet' | 'base-sepolia' | 'ethereum-sepolia' | 'solana-devnet'>('arc-testnet');
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [settlementCurrency, setSettlementCurrency] = useState<'USDC' | 'EURC'>('USDC');

  const [isMultiAgent, setIsMultiAgent] = useState(false);
  const [humanArbiter, setHumanArbiter] = useState(DISPUTE_DAO_ADDRESS);
  const DEFAULT_MULTI_AGENTS = [
    "0x1087E71CD83101adF154d8215522EadA51Bf891E",
    "0xe6A13B821A58d28e7522EadA51Bf891E1087E71C",
    "0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39Fc72d"
  ];

  const { writeContractAsync } = useWriteContract();

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  // Calculate total amount
  const totalAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const parsedValue = parseUnits(totalAmount.toFixed(6), USDC_DECIMALS);

  const formattedBalance = usdcBalance
    ? Number(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  const hasInsufficientBalance = usdcBalance
    ? parsedValue > (usdcBalance as bigint)
    : false;

  const isSellerValid = sellerAddress === '' || isValidAddress(sellerAddress);
  const isAgentValid = agentAddress === '' || isValidAddress(agentAddress);
  const isArbiterValid = humanArbiter === '' || isValidAddress(humanArbiter);

  // Validate milestones
  const areMilestonesValid = milestones.every(
    (m) => m.description.trim() !== '' && Number(m.amount) > 0
  );

  const canSubmit =
    isConnected &&
    totalAmount > 0 &&
    areMilestonesValid &&
    isValidAddress(sellerAddress) &&
    (isMultiAgent ? (DEFAULT_MULTI_AGENTS.every(isValidAddress) && isValidAddress(humanArbiter)) : isValidAddress(agentAddress)) &&
    (sourceChain !== 'arc-testnet' || !hasInsufficientBalance) &&
    txStep === 'idle' &&
    (!bridgeStatus || bridgeStatus.step === 'FAILED');

  const addMilestone = () => {
    setMilestones([...milestones, { description: `Deliverable ${milestones.length + 1}`, amount: '' }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length === 1) return;
    const next = [...milestones];
    next.splice(index, 1);
    setMilestones(next);
  };

  const handleMilestoneChange = (index: number, field: 'description' | 'amount', value: string) => {
    const next = [...milestones];
    if (field === 'amount') {
      if (/^\d*\.?\d{0,6}$/.test(value) || value === '') {
        next[index].amount = value;
      }
    } else {
      next[index].description = value;
    }
    setMilestones(next);
  };

  const runUnifiedFunding = useCallback(async () => {
    if (!address) return;
    setTxStep('creating');

    // Pre-screening compliance checks
    try {
      const sellerCheck = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: sellerAddress }),
      }).then(r => r.json());

      if (sellerCheck.blocked) {
        setTxStep('idle');
        setBridgeStatus({
          step: 'FAILED',
          message: 'The seller address failed compliance screening and is blocked.',
          error: 'Compliance Check Failed',
        });
        return;
      }

      if (!isMultiAgent && agentAddress) {
        const agentCheck = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: agentAddress }),
        }).then(r => r.json());
        if (agentCheck.blocked) {
          setTxStep('idle');
          setBridgeStatus({
            step: 'FAILED',
            message: 'The AI Agent address failed compliance screening and is blocked.',
            error: 'Compliance Check Failed',
          });
          return;
        }
      }

      if (isMultiAgent && humanArbiter) {
        const arbiterCheck = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: humanArbiter }),
        }).then(r => r.json());
        if (arbiterCheck.blocked) {
          setTxStep('idle');
          setBridgeStatus({
            step: 'FAILED',
            message: 'The fallback human arbiter address failed compliance screening and is blocked.',
            error: 'Compliance Check Failed',
          });
          return;
        }
      }
    } catch (e) {
      console.error('Compliance pre-screening failed:', e);
    }

    const jobId = Math.floor(Math.random() * 1000) + 1;

    await executeUnifiedFunding({
      sourceChain,
      amount: totalAmount.toString(),
      userAddress: address,
      jobId,
      onStateChange: async (status) => {
        setBridgeStatus(status);
        if (status.step === 'LOCKING') {
          try {
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60);
            const descs = milestones.map((m) => m.description);
            const amounts = milestones.map((m) => parseUnits(Number(m.amount).toFixed(6), USDC_DECIMALS));

            const isEURC = settlementCurrency === 'EURC';
            const escrowTxHash = await writeContractAsync({
              address: AUTO_ESCROW_ADDRESS,
              abi: AUTO_ESCROW_ABI,
              functionName: isMultiAgent ? 'createEscrowWithMultiAgent' : (isEURC ? 'createEscrowWithFX' : 'createEscrow'),
              args: isMultiAgent ? [
                sellerAddress as `0x${string}`,
                DEFAULT_MULTI_AGENTS as `0x${string}`[],
                deadline,
                jobDescription || 'Agentic Escrow Job',
                descs,
                amounts,
                humanArbiter as `0x${string}`
              ] : (isEURC ? [
                sellerAddress as `0x${string}`,
                agentAddress as `0x${string}`,
                deadline,
                jobDescription || 'Agentic Escrow Job',
                descs,
                amounts,
                EURC_ADDRESS,
              ] : [
                sellerAddress as `0x${string}`,
                agentAddress as `0x${string}`,
                deadline,
                jobDescription || 'Agentic Escrow Job',
                descs,
                amounts,
              ]),
            });

            const { createPublicClient, http } = await import('viem');
            const { arcTestnet } = await import('@/components/Web3Provider');
            const publicClient = createPublicClient({
              chain: arcTestnet,
              transport: http(),
            });
            await publicClient.waitForTransactionReceipt({ hash: escrowTxHash });

            setTxStep('confirmed');
            setBridgeStatus({
              step: 'COMPLETED',
              message: `Escrow successfully funded & locked. Transaction confirmed on ArcScan!`,
              txHash: escrowTxHash,
            });

            setJobDescription('');
            setSellerAddress('');
            setAgentAddress('');
            setMilestones([{ description: 'Deliverable 1', amount: '' }]);
            setTimeout(() => {
              setTxStep('idle');
              setBridgeStatus(null);
            }, 4000);
          } catch (e: any) {
            console.error('Contract execution failed:', e);
            setTxStep('idle');
            setBridgeStatus({
              step: 'FAILED',
              message: `Contract lock failed: ${e.message || 'Transaction rejected'}`,
              error: e.message,
              canRecover: true,
            });
          }
        }
      },
      onSuccess: () => {}
    });
  }, [
    address,
    sourceChain,
    totalAmount,
    milestones,
    sellerAddress,
    agentAddress,
    jobDescription,
    settlementCurrency,
    writeContractAsync,
    isMultiAgent,
    humanArbiter,
    DEFAULT_MULTI_AGENTS,
  ]);

  const handleRecoverLock = useCallback(async () => {
    if (!address) return;
    try {
      setTxStep('creating');

      // Compliance check before recovering lock
      const sellerCheck = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: sellerAddress }),
      }).then(r => r.json());

      if (sellerCheck.blocked) {
        setTxStep('idle');
        setBridgeStatus({
          step: 'FAILED',
          message: 'The seller address failed compliance screening and is blocked.',
          error: 'Compliance Check Failed',
        });
        return;
      }

      if (!isMultiAgent && agentAddress) {
        const agentCheck = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: agentAddress }),
        }).then(r => r.json());
        if (agentCheck.blocked) {
          setTxStep('idle');
          setBridgeStatus({
            step: 'FAILED',
            message: 'The AI Agent address failed compliance screening and is blocked.',
            error: 'Compliance Check Failed',
          });
          return;
        }
      }

      if (isMultiAgent && humanArbiter) {
        const arbiterCheck = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: humanArbiter }),
        }).then(r => r.json());
        if (arbiterCheck.blocked) {
          setTxStep('idle');
          setBridgeStatus({
            step: 'FAILED',
            message: 'The fallback human arbiter address failed compliance screening and is blocked.',
            error: 'Compliance Check Failed',
          });
          return;
        }
      }
      
      setBridgeStatus({
        step: 'LOCKING',
        message: 'Resuming deposit. Submitting fund() transaction to AutoEscrowv3 contract...',
      });
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60);
      const descs = milestones.map((m) => m.description);
      const amounts = milestones.map((m) => parseUnits(Number(m.amount).toFixed(6), USDC_DECIMALS));

      const isEURC = settlementCurrency === 'EURC';
      const escrowTxHash = await writeContractAsync({
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: isMultiAgent ? 'createEscrowWithMultiAgent' : (isEURC ? 'createEscrowWithFX' : 'createEscrow'),
        args: isMultiAgent ? [
          sellerAddress as `0x${string}`,
          DEFAULT_MULTI_AGENTS as `0x${string}`[],
          deadline,
          jobDescription || 'Agentic Escrow Job',
          descs,
          amounts,
          humanArbiter as `0x${string}`
        ] : (isEURC ? [
          sellerAddress as `0x${string}`,
          agentAddress as `0x${string}`,
          deadline,
          jobDescription || 'Agentic Escrow Job',
          descs,
          amounts,
          EURC_ADDRESS,
        ] : [
          sellerAddress as `0x${string}`,
          agentAddress as `0x${string}`,
          deadline,
          jobDescription || 'Agentic Escrow Job',
          descs,
          amounts,
        ]),
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http(),
      });
      await publicClient.waitForTransactionReceipt({ hash: escrowTxHash });

      setTxStep('confirmed');
      setBridgeStatus({
        step: 'COMPLETED',
        message: `Escrow successfully funded & locked. Transaction confirmed on ArcScan!`,
        txHash: escrowTxHash,
      });

      setJobDescription('');
      setSellerAddress('');
      setAgentAddress('');
      setMilestones([{ description: 'Deliverable 1', amount: '' }]);
      setTimeout(() => {
        setTxStep('idle');
        setBridgeStatus(null);
      }, 4000);
    } catch (e: any) {
      console.error('Recovery failed:', e);
      setTxStep('idle');
      setBridgeStatus({
        step: 'FAILED',
        message: `Contract lock failed: ${e.message || 'Transaction rejected'}`,
        error: e.message,
        canRecover: true,
      });
    }
  }, [
    address,
    milestones,
    sellerAddress,
    agentAddress,
    jobDescription,
    settlementCurrency,
    writeContractAsync,
    isMultiAgent,
    humanArbiter,
    DEFAULT_MULTI_AGENTS,
  ]);

  const handleCreateEscrow = useCallback(async () => {
    if (!canSubmit || !address) return;

    if (sourceChain !== 'arc-testnet') {
      runUnifiedFunding();
      return;
    }

    // Compliance checks
    try {
      const sellerCheck = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: sellerAddress }),
      }).then(r => r.json());

      if (sellerCheck.blocked) {
        addToast({
          type: 'error',
          title: 'Compliance Restriction',
          message: 'The seller address failed compliance screening and is blocked.',
        });
        return;
      }

      if (!isMultiAgent && agentAddress) {
        const agentCheck = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: agentAddress }),
        }).then(r => r.json());
        if (agentCheck.blocked) {
          addToast({
            type: 'error',
            title: 'Compliance Restriction',
            message: 'The AI Agent address failed compliance screening and is blocked.',
          });
          return;
        }
      }

      if (isMultiAgent && humanArbiter) {
        const arbiterCheck = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: humanArbiter }),
        }).then(r => r.json());
        if (arbiterCheck.blocked) {
          addToast({
            type: 'error',
            title: 'Compliance Restriction',
            message: 'The fallback human arbiter address failed compliance screening and is blocked.',
          });
          return;
        }
      }
    } catch (e) {
      console.error('Compliance screening failed:', e);
    }

    let toastId = '';

    try {
      // Step 1: Approve
      setTxStep('approving');
      toastId = addToast({
        type: 'loading',
        title: 'Step 1/2: Approving USDC',
        message: `Requesting approval for ${totalAmount.toLocaleString()} USDC`,
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

      // Wait for approve to be mined
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
        message: `Locking ${totalAmount.toLocaleString()} USDC with agent verification`,
      });

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60); // 14 days deadline
      const descs = milestones.map((m) => m.description);
      const amounts = milestones.map((m) => parseUnits(Number(m.amount).toFixed(6), USDC_DECIMALS));

      const isEURC = settlementCurrency === 'EURC';
      const escrowTxHash = await writeContractAsync({
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: isMultiAgent ? 'createEscrowWithMultiAgent' : (isEURC ? 'createEscrowWithFX' : 'createEscrow'),
        args: isMultiAgent ? [
          sellerAddress as `0x${string}`,
          DEFAULT_MULTI_AGENTS as `0x${string}`[],
          deadline,
          jobDescription || 'Agentic Escrow Job',
          descs,
          amounts,
          humanArbiter as `0x${string}`
        ] : (isEURC ? [
          sellerAddress as `0x${string}`,
          agentAddress as `0x${string}`,
          deadline,
          jobDescription || 'Agentic Escrow Job',
          descs,
          amounts,
          EURC_ADDRESS,
        ] : [
          sellerAddress as `0x${string}`,
          agentAddress as `0x${string}`,
          deadline,
          jobDescription || 'Agentic Escrow Job',
          descs,
          amounts,
        ]),
      });

      await publicClient.waitForTransactionReceipt({ hash: escrowTxHash });

      setTxStep('confirmed');
      updateToast(createToastId, {
        type: 'success',
        title: 'Escrow Created Successfully',
        message: `${totalAmount.toLocaleString()} USDC locked across ${milestones.length} deliverables.`,
        txHash: escrowTxHash,
      });

      // Reset form
      setJobDescription('');
      setSellerAddress('');
      setAgentAddress('');
      setMilestones([{ description: 'Deliverable 1', amount: '' }]);
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
  }, [
    canSubmit,
    address,
    totalAmount,
    parsedValue,
    milestones,
    sellerAddress,
    agentAddress,
    jobDescription,
    sourceChain,
    runUnifiedFunding,
    settlementCurrency,
    writeContractAsync,
    addToast,
    updateToast,
    isMultiAgent,
    humanArbiter,
    DEFAULT_MULTI_AGENTS,
  ]);

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
        Lock USDC into an ERC-8183 Job Settlement contract with customizable deliverables.
      </p>

      <div className="space-y-4">
        {/* Job Title / PO Reference */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Job Title / PO Reference
          </label>
          <input
            type="text"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all duration-200 placeholder-gray-700"
            placeholder="e.g. Web Development or PO-9942"
          />
        </div>

        {/* Deliverables / Milestones */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              Deliverables & Budget Split
            </label>
            <button
              type="button"
              onClick={addMilestone}
              className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Deliverable
            </button>
          </div>

          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
            {milestones.map((m, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={m.description}
                  onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                  className="flex-1 bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all placeholder-gray-700"
                  placeholder={`Deliverable ${idx + 1} description`}
                />
                <div className="relative w-28">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={m.amount}
                    onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl pl-3 pr-8 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all placeholder-gray-700"
                    placeholder="0.00"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500">
                    USDC
                  </span>
                </div>
                {milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMilestone(idx)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Calculated Total Amount */}
        <div className="bg-gray-950/40 border border-gray-800/50 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs text-gray-400 font-medium">Computed Budget</span>
          <div className="flex flex-col items-end">
            <span className="font-mono text-base font-bold text-cyan-400">
              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC
            </span>
            {isConnected && (
              <span className="text-[10px] text-gray-600 mt-0.5">
                Balance: ${formattedBalance}
              </span>
            )}
          </div>
        </div>
        {hasInsufficientBalance && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Insufficient balance for total budget
          </p>
        )}

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

        {/* Settlement Currency Select */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Settlement Currency
            <span className="text-cyan-500/70 normal-case tracking-normal">(StableFX Cross-Border Swap)</span>
          </label>
          <select
            value={settlementCurrency}
            onChange={(e) => setSettlementCurrency(e.target.value as 'USDC' | 'EURC')}
            className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all duration-200"
          >
            <option value="USDC">USDC (USD Stablecoin)</option>
            <option value="EURC">EURC (EUR Stablecoin via StableFX Swap)</option>
          </select>
        </div>

        {/* Verification Architecture Selection */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Verification Model
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsMultiAgent(false)}
              className={`px-3 py-2 text-xs rounded-xl border font-medium transition-all flex flex-col items-center gap-1 ${
                !isMultiAgent
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                  : 'bg-gray-900/40 border-gray-800/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>Single AI Agent</span>
              <span className="text-[8px] font-normal text-gray-500">Standard verification</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMultiAgent(true)}
              className={`px-3 py-2 text-xs rounded-xl border font-medium transition-all flex flex-col items-center gap-1 ${
                isMultiAgent
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                  : 'bg-gray-900/40 border-gray-800/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>Multi-Agent Consensus</span>
              <span className="text-[8px] font-normal text-gray-500">2-of-3 + Fallback DAO</span>
            </button>
          </div>
        </div>

        {isMultiAgent ? (
          <div className="space-y-3 bg-purple-950/10 border border-purple-800/30 rounded-xl p-3.5 animate-fade-in">
            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold mb-1">
              <Shield className="w-3.5 h-3.5" />
              Consensus Node Setup
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
              This job will be verified using a 3-agent Byzantine Fault Tolerance consensus. Two or more agents must sign off on deliverables to release funds.
            </p>
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Consensus Fleet:</span>
              {DEFAULT_MULTI_AGENTS.map((agent, i) => (
                <div key={i} className="flex justify-between items-center text-[11px] font-mono bg-gray-950/40 px-2.5 py-1.5 rounded border border-gray-800/40 text-gray-300">
                  <span>Agent #{i+1}: {truncateAddress(agent)}</span>
                  <span className="text-[9px] px-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-sans">Active Node</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Human Fallback Arbiter
              </label>
              <input
                type="text"
                value={humanArbiter}
                onChange={(e) => setHumanArbiter(e.target.value.trim())}
                className={`
                  w-full bg-[var(--bg-input)] border rounded-xl px-3.5 py-2 text-xs font-mono
                  focus:outline-none focus:ring-2 transition-all duration-200 placeholder-gray-700
                  ${humanArbiter && !isArbiterValid ? 'border-red-500/60 focus:ring-red-500/40' : 'border-gray-800/60 focus:ring-purple-500/40'}
                `}
                placeholder="0x..."
              />
              {humanArbiter && !isArbiterValid && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Invalid Ethereum address
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Agent Selection */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Select Verification AI Agent
                <span className="text-cyan-500/70 normal-case tracking-normal">(ERC-8004 Registry)</span>
              </label>
              <select
                value={STATIC_AGENTS.some(a => a.address === agentAddress) ? agentAddress : agentAddress ? 'custom' : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setAgentAddress('');
                  } else {
                    setAgentAddress(val);
                  }
                }}
                className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all duration-200"
              >
                <option value="">-- Choose Agent --</option>
                {STATIC_AGENTS.map((agent) => (
                  <option key={agent.address} value={agent.address}>
                    {agent.defaultName} ({truncateAddress(agent.address, 4)}) - {agent.fee}
                  </option>
                ))}
                <option value="custom">-- Custom Agent Address --</option>
              </select>
            </div>

            {/* Custom Agent Address Input */}
            {(!STATIC_AGENTS.some(a => a.address === agentAddress) || agentAddress === '') ? (
              <div className="animate-fade-in">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Custom AI Agent Address
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
            ) : null}
          </>
        )}

        {/* Source Funding Chain Selection */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Source Funding Chain
            <span className="text-cyan-500/70 normal-case tracking-normal">(Circle App Kit)</span>
          </label>
          <select
            value={sourceChain}
            onChange={(e) => setSourceChain(e.target.value as any)}
            className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all duration-200"
          >
            <option value="arc-testnet">⚡ Arc Testnet (Native Gasless)</option>
            <option value="base-sepolia">🔵 Base Sepolia (Unified Balance)</option>
            <option value="ethereum-sepolia">♦️ Ethereum Sepolia (Unified Balance)</option>
            <option value="solana-devnet">☀️ Solana Devnet (Unified Balance)</option>
          </select>
        </div>

        {/* Transaction Preview */}
        {canSubmit && (
          <div className="bg-gray-950/50 border border-gray-800/40 rounded-xl p-3 space-y-1.5 animate-fade-in">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium flex items-center gap-1">
              <Info className="w-3 h-3" />
              Transaction Preview
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total Escrow Budget</span>
              <span className="font-mono text-gray-200">{totalAmount.toLocaleString()} USDC</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Deliverables</span>
              <span className="font-mono text-gray-400">{milestones.length} split targets</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Released to</span>
              <span className="font-mono text-gray-400">{truncateAddress(sellerAddress)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Evaluated by</span>
              <span className="font-mono text-gray-400">
                {isMultiAgent ? 'Multi-Agent Consensus (3 Nodes)' : truncateAddress(agentAddress)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Gas Fee</span>
              {connector?.id === 'circle' || sourceChain !== 'arc-testnet' ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-emerald-400 font-semibold">$0.00</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Sponsored
                  </span>
                </div>
              ) : (
                <span className="font-mono text-cyan-400">USDC (Native)</span>
              )}
            </div>
            {sourceChain !== 'arc-testnet' && (
              <div className="pt-1.5 border-t border-gray-800/20 flex gap-1.5 items-center text-[10px] text-gray-500">
                <Layers className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>USDC will be automatically bridged via Circle CCTP.</span>
              </div>
            )}
          </div>
        )}

        {/* Real-time Status Tracker for Bridge Operations */}
        {bridgeStatus && (
          <div className="bg-gray-950/70 border border-gray-800/80 rounded-xl p-4 space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                Unified Balance Routing
              </h4>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {bridgeStatus.step}
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div className="relative flex justify-between items-center px-1">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-800" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{
                  width:
                    bridgeStatus.step === 'DEPOSITING'
                      ? '15%'
                      : bridgeStatus.step === 'BRIDGING'
                      ? '50%'
                      : bridgeStatus.step === 'LOCKING'
                      ? '85%'
                      : bridgeStatus.step === 'COMPLETED'
                      ? '100%'
                      : '0%',
                }}
              />

              {[
                { label: 'Deposit', step: 'DEPOSITING' },
                { label: 'Bridge', step: 'BRIDGING' },
                { label: 'Lock', step: 'LOCKING' },
              ].map((item, idx) => {
                const stepOrder = ['DEPOSITING', 'BRIDGING', 'LOCKING', 'COMPLETED'];
                const currentIdx = stepOrder.indexOf(bridgeStatus.step);
                const itemIdx = stepOrder.indexOf(item.step);
                const isPassed = currentIdx > itemIdx;
                const isCurrent = currentIdx === itemIdx;

                return (
                  <div key={item.label} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300 ${
                        isPassed
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : isCurrent
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                          : 'bg-gray-900 border-gray-850 text-gray-600'
                      }`}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-[9px] mt-1 font-medium transition-colors duration-300 ${
                        isCurrent ? 'text-cyan-400' : isPassed ? 'text-emerald-400' : 'text-gray-600'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-sans border-t border-gray-900 pt-2 text-center">
              {bridgeStatus.message}
            </p>

            {bridgeStatus.step === 'FAILED' && bridgeStatus.canRecover && (
              <div className="pt-2 border-t border-red-950/20 space-y-2">
                <p className="text-[10px] text-red-400 leading-normal">
                  The bridge finished but the final contract call failed or was rejected. You can safely retry without re-bridging.
                </p>
                <button
                  onClick={handleRecoverLock}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all duration-200"
                >
                  Retry Lock Escrow
                </button>
              </div>
            )}
          </div>
        )}

        {/* Multi-Step Progress (Fallback for native) */}
        {sourceChain === 'arc-testnet' && txStep !== 'idle' && txStep !== 'confirmed' && (
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

