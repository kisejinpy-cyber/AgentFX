'use client';

import { useState } from 'react';
import { ShieldAlert, Mail, Send, CheckCircle, ExternalLink } from 'lucide-react';

interface ComplianceBlockProps {
  address: string;
  category?: string;
  onDisconnect?: () => void;
}

export function ComplianceBlock({ address, category = 'Sanction Risk / Policy Restriction', onDisconnect }: ComplianceBlockProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !details) return;
    setSubmitting(true);
    // Simulate submission latency
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06)_0,transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-lg bg-gray-900/50 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-100 tracking-tight">Access Prohibited</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider font-mono">
              Compliance Screening Flagged
            </p>
          </div>

          <div className="w-full bg-gray-950/60 border border-gray-800/60 rounded-2xl p-4 text-left space-y-3 font-sans">
            <p className="text-xs text-gray-400 leading-relaxed">
              This system screens all connected wallets against global compliance lists, including Office of Foreign Assets Control (OFAC) sanctions watchlists. Your address has been flagged as high risk.
            </p>
            <div className="pt-1 border-t border-gray-800/40 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Connected Wallet</span>
                <span className="font-mono text-gray-300">{address.slice(0, 8)}...{address.slice(-8)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Restriction Type</span>
                <span className="text-red-400 font-medium">{category}</span>
              </div>
            </div>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmitAppeal} className="w-full space-y-4 text-left pt-2">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Compliance Appeal Request
                </h3>
                <p className="text-[10px] text-gray-600">
                  If you believe this restriction is in error, submit an appeal below.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Full Name / Corporate Entity
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-500/30 transition-all font-sans"
                    placeholder="Enter entity name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Contact Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-500/30 transition-all font-sans"
                    placeholder="treasury@domain.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Explanation / Proof of Identity
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-500/30 transition-all resize-none font-sans"
                    placeholder="Provide details or jurisdiction context..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Appeal Request'}
                <Send className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <div className="w-full bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-5 text-center space-y-2 animate-fade-in">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-xs font-semibold text-emerald-400">Appeal Successfully Submitted</h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Your appeal details have been logged in our secure audit compliance database. Our compliance officer will review your jurisdiction and verify credentials shortly.
              </p>
            </div>
          )}

          <div className="w-full pt-4 flex gap-4 justify-center">
            {onDisconnect && (
              <button
                type="button"
                onClick={onDisconnect}
                className="text-[10px] text-gray-500 hover:text-gray-300 underline transition-colors"
              >
                Disconnect Flagged Wallet
              </button>
            )}
            <a
              href="https://home.treasury.gov/policy-issues/financial-sanctions/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              OFAC SDN List
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
