import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CtaSection } from '@/components/CtaSection';
import { Footer } from '@/components/Footer';
import { 
  Shield, 
  Zap, 
  Cpu, 
  Send, 
  Bot, 
  CheckCircle, 
  ArrowRight, 
  Lock, 
  AlertCircle, 
  RefreshCw, 
  Fingerprint, 
  ExternalLink 
} from 'lucide-react';

export const metadata: Metadata = {
  title: {
    absolute: 'Meridian Treasury OS | Stablecoin Commerce Stack for AI Agents',
  },
  description: 'Unlock sub-second cross-border settlements with autonomous AI treasury. Meridian automates smart escrows, complies with real-time watchlist screening, and manages multi-chain routing natively using USDC.',
  keywords: [
    'stablecoin treasury',
    'AI agent commerce',
    'smart escrow',
    'circle app kit',
    'circle bridge kit',
    'USDC native gas',
    'Arc Network',
    'B2B settlement',
    'OFAC compliance screening',
    'cross-border payment infrastructure'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io',
  },
  openGraph: {
    title: 'Meridian Treasury OS | Stablecoin Commerce Stack for AI Agents & SMEs',
    description: 'Autonomous B2B payment rails. Smart escrows, zero-gas USDC payments, real-time watchlist screening, and dynamic multi-chain routing.',
    url: 'https://meridian-treasury.io',
    siteName: 'Meridian Treasury OS',
    images: [
      {
        url: 'https://meridian-treasury.io/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Meridian Treasury OS Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meridian Treasury OS | Stablecoin Commerce Stack for AI Agents',
    description: 'Autonomous B2B payment rails. Smart escrows, zero-gas USDC payments, real-time watchlist screening, and dynamic multi-chain routing.',
    images: ['https://meridian-treasury.io/og-image.png'],
  },
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://meridian-treasury.io/#organization",
        "name": "Meridian",
        "url": "https://meridian-treasury.io",
        "logo": "https://meridian-treasury.io/favicon.ico",
        "sameAs": [
          "https://twitter.com/meridian_os",
          "https://github.com/meridian-treasury"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://meridian-treasury.io/#website",
        "url": "https://meridian-treasury.io",
        "name": "Meridian Treasury OS",
        "description": "Stablecoin Commerce Stack for AI Agents & SMEs",
        "publisher": {
          "@id": "https://meridian-treasury.io/#organization"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://meridian-treasury.io/#software",
        "name": "Meridian Treasury OS",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "description": "AI-native autonomous treasury and settlement operating system for stablecoin commerce.",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        }
      }
    ]
  };

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)] overflow-x-hidden">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-20 pb-16 text-center space-y-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          Autonomous Treasury OS for Web3 B2B
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-100 max-w-4xl mx-auto leading-[1.1]">
          The Stablecoin Commerce Stack for <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI Agents & SMEs</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Unlock sub-second cross-border settlements. Meridian automates smart escrows, complies with real-time watchlist screening, and manages developer-controlled multi-chain routing.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-300 shadow-[var(--glow-cyan)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Interactive App
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900/60 hover:bg-gray-800/80 text-gray-300 border border-gray-800/60 px-8 py-3.5 rounded-xl transition-all duration-300"
          >
            Read Integration Docs
          </Link>
        </div>

        {/* Live Interface Preview Mockup */}
        <div className="pt-10 max-w-5xl mx-auto">
          <div className="bg-gray-950 border border-gray-800/60 rounded-2xl p-2 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-blue-500/5 opacity-80" />
            <div className="bg-gray-900/50 border border-gray-800/30 rounded-xl p-5 sm:p-8 space-y-6 text-left relative z-10">
              {/* Fake Dashboard Header */}
              <div className="flex items-center justify-between border-b border-gray-800/50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="text-[10px] text-gray-500 font-mono bg-gray-950 border border-gray-850 px-3 py-1 rounded">
                  meridian.os/dashboard
                </div>
              </div>
              {/* Showcase Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-950 border border-gray-850 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Agent Escrows</span>
                  <div className="text-xl font-mono text-cyan-400 font-bold">$125,000 USDC</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    AI-Verified Delivery
                  </div>
                </div>
                <div className="bg-gray-950 border border-gray-850 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Active Swarms</span>
                  <div className="text-xl font-mono text-gray-200 font-bold">4 Fleet Agents</div>
                  <div className="text-[10px] text-indigo-400 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    Powered by DeepSeek AI
                  </div>
                </div>
                <div className="bg-gray-950 border border-gray-850 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Network Finality</span>
                  <div className="text-xl font-mono text-blue-400 font-bold">&lt; 0.8 Seconds</div>
                  <div className="text-[10px] text-gray-500">Arc Testnet Gas-Native</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="bg-gray-950/40 border-y border-gray-900 py-20">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-100">
              The Pain of Cross-Border B2B Supply Chain Settlements
            </h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              Traditional wire transfers are slow, expensive, and lack delivery insurance. Escrow services charge hefty fees and require human intermediaries. Compliance audits occur post-settlement, creating extreme regulatory risk.
            </p>
            <div className="space-y-4">
              {[
                { title: "Manual Escrow Disputes", desc: "Settling goods disputes takes weeks of back-and-forth communication." },
                { title: "Watchlist Exposure Risk", desc: "Routing funds without instant screening risks dealing with sanctioned entities." },
                { title: "Fragmented Chain Balances", desc: "Managing stablecoin pools across separate blockchains leads to capital inefficiency." }
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500/80 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-200">{title}</h4>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/30 border border-gray-850 rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-cyan-400">
              Meridian: The Autonomous Settlement Solution
            </h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              By combining Circle's secure smart contract APIs, Arc Network's USDC gas infrastructure, and DeepSeek autonomous agent swarms, Meridian provides secure compliance checks and automated payment releases.
            </p>
            <div className="space-y-4">
              {[
                { title: "Agent-Driven Automation", desc: "Escrow funds automatically unlock upon verified carrier delivery receipt." },
                { title: "Real-time Compliance Screening", desc: "Shipper and receiver wallet addresses are instantly screened for AML risks." },
                { title: "Unified Treasury Rails", desc: "Deposit across multiple chains and handle routing instantly using Circle Gateway." }
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-200">{title}</h4>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-20 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-gray-100">Enterprise Fintech Architecture</h2>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Everything your startup or enterprise needs to automate stablecoin liquidity pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Autonomous Escrow",
              desc: "Deploy smart contracts that hold USDC. AI agents release payments only when API monitors confirm receipt."
            },
            {
              icon: Cpu,
              title: "DeepSeek Swarms",
              desc: "Coordination, Logistics, Compliance, and Treasury agents align to verify manifests before settlement execution."
            },
            {
              icon: RefreshCw,
              title: "Unified Cross-Chain Balance",
              desc: "Abstract multi-chain balances with Circle Unified Balance Kit adapters. Send and receive seamlessly."
            },
            {
              icon: Send,
              title: "CCTP Bridge Integrations",
              desc: "Bridge USDC natively between EVM chains and Solana without slippage or trust assumptions."
            },
            {
              icon: Fingerprint,
              title: "Programmable Wallets",
              desc: "Developer-controlled smart accounts abstract key management with PIN and social recoveries."
            },
            {
              icon: Lock,
              title: "Compliance Dashboard",
              desc: "Automatic sanctions risk scoring matching OFAC and Circle AML watchlists in real-time."
            }
          ].map(({ icon: Icon, title, desc }, idx) => (
            <div key={idx} className="bg-gray-900/20 border border-gray-800/40 hover:border-cyan-500/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Step Flow */}
      <section className="bg-gray-950/40 border-t border-gray-900 py-20">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-gray-100">Step-by-Step Flow</h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              How Meridian automates and protects your supply chain finances in four easy steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
            {[
              { step: "01", title: "Create Escrow", desc: "Buyer creates escrow job specifying terms and carrier tracking ID." },
              { step: "02", title: "AML Compliance Run", desc: "Compliance Agent audits shipper and receiver addresses against watchlists." },
              { step: "03", title: "Oracle Verification", desc: "Logistics Agent monitors carrier updates and validates delivery status." },
              { step: "04", title: "Autonomous Settlement", desc: "Treasury Agent releases payment on-chain via Developer-Controlled Circle Wallet." }
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-gray-900/30 border border-gray-800/40 rounded-2xl p-5 space-y-3 relative group hover:border-blue-500/30 transition-colors">
                <span className="text-4xl font-mono font-bold text-gray-800 group-hover:text-blue-500/20 transition-colors">{step}</span>
                <h4 className="text-xs font-semibold text-gray-200">{title}</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Tech Stack */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-20 text-center space-y-8">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Built with Tier-1 Blockchain Technologies</h3>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
          <span className="text-xs font-mono font-bold text-gray-400 hover:text-cyan-400 transition-colors">CIRCLE DEVELOPER SUITE</span>
          <span className="text-xs font-mono font-bold text-gray-400 hover:text-cyan-400 transition-colors">ARC NETWORK</span>
          <span className="text-xs font-mono font-bold text-gray-400 hover:text-cyan-400 transition-colors">DEEPSEEK AI</span>
          <span className="text-xs font-mono font-bold text-gray-400 hover:text-cyan-400 transition-colors">NEXT.JS TAILWIND</span>
        </div>
      </section>

      <CtaSection />

      {/* Footer */}
      <Footer />
    </main>
  );
}

