'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { EscrowForm } from '@/components/EscrowForm';
import { StatsRow } from '@/components/StatsRow';
import { EscrowTable } from '@/components/EscrowTable';
import { ActivityLog } from '@/components/ActivityLog';
import { PaymentsPanel } from '@/components/PaymentsPanel';
import { TreasuryRouter } from '@/components/TreasuryRouter';
import { AgentFleetPanel } from '@/components/AgentFleetPanel';
import { AgentSwarmPlayground } from '@/components/AgentSwarmPlayground';
import { AgentDirectory } from '@/components/AgentDirectory';
import { CurrencyConverter } from '@/components/CurrencyConverter';
import { NotificationSettings } from '@/components/NotificationSettings';
import { DisputeBoard } from '@/components/DisputeBoard';
import { ComplianceDashboard } from '@/components/ComplianceDashboard';
import { WalletAnalytics } from '@/components/WalletAnalytics';
import {
  ExternalLink,
  BookOpen,
  Shield,
  Zap,
  Send,
  Cpu,
  Bot,
  Bell,
  Gavel,
  ShieldCheck,
} from 'lucide-react';
import { AUTO_ESCROW_ADDRESS, explorerAddressUrl } from '@/lib/constants';

type TabKey = 'escrow' | 'payments' | 'treasury' | 'agents' | 'disputes' | 'alerts' | 'compliance';

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('escrow');
  const [agentAddress, setAgentAddress] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const tabs = [
    { key: 'escrow' as const, label: 'Escrow', icon: Zap, desc: 'Agent-verified smart escrow' },
    { key: 'payments' as const, label: 'Payments', icon: Send, desc: 'Send, bridge & faucet' },
    { key: 'treasury' as const, label: 'Treasury', icon: Cpu, desc: 'Policy engine & routing' },
    { key: 'agents' as const, label: 'Agents', icon: Bot, desc: 'Programmable Wallets' },
    { key: 'disputes' as const, label: 'Disputes', icon: Gavel, desc: 'Consensus Dispute Board' },
    { key: 'alerts' as const, label: 'Alerts', icon: Bell, desc: 'Real-time webhook events' },
    { key: 'compliance' as const, label: 'Compliance', icon: ShieldCheck, desc: 'AML / Screening logs' },
  ];

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      {/* Navigation Tabs (Desktop Only) */}
      <div className="hidden md:block border-b border-gray-800/40 bg-gray-950/30 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-none">
            {tabs.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap
                  ${activeTab === key
                    ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-700'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className="hidden sm:inline text-[10px] text-gray-600 font-normal">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-950/90 backdrop-blur-2xl border-t border-gray-800/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.slice(0, 4).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setShowMoreMenu(false);
              }}
              className={`flex flex-col items-center gap-1.5 py-1.5 px-2.5 transition-all duration-200 relative
                ${activeTab === key && !showMoreMenu
                  ? 'text-cyan-400 font-semibold'
                  : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              {activeTab === key && !showMoreMenu && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-cyan-400 shadow-[0_0_12px_#22d3ee] rounded-full animate-fade-in" />
              )}
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[10px] tracking-wide font-sans">{label}</span>
            </button>
          ))}
          
          {/* More button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center gap-1.5 py-1.5 px-2.5 transition-all duration-200 relative
              ${showMoreMenu || tabs.slice(4).some(t => t.key === activeTab)
                ? 'text-purple-400 font-semibold'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {(showMoreMenu || tabs.slice(4).some(t => t.key === activeTab)) && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-purple-400 shadow-[0_0_12px_#a855f7] rounded-full animate-fade-in" />
            )}
            <div className="w-4.5 h-4.5 flex flex-col items-center justify-center gap-0.5">
              <span className={`w-1 h-1 rounded-full bg-current transition-all duration-200 ${showMoreMenu ? 'scale-125' : ''}`} />
              <span className={`w-1 h-1 rounded-full bg-current transition-all duration-200 ${showMoreMenu ? 'scale-125' : ''}`} />
              <span className={`w-1 h-1 rounded-full bg-current transition-all duration-200 ${showMoreMenu ? 'scale-125' : ''}`} />
            </div>
            <span className="text-[10px] tracking-wide font-sans">More</span>
          </button>
        </div>
      </div>

      {/* Mobile "More" Menu Overlay Drawer */}
      {showMoreMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-30 md:hidden animate-fade-in"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-4 right-4 z-40 bg-gray-950/95 backdrop-blur-2xl border border-gray-800/80 rounded-2xl p-4 shadow-2xl md:hidden animate-slide-up space-y-3.5 max-w-sm mx-auto">
            <div className="flex items-center justify-between border-b border-gray-800/40 pb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Treasury Modules</h3>
              <span className="text-[9px] font-bold bg-purple-950/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-900/30 uppercase tracking-wider font-mono">Secondary</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tabs.slice(4).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setShowMoreMenu(false);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-1.5 text-center
                    ${activeTab === key
                      ? 'bg-purple-950/25 border-purple-500/40 text-purple-300'
                      : 'bg-gray-900/40 border-gray-850/60 text-gray-400 hover:text-gray-200 hover:border-gray-700/60'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Dashboard Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 sm:pb-12">

        {/* ─── Escrow Tab ─── */}
        {activeTab === 'escrow' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              <div className="lg:col-span-4 space-y-6">
                <EscrowForm agentAddress={agentAddress} setAgentAddress={setAgentAddress} />
                {/* How It Works */}
                <div className="bg-gray-900/30 border border-gray-800/30 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">How It Works</h3>
                  <div className="space-y-2.5">
                    {[
                      { step: '1', text: 'Buyer locks USDC into agent-verified escrow' },
                      { step: '2', text: 'AI agent monitors delivery via oracle/webhook' },
                      { step: '3', text: 'Upon verification, agent releases funds to seller' },
                      { step: '4', text: 'If disputed, agent or seller can initiate refund' },
                    ].map(({ step, text }) => (
                      <div key={step} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] text-cyan-400 font-bold">{step}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <CurrencyConverter />
              </div>
              <div className="lg:col-span-8 space-y-6">
                <StatsRow />
                <EscrowTable />
                <ActivityLog />
              </div>
            </div>
            {/* Agent Directory */}
            <div>
              <AgentDirectory
                onSelectAgent={(address) => {
                  setAgentAddress(address);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        )}

        {/* ─── Payments Tab ─── */}
        {activeTab === 'payments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-fade-in">
            <div className="lg:col-span-5">
              <PaymentsPanel />
            </div>
            <div className="lg:col-span-7 space-y-6">
              <WalletAnalytics />
              {/* Circle Integration Info */}
              <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-200">Circle Developer Suite</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Meridian integrates Circle's developer infrastructure for enterprise-grade stablecoin operations.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'USDC', desc: 'Settlement rail', status: 'active' },
                    { name: 'CCTP v2', desc: 'Cross-chain bridge', status: 'active' },
                    { name: 'App Kit', desc: 'Unified Balance SDK', status: 'active' },
                    { name: 'Wallets', desc: 'Embedded key mgmt', status: 'active' },
                    { name: 'Gateway', desc: 'Treasury routing', status: 'active' },
                    { name: 'Nanopayments', desc: 'Micro-transactions', status: 'active' },
                  ].map(({ name, desc, status }) => (
                    <div key={name} className="bg-gray-950/40 border border-gray-800/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-200">{name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium
                          ${status === 'active' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30' :
                            status === 'integrated' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30' :
                            'bg-gray-800/30 text-gray-500 border border-gray-800/30'}`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Treasury Tab ─── */}
        {activeTab === 'treasury' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-fade-in">
            <div className="lg:col-span-12">
              <StatsRow />
            </div>
            <div className="lg:col-span-12">
              <TreasuryRouter />
            </div>
          </div>
        )}

        {/* ─── Agents Tab ─── */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl w-full mx-auto animate-fade-in">
            <div className="lg:col-span-8 space-y-6">
              <AgentFleetPanel />
              <AgentSwarmPlayground />
            </div>
            <div className="lg:col-span-4">
              <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Circle Integration</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  The Agent Fleet uses Circle Programmable Wallets to abstract private key management. 
                  When an escrow event is detected, the agent backend requests a signature via Circle API.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-400/10 px-2.5 py-1.5 rounded border border-emerald-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gas Station Enabled (Zero-Gas for Agent)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Disputes Tab ─── */}
        {activeTab === 'disputes' && (
          <div className="max-w-7xl mx-auto animate-fade-in">
            <DisputeBoard />
          </div>
        )}

        {/* ─── Alerts Tab ─── */}
        {activeTab === 'alerts' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <NotificationSettings />
          </div>
        )}

        {/* ─── Compliance Tab ─── */}
        {activeTab === 'compliance' && (
          <div className="max-w-7xl mx-auto animate-fade-in">
            <ComplianceDashboard />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            <Shield className="w-3.5 h-3.5" />
            <span>Built on Arc Network • USDC Native Gas • Sub-second Finality</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={explorerAddressUrl(AUTO_ESCROW_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
            >
              Contract
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="https://developers.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
            >
              Circle Docs
              <BookOpen className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
