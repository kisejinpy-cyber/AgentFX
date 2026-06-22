'use client';

import Link from 'next/link';
import { BookOpen, Terminal, Cpu, Shield, ArrowRight } from 'lucide-react';
import React from 'react';

export interface RelatedItem {
  title: string;
  description: string;
  href: string;
  category: string;
  type: 'blog' | 'docs' | 'feature' | 'integration';
}

interface RelatedContentProps {
  currentSlug: string;
  category?: string;
  tags?: string[];
  maxItems?: number;
}

export function RelatedContent({
  currentSlug,
  category,
  tags = [],
  maxItems = 2,
}: RelatedContentProps) {
  // Pre-seed dynamic database of resources for cross-linking
  const recommendationsPool: RelatedItem[] = [
    {
      title: 'Stablecoin Gas Abstraction Protocol',
      description: 'Learn how gas-abstracted USDC settlements streamline B2B global transactions and eliminate native gas token friction.',
      href: '/blog/stablecoin-gas-abstraction',
      category: 'Protocol Tech',
      type: 'blog',
    },
    {
      title: 'DeepSeek AI Agent Swarm Consensus',
      description: 'Explore details on Coordinate, Logistics, Compliance, and Treasury AI agents checking logistics delivery.',
      href: '/blog/autonomous-ai-escrow',
      category: 'Artificial Intelligence',
      type: 'blog',
    },
    {
      title: 'Circle Developer-Controlled SDK Guide',
      description: 'Learn to configure Circle Programmable Wallet Sets and trigger API-driven token releases.',
      href: '/blog/circle-programmable-wallets',
      category: 'Developer Guide',
      type: 'blog',
    },
    {
      title: 'Integration Documentation Manual',
      description: 'Integrate Meridian\'s autonomous escrow protocol, programmable developer wallets, and DeepSeek AI verification.',
      href: '/docs#quickstart',
      category: 'Documentation',
      type: 'docs',
    },
    {
      title: 'Smart Escrow Contract ABI & Spec',
      description: 'Read the solidity contract variables, status rules, and payout consensus constraints.',
      href: '/docs#escrow-protocol',
      category: 'Documentation',
      type: 'docs',
    },
    {
      title: 'Compliance watchlist screening API',
      description: 'How to trigger AML watchlist screenings against global sanctioned targets locally.',
      href: '/docs#compliance-screening',
      category: 'Documentation',
      type: 'docs',
    },
    {
      title: 'Interactive Settlement Dashboard',
      description: 'Open the app dashboard to configure wallets, create escrows, and inspect transaction chains.',
      href: '/dashboard',
      category: 'Application',
      type: 'feature',
    },
  ];

  // Calculate similarity rankings based on category overlap, slug keywords, and type
  const resolvedItems = React.useMemo(() => {
    const scored = recommendationsPool
      .filter((item) => !item.href.includes(currentSlug)) // exclude current page
      .map((item) => {
        let score = 0;
        
        // Category matching
        if (category && item.category.toLowerCase() === category.toLowerCase()) {
          score += 5;
        }

        // Tag matching
        tags.forEach((tag) => {
          if (item.title.toLowerCase().includes(tag.toLowerCase()) || 
              item.description.toLowerCase().includes(tag.toLowerCase())) {
            score += 2;
          }
        });

        // Intent matching (cross-linking: blogs should recommend docs/dashboard; docs should recommend blogs/dashboard)
        if (currentSlug.startsWith('blog') && item.type === 'docs') score += 1;
        if (currentSlug.startsWith('docs') && item.type === 'blog') score += 1;

        return { item, score };
      });

    // Sort by score descending, then slice
    return scored
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item)
      .slice(0, maxItems);
  }, [currentSlug, category, tags, maxItems]);

  if (resolvedItems.length === 0) return null;

  // Icon selector based on type
  const getTypeIcon = (type: RelatedItem['type']) => {
    switch (type) {
      case 'blog':
        return <BookOpen className="w-4 h-4 text-cyan-400" />;
      case 'docs':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'feature':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      default:
        return <Shield className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <section className="space-y-4 pt-6 border-t border-gray-900">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        Recommended Resources & Context
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {resolvedItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-gray-900/10 border border-gray-800/40 hover:border-cyan-500/20 p-4 rounded-xl block group transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-gray-950 border border-gray-850 rounded-md">
                {getTypeIcon(item.type)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold font-mono">
                {item.category} &bull; {item.type}
              </span>
            </div>
            <span className="text-xs font-bold text-gray-300 group-hover:text-cyan-400 transition-colors line-clamp-1">
              {item.title}
            </span>
            <p className="text-[10px] text-gray-500 block mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
            <span className="text-[10px] text-cyan-400/80 font-semibold flex items-center gap-1 mt-2.5 group-hover:text-cyan-300 transition-colors">
              Explore Resource
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
