'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { RefreshCw, ArrowRightLeft, DollarSign, Euro, AlertTriangle } from 'lucide-react';
import {
  USDC_ADDRESS,
  EURC_ADDRESS,
  AUTO_ESCROW_ADDRESS,
  AUTO_ESCROW_ABI,
} from '@/lib/constants';

const STABLE_FX_ABI = [
  {
    name: 'getQuote',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

export function CurrencyConverter() {
  const [usdcVal, setUsdcVal] = useState('100');
  const [eurcVal, setEurcVal] = useState('');
  const [isUsdcToEurc, setIsUsdcToEurc] = useState(true);
  const [slippage, setSlippage] = useState('0.5');

  // 1. Read StableFX router address from AutoEscrow
  const { data: routerAddress } = useReadContract({
    address: AUTO_ESCROW_ADDRESS,
    abi: AUTO_ESCROW_ABI,
    functionName: 'stableFXRouter',
    query: { refetchInterval: 60_000 },
  });

  // 2. Query quote from StableFX contract if routerAddress is valid
  const parsedIn = parseUnits(Number(usdcVal) ? usdcVal : '0', 6);
  const { data: quoteAmount, refetch, isPending } = useReadContract({
    address: routerAddress as `0x${string}` | undefined,
    abi: STABLE_FX_ABI,
    functionName: 'getQuote',
    args: routerAddress
      ? [
          isUsdcToEurc ? USDC_ADDRESS : EURC_ADDRESS,
          isUsdcToEurc ? EURC_ADDRESS : USDC_ADDRESS,
          parsedIn,
        ]
      : undefined,
    query: {
      enabled: !!routerAddress && Number(usdcVal) > 0,
      refetchInterval: 15_000,
    },
  });

  // Update calculated output whenever quote or rate updates
  useEffect(() => {
    if (quoteAmount) {
      setEurcVal(formatUnits(quoteAmount as bigint, 6));
    } else {
      // Static fallback rate: 1 USDC = 0.92 EURC
      const amount = Number(usdcVal) || 0;
      if (isUsdcToEurc) {
        setEurcVal((amount * 0.92).toFixed(2));
      } else {
        setEurcVal((amount / 0.92).toFixed(2));
      }
    }
  }, [quoteAmount, usdcVal, isUsdcToEurc]);

  const handleInputChange = (val: string) => {
    if (/^\d*\.?\d{0,6}$/.test(val) || val === '') {
      setUsdcVal(val);
    }
  };

  const toggleDirection = () => {
    setIsUsdcToEurc(!isUsdcToEurc);
    setUsdcVal(eurcVal);
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          StableFX Rate Calculator
        </h3>
        <button
          onClick={() => refetch()}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          disabled={isPending}
          title="Refresh Quote"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center relative">
        {/* Source Input */}
        <div className="bg-gray-950/40 border border-gray-800/60 rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
            {isUsdcToEurc ? 'You Send' : 'You Receive'}
          </span>
          <div className="flex items-center justify-between">
            <input
              type="text"
              inputMode="decimal"
              value={usdcVal}
              onChange={(e) => handleInputChange(e.target.value)}
              className="bg-transparent border-none text-base font-mono font-bold text-gray-100 focus:outline-none w-2/3 p-0"
              placeholder="0.00"
            />
            <div className="flex items-center gap-1.5 bg-gray-900/80 px-2.5 py-1 rounded-lg border border-gray-800/60">
              {isUsdcToEurc ? (
                <>
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-gray-300">USDC</span>
                </>
              ) : (
                <>
                  <Euro className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-gray-300">EURC</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Swap Button (between items) */}
        <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex justify-center z-10">
          <button
            onClick={toggleDirection}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 p-2 rounded-full border border-cyan-500/30 transition-all duration-200 shadow-lg hover:scale-105 active:scale-95"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 rotate-90 md:rotate-0" />
          </button>
        </div>

        {/* Target Output */}
        <div className="bg-gray-950/40 border border-gray-800/60 rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
            {isUsdcToEurc ? 'Recipient Receives' : 'Recipient Sends'}
          </span>
          <div className="flex items-center justify-between">
            <span className="text-base font-mono font-bold text-gray-400">
              {Number(eurcVal) ? Number(eurcVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '0.00'}
            </span>
            <div className="flex items-center gap-1.5 bg-gray-900/80 px-2.5 py-1 rounded-lg border border-gray-800/60">
              {isUsdcToEurc ? (
                <>
                  <Euro className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-gray-300">EURC</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-gray-300">USDC</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slippage & Price Protection controls */}
      <div className="border-t border-gray-800/40 pt-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium px-1">
          <span className="uppercase tracking-wider font-semibold">Slippage Protection</span>
          <div className="flex gap-1.5">
            {['0.1', '0.5', '1.0'].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border transition-all ${
                  slippage === val
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                    : 'bg-transparent border-gray-800/60 text-gray-600 hover:text-gray-400'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {quoteAmount && (() => {
          const currentRate = Number(eurcVal) / (Number(usdcVal) || 1);
          const spotRate = 0.9200; // Benchmark spot rate
          const priceImpact = Math.max(0, ((spotRate - currentRate) / spotRate) * 100);
          const exceeded = priceImpact > parseFloat(slippage);

          if (exceeded) {
            return (
              <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg text-[10px] leading-normal animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
                <span className="text-red-400 font-medium">
                  Warning: FX Slippage is {priceImpact.toFixed(2)}%, exceeding your {slippage}% protection limit!
                </span>
              </div>
            );
          }
          return null;
        })()}
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium px-1">
        <span>Guaranteed FX Rate</span>
        <span>
          1 USDC = {quoteAmount ? (Number(eurcVal) / (Number(usdcVal) || 1)).toFixed(4) : '0.9200'} EURC
        </span>
      </div>
    </div>
  );
}
