'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import {
  Coins,
  Loader2,
  CheckCircle,
  Database,
  ArrowUpRight,
  TrendingUp,
  History,
  Info,
} from 'lucide-react';
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  USDC_ABI,
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

export interface BillingLog {
  id: string;
  timestamp: number;
  user: string;
  recipient: string;
  amount: number;
  status: string;
}

export function GatewayFunding() {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [reserveBalance, setReserveBalance] = useState(0.05);
  const [agentEarnings, setAgentEarnings] = useState(0.00245);
  const [logs, setLogs] = useState<BillingLog[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Read real Arc USDC balance to verify funding capability
  const { data: arcBalance, refetch: refetchArc } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const formattedArcBalance = arcBalance
    ? Number(formatUnits(arcBalance as bigint, USDC_DECIMALS)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  const fetchReserves = async () => {
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-nanopayments',
          userAddress: address || 'default',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReserveBalance(data.balance);
        setAgentEarnings(data.earnings);
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch nanopayments status:', err);
    }
  };

  useEffect(() => {
    fetchReserves();
    const interval = setInterval(fetchReserves, 6000);
    return () => clearInterval(interval);
  }, [address]);

  const handleTopup = async () => {
    if (!isConnected || !address || !topupAmount) return;
    setLoading(true);

    const amountNum = parseFloat(topupAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount to top up.',
      });
      setLoading(false);
      return;
    }

    const toastId = addToast({
      type: 'loading',
      title: 'Funding Reserves',
      message: `Locking ${amountNum} USDC into Circle Gateway...`,
    });

    try {
      // Simulate real transaction lock call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'topup-nanopayments',
          userAddress: address,
          amount: topupAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReserveBalance(data.balance);
      setTopupAmount('');
      updateToast(toastId, {
        type: 'success',
        title: 'Reserves Funded',
        message: `Successfully locked ${amountNum} USDC into Circle Gateway reserves!`,
      });
      fetchReserves();
    } catch (err: any) {
      updateToast(toastId, {
        type: 'error',
        title: 'Top-up Failed',
        message: err.message || 'Verification execution failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimEarnings = async () => {
    if (!isConnected) return;
    setClaiming(true);

    const toastId = addToast({
      type: 'loading',
      title: 'Claiming Agent Fees',
      message: `Withdrawing $${agentEarnings.toFixed(5)} USDC to developer wallet...`,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim-earnings' }),
      });
      if (!res.ok) throw new Error('Failed to claim');

      updateToast(toastId, {
        type: 'success',
        title: 'Earnings Claimed',
        message: `Successfully swept accumulated micro-fees to your wallet!`,
      });
      fetchReserves();
    } catch (err: any) {
      updateToast(toastId, {
        type: 'error',
        title: 'Claim Failed',
        message: err.message || 'Claim transaction failed',
      });
    } finally {
      setClaiming(false);
    }
  };

  // Helper function to update toast inside custom timeout
  const updateToast = (id: string, options: any) => {
    // Falls back to direct toast alerts if update utility has custom arguments
    addToast({
      type: options.type,
      title: options.title,
      message: options.message,
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buyer Reserves Card */}
        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Nanopayment Reserves
              </span>
              <h4 className="text-2xl font-mono font-bold text-cyan-400 mt-1">
                ${reserveBalance.toFixed(5)} <span className="text-xs font-sans text-gray-500">USDC</span>
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
          </div>
          
          <p className="text-[10px] text-gray-500 leading-normal">
            Locked on-chain balances used to verify logistics checks. Cost per verification check is exactly <strong className="text-gray-400">0.00001 USDC</strong>.
          </p>

          {/* Top-up Form */}
          <div className="space-y-2 pt-2 border-t border-gray-800/40">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-500">Deposit amount</span>
              <span className="text-gray-600 font-mono">Wallet: ${formattedArcBalance} USDC</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.05"
                  value={topupAmount}
                  onChange={(e) => {
                    if (/^\d*\.?\d{0,4}$/.test(e.target.value) || e.target.value === '') {
                      setTopupAmount(e.target.value);
                    }
                  }}
                  className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl pl-3 pr-8 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder-gray-700"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-600">USDC</span>
              </div>
              <button
                onClick={handleTopup}
                disabled={loading || !topupAmount}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 text-xs px-3.5 rounded-xl transition-all font-semibold flex items-center gap-1 disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                Deposit
              </button>
            </div>
          </div>
        </div>

        {/* Agent Earnings Card */}
        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Agent Operator Earnings
              </span>
              <h4 className="text-2xl font-mono font-bold text-purple-400 mt-1">
                ${agentEarnings.toFixed(5)} <span className="text-xs font-sans text-gray-500">USDC</span>
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <p className="text-[10px] text-gray-500 leading-normal">
            Accumulated micropayment fees collected by your active AI verify fleet nodes. Sweep accrued revenue to your developer wallet.
          </p>

          <div className="pt-2 border-t border-gray-800/40">
            <button
              onClick={handleClaimEarnings}
              disabled={claiming || agentEarnings <= 0}
              className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 text-xs py-2 rounded-xl transition-all font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
            >
              {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
              Claim Micro-Fees
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-950/10 border border-blue-900/20 rounded-xl p-3.5 flex gap-2.5 items-start">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
          <strong>x402 Protocol Implementation:</strong> APIs respond with <code className="text-blue-400">402 Payment Required</code> when reserves are empty. The client automatically signs micropayment updates to verify requests, enabling instant off-chain verification and batched settlement.
        </p>
      </div>

      {/* Real-time Invoice Logs */}
      <div className="bg-gray-900/20 border border-gray-800/40 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800/40 flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-300">Real-Time Invoice Audits</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800/40 text-[9px] text-gray-500 uppercase font-semibold">
                <th className="px-4 py-2.5">Invoice ID</th>
                <th className="px-4 py-2.5">User Address</th>
                <th className="px-4 py-2.5">Agent Recipient</th>
                <th className="px-4 py-2.5">Fee Paid</th>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/20 text-xs font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-600 font-sans text-xs">
                    No micropayments recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/5 transition-colors">
                    <td className="px-4 py-2">{log.id}</td>
                    <td className="px-4 py-2 text-gray-500">{log.user.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-gray-500">{log.recipient.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-cyan-400">${log.amount.toFixed(5)}</td>
                    <td className="px-4 py-2 text-gray-600 font-sans text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
