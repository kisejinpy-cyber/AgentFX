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
  Building,
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
import { BridgePanel } from '@/components/BridgePanel';
import { BankLinking } from '@/components/BankLinking';

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
  return <BridgePanel />;
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

interface PayoutLog {
  id: string;
  bankAccountId: string;
  bankName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'settled' | 'failed';
  timestamp: string;
  escrowId: string;
}

// ─── Off-Ramp Tab ───
function OfframpTab() {
  const { addToast } = useToast();
  const [payouts, setPayouts] = useState<PayoutLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts');
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch (err) {
      console.error('Failed to fetch payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleSimulateWebhook = async (payoutId: string, targetStatus: string) => {
    try {
      const res = await fetch('/api/webhooks/circle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-circle-signature': 'sandbox-signature-proof',
        },
        body: JSON.stringify({
          notificationType: 'payouts.updated',
          notification: {
            id: payoutId,
            status: targetStatus.toUpperCase(),
            amount: { amount: '100.00', currency: 'USD' }
          }
        })
      });

      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Webhook Simulated',
          message: `Payout #${payoutId} updated to ${targetStatus} in sandbox database.`,
        });
        fetchPayouts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Wizard and Bank Account List */}
      <BankLinking onRefreshHistory={fetchPayouts} />

      {/* Payout History Section */}
      <div className="space-y-3 pt-5 border-t border-gray-800/40">
        <div>
          <h4 className="text-xs font-semibold text-gray-200">Payout History</h4>
          <p className="text-[10px] text-gray-500 mt-0.5 font-sans">
            Tracking automatic conversion of settled escrow tokens into USD bank transfers.
          </p>
        </div>

        {loading ? (
          <div className="text-xs text-gray-500 py-4 text-center">Loading payouts history...</div>
        ) : payouts.length === 0 ? (
          <div className="text-xs text-gray-650 py-6 text-center font-sans">No recent bank payouts.</div>
        ) : (
          <div className="space-y-2.5">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="bg-gray-950/40 border border-gray-850/60 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors hover:border-gray-800/60"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-200 font-bold">
                      ${payout.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-sans">
                      USD Fiat
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono">
                    <span>ID: {payout.id}</span>
                    <span>•</span>
                    <span>To: {payout.bankName}</span>
                    <span>•</span>
                    <span>Escrow #{payout.escrowId}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3.5">
                  <div className="flex flex-col sm:items-end text-left sm:text-right">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${
                      payout.status === 'settled'
                        ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
                        : payout.status === 'failed'
                        ? 'bg-red-950/20 text-red-400 border-red-500/20'
                        : 'bg-amber-950/20 text-amber-400 border-amber-500/20'
                    }`}>
                      {payout.status.toUpperCase()}
                    </span>
                    <span className="text-[8px] text-gray-650 mt-1 font-mono">
                      {new Date(payout.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {(payout.status === 'pending' || payout.status === 'processing') && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleSimulateWebhook(payout.id, 'settled')}
                        className="text-[9px] bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded transition-all font-bold uppercase active:scale-95"
                      >
                        Settle
                      </button>
                      <button
                        onClick={() => handleSimulateWebhook(payout.id, 'failed')}
                        className="text-[9px] bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-400 px-2 py-1 rounded transition-all font-bold uppercase active:scale-95"
                      >
                        Fail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Payments Component ───
export function PaymentsPanel() {
  const [activeTab, setActiveTab] = useState<'transfer' | 'bridge' | 'faucet' | 'offramp'>('transfer');

  const tabs = [
    { key: 'transfer' as const, label: 'Send', icon: Send },
    { key: 'bridge' as const, label: 'Bridge', icon: ArrowLeftRight },
    { key: 'faucet' as const, label: 'Faucet', icon: Droplets },
    { key: 'offramp' as const, label: 'Off-Ramp', icon: Building },
  ];

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-800/40">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 text-[10px] sm:text-xs font-medium transition-all
              ${activeTab === key
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
          >
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'transfer' && <TransferTab />}
        {activeTab === 'bridge' && <BridgeTab />}
        {activeTab === 'faucet' && <FaucetTab />}
        {activeTab === 'offramp' && <OfframpTab />}
      </div>
    </div>
  );
}
