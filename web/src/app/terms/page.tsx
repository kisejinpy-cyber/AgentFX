import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Shield } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';
import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Review the terms of service governing smart escrows, compliance verification rules, autonomous agent workflows, and liability disclaimers on Meridian.',
  keywords: [
    'Meridian terms of service',
    'smart escrow terms',
    'autonomous operation disclosure',
    'OFAC whitelist rules'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io/terms',
  },
  openGraph: {
    title: 'Terms of Service',
    description: 'Review the terms of service governing smart escrows, compliance verification rules, autonomous agent workflows, and liability disclaimers on Meridian.',
    url: 'https://meridian-treasury.io/terms',
    type: 'website',
  },
};

export default function TermsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://meridian-treasury.io/terms/#webpage",
        "url": "https://meridian-treasury.io/terms",
        "name": "Terms of Service - Meridian",
        "description": "Rules, disclosures, and guidelines for using the Meridian autonomous treasury and settlement operating system.",
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
              "name": "Terms",
              "item": "https://meridian-treasury.io/terms"
            }
          ]
        }
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

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs />
        
        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
            <Shield className="w-4 h-4" />
            Compliance & Usage
          </div>
          <h1 className="text-3xl font-extrabold text-gray-100">Terms of Service</h1>
          <p className="text-[10px] text-gray-500 font-mono">Last Updated: June 22, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs text-gray-400 leading-relaxed">
          <h3 className="text-sm font-bold text-gray-200">1. Acceptance of Terms</h3>
          <p>
            By accessing or using Meridian Treasury OS, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the application.
          </p>

          <h3 className="text-sm font-bold text-gray-200">2. Autonomous Operations</h3>
          <p>
            Meridian provides an interface to interact with decentralized smart contracts and AI-powered swarm agents. You acknowledge that on-chain actions (such as escrow creations and releases) are final and irreversible. Meridian cannot refund or retrieve funds once locked on-chain outside the programmed smart contract rules.
          </p>

          <h3 className="text-sm font-bold text-gray-200">3. Compliance and Blocked Addresses</h3>
          <p>
            You agree to use this platform in compliance with all applicable local and international AML laws. Meridian reserves the right to reject actions from wallets screened as sanctioned under OFAC or Circle's AML watchlists.
          </p>

          <h3 className="text-sm font-bold text-gray-200">4. Disclaimer of Warranty</h3>
          <p>
            The software is provided "as is", without warranty of any kind, express or implied. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of the platform.
          </p>
        </div>

        {/* Related Content & Cross-linking */}
        <RelatedContent currentSlug="terms" category="Documentation" />

        {/* Recovery CTA */}
        <CtaBlock context="legal" className="mt-8" />

      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}

