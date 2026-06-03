'use client';

import { useState, useEffect } from 'react';
import { useConnect, useDisconnect, useAccount } from 'wagmi';
import { Lock, Mail, ShieldAlert, Loader2, X, CheckCircle, Smartphone } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function CircleAuthModal() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<'auth' | 'challenge'>('auth');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Challenge Transaction Info
  const [txPayload, setTxPayload] = useState<any>(null);

  // Listen to the window events for transaction signing intercept
  useEffect(() => {
    const handleSignRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      setTxPayload(customEvent.detail.tx);
      setModalType('challenge');
      setPin(''); // Reset PIN for security
      setIsOpen(true);
    };

    const handleOpenAuth = () => {
      setModalType('auth');
      setIsOpen(true);
    };

    window.addEventListener('circle-sign-transaction', handleSignRequest);
    window.addEventListener('circle-open-auth', handleOpenAuth);

    return () => {
      window.removeEventListener('circle-sign-transaction', handleSignRequest);
      window.removeEventListener('circle-open-auth', handleOpenAuth);
    };
  }, []);

  const handleClose = () => {
    if (modalType === 'challenge') {
      // Reject transaction promise on close
      window.dispatchEvent(
        new CustomEvent('circle-sign-failure', {
          detail: { error: 'Transaction canceled by user' },
        })
      );
    }
    setIsOpen(false);
    setPin('');
    setLoading(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || pin.length < 4) return;

    setLoading(true);
    try {
      const res = await fetch('/api/circle-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, pin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate');

      // Save credentials locally for provider connection
      localStorage.setItem('circle_wallet_address', data.address);
      localStorage.setItem('circle_user_token', data.userToken);
      localStorage.setItem('circle_email', email);

      // Trigger Wagmi connection
      const circleConnectorInstance = connectors.find((c) => c.id === 'circle');
      if (circleConnectorInstance) {
        connect({ connector: circleConnectorInstance });
      }

      addToast({
        type: 'success',
        title: 'Circle Account Linked',
        message: `Secure Smart Account provisioned at ${data.address.substring(0, 8)}...`,
      });

      setIsOpen(false);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message || 'Check credentials and network',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || !txPayload) return;

    setLoading(true);
    try {
      const storedEmail = localStorage.getItem('circle_email') || email;
      const res = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: storedEmail,
          pin,
          tx: txPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // Dispatch success event to provider
      window.dispatchEvent(
        new CustomEvent('circle-sign-success', {
          detail: { to: txPayload.to, data: txPayload.data, hash: data.hash },
        })
      );

      setIsOpen(false);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('circle-sign-failure', {
          detail: { error: err.message },
        })
      );
      addToast({
        type: 'error',
        title: 'Authorization Rejected',
        message: err.message || 'Incorrect security PIN code',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-gray-950 border border-gray-800/80 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden">
        {/* Decorative ambient background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {modalType === 'auth' ? (
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center border border-cyan-500/30">
                <Smartphone className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-base font-semibold text-gray-100">
                Embedded Circle Smart Account
              </h3>
            </div>
            <p className="text-gray-500 text-xs mb-5">
              Secure Web2-native login. Your wallet is protected by Multi-Party Computation (MPC).
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all placeholder-gray-700 font-mono text-gray-200"
                    placeholder="treasury@corporate.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Security PIN (6 digits)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all placeholder-gray-700 font-mono tracking-widest text-gray-200"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email || pin.length < 4}
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-[var(--glow-cyan)] hover:shadow-[var(--glow-cyan-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-xs flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Sign In & Provision Wallet
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center border border-amber-500/30 animate-pulse">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-base font-semibold text-gray-100">
                Circle Security PIN Verification
              </h3>
            </div>
            <p className="text-gray-500 text-xs mb-5">
              Confirm contract interaction on Arc Testnet. This request was intercepted for protection.
            </p>

            {txPayload && (
              <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-3 mb-5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Destination Contract</span>
                  <span className="font-mono text-gray-400">{txPayload.to.substring(0, 14)}...</span>
                </div>
                {txPayload.data && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Call Payload Size</span>
                    <span className="font-mono text-gray-400">{Math.ceil(txPayload.data.length / 2 - 1)} bytes</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleChallengeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Enter Your Security PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="password"
                    required
                    autoFocus
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all placeholder-gray-700 font-mono tracking-widest text-gray-200"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-400 font-medium py-2.5 rounded-xl transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || pin.length < 4}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold py-2.5 rounded-xl shadow-[var(--glow-cyan)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-xs flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Verify & Sign
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
