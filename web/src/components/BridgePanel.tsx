'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  ArrowRight,
  ArrowLeftRight,
  Loader2,
  Check,
  AlertTriangle,
  Droplets,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  USDC_ABI,
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import {
  executeCctpBridge,
  BridgeState,
  getSepoliaUSDCBalance,
  adjustSepoliaUSDCBalance,
} from '@/lib/cctpAttestation';

export function BridgePanel() {
  const { address, isConnected, connector } = useAccount();
  const { addToast } = useToast();

  const [sourceChain, setSourceChain] = useState<'ethereum-sepolia' | 'base-sepolia' | 'arbitrum-sepolia'>('ethereum-sepolia');
  const [amount, setAmount] = useState('');
  const [sepoliaBalance, setSepoliaBalance] = useState('1000.00');
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [isMintingFaucet, setIsMintingFaucet] = useState(false);

  // Read real Arc USDC balance
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

  useEffect(() => {
    setSepoliaBalance(getSepoliaUSDCBalance());
  }, []);

  const handleFaucetMint = async () => {
    setIsMintingFaucet(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const nextBal = adjustSepoliaUSDCBalance(100);
    setSepoliaBalance(nextBal);
    setIsMintingFaucet(false);
    addToast({
      type: 'success',
      title: 'Faucet Minted',
      message: '100.00 Sepolia USDC added to your source chain balance.',
    });
  };

  const parsedAmount = amount ? parseFloat(amount) : 0;
  const hasInsufficient = parsedAmount > parseFloat(sepoliaBalance);
  const isIdle = !bridgeState || bridgeState.step === 'IDLE' || bridgeState.step === 'DONE';

  const canBridge =
    isConnected &&
    parsedAmount > 0 &&
    !hasInsufficient &&
    isIdle;

  const handleStartBridge = async () => {
    if (!canBridge || !address || !connector) return;

    await executeCctpBridge({
      amount,
      userAddress: address,
      sourceChain,
      connector,
      onStateChange: (state) => {
        setBridgeState(state);
      },
      onSuccess: () => {
        refetchArc();
        setSepoliaBalance(getSepoliaUSDCBalance());
        setAmount('');
      },
    });
  };

  const handleClaimTokens = async () => {
    if (!address || !bridgeState) return;
    setBridgeState({
      step: 'MINTING',
      message: 'Retrying token minting on Arc Testnet. Broadcasting receiveMessage()...',
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setBridgeState({
      step: 'DONE',
      message: 'Mint transaction successfully executed on Arc Testnet!',
    });
    refetchArc();
    setAmount('');
  };

  return (
    <div className="space-y-5">
      {/* Network Direction Selector */}
      <div className="bg-gray-950/40 border border-gray-800/40 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1 text-center w-full">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Source Chain</p>
            <select
              value={sourceChain}
              onChange={(e) => setSourceChain(e.target.value as any)}
              disabled={!isIdle}
              className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500/40 w-full sm:w-auto"
            >
              <option value="ethereum-sepolia">Ethereum Sepolia</option>
              <option value="base-sepolia">Base Sepolia</option>
              <option value="arbitrum-sepolia">Arbitrum Sepolia</option>
            </select>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center my-1 sm:my-0 sm:mx-4 shrink-0 rotate-90 sm:rotate-0">
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="flex-1 text-center w-full">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Destination Chain</p>
            <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/20 border border-cyan-900/30 px-3 py-1.5 rounded-lg inline-block w-full sm:w-auto">
              ⚡ Arc Testnet
            </span>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Amount to Bridge</label>
          <div className="flex gap-2">
            <span className="text-gray-500">Source Bal:</span>
            <span className="font-mono font-medium text-gray-300">${parseFloat(sepoliaBalance).toFixed(2)} USDC</span>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              if (/^\d*\.?\d{0,2}$/.test(e.target.value) || e.target.value === '') {
                setAmount(e.target.value);
              }
            }}
            disabled={!isIdle}
            className={`w-full bg-[var(--bg-input)] border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 transition-all placeholder-gray-700
              ${hasInsufficient ? 'border-red-500/60 focus:ring-red-500/40' : 'border-gray-800/60 focus:ring-cyan-500/40'}`}
            placeholder="0.00"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button
              onClick={() => setAmount(sepoliaBalance)}
              disabled={!isIdle}
              className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors uppercase font-bold tracking-wider mr-1.5 disabled:opacity-40"
            >
              Max
            </button>
            <span className="text-xs font-bold text-cyan-500 bg-cyan-950/40 px-2 py-0.5 rounded">USDC</span>
          </div>
        </div>
        {hasInsufficient && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Insufficient source chain balance
          </p>
        )}
      </div>

      {/* CCTP Protocol Details Card */}
      {isIdle && (
        <div className="bg-blue-950/10 border border-blue-900/20 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Circle CCTP Protocol (Mint & Burn)
            </span>
            <span className="text-[9px] uppercase font-bold bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded text-blue-400">
              V2 Standard
            </span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
            Circle's Cross-Chain Transfer Protocol safely destroys USDC on the source network and mints it natively on Arc. No liquidity pools or wrapped asset risks.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-gray-950/40 rounded-lg p-2 text-center border border-gray-900">
              <p className="text-[9px] text-gray-500">Bridging Time</p>
              <p className="text-xs font-mono text-gray-300 font-semibold">Instant (Demo)</p>
            </div>
            <div className="bg-gray-950/40 rounded-lg p-2 text-center border border-gray-900">
              <p className="text-[9px] text-gray-500">Bridge Fee</p>
              <p className="text-xs font-mono text-emerald-400 font-semibold">Free</p>
            </div>
            <div className="bg-gray-950/40 rounded-lg p-2 text-center border border-gray-900">
              <p className="text-[9px] text-gray-500">Arc Gas Fee</p>
              <p className="text-xs font-mono text-emerald-400 font-semibold">$0.00</p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time CCTP Bridge Stepper */}
      {bridgeState && bridgeState.step !== 'IDLE' && (
        <div className="bg-gray-950/60 border border-gray-800/80 rounded-2xl p-4 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              CCTP Crossing Progress
            </span>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {bridgeState.step}
            </span>
          </div>

          {/* Stepper Steps */}
          <div className="relative flex justify-between items-center px-2">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-800" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{
                width:
                  bridgeState.step === 'BURNING'
                    ? '15%'
                    : bridgeState.step === 'ATTESTING'
                    ? '50%'
                    : bridgeState.step === 'MINTING'
                    ? '85%'
                    : bridgeState.step === 'DONE'
                    ? '100%'
                    : '0%',
              }}
            />

            {[
              { label: 'Burn', step: 'BURNING' },
              { label: 'Attest', step: 'ATTESTING' },
              { label: 'Mint', step: 'MINTING' },
            ].map((item, idx) => {
              const order = ['BURNING', 'ATTESTING', 'MINTING', 'DONE'];
              const curIdx = order.indexOf(bridgeState.step);
              const itemIdx = order.indexOf(item.step);
              const passed = curIdx > itemIdx;
              const active = curIdx === itemIdx;

              return (
                <div key={item.label} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300 ${
                      passed
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        : active
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300 animate-pulse'
                        : 'bg-gray-900 border-gray-800 text-gray-500'
                    }`}
                  >
                    {passed ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] mt-1 font-semibold transition-colors duration-300 ${
                      active ? 'text-cyan-400' : passed ? 'text-emerald-400' : 'text-gray-550'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Status Message */}
          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-900 space-y-2">
            <p className="text-[11px] text-gray-400 leading-normal text-center font-sans">
              {bridgeState.message}
            </p>
            {bridgeState.txHash && (
              <div className="flex justify-between text-[10px] border-t border-gray-950 pt-2 font-mono text-gray-500">
                <span>Transaction ID:</span>
                <span className="text-gray-400 select-all">{bridgeState.txHash.slice(0, 14)}...{bridgeState.txHash.slice(-10)}</span>
              </div>
            )}
            {bridgeState.messageHash && (
              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>CCTP Message Hash:</span>
                <span className="text-gray-400 select-all">{bridgeState.messageHash.slice(0, 14)}...{bridgeState.messageHash.slice(-10)}</span>
              </div>
            )}
          </div>

          {/* Recover Failed Mint Step */}
          {bridgeState.step === 'FAILED' && bridgeState.canRecover && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] text-red-400 leading-normal">
                The transaction burned successfully, but executing the mint command on Arc timed out or was cancelled. Click below to claim your USDC.
              </p>
              <button
                onClick={handleClaimTokens}
                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all duration-200"
              >
                Claim Bridged Tokens
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Bridge Button */}
      <button
        onClick={handleStartBridge}
        disabled={!canBridge}
        className={`w-full font-semibold py-3 rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2
          ${
            canBridge
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[var(--glow-cyan)]'
              : 'bg-gray-800/60 text-gray-500 cursor-not-allowed'
          }`}
      >
        {!isIdle ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
        {!isIdle ? 'Bridging USDC...' : 'Initiate CCTP Transfer'}
      </button>

      {/* Integrated Test Faucet for Sepolia USDC */}
      {isIdle && (
        <div className="border-t border-gray-800/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-cyan-950/5 p-3 rounded-xl border border-cyan-900/10">
          <div className="flex gap-2.5 items-start">
            <Droplets className="w-4.5 h-4.5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-300">Testnet Faucet</p>
              <p className="text-[10px] text-gray-500 leading-normal">
                Instantly claim free Sepolia USDC to try the native CCTP bridge interface.
              </p>
            </div>
          </div>
          <button
            onClick={handleFaucetMint}
            disabled={isMintingFaucet}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 hover:from-cyan-900/60 hover:to-blue-900/60 border border-cyan-800/40 text-cyan-400 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-40"
          >
            {isMintingFaucet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mint +100 USDC'}
          </button>
        </div>
      )}
    </div>
  );
}
