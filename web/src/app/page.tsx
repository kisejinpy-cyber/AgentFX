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
import {
  ExternalLink,
  BookOpen,
  Shield,
  Zap,
  Send,
  Cpu,
  LayoutDashboard,
  Bot,
} from 'lucide-react';
import { AUTO_ESCROW_ADDRESS, explorerAddressUrl } from '@/lib/constants';

type TabKey = 'escrow' | 'payments' | 'treasury' | 'agents';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('escrow');

  const tabs = [
    { key: 'escrow' as const, label: 'Escrow', icon: Zap, desc: 'Agent-verified smart escrow' },
    { key: 'payments' as const, label: 'Payments', icon: Send, desc: 'Send, bridge & faucet' },
    { key: 'treasury' as const, label: 'Treasury', icon: Cpu, desc: 'Policy engine & routing' },
    { key: 'agents' as const, label: 'Agents', icon: Bot, desc: 'Programmable Wallets' },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-800/40 bg-gray-950/30 backdrop-blur-sm sticky top-0 z-30">
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

      {/* Dashboard Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* ─── Escrow Tab ─── */}
        {activeTab === 'escrow' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-fade-in">
            <div className="lg:col-span-4 space-y-6">
              <EscrowForm />
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
            </div>
            <div className="lg:col-span-8 space-y-6">
              <StatsRow />
              <EscrowTable />
              <ActivityLog />
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
              <StatsRow />
              {/* Circle Integration Info */}
              <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-200">Circle Developer Suite</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Meridian integrates Circle's developer infrastructure for enterprise-grade stablecoin operations.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'USDC', desc: 'Settlement rail', status: 'active' },
                    { name: 'CCTP v2', desc: 'Cross-chain bridge', status: 'integrated' },
                    { name: 'App Kit', desc: 'Unified Balance SDK', status: 'integrated' },
                    { name: 'Wallets', desc: 'Embedded key mgmt', status: 'planned' },
                    { name: 'Gateway', desc: 'Treasury routing', status: 'planned' },
                    { name: 'Nanopayments', desc: 'Micro-transactions', status: 'planned' },
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
            </div>
            <div className="lg:col-span-4">
              <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Circle Integration</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  The Agent Fleet uses Circle Programmable Wallets to abstract private key management. 
                  When an escrow event is detected, the agent backend requests a signature via Circle API.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-900/10 px-2.5 py-1.5 rounded border border-emerald-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gas Station Enabled (Zero-Gas for Agent)
                </div>
              </div>
            </div>
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
