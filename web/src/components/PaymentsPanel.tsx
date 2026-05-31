'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  Send,
  ArrowLeftRight,
  Droplets,
  Loader2,
  Check,
  ExternalLink,
  Clock,
  ArrowRight,
  AlertTriangle,
  Repeat,
} from 'lucide-react';
import {
  USDC_ADDRESS,
  USDC_ABI,
  USDC_DECIMALS,
  ARC_TESTNET_EXPLORER,
  isValidAddress,
  truncateAddress,
  explorerTxUrl,
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

// ─── USDC Transfer Tab ───
function TransferTab() {
  const { address, isConnected } = useAccount();
  const { addToast, updateToast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const formattedBalance = balance
    ? Number(formatUnits(balance as bigint, USDC_DECIMALS)).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })
    : '0.00';

  const parsedAmount = amount ? Number(amount) : 0;
  const hasInsufficient = balance ? parseUnits(amount || '0', USDC_DECIMALS) > (balance as bigint) : false;
  const recipientValid = recipient === '' || isValidAddress(recipient);
  const canSend = isConnected && parsedAmount > 0 && isValidAddress(recipient) && !hasInsufficient && !sending;

  const TRANSFER_ABI = [{
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  }] as const;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const toastId = addToast({
      type: 'loading',
      title: 'Sending USDC',
      message: `Transferring ${Number(amount).toLocaleString()} USDC to ${truncateAddress(recipient)}`,
    });
    try {
      const txHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: TRANSFER_ABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, parseUnits(amount, USDC_DECIMALS)],
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const client = createPublicClient({ chain: arcTestnet, transport: http() });
      await client.waitForTransactionReceipt({ hash: txHash });

      updateToast(toastId, {
        type: 'success',
        title: 'USDC Sent',
        message: `${Number(amount).toLocaleString()} USDC sent to ${truncateAddress(recipient)}`,
        txHash,
      });
      setAmount('');
      setRecipient('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      let userMsg = msg;
      if (msg.includes('User rejected') || msg.includes('user rejected')) userMsg = 'Transaction rejected.';
      else if (msg.includes('insufficient')) userMsg = 'Insufficient balance.';
      updateToast(toastId, { type: 'error', title: 'Transfer Failed', message: userMsg });
    } finally {
      setSending(false);
    }
  }, [canSend, amount, recipient, writeContractAsync, addToast, updateToast]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between mb-1.5">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Amount</label>
          {isConnected && (
            <button onClick={() => balance && setAmount(formatUnits(balance as bigint, USDC_DECIMALS))}
              className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors font-medium">
              Balance: ${formattedBalance}
            </button>
          )}
        </div>
        <div className="relative">
          <input type="text" inputMode="decimal" value={amount}
            onChange={(e) => { if (/^\d*\.?\d{0,6}$/.test(e.target.value) || e.target.value === '') setAmount(e.target.value); }}
            className={`w-full bg-[var(--bg-input)] border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 transition-all placeholder-gray-700
              ${hasInsufficient ? 'border-red-500/60 focus:ring-red-500/40' : 'border-gray-800/60 focus:ring-cyan-500/40'}`}
            placeholder="0.00" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-500 bg-cyan-950/40 px-2 py-0.5 rounded">USDC</div>
        </div>
        {hasInsufficient && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Insufficient balance</p>}
      </div>

      <div>
        <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Recipient</label>
        <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())}
          className={`w-full bg-[var(--bg-input)] border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 transition-all placeholder-gray-700
            ${recipient && !recipientValid ? 'border-red-500/60 focus:ring-red-500/40' : 'border-gray-800/60 focus:ring-cyan-500/40'}`}
          placeholder="0x..." />
        {recipient && !recipientValid && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Invalid address</p>}
      </div>

      {canSend && (
        <div className="bg-gray-950/50 border border-gray-800/40 rounded-xl p-3 space-y-1 animate-fade-in text-xs">
          <div className="flex justify-between"><span className="text-gray-400">Send</span><span className="font-mono text-gray-200">{Number(amount).toLocaleString()} USDC</span></div>
          <div className="flex justify-between"><span className="text-gray-400">To</span><span className="font-mono text-gray-400">{truncateAddress(recipient)}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Network fee</span><span className="font-mono text-cyan-400">~0.001 USDC</span></div>
        </div>
      )}

      <button onClick={handleSend} disabled={!canSend}
        className={`w-full font-semibold py-3 rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2
          ${canSend ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[var(--glow-cyan)]' : 'bg-gray-800/60 text-gray-500 cursor-not-allowed'}`}>
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? 'Sending...' : 'Send USDC'}
      </button>
    </div>
  );
}

// ─── CCTP Bridge Tab ───
function BridgeTab() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-950/50 border border-gray-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">From</p>
            <p className="text-sm font-medium text-gray-200">Ethereum Sepolia</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-3">
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">To</p>
            <p className="text-sm font-medium text-gray-200">Arc Testnet</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Amount to Bridge</label>
        <div className="relative">
          <input type="text" inputMode="decimal" disabled
            className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-3 text-lg font-mono placeholder-gray-700 opacity-50"
            placeholder="0.00" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-500 bg-cyan-950/40 px-2 py-0.5 rounded">USDC</div>
        </div>
      </div>

      <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl p-3 space-y-2">
        <p className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Circle CCTP v2
        </p>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Cross-Chain Transfer Protocol enables native USDC bridging between chains. 
          USDC is burned on the source chain and minted on the destination, ensuring 
          no wrapped tokens or liquidity pool risk.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-gray-950/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500">Est. Time</p>
            <p className="text-xs font-mono text-gray-300">~13 min</p>
          </div>
          <div className="bg-gray-950/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500">Bridge Fee</p>
            <p className="text-xs font-mono text-gray-300">$0.00</p>
          </div>
        </div>
      </div>

      <a
        href="https://developers.circle.com/cctp"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-700/50 transition-all"
      >
        <ExternalLink className="w-4 h-4" />
        Open CCTP Bridge
      </a>
      <p className="text-[10px] text-gray-600 text-center">
        CCTP bridge requires multi-chain wallet connection. Use Circle's official bridge interface.
      </p>
    </div>
  );
}

// ─── Faucet Tab ───
function FaucetTab() {
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-4">
      <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-4">
        <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 mb-2">
          <Droplets className="w-3.5 h-3.5" />
          Arc Testnet Faucet
        </p>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Get free testnet USDC to try Meridian. The faucet provides both native USDC (for gas) 
          and ERC-20 USDC (for escrow deposits) on Arc Testnet.
        </p>
      </div>

      {isConnected && address && (
        <div className="bg-gray-950/50 border border-gray-800/40 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Your Address</p>
          <p className="text-xs font-mono text-gray-300 break-all">{address}</p>
        </div>
      )}

      <a
        href={`https://faucet.circle.com/`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all"
      >
        <Droplets className="w-4 h-4" />
        Open Circle Faucet
      </a>

      <div className="space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Instructions</p>
        {[
          'Visit faucet.circle.com',
          'Select "Arc Testnet" as the network',
          'Paste your wallet address',
          'Request testnet USDC (both native + ERC-20)',
        ].map((step, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="w-4 h-4 rounded-full bg-gray-800/60 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] text-gray-400 font-bold">{i + 1}</span>
            </div>
            <p className="text-xs text-gray-500">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Payments Component ───
export function PaymentsPanel() {
  const [activeTab, setActiveTab] = useState<'transfer' | 'bridge' | 'faucet'>('transfer');

  const tabs = [
    { key: 'transfer' as const, label: 'Send', icon: Send },
    { key: 'bridge' as const, label: 'Bridge', icon: ArrowLeftRight },
    { key: 'faucet' as const, label: 'Faucet', icon: Droplets },
  ];

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-800/40">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all
              ${activeTab === key
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'transfer' && <TransferTab />}
        {activeTab === 'bridge' && <BridgeTab />}
        {activeTab === 'faucet' && <FaucetTab />}
      </div>
    </div>
  );
}
