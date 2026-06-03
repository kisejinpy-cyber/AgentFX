'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { USDC_ADDRESS, USDC_DECIMALS, USDC_ABI } from '@/lib/constants';
import { getUnifiedBalances, ChainBalance } from '@/lib/appKitHelper';
import { Layers, ChevronDown, RefreshCw, AlertCircle, Link } from 'lucide-react';

export function UnifiedBalanceWidget() {
  const { address, isConnected } = useAccount();
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const loadBalances = async (showLoading = true) => {
    if (!address) return;
    if (showLoading) setIsLoading(true);
    const chainBalances = await getUnifiedBalances(address, formattedArc);
    setBalances(chainBalances);
    setIsLoading(false);
  };

  // Reload when address or real balance updates
  useEffect(() => {
    loadBalances(true);
  }, [address, formattedArc]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isConnected || !address) return null;

  // Calculate total unified balance
  const totalUnified = balances.reduce((sum, item) => sum + parseFloat(item.balance || '0'), 0);

  const formattedTotal = totalUnified.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gradient-to-r from-gray-900/80 to-blue-950/20 hover:from-gray-800/80 hover:to-blue-950/40 border border-gray-800/60 hover:border-cyan-500/30 px-3.5 py-1.5 rounded-xl transition-all duration-300 group"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <div className="text-left">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold group-hover:text-gray-400 transition-colors">
            Unified Balance
          </p>
          <p className="text-xs font-mono font-bold text-gray-200">
            ${formattedTotal} <span className="text-[10px] text-gray-500 font-normal">USDC</span>
          </p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-gray-400'}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-950/95 backdrop-blur-xl border border-gray-800/80 rounded-xl shadow-2xl p-4 z-50 animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800/40 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-gray-200">Aggregated Balances</h3>
            </div>
            <button
              onClick={() => {
                refetchArc();
                loadBalances(false);
              }}
              disabled={isLoading}
              className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400 hover:text-gray-200 transition-all duration-200 disabled:opacity-40"
              title="Refresh balances"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          <div className="space-y-2">
            {balances.map((item) => (
              <div
                key={item.chainId}
                className="flex items-center justify-between p-2 rounded-lg border border-gray-900/50 hover:border-gray-800/50 bg-gray-900/10 hover:bg-gray-900/30 transition-all duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs ${item.logoColor}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-300">{item.chainName}</p>
                    <p className="text-[10px] text-gray-500">
                      {item.chainId === 'arc-testnet' ? 'Target Destination' : 'CCTP Bridge Available'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-gray-200">
                  ${parseFloat(item.balance).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-800/40 flex items-start gap-2 bg-cyan-950/5 p-2 rounded-lg border border-cyan-900/20">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Circle App Kit automatically consolidates your balances and handles the CCTP bridging route during escrow funding in a single signature flow.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
