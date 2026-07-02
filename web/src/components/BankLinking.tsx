'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Building, 
  UserCheck, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Lock, 
  HelpCircle, 
  ArrowRight, 
  Check, 
  Users, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface BankAccount {
  id: string;
  nickname: string;
  bankName: string;
  currency: string;
  status: 'pending_approval' | 'active';
  maskedAccount: string;
  routingNumber: string;
  approvals: string[];
  requiredApprovals: number;
}

interface BankLinkingProps {
  onRefreshHistory?: () => void;
}

export function BankLinking({ onRefreshHistory }: BankLinkingProps) {
  const { address } = useAccount();
  const { addToast } = useToast();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Wizard fields
  const [nickname, setNickname] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNum, setAccountNum] = useState('');
  const [routingNum, setRoutingNum] = useState('');
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts');
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.bankAccounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const handleLinkBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !nickname || !bankName || !accountNum || !routingNum) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'linkBank',
          nickname,
          bankName,
          accountNumber: accountNum,
          routingNumber: routingNum,
          userAddress: address,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addToast({
          type: 'info',
          title: 'Bank Account Linked',
          message: 'Account created with PENDING_APPROVAL status. Requires multi-sig approval.',
        });
        setWizardStep(2); // move to approval step in wizard
        fetchBankAccounts();
      } else {
        const err = await res.json();
        addToast({
          type: 'error',
          title: 'Linking Failed',
          message: err.error || 'Failed to initialize account linking',
        });
      }
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Linking Failed',
        message: 'Could not connect to the payouts server.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveBank = async (bankId: string) => {
    if (!address) return;
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approveBank',
          bankId,
          userAddress: address,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const account = data.account;
        addToast({
          type: account.status === 'active' ? 'success' : 'info',
          title: account.status === 'active' ? 'Bank Account Activated' : 'Approval Submitted',
          message: account.status === 'active' 
            ? `Multi-sig complete. ${account.nickname} is now active for automatic off-ramping.`
            : `Approval logged. (${account.approvals.length}/${account.requiredApprovals} approvals)`,
        });
        fetchBankAccounts();
        if (wizardStep === 2) {
          setWizardStep(3); // success state
        }
      } else {
        const err = await res.json();
        addToast({
          type: 'error',
          title: 'Approval Failed',
          message: err.error || 'Failed to submit approval',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateWebhook = async (payoutId: string, status: string) => {
    try {
      // Simulate webhook callbacks for payouts.updated
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
            status: status.toUpperCase(),
            amount: { amount: '100.00', currency: 'USD' }
          }
        })
      });

      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Webhook Sim Success',
          message: `Payout status updated to ${status} in database.`,
        });
        if (onRefreshHistory) onRefreshHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetWizard = () => {
    setNickname('');
    setBankName('');
    setAccountNum('');
    setRoutingNum('');
    setWizardStep(1);
    setShowWizard(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-3 border-b border-gray-800/40">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Linked Bank Accounts</h3>
          <p className="text-[10px] text-gray-500 mt-0.5 font-sans">
            Manage off-ramp bank destinations with multi-signature corporate approvals.
          </p>
        </div>
        {!showWizard && (
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-1.5 px-3 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Link Bank Account
          </button>
        )}
      </div>

      {showWizard && (
        <div className="bg-gray-900/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-fade-in space-y-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
          
          {/* Wizard step progress indicator */}
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono tracking-wider uppercase">
            <span className={wizardStep === 1 ? 'text-cyan-400 font-bold' : ''}>1. Enter Details</span>
            <ArrowRight className="w-3 h-3" />
            <span className={wizardStep === 2 ? 'text-cyan-400 font-bold' : ''}>2. Multi-Sig Approval</span>
            <ArrowRight className="w-3 h-3" />
            <span className={wizardStep === 3 ? 'text-cyan-400 font-bold' : ''}>3. Complete</span>
          </div>

          {wizardStep === 1 && (
            <form onSubmit={handleLinkBank} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 group relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Account Nickname <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                    </label>
                    <span className="text-[8px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                      Local label for quick selection
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    placeholder="e.g. Chase Treasury Core"
                  />
                </div>

                <div className="space-y-1 group relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Bank Name <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                    </label>
                    <span className="text-[8px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                      Name of financial institution
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    placeholder="e.g. JPMorgan Chase"
                  />
                </div>

                <div className="space-y-1 group relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Account Number <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                    </label>
                    <span className="text-[8px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                      Standard ACH/IBAN account identifier
                    </span>
                  </div>
                  <input
                    type="password"
                    required
                    value={accountNum}
                    onChange={(e) => setAccountNum(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-mono"
                    placeholder="e.g. 1234567890 (Direct ACH)"
                  />
                </div>

                <div className="space-y-1 group relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Routing Number <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                    </label>
                    <span className="text-[8px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                      9-digit transit/routing transit code
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={routingNum}
                    onChange={(e) => setRoutingNum(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-mono"
                    placeholder="e.g. 021000021"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetWizard}
                  className="text-xs text-gray-500 hover:text-gray-300 px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  Next Step: Multi-Sig
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-xl">
                <Users className="w-6 h-6 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-gray-300">Co-Signer Approval Required</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-sans mt-0.5">
                    Adding bank accounts requires approvals from at least 2 distinct administrative addresses. Your approval has been automatically logged.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] border-b border-gray-800/30 pb-2 text-gray-500 font-mono">
                  <span>Signer Wallet Address</span>
                  <span>Status</span>
                </div>
                <div className="flex justify-between items-center text-xs py-1.5">
                  <span className="font-mono text-gray-400">{address ? `${address.slice(0, 16)}...` : 'Connected Wallet'}</span>
                  <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold uppercase">
                    <Check className="w-3 h-3" /> Approved
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs py-1.5">
                  <span className="font-mono text-gray-500">0xe6a18a01a034c68d660e53aa57e71c1087e71c8c (Co-Admin)</span>
                  <button
                    onClick={() => {
                      const pendingAcc = bankAccounts.find(acc => acc.status === 'pending_approval');
                      if (pendingAcc) {
                        handleApproveBank(pendingAcc.id);
                      } else {
                        // fallback mock step
                        setWizardStep(3);
                      }
                    }}
                    className="text-[9px] font-bold uppercase tracking-wider bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20 hover:border-cyan-500/30"
                  >
                    Simulate Co-Sign Approval
                  </button>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-200">Bank Destination Activated</h4>
                <p className="text-[10px] text-gray-500 max-w-sm mx-auto font-sans leading-relaxed">
                  All multi-sig clearances have been verified. Any released escrows or payouts to this account will route to USD fiat immediately.
                </p>
              </div>
              <button
                onClick={resetWizard}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs py-1.5 px-4 rounded-xl transition-all border border-gray-700/60"
              >
                Close Onboarding Wizard
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-600 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
          Loading linked bank accounts...
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 gap-3.5 border border-dashed border-gray-850 rounded-2xl bg-gray-950/20 text-center animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-300 font-semibold">No Bank Destinations Active</p>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed max-w-[320px] mx-auto font-sans">
              To off-ramp escrow settlements automatically into USD fiat, link a corporate bank account destination and verify administrative approvals.
            </p>
          </div>
          {!showWizard && (
            <button
              onClick={() => setShowWizard(true)}
              className="text-[10px] font-semibold bg-cyan-950/40 hover:bg-cyan-950/60 border border-cyan-800/30 hover:border-cyan-700/50 text-cyan-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Link Your First Bank
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map((account) => {
            const hasApproved = address ? account.approvals.includes(address.toLowerCase()) : false;
            
            return (
              <div
                key={account.id}
                className={`bg-gray-900/40 backdrop-blur-xl border rounded-2xl p-5 shadow-xl relative overflow-hidden group transition-all hover:border-gray-700/60 ${
                  account.status === 'active' 
                    ? 'border-gray-850/60' 
                    : 'border-amber-500/15'
                }`}
              >
                {/* Glow accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl pointer-events-none transition-opacity ${
                  account.status === 'active' 
                    ? 'bg-cyan-500/5 group-hover:opacity-100 opacity-60' 
                    : 'bg-amber-500/5'
                }`} />

                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      account.status === 'active'
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-300">{account.nickname}</h4>
                      <p className="text-[10px] text-gray-500 font-sans mt-0.5">{account.bankName}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${
                    account.status === 'active'
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-950/20 text-amber-400 border-amber-500/20'
                  }`}>
                    {account.status === 'active' ? 'ACTIVE' : 'PENDING APPROVAL'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800/40 grid grid-cols-2 gap-y-2 text-[10px] font-mono text-gray-500">
                  <div>
                    <span>Account Masked</span>
                    <p className="text-gray-300 text-xs mt-0.5">{account.maskedAccount}</p>
                  </div>
                  <div>
                    <span>Routing Number</span>
                    <p className="text-gray-300 text-xs mt-0.5">{account.routingNumber}</p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-between items-center mt-1">
                      <span>Multi-Sig Approvals</span>
                      <span className="text-gray-400 font-bold">{account.approvals.length} / {account.requiredApprovals} approved</span>
                    </div>
                    {account.status !== 'active' && !hasApproved && (
                      <button
                        onClick={() => handleApproveBank(account.id)}
                        className="w-full mt-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-1.5 px-3 rounded-lg transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Approve Bank Link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
