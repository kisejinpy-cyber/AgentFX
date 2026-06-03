'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Inbox,
  Loader2,
  AlertTriangle,
  Shield,
  Timer,
  Target,
} from 'lucide-react';
import {
  AUTO_ESCROW_ADDRESS,
  AUTO_ESCROW_ABI,
  USDC_DECIMALS,
  EURC_ADDRESS,
  truncateAddress,
  explorerAddressUrl,
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

// EscrowState enum matches Solidity: ACTIVE=0, RELEASED=1, REFUNDED=2, DISPUTED=3, RESOLVED=4
const STATE_LABELS: Record<number, { label: string; icon: React.ElementType; color: string }> = {
  0: { label: 'Active', icon: Clock, color: 'text-amber-400' },
  1: { label: 'Released', icon: CheckCircle, color: 'text-emerald-400' },
  2: { label: 'Refunded', icon: XCircle, color: 'text-red-400' },
  3: { label: 'Disputed', icon: AlertTriangle, color: 'text-orange-400' },
  4: { label: 'Resolved', icon: Shield, color: 'text-blue-400' },
};

interface EscrowData {
  id: number;
  buyer: string;
  seller: string;
  agent: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  deadline: bigint;
  state: number;
  createdAt: bigint;
  invoiceRef: string;
  milestoneCount: number;
  settlementToken: string;
}

function StatusBadge({ state }: { state: number }) {
  const info = STATE_LABELS[state] || STATE_LABELS[0];
  const Icon = info.icon;
  return (
    <span className={`flex items-center gap-1.5 ${info.color} text-xs`}>
      <Icon className="w-3.5 h-3.5" />
      {info.label}
    </span>
  );
}

function DeadlineInfo({ deadline, state }: { deadline: bigint; state: number }) {
  if (state !== 0) return null; // Only show for active escrows
  const deadlineDate = new Date(Number(deadline) * 1000);
  const now = new Date();
  const isExpired = deadlineDate < now;
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <span className={`text-[10px] font-mono flex items-center gap-1 ${isExpired ? 'text-red-400' : daysLeft <= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
      <Timer className="w-2.5 h-2.5" />
      {isExpired ? 'Expired' : `${daysLeft}d left`}
    </span>
  );
}

function EscrowRow({ escrow }: { escrow: EscrowData }) {
  const { address, connector } = useAccount();
  const { addToast, updateToast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const [acting, setActing] = useState(false);

  const isActive = escrow.state === 0;
  const isAgent = address?.toLowerCase() === escrow.agent.toLowerCase();
  const isBuyer = address?.toLowerCase() === escrow.buyer.toLowerCase();
  const isSeller = address?.toLowerCase() === escrow.seller.toLowerCase();
  const canRelease = isActive && (isAgent || isBuyer);
  const canRefund = isActive && (isAgent || isSeller);
  const canDispute = isActive && (isBuyer || isSeller);
  const isExpired = isActive && Number(escrow.deadline) * 1000 < Date.now();
  const canClaimTimeout = isActive && isExpired && isBuyer;

  const isEURC = escrow.settlementToken?.toLowerCase() === EURC_ADDRESS.toLowerCase();
  const currencyLabel = isEURC ? 'EURC' : 'USDC';

  const formattedAmount = Number(formatUnits(escrow.totalAmount, USDC_DECIMALS)).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const releasedPct = escrow.totalAmount > BigInt(0)
    ? Number((escrow.releasedAmount * BigInt(100)) / escrow.totalAmount)
    : 0;

  const handleAction = useCallback(async (action: 'releaseAll' | 'refundEscrow' | 'claimTimeoutRefund') => {
    setActing(true);
    const labels: Record<string, string> = {
      releaseAll: 'Releasing Escrow',
      refundEscrow: 'Refunding Escrow',
      claimTimeoutRefund: 'Claiming Timeout Refund',
    };
    const toastId = addToast({ type: 'loading', title: labels[action], message: `Processing escrow #${escrow.id}...` });

    try {
      const txHash = await writeContractAsync({
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: action,
        args: [BigInt(escrow.id)],
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      updateToast(toastId, {
        type: 'success',
        title: action === 'releaseAll' ? 'Escrow Released' : 'Escrow Refunded',
        message: `${isEURC ? '€' : '$'}${formattedAmount} ${currencyLabel} ${action === 'releaseAll' ? 'sent to seller' : 'returned to buyer'}`,
        txHash,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      let userMessage = message;
      if (message.includes('User rejected') || message.includes('user rejected')) userMessage = 'Transaction was rejected.';
      else if (message.includes('not active')) userMessage = 'Escrow is no longer active.';
      updateToast(toastId, { type: 'error', title: 'Action Failed', message: userMessage });
    } finally {
      setActing(false);
    }
  }, [escrow, writeContractAsync, addToast, updateToast, formattedAmount]);

  const handleDispute = useCallback(async () => {
    const reason = prompt('Please enter the reason for the dispute:');
    if (!reason) return;

    setActing(true);
    const toastId = addToast({ type: 'loading', title: 'Filing Dispute', message: `Filing dispute for escrow #${escrow.id}...` });

    try {
      const txHash = await writeContractAsync({
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: 'disputeJob',
        args: [BigInt(escrow.id), reason],
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      updateToast(toastId, {
        type: 'success',
        title: 'Dispute Filed',
        message: `Escrow #${escrow.id} has been moved to disputed state.`,
        txHash,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      updateToast(toastId, { type: 'error', title: 'Action Failed', message });
    } finally {
      setActing(false);
    }
  }, [escrow, writeContractAsync, addToast, updateToast]);

  return (
    <tr className="hover:bg-gray-800/15 transition-colors duration-150 group">
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-gray-400">#{escrow.id}</span>
          {escrow.invoiceRef && (
            <span className="text-[9px] text-gray-600 truncate max-w-[60px]" title={escrow.invoiceRef}>
              {escrow.invoiceRef}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <a href={explorerAddressUrl(escrow.seller)} target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs text-gray-300 hover:text-cyan-400 transition-colors">
              {truncateAddress(escrow.seller)}
            </a>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ArrowDownLeft className="w-3 h-3 text-blue-400" />
            <span className="font-mono text-[10px] text-gray-500">{truncateAddress(escrow.buyer)}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <a href={explorerAddressUrl(escrow.agent)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-800/30 hover:border-blue-700/50 transition-colors">
          {truncateAddress(escrow.agent, 5)}
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm text-gray-200">{isEURC ? '€' : '$'}{formattedAmount}</span>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isEURC ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
              {currencyLabel}
            </span>
          </div>
          {releasedPct > 0 && releasedPct < 100 && (
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${releasedPct}%` }} />
              </div>
              <span className="text-[9px] text-gray-500">{releasedPct}%</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <StatusBadge state={escrow.state} />
          <DeadlineInfo deadline={escrow.deadline} state={escrow.state} />
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-1">
          {escrow.milestoneCount > 1 && (
            <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
              <Target className="w-2.5 h-2.5" />{escrow.milestoneCount} milestones
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        {isActive ? (
          <div className="flex gap-1.5 flex-wrap">
            {canRelease && (
              <button onClick={() => handleAction('releaseAll')} disabled={acting}
                className="text-[10px] bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded border border-emerald-800/30 transition-all disabled:opacity-50">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Release'}
              </button>
            )}
            {canRefund && !isExpired && (
              <button onClick={() => handleAction('refundEscrow')} disabled={acting}
                className="text-[10px] bg-red-900/20 hover:bg-red-900/40 text-red-400 px-2 py-1 rounded border border-red-800/30 transition-all disabled:opacity-50">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refund'}
              </button>
            )}
            {canClaimTimeout && (
              <button onClick={() => handleAction('claimTimeoutRefund')} disabled={acting}
                className="text-[10px] bg-amber-900/20 hover:bg-amber-900/40 text-amber-400 px-2 py-1 rounded border border-amber-800/30 transition-all disabled:opacity-50">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Timeout Refund'}
              </button>
            )}
            {canDispute && (
              <button onClick={handleDispute} disabled={acting}
                className="text-[10px] bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 px-2 py-1 rounded border border-orange-800/30 transition-all disabled:opacity-50">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Dispute'}
              </button>
            )}
            {isActive && (
              <button onClick={async () => {
                setActing(true);
                const toastId = addToast({ type: 'loading', title: 'AI Verification', message: 'Agent analyzing off-chain delivery data...' });
                try {
                  // Phase 1: Try endpoint without payment header
                  let res = await fetch('/api/agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'verify', escrowId: escrow.id, userAddress: address })
                  });

                  // Phase 2: Intercept HTTP 402 Payment Required
                  if (res.status === 402) {
                    const cost = res.headers.get('X-402-Payment-Cost') || '0.00001';
                    const recipient = res.headers.get('X-402-Payment-Recipient') || 'Agent node';
                    
                    // Show micro-billing toast
                    addToast({
                      type: 'loading',
                      title: 'x402 Micropayment Required',
                      message: `Paying ${cost} USDC to agent operator (${truncateAddress(recipient, 4)})...`
                    });

                    // Simulate signing off-chain EIP-3009 transfer authorization
                    await new Promise(r => setTimeout(r, 1200));

                    // Retry request with signed micropayment header proof
                    res = await fetch('/api/agent', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-402-Payment-Authorization': 'Bearer mock-eip3009-sig-channel-proof'
                      },
                      body: JSON.stringify({ action: 'verify', escrowId: escrow.id, userAddress: address })
                    });
                  }

                  const data = await res.json();
                  if (!res.ok) throw new Error(data.message || data.error);
                  
                  updateToast(toastId, { type: 'success', title: 'Agent Released Escrow', message: `Auto-verified and released by AI Agent`, txHash: data.txHash });
                } catch (e: any) {
                  updateToast(toastId, { type: 'error', title: 'AI Verification Failed', message: e.message || 'Nanopayment error' });
                }
                setActing(false);
              }} disabled={acting}
                className="text-[10px] bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 px-2 py-1 rounded border border-purple-800/30 transition-all disabled:opacity-50 flex items-center gap-1">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Auto-Release (AI)'}
              </button>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-gray-600">—</span>
        )}
      </td>
    </tr>
  );
}

export function EscrowTable() {
  const { connector } = useAccount();
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: nextId, refetch: refetchNextId } = useReadContract({
    address: AUTO_ESCROW_ADDRESS,
    abi: AUTO_ESCROW_ABI,
    functionName: 'nextEscrowId',
    query: { refetchInterval: 12_000 },
  });

  useEffect(() => {
    if (nextId === undefined) return;
    const count = Number(nextId);
    if (count === 0) { setEscrows([]); setLoading(false); return; }

    let cancelled = false;

    async function fetchAll() {
      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const client = createPublicClient({ chain: arcTestnet, transport: http() });

      const calls = [];
      for (let i = count - 1; i >= 0 && i >= count - 50; i--) {
        calls.push({
          address: AUTO_ESCROW_ADDRESS as `0x${string}`,
          abi: AUTO_ESCROW_ABI,
          functionName: 'getJob' as const,
          args: [BigInt(i)] as const,
        });
      }

      try {
        const individualResults = await Promise.all(
          calls.map(call => 
            client.readContract(call)
              .then(res => ({ status: 'success' as const, result: res }))
              .catch(err => ({ status: 'failure' as const, error: err }))
          )
        );
        const results: EscrowData[] = [];
        for (let idx = 0; idx < individualResults.length; idx++) {
          const res = individualResults[idx];
          if (res.status === 'success' && res.result) {
            const [buyer, seller, agent, totalAmount, releasedAmount, deadline, state, createdAt, invoiceRef, milestoneCount, settlementToken] =
              res.result as [string, string, string, bigint, bigint, bigint, number, bigint, string, bigint, string];
            if (buyer !== '0x0000000000000000000000000000000000000000') {
              results.push({
                id: count - 1 - idx,
                buyer, seller, agent,
                totalAmount, releasedAmount, deadline,
                state: Number(state),
                createdAt,
                invoiceRef,
                milestoneCount: Number(milestoneCount),
                settlementToken,
              });
            }
          }
        }
        if (!cancelled) { setEscrows(results); setLoading(false); }
      } catch (e) {
        console.error('Failed to fetch escrows:', e);
        if (!cancelled) { setLoading(false); }
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [nextId]);

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
      <div className="px-5 py-4 border-b border-gray-800/40 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200">On-Chain Escrows</h3>
        <div className="flex items-center gap-2">
          {connector?.id === 'circle' && (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
              Gasless
            </span>
          )}
          <button onClick={() => refetchNextId()} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
            Refresh
          </button>
          <span className="flex items-center gap-1.5 text-[10px] bg-gray-800/50 px-2.5 py-1 rounded-full text-gray-400 border border-gray-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          <span className="text-sm text-gray-500">Loading on-chain data...</span>
        </div>
      ) : escrows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Inbox className="w-10 h-10 text-gray-700" />
          <p className="text-sm text-gray-500">No escrows yet</p>
          <p className="text-xs text-gray-600">Create your first escrow to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-950/40 text-[10px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Parties</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Info</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {escrows.map(escrow => (
                <EscrowRow key={escrow.id} escrow={escrow} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 bg-gray-950/30 border-t border-gray-800/30 flex items-center justify-between">
        <span className="text-[10px] text-gray-600">
          AutoEscrow v2 — milestones, deadlines, disputes
        </span>
        <a href={explorerAddressUrl(AUTO_ESCROW_ADDRESS)} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-cyan-500/70 hover:text-cyan-400 transition-colors flex items-center gap-1">
          {truncateAddress(AUTO_ESCROW_ADDRESS)}
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
}
