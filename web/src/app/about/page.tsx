import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Shield, Sparkles, Heart, Globe } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';
import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Mission',
  description: 'Learn about Meridian\'s vision to accelerate B2B global commerce via autonomous AI agent treasury networks, decentralized smart escrows, and zero-gas USDC payments.',
  keywords: [
    'Meridian mission',
    'AI agent treasury',
    'b2b payment vision',
    'decentralized escrow safety',
    'stablecoin challenge hackathon'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io/about',
  },
  openGraph: {
    title: 'Our Mission',
    description: 'Accelerating global B2B commerce with autonomous AI agent escrows, zero-gas USDC settle structures, and real-time compliance screening.',
    url: 'https://meridian-treasury.io/about',
    type: 'website',
  },
};

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": "https://meridian-treasury.io/about/#webpage",
        "url": "https://meridian-treasury.io/about",
        "name": "About Meridian Treasury OS",
        "description": "Our mission is to accelerate global B2B commerce with autonomous AI agent treasuries and compliance.",
        "breadcrumb": {
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
              "name": "About",
              "item": "https://meridian-treasury.io/about"
            }
          ]
        }
      },
      {
        "@type": "Organization",
        "name": "Meridian",
        "url": "https://meridian-treasury.io",
        "logo": "https://meridian-treasury.io/favicon.ico"
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

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs />
        
        {/* Storytelling Intro */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold justify-center">
            <Sparkles className="w-4 h-4" />
            Our Mission
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-100 leading-tight">
            Accelerating Global Commerce with Autonomous AI Treasury
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            We are building a new generation of B2B payment rails where programmable smart escrows and consensus-seeking AI agents settle cross-border supply chain transactions instantly and safely.
          </p>
        </div>

        {/* Mission Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-900 pt-8">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              The Vision
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              We envision a friction-free global economy where small-and-medium enterprises (SMEs) can trade internationally with zero-gas fee overhead, instant cross-chain liquidity transfers, and absolute compliance protection.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Decentralized Trust
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              By combining on-chain escrow rules with real-time watchlist screening, we eliminate the need to trust counterparties. Payments are released autonomously upon successful carrier courier API deliveries.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-gray-900/20 border border-gray-850 rounded-2xl p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            The Hackathon Story
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Meridian was conceived during the Stablecoins Commerce Stack Challenge as a direct solution to a real problem: SMEs get blocked by high international banking wire fees, slow clearance times, and lack of transaction safety.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            We wired together Circle's advanced SDK components (App Kit, Bridge Kit, programmable developer-controlled wallets) and Arc's native USDC gas network to prove that autonomous, compliant, zero-gas financial systems are possible today.
          </p>
        </div>

        {/* Related Content & Context */}
        <RelatedContent currentSlug="about" category="Artificial Intelligence" />

        {/* Call to Action */}
        <CtaBlock context="marketing" />

      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}

