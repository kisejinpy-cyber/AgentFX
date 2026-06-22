'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';
import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

interface FAQItem {
  q: string;
  a: string;
  category: string;
}

export default function FaqClient() {
  const [search, setSearch] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      category: 'General',
      q: 'What is Meridian Treasury OS?',
      a: 'Meridian is an autonomous, AI-driven treasury management and settlement system for international B2B transactions. It replaces traditional middle-men escrow systems with smart contracts and automated agent swarms that verify delivery and compliance details in real-time.'
    },
    {
      category: 'General',
      q: 'Is Meridian safe to use?',
      a: 'Yes. Meridian is designed with safety as its primary pillar. It does not control user keys. All smart contracts are open-source and run on the decentralized Arc Network. Agent swarms only execute actions on-chain when verified terms are satisfied.'
    },
    {
      category: 'Technical',
      q: 'What is the Arc Network?',
      a: 'Arc is a sub-second finality blockchain network designed for high-performance stablecoin transactions where USDC is the native gas token. This removes the need for users to maintain gas tokens like ETH, simplify billing, and predict settlement costs.'
    },
    {
      category: 'Technical',
      q: 'How does the DeepSeek Agent Swarm work?',
      a: 'The swarm consists of specialized AI agents: a Coordinator, a Logistics Oracle, a Compliance Auditor, and a Treasury Settler. Each agent performs their check (such as screening watchlists or looking up airway bills) and seeks consensus before executing payment triggers.'
    },
    {
      category: 'Circle Integration',
      q: 'What parts of the Circle Developer Suite are integrated?',
      a: 'Meridian integrates Circle Programmable Wallets for abstracting private keys, CCTP v2 for zero-slippage cross-chain bridging of USDC, Circle Gateway for unified multi-chain balance management, and Circle Developer-Controlled Wallets for automated agent operations.'
    },
    {
      category: 'Circle Integration',
      q: 'How do nanopayments work?',
      a: 'Nanopayments use the x402 pay-per-use protocol. Each swarm task execution deducts a micro-payment ($0.00001 USDC) from your prefunded balance. This allows developers to consume agent features without complex billing commitments.'
    }
  ];

  const filteredFaqs = faqs.filter(item => 
    item.q.toLowerCase().includes(search.toLowerCase()) || 
    item.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Navigation Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs />
        
        {/* Page Title & Intro */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
            <HelpCircle className="w-4 h-4" />
            Support Center
          </div>
          <h1 className="text-3xl font-extrabold text-gray-100">Frequently Asked Questions</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Find answers to common questions about the Meridian settlement system, smart contracts, and stablecoin infrastructure.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or categories..."
            className="w-full pl-11 pr-4 py-3 bg-gray-950 border border-gray-850 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center p-8 text-xs text-gray-500">
               No matching questions found. Try search keywords like "Arc", "Circle", or "Swarm".
            </div>
          ) : (
            filteredFaqs.map((item, idx) => {
              const isOpen = expandedIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-gray-900/20 border border-gray-850 hover:border-gray-800 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setExpandedIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-semibold text-gray-200">{item.q}</h4>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-gray-400 leading-relaxed border-t border-gray-900/40">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action Callouts */}
        <div className="pt-4 space-y-6">
          <CtaBlock context="support" />
          <RelatedContent currentSlug="faq" category="Support Center" tags={["support"]} />
        </div>

      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
