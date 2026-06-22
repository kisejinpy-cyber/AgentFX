'use client';

import { TrendingUp, RefreshCcw, Clock, Activity } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { AUTO_ESCROW_ADDRESS, AUTO_ESCROW_ABI, USDC_ADDRESS, USDC_ABI, USDC_DECIMALS } from '@/lib/constants';
import { useState, useEffect } from 'react';

function StatCard({
  label,
  value,
  subtitle,
  subtitleIcon: SubtitleIcon,
  subtitleColor = 'text-gray-400',
  accentBorder = false,
  glow = false,
  children,
}: {
  label: string;
  value: React.ReactNode;
  subtitle: string;
  subtitleIcon?: React.ElementType;
  subtitleColor?: string;
  accentBorder?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`
        bg-gradient-to-br from-gray-900/80 to-gray-950/80 rounded-2xl p-5 relative overflow-hidden group transition-all duration-300
        border ${accentBorder ? 'border-cyan-900/40' : 'border-gray-800/50'}
        ${glow ? 'shadow-[var(--glow-cyan)]' : ''}
        hover:border-gray-700/60
      `}
    >
      <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/[0.03] transition-colors duration-300" />
      <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 relative z-10">{label}</h3>
      <div className="text-2xl font-bold font-mono relative z-10">{value}</div>
      <div className={`mt-2 text-xs ${subtitleColor} flex items-center relative z-10`}>
        {SubtitleIcon && <SubtitleIcon className="w-3 h-3 mr-1.5" />}
        {subtitle}
      </div>
      {children}
    </div>
  );
}

export function StatsRow() {
  // Read real nextEscrowId from contract
  const { data: nextEscrowId } = useReadContract({
    address: AUTO_ESCROW_ADDRESS,
    abi: AUTO_ESCROW_ABI,
    functionName: 'nextEscrowId',
    query: { refetchInterval: 15_000 },
  });

  // Read contract USDC balance (Total Value Locked)
  const { data: contractBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [AUTO_ESCROW_ADDRESS],
    query: { refetchInterval: 15_000 },
  });

  const isReal = nextEscrowId !== undefined && Number(nextEscrowId) > 0;
  
  // Bootstrap fallback: TVL = $35,950.00, escrows = 5
  const totalEscrows = isReal ? Number(nextEscrowId) : 5;
  const tvl = isReal && contractBalance
    ? Number(formatUnits(contractBalance as bigint, USDC_DECIMALS))
    : 35950.00;
  const formattedTVL = tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Yield counter (calculated based on real or simulated TVL at ~5.1% APY)
  const [yieldAccrued, setYieldAccrued] = useState(isReal ? 0 : 124.9582);
  useEffect(() => {
    // Calculate yield per second at 5.1% APY
    const yieldPerSecond = (tvl * 0.051) / (365 * 24 * 3600);
    if (yieldPerSecond <= 0) return;

    const interval = setInterval(() => {
      setYieldAccrued(prev => prev + yieldPerSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [tvl]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Total Value Locked"
        value={<span className="text-gray-100">${formattedTVL}</span>}
        subtitle={isReal ? `${totalEscrows} escrow${totalEscrows !== 1 ? 's' : ''} on-chain` : `${totalEscrows} escrows (Simulated)`}
        subtitleIcon={Activity}
        subtitleColor={isReal ? "text-cyan-400" : "text-amber-400/80"}
      >
        {!isReal && (
          <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
            Sandbox
          </span>
        )}
      </StatCard>

      <StatCard
        label="Active Escrows"
        value={<span className="text-gray-100">{totalEscrows}</span>}
        subtitle={isReal ? "Verifiable on ArcScan" : "Mock Sandbox Activity"}
        subtitleIcon={RefreshCcw}
        subtitleColor={isReal ? "text-blue-400" : "text-amber-400/80"}
      >
        {!isReal && (
          <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
            Sandbox
          </span>
        )}
      </StatCard>

      <StatCard
        label="Projected Yield (USYC)"
        value={
          <span className="text-gray-100 flex items-baseline">
            ${yieldAccrued.toFixed(4).split('.')[0]}
            <span className="text-cyan-400 text-lg">.{yieldAccrued.toFixed(4).split('.')[1]}</span>
          </span>
        }
        subtitle="~5.1% APY on locked capital"
        subtitleIcon={Clock}
        subtitleColor="text-gray-500"
        accentBorder
        glow
      >
        {!isReal && (
          <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
            Sandbox
          </span>
        )}
      </StatCard>
    </div>
  );
}
