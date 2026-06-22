import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Shield, Zap, Terminal, Book, Code, ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';
import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Integration Documentation',
  description: 'Integrate Meridian\'s autonomous escrow protocol, programmable developer wallets, zero-gas USDC, and DeepSeek AI swarm verification via simple REST API or smart contracts.',
  keywords: [
    'Meridian developer integration',
    'autonomous escrow smart contracts',
    'circle app kit sdk',
    'arc network testnet deployment',
    'deepseek AI agents api'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io/docs',
  },
  openGraph: {
    title: 'Integration Documentation',
    description: 'Learn how to deploy smart escrows, trigger watchlists audits, and manage developer wallets dynamically.',
    url: 'https://meridian-treasury.io/docs',
    type: 'website',
  },
};

export default function DocsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": "https://meridian-treasury.io/docs/#article",
        "url": "https://meridian-treasury.io/docs",
        "name": "Integration Documentation",
        "headline": "How to Integrate Meridian Autonomous Treasury & Escrow Systems",
        "description": "Developer manual for smart contracts, Circle Programmable Wallets, and DeepSeek AI swarm orchestrations.",
        "inLanguage": "en-US",
        "publisher": {
          "@type": "Organization",
          "name": "Meridian",
          "logo": "https://meridian-treasury.io/favicon.ico"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://meridian-treasury.io"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Docs",
            "item": "https://meridian-treasury.io/docs"
          }
        ]
      }
    ]
  };

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navigation Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      {/* Docs Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Getting Started</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="#introduction" className="block py-1.5 text-cyan-400 font-medium hover:text-cyan-300">
                  Introduction
                </a>
              </li>
              <li>
                <a href="#quickstart" className="block py-1.5 text-gray-400 hover:text-gray-200">
                  Quick Start
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Core Infrastructure</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="#escrow-protocol" className="block py-1.5 text-gray-400 hover:text-gray-200">
                  Smart Escrow Contract
                </a>
              </li>
              <li>
                <a href="#compliance-screening" className="block py-1.5 text-gray-400 hover:text-gray-200">
                  Compliance Watchlist
                </a>
              </li>
              <li>
                <a href="#agent-swarm" className="block py-1.5 text-gray-400 hover:text-gray-200">
                  DeepSeek Swarm Loop
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Developer API</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="#api-reference" className="block py-1.5 text-gray-400 hover:text-gray-200">
                  API Endpoints
                </a>
              </li>
            </ul>
          </div>
        </aside>

        {/* Content Area */}
        <article className="lg:col-span-9 space-y-12 max-w-3xl">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs />
          
          {/* Section: Introduction */}
          <section id="introduction" className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
              <Book className="w-4 h-4" />
              Getting Started
            </div>
            <h1 className="text-3xl font-extrabold text-gray-100">Introduction to Meridian</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Meridian is an <strong>AI-native autonomous treasury and settlement operating system</strong> built to remove friction from cross-border commerce. Powered by the <strong>Arc Network</strong> (using native USDC gas) and <strong>Circle Developer Suite</strong>, it enables trustless, instant B2B transactions.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              By deploying programmable smart escrows governed by a decentralized consensus-seeking AI swarm, Meridian automates compliance checks, shipping logistics monitoring, and payment releases without intermediaries.
            </p>
          </section>

          {/* Section: Quick Start */}
          <section id="quickstart" className="space-y-4 border-t border-gray-900 pt-8">
            <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
              <Zap className="w-4 h-4" />
              Developer Guide
            </div>
            <h2 className="text-2xl font-bold text-gray-100">Quick Start</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Set up and trigger your first autonomous agent escrow in three simple API commands.
            </p>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-300">1. Authenticate with Circle Developer Account</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Add your Developer Credentials and entity secrets to the local environmental settings:
              </p>
              <div className="bg-gray-950 border border-gray-850 rounded-xl p-4 font-mono text-[11px] text-gray-300 space-y-1">
                <div>CIRCLE_API_KEY=your_circle_api_key_here</div>
                <div>CIRCLE_ENTITY_SECRET=your_hex_entity_secret</div>
                <div>DEEPSEEK_API_KEY=your_deepseek_api_key</div>
              </div>

              <h3 className="text-xs font-bold text-gray-300">2. Deploy a New Escrow Contract</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Deploy the Auto Escrow contract to the Arc Testnet using standard hardhat / forge configs:
              </p>
              <div className="bg-gray-950 border border-gray-850 rounded-xl p-4 font-mono text-[11px] text-gray-300">
                npx hardhat run scripts/deploy.js --network arcTestnet
              </div>
            </div>
          </section>

          {/* Section: Core Features */}
          <section id="escrow-protocol" className="space-y-4 border-t border-gray-900 pt-8">
            <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
              <Shield className="w-4 h-4" />
              Smart Escrow Protocol
            </div>
            <h2 className="text-2xl font-bold text-gray-100">Smart Escrow Contract</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              The on-chain escrow contract governs locking, releasing, and disputing funds. All operations are paid natively in USDC gas token.
            </p>
            <div className="bg-gray-950 border border-gray-850 rounded-xl p-4 font-mono text-[11px] text-gray-300 max-h-60 overflow-y-auto">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AutoEscrow {
    enum Status { None, Active, InProgress, Completed, Disputed, Refunded }

    struct Job {
        address buyer;
        address seller;
        address worker;
        uint256 amount;
        string description;
        Status status;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public nextEscrowId;

    function createJob(address seller, uint256 amount, string memory desc) external returns (uint256) {
        // Creates a new escrow job locked on-chain...
    }
}`}
            </div>
          </section>

          {/* Section: API Reference */}
          <section id="api-reference" className="space-y-4 border-t border-gray-900 pt-8">
            <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
              <Code className="w-4 h-4" />
              REST API
            </div>
            <h2 className="text-2xl font-bold text-gray-100">API Endpoints</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Trigger automated agent audits via standard HTTPS requests. Supported parameters and responses:
            </p>
            
            <div className="bg-gray-950 border border-gray-850 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">POST</span>
                <span className="font-mono text-xs text-gray-300">/api/agent</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Trigger compliance audit and on-chain payout settlement.
              </p>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Request Body</h4>
              <pre className="bg-gray-900/50 border border-gray-850 p-3 rounded font-mono text-[10px] text-gray-300">
{`{
  "action": "swarm-task",
  "task": "Perform compliance check on PO-9942 and execute payout if delivered",
  "userAddress": "0x2bcb1747ca1f4fbea8e0d68cbca5dc48e6a18a01"
}`}
              </pre>
            </div>
          </section>

          {/* Action Link */}
          <div className="pt-8 space-y-8 border-t border-gray-900">
            <CtaBlock context="docs" />
            <RelatedContent currentSlug="docs" category="Documentation" tags={["escrow", "watchlist", "sdk"]} />
          </div>

        </article>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
