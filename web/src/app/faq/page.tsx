import type { Metadata } from 'next';
import FaqClient from './FaqClient';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Find answers to common questions about Meridian smart escrows, stablecoin gasless transactions, Arc Network precompiles, and DeepSeek AI agent swarms.',
  keywords: [
    'Meridian faq',
    'stablecoin support',
    'AI agent escrow questions',
    'Arc Network details',
    'Circle programmable wallets assistance'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions',
    description: 'Find answers to common questions about Meridian smart escrows, stablecoin gasless transactions, Arc Network precompiles, and DeepSeek AI agent swarms.',
    url: 'https://meridian-treasury.io/faq',
    type: 'website',
  },
};

export default function FAQPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Meridian Treasury OS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Meridian is an autonomous, AI-driven treasury management and settlement system for B2B transactions. It replaces traditional middle-men escrow systems with smart contracts and automated agent swarms."
        }
      },
      {
        "@type": "Question",
        "name": "Is Meridian safe to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Meridian is designed with safety as its primary pillar. It does not control user keys. All smart contracts are open-source and run on the decentralized Arc Network."
        }
      },
      {
        "@type": "Question",
        "name": "What is the Arc Network?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Arc is a sub-second finality blockchain network designed for high-performance stablecoin transactions where USDC is the native gas token."
        }
      },
      {
        "@type": "Question",
        "name": "How does the DeepSeek Agent Swarm work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The swarm consists of specialized AI agents: a Coordinator, a Logistics Oracle, a Compliance Auditor, and a Treasury Settler. Each agent performs their check and seeks consensus before executing payment triggers."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqClient />
    </>
  );
}
