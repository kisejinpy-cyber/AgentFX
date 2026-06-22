import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Shield } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';
import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Understand how Meridian handles user privacy, decentralized blockchain data ledger entries, and local carrier courier integration records.',
  keywords: [
    'Meridian privacy policy',
    'decentralized blockchain safety',
    'ledger data protection',
    'compliance screening privacy'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io/privacy',
  },
  openGraph: {
    title: 'Privacy Policy',
    description: 'Understand how Meridian handles user privacy, decentralized blockchain data ledger entries, and local carrier courier integration records.',
    url: 'https://meridian-treasury.io/privacy',
    type: 'website',
  },
};

export default function PrivacyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://meridian-treasury.io/privacy/#webpage",
        "url": "https://meridian-treasury.io/privacy",
        "name": "Privacy Policy - Meridian",
        "description": "Information about data privacy and compliance practices on the Meridian autonomous treasury platform.",
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
              "name": "Privacy",
              "item": "https://meridian-treasury.io/privacy"
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
            Compliance & Privacy
          </div>
          <h1 className="text-3xl font-extrabold text-gray-100">Privacy Policy</h1>
          <p className="text-[10px] text-gray-500 font-mono">Last Updated: June 22, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs text-gray-400 leading-relaxed">
          <h3 className="text-sm font-bold text-gray-200">1. Information We Collect</h3>
          <p>
            Meridian Treasury OS is designed as a decentralized, autonomous portal. We do not store or collect personal identifying information. When using our services, we only interact with publicly available blockchain data (addresses, smart contracts, events) and carrier logistics APIs.
          </p>

          <h3 className="text-sm font-bold text-gray-200">2. Wallet Addresses & Ledger Data</h3>
          <p>
            Your blockchain wallet addresses, transaction hashes, and smart contract data are publicly recorded on the ledger (Arc Network / EVM chains). Because this ledger data is immutable and open, we have no control over how third-party block explorers display this information.
          </p>

          <h3 className="text-sm font-bold text-gray-200">3. Compliance Check Records</h3>
          <p>
            Watchlist AML screening checks are conducted locally or processed via API integrations. Any information parsed (e.g. shipper or receiver address matches) is evaluated purely to confirm eligibility for smart escrow settlements and is not persisted in database tables outside of local logs needed for audit reports.
          </p>

          <h3 className="text-sm font-bold text-gray-200">4. Changes to This Policy</h3>
          <p>
            We may revise this privacy policy from time to time. The revised version will be effective as of the published date.
          </p>
        </div>

        {/* Related Content & Internal Linking */}
        <RelatedContent currentSlug="privacy" category="Documentation" />

        {/* Recovery CTA */}
        <CtaBlock context="legal" className="mt-8" />

      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}

