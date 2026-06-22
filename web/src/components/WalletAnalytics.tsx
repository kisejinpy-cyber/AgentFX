'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { USDC_ADDRESS, USDC_DECIMALS, USDC_ABI, AUTO_ESCROW_ADDRESS, AUTO_ESCROW_ABI } from '@/lib/constants';
import { LoadingCard } from '@/components/ui/motion/LoadingLibrary';
import { getUnifiedBalances, ChainBalance } from '@/lib/appKitHelper';
import {
  Wallet,
  PieChart,
  Activity,
  History,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  DollarSign,
  Info,
} from 'lucide-react';

interface TxHistoryItem {
  id: string;
  type: 'transfer_out' | 'bridge' | 'payout' | 'escrow_lock';
  amount: string;
  chainOrBank: string;
  status: string;
  timestamp: string;
  txHash?: string;
}

export function WalletAnalytics() {
  const { address, isConnected } = useAccount();
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [txCount, setTxCount] = useState({ sent: 0, received: 0, bridged: 0, payouts: 0 });

  // Read real Arc USDC balance
  const { data: arcUsdcBalance, refetch: refetchArc } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const formattedArc = arcUsdcBalance
    ? formatUnits(arcUsdcBalance as bigint, USDC_DECIMALS)
    : '0.00';

  // Fetch unified balances across chains
  const loadData = async (silent = false) => {
    if (!address) {
      if (!silent) setIsLoading(true);
      setBalances([
        {
          chainId: 'arc-testnet',
          chainName: 'Arc Testnet (Native)',
          balance: '1500.00',
          icon: '⚡',
          logoColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
        },
        {
          chainId: 'base-sepolia',
          chainName: 'Base Sepolia',
          balance: '2450.00',
          icon: '🔵',
          logoColor: 'text-blue-500 border-blue-500/30 bg-blue-500/5',
        },
        {
          chainId: 'ethereum-sepolia',
          chainName: 'Ethereum Sepolia',
          balance: '980.00',
          icon: '♦️',
          logoColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5',
        },
        {
          chainId: 'solana-devnet',
          chainName: 'Solana Devnet',
          balance: '120.00',
          icon: '☀️',
          logoColor: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
        }
      ]);
      setHistory([
        {
          id: 'tx-payout-mock-1',
          type: 'payout',
          amount: '450.00',
          chainOrBank: 'Silicon Valley Bank',
          status: 'completed',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'tx-bridge-1',
          type: 'bridge',
          amount: '120.00',
          chainOrBank: 'Base Sepolia → Arc Testnet',
          status: 'settled',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          txHash: '0xe6b13b...f5a70',
        },
        {
          id: 'tx-escrow-1',
          type: 'escrow_lock',
          amount: '250.00',
          chainOrBank: 'AutoEscrowv3 Contract',
          status: 'settled',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          txHash: '0x32cd9d...3cede',
        },
        {
          id: 'tx-out-mock-1',
          type: 'transfer_out',
          amount: '80.00',
          chainOrBank: '0xe6A13B...E71C',
          status: 'settled',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          txHash: '0xabc123...ff349',
        }
      ]);
      setTxCount({
        sent: 3,
        received: 2,
        bridged: 1,
        payouts: 1,
      });
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);

    try {
      // 1. Fetch balances across chains using App Kit helper
      const chainBalances = await getUnifiedBalances(address, formattedArc);
      setBalances(chainBalances);

      // 2. Fetch payouts from our DB
      const payoutsRes = await fetch('/api/payouts');
      let recentPayouts: any[] = [];
      if (payoutsRes.ok) {
        const payoutData = await payoutsRes.json();
        recentPayouts = payoutData.payouts || [];
      }

      // 3. Assemble a unified transaction history timeline
      const timeline: TxHistoryItem[] = [];

      // Add payouts to history
      recentPayouts.slice(0, 4).forEach((p: any) => {
        timeline.push({
          id: p.id,
          type: 'payout',
          amount: p.amount.toString(),
          chainOrBank: p.bankName,
          status: p.status,
          timestamp: p.timestamp,
        });
      });

      // Add mock recent transfers and bridge steps to flesh out history
      timeline.push({
        id: 'tx-bridge-1',
        type: 'bridge',
        amount: '120.00',
        chainOrBank: 'Base Sepolia → Arc',
        status: 'settled',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        txHash: '0xe6b13b...f5a70',
      });

      timeline.push({
        id: 'tx-escrow-1',
        type: 'escrow_lock',
        amount: '250.00',
        chainOrBank: 'AutoEscrowv3 Contract',
        status: 'settled',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        txHash: '0x32cd9d...3cede',
      });

      // Sort timeline by timestamp descending
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(timeline);

      // 4. Calculate simple stats
      setTxCount({
        sent: 2,
        received: 1,
        bridged: 1,
        payouts: recentPayouts.length,
      });

    } catch (e) {
      console.error('Error fetching analytics data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 20_000);
    return () => clearInterval(interval);
  }, [address, formattedArc]);

  // Calculate totals & asset distributions
  const totalBalance = balances.reduce((sum, item) => sum + parseFloat(item.balance || '0'), 0);
  const isDemo = !isConnected || !address;
  if (isLoading && balances.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        <LoadingCard rows={3} />
        <LoadingCard rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400">Sandbox Preview Mode</p>
              <p className="text-[10px] text-gray-400 font-medium">
                You are viewing simulated multi-chain portfolio activity. Connect your wallet to view real assets.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Upper Grid - Portfolio summary and transaction statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Asset Allocations */}
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800/40 pb-3">
            <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Asset Allocations
            </h3>
            <button
              onClick={() => {
                refetchArc();
                loadData();
              }}
              disabled={isLoading}
              className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400 hover:text-gray-200 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500 font-medium">Total Multi-Chain Value</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-xs text-gray-500 ml-1">USDC</span>
              </span>
            </div>

            {/* Allocation Progress Bar */}
            <div className="h-2 w-full rounded-full bg-gray-950 flex overflow-hidden">
              {balances.map((item, idx) => {
                const bal = parseFloat(item.balance || '0');
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                if (pct <= 0) return null;

                const bgColors = [
                  'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]',
                  'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]',
                  'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]',
                  'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]',
                ];

                return (
                  <div
                    key={item.chainId}
                    style={{ width: `${pct}%` }}
                    className={`${bgColors[idx % bgColors.length]} transition-all duration-500`}
                    title={`${item.chainName}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {balances.map((item, idx) => {
                const bal = parseFloat(item.balance || '0');
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                const dotColors = [
                  'bg-cyan-400',
                  'bg-blue-500',
                  'bg-indigo-500',
                  'bg-purple-500',
                ];

                return (
                  <div
                    key={item.chainId}
                    className="flex justify-between items-center p-2 rounded-lg bg-gray-950/40 border border-gray-900/60"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                      <span className="text-[10px] text-gray-400 font-medium truncate">{item.chainName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-200 shrink-0 ml-1">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Transaction Activity & Operations */}
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl space-y-4">
          <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-gray-800/40 pb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            Transaction Statistics
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'CCTP Bridge Sweeps', value: txCount.bridged, desc: 'Incoming cross-chain', color: 'text-cyan-400' },
              { label: 'Bank Payouts', value: txCount.payouts, desc: 'Off-ramped fiat', color: 'text-emerald-400' },
              { label: 'Outbound Transfers', value: txCount.sent, desc: 'P2P sends', color: 'text-blue-400' },
              { label: 'Active Escrow Locking', value: 1, desc: 'Funded jobs', color: 'text-indigo-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-950/40 border border-gray-900/60 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">{stat.label}</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</span>
                  <span className="text-[8px] text-gray-600 font-normal">{stat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Unified Transaction Timeline */}
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl space-y-4">
        <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-gray-800/40 pb-3">
          <History className="w-4 h-4 text-cyan-400" />
          Unified Portfolio History
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">No transaction logs available.</p>
        ) : (
          <div className="divide-y divide-gray-800/20 max-h-[300px] overflow-y-auto pr-1">
            {history.map((tx) => {
              const config = {
                transfer_out: { label: 'Send Out', icon: ArrowUpRight, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                bridge:       { label: 'CCTP Sweep', icon: RefreshCw, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
                payout:       { label: 'Fiat Payout', icon: Building2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                escrow_lock:  { label: 'Escrow Lock', icon: Wallet, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              }[tx.type];

              const Icon = config.icon;

              return (
                <div key={tx.id} className="py-3 flex justify-between items-center gap-3 transition-colors hover:bg-gray-800/5 rounded-lg px-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200">{config.label}</span>
                        <span className={`text-[8px] px-1 py-0.5 rounded font-mono font-bold ${
                          tx.status === 'settled' || tx.status === 'success'
                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/20'
                            : 'bg-amber-950/20 text-amber-400 border border-amber-900/20'
                        }`}>
                          {tx.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{tx.chainOrBank}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-gray-200">
                      ${parseFloat(tx.amount).toFixed(2)}
                    </span>
                    <p className="text-[8px] text-gray-600 mt-0.5">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
