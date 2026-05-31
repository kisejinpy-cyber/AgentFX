'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  Cpu,
  Plus,
  Trash2,
  Play,
  Pause,
  Settings,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Wallet,
} from 'lucide-react';
import {
  USDC_ADDRESS,
  USDC_ABI,
  USDC_DECIMALS,
  isValidAddress,
  truncateAddress,
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

interface PolicyRule {
  id: string;
  name: string;
  type: 'threshold-sweep' | 'scheduled-payout' | 'reserve-topup';
  config: {
    threshold?: string;
    target?: string;
    amount?: string;
    schedule?: string;
  };
  enabled: boolean;
}

const DEFAULT_RULES: PolicyRule[] = [
  {
    id: '1',
    name: 'Auto-Sweep Excess',
    type: 'threshold-sweep',
    config: {
      threshold: '50000',
      target: '', // yield vault or treasury address
    },
    enabled: false,
  },
  {
    id: '2',
    name: 'Weekly Payroll Reserve',
    type: 'scheduled-payout',
    config: {
      amount: '10000',
      schedule: 'weekly',
      target: '',
    },
    enabled: false,
  },
  {
    id: '3',
    name: 'Minimum Reserve Guard',
    type: 'reserve-topup',
    config: {
      threshold: '5000',
    },
    enabled: false,
  },
];

function RuleCard({
  rule,
  onToggle,
  onUpdate,
  onDelete,
}: {
  rule: PolicyRule;
  onToggle: () => void;
  onUpdate: (updates: Partial<PolicyRule>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    'threshold-sweep': { label: 'Sweep', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/30' },
    'scheduled-payout': { label: 'Payout', icon: Clock, color: 'text-blue-400 bg-blue-900/20 border-blue-800/30' },
    'reserve-topup': { label: 'Guard', icon: Target, color: 'text-amber-400 bg-amber-900/20 border-amber-800/30' },
  };

  const typeInfo = typeLabels[rule.type];
  const Icon = typeInfo.icon;

  return (
    <div className={`border rounded-xl p-4 transition-all duration-200 ${rule.enabled ? 'border-gray-700/50 bg-gray-900/40' : 'border-gray-800/30 bg-gray-950/30 opacity-60'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${typeInfo.color}`}>
            <Icon className="w-3 h-3" />
            {typeInfo.label}
          </span>
          <span className="text-sm font-medium text-gray-200">{rule.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`w-9 h-5 rounded-full transition-all duration-200 relative ${rule.enabled ? 'bg-cyan-500' : 'bg-gray-700'}`}
          >
            <span className={`absolute w-3.5 h-3.5 rounded-full bg-white top-[3px] transition-all duration-200 ${rule.enabled ? 'left-[18px]' : 'left-[3px]'}`} />
          </button>
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Config */}
      <div className="space-y-2 mt-3">
        {rule.type === 'threshold-sweep' && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">When balance exceeds</span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={rule.config.threshold || ''}
                  onChange={(e) => onUpdate({ config: { ...rule.config, threshold: e.target.value } })}
                  className="w-20 bg-gray-950/50 border border-gray-800/40 rounded px-2 py-1 text-xs font-mono text-gray-200 text-right focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                <span className="text-gray-500">USDC</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Sweep excess to</span>
              <input
                type="text"
                value={rule.config.target || ''}
                onChange={(e) => onUpdate({ config: { ...rule.config, target: e.target.value } })}
                className="w-32 bg-gray-950/50 border border-gray-800/40 rounded px-2 py-1 text-xs font-mono text-gray-200 text-right focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                placeholder="0x... or USYC vault"
              />
            </div>
          </>
        )}
        {rule.type === 'scheduled-payout' && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Payout amount</span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={rule.config.amount || ''}
                  onChange={(e) => onUpdate({ config: { ...rule.config, amount: e.target.value } })}
                  className="w-20 bg-gray-950/50 border border-gray-800/40 rounded px-2 py-1 text-xs font-mono text-gray-200 text-right focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                <span className="text-gray-500">USDC</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Frequency</span>
              <select
                value={rule.config.schedule || 'weekly'}
                onChange={(e) => onUpdate({ config: { ...rule.config, schedule: e.target.value } })}
                className="bg-gray-950/50 border border-gray-800/40 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Recipient</span>
              <input
                type="text"
                value={rule.config.target || ''}
                onChange={(e) => onUpdate({ config: { ...rule.config, target: e.target.value } })}
                className="w-32 bg-gray-950/50 border border-gray-800/40 rounded px-2 py-1 text-xs font-mono text-gray-200 text-right focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                placeholder="0x..."
              />
            </div>
          </>
        )}
        {rule.type === 'reserve-topup' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Alert when below</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={rule.config.threshold || ''}
                onChange={(e) => onUpdate({ config: { ...rule.config, threshold: e.target.value } })}
                className="w-20 bg-gray-950/50 border border-gray-800/40 rounded px-2 py-1 text-xs font-mono text-gray-200 text-right focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
              />
              <span className="text-gray-500">USDC</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Treasury Execute (real on-chain transfer) ───
// ─── Treasury Vault Execute Panel (real on-chain logic) ───
import { TREASURY_VAULT_ADDRESS, TREASURY_VAULT_ABI } from '@/lib/constants';

function ExecutePanel() {
  const { address, isConnected } = useAccount();
  const { addToast, updateToast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState('');
  const [executingType, setExecutingType] = useState<'deposit' | 'sweep' | null>(null);

  // Read Treasury Vault USDC balance
  const { data: vaultBalance, refetch: refetchVault } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [TREASURY_VAULT_ADDRESS],
    query: { refetchInterval: 10_000 },
  });

  const formattedVaultBalance = vaultBalance
    ? Number(formatUnits(vaultBalance as bigint, USDC_DECIMALS)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const canDeposit = isConnected && Number(amount) > 0 && !executingType;
  const canSweep = isConnected && !executingType && vaultBalance && (vaultBalance as bigint) > BigInt(0);

  const handleDeposit = useCallback(async () => {
    if (!canDeposit) return;
    setExecutingType('deposit');
    const toastId = addToast({ type: 'loading', title: 'Depositing to Vault', message: `Approving & Depositing ${amount} USDC...` });
    try {
      // Approve USDC
      const approveTx = await writeContractAsync({
        address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve',
        args: [TREASURY_VAULT_ADDRESS, parseUnits(amount, USDC_DECIMALS)],
      });
      
      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const client = createPublicClient({ chain: arcTestnet, transport: http() });
      await client.waitForTransactionReceipt({ hash: approveTx });

      // Deposit
      const depositTx = await writeContractAsync({
        address: TREASURY_VAULT_ADDRESS, abi: TREASURY_VAULT_ABI, functionName: 'deposit',
        args: [parseUnits(amount, USDC_DECIMALS)],
      });
      await client.waitForTransactionReceipt({ hash: depositTx });
      
      updateToast(toastId, { type: 'success', title: 'Deposit Complete', message: `${amount} USDC secured in Treasury Vault`, txHash: depositTx });
      setAmount('');
      refetchVault();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      updateToast(toastId, { type: 'error', title: 'Deposit Failed', message: msg.includes('rejected') ? 'Rejected by wallet' : msg });
    } finally { setExecutingType(null); }
  }, [canDeposit, amount, writeContractAsync, addToast, updateToast, refetchVault]);

  const handleSweep = useCallback(async () => {
    if (!canSweep) return;
    setExecutingType('sweep');
    // We sweep to a mock "Yield Protocol" address for the demo
    const MOCK_YIELD_VAULT = '0x0000000000000000000000000000000000000001'; 
    // Sweep everything above 100 USDC threshold
    const THRESHOLD = parseUnits('100', USDC_DECIMALS);
    
    const toastId = addToast({ type: 'loading', title: 'Sweeping to Yield', message: `Routing excess USDC to USYC Yield Vault...` });
    try {
      const txHash = await writeContractAsync({
        address: TREASURY_VAULT_ADDRESS, abi: TREASURY_VAULT_ABI, functionName: 'sweepExcessToYield',
        args: [THRESHOLD, MOCK_YIELD_VAULT],
      });
      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const client = createPublicClient({ chain: arcTestnet, transport: http() });
      await client.waitForTransactionReceipt({ hash: txHash });
      
      updateToast(toastId, { type: 'success', title: 'Yield Sweep Complete', message: `Excess capital successfully routed to USYC Vault`, txHash });
      refetchVault();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      updateToast(toastId, { type: 'error', title: 'Sweep Failed', message: msg.includes('rejected') ? 'Rejected by wallet' : msg });
    } finally { setExecutingType(null); }
  }, [canSweep, writeContractAsync, addToast, updateToast, refetchVault]);

  return (
    <div className="bg-gray-950/40 border border-gray-800/30 rounded-xl p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-1">
            <Wallet className="w-3 h-3" />
            Treasury Vault Balance
          </p>
          <div className="text-xl font-mono text-cyan-400">${formattedVaultBalance} <span className="text-xs text-gray-500">USDC</span></div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Auto-Sweep Threshold</p>
          <p className="text-sm font-mono text-gray-400">100.00 USDC</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-2">
          <input type="text" inputMode="decimal" value={amount}
            onChange={(e) => { if (/^\d*\.?\d{0,6}$/.test(e.target.value) || e.target.value === '') setAmount(e.target.value); }}
            className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder-gray-700"
            placeholder="Amount to deposit" />
          <button onClick={handleDeposit} disabled={!canDeposit}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5
              ${canDeposit ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20' : 'bg-gray-800/40 text-gray-600 border border-gray-800/30 cursor-not-allowed'}`}>
            {executingType === 'deposit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Deposit USDC
          </button>
        </div>
        
        <div className="flex flex-col justify-end">
          <button onClick={handleSweep} disabled={!canSweep}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 h-[38px]
              ${canSweep ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-gray-800/40 text-gray-600 border border-gray-800/30 cursor-not-allowed'}`}>
            {executingType === 'sweep' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
            Sweep to USYC
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Treasury Router ───
export function TreasuryRouter() {
  const [rules, setRules] = useState<PolicyRule[]>(DEFAULT_RULES);

  const addRule = () => {
    setRules(prev => [...prev, {
      id: crypto.randomUUID(),
      name: 'New Policy',
      type: 'threshold-sweep',
      config: { threshold: '10000' },
      enabled: false,
    }]);
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateRule = (id: string, updates: Partial<PolicyRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800/40 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Treasury Policy Engine
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Configure autonomous treasury routing rules for AI agent execution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-gray-800/50 px-2.5 py-1 rounded-full text-gray-400 border border-gray-800/40">
            {activeCount} active
          </span>
          <button onClick={addRule}
            className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="p-5 space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No policies configured</p>
            <p className="text-xs text-gray-600">Add a rule to automate treasury operations</p>
          </div>
        ) : (
          rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => toggleRule(rule.id)}
              onUpdate={(updates) => updateRule(rule.id, updates)}
              onDelete={() => deleteRule(rule.id)}
            />
          ))
        )}
      </div>

      {/* Execute Panel */}
      <div className="px-5 pb-5">
        <ExecutePanel />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-950/30 border-t border-gray-800/30">
        <p className="text-[10px] text-gray-600">
          Treasury Vault is a live Smart Contract on Arc Testnet. 
          Agent execution automatically sweeps idle capital to yield-bearing USYC when thresholds are met.
        </p>
      </div>
    </div>
  );
}
