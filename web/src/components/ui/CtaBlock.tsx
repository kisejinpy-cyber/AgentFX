'use client';

import Link from 'next/link';
import { ArrowRight, Wallet, BookOpen, MessageSquare, ShieldAlert } from 'lucide-react';
import React from 'react';

type CTAContext = 'marketing' | 'docs' | 'support' | 'legal';

interface CtaBlockProps {
  context: CTAContext;
  className?: string;
}

export function CtaBlock({ context, className = '' }: CtaBlockProps) {
  // Content selection map based on user journey context
  const getContextData = () => {
    switch (context) {
      case 'docs':
        return {
          badge: 'Developer Resources',
          title: 'Ready to build with Meridian?',
          desc: 'Connect your developer wallets, deploy custom auto-escrows to the Arc Testnet, and setup automated compliance audits.',
          primary: { label: 'Go to Developer Dashboard', href: '/dashboard', icon: Wallet },
          secondary: { label: 'Ask FAQ Questions', href: '/faq', icon: MessageSquare },
        };
      case 'support':
        return {
          badge: 'Active Support Channels',
          title: 'Need technical integration assistance?',
          desc: 'Our developer core group is available to help write Circle SDK controllers, configure entity secrets, or deploy smart contracts.',
          primary: { label: 'Explore Integration Docs', href: '/docs', icon: BookOpen },
          secondary: { label: 'Launch Dashboard App', href: '/dashboard', icon: Wallet },
        };
      case 'legal':
        return {
          badge: 'Compliance & Safety',
          title: 'Have compliance or security questions?',
          desc: 'Meridian settles B2B funds trustlessly without custody, adhering to international watchlists and automated OFAC address checks.',
          primary: { label: 'Contact Legal Support', href: '/contact', icon: MessageSquare },
          secondary: { label: 'Read Safety Mission', href: '/about', icon: BookOpen },
        };
      case 'marketing':
      default:
        return {
          badge: 'Next Generation FinTech',
          title: 'Automate your supply chain payments',
          desc: 'Scale your B2B commerce operations with zero-gas stablecoin escrows, automated compliance watchlists, and sub-second transaction speeds.',
          primary: { label: 'Launch Interactive Dashboard', href: '/dashboard', icon: Wallet },
          secondary: { label: 'Read Technical Docs', href: '/docs', icon: BookOpen },
        };
    }
  };

  const data = getContextData();
  const PrimaryIcon = data.primary.icon;
  const SecondaryIcon = data.secondary.icon;

  return (
    <div 
      className={`relative bg-gradient-to-tr from-gray-900/30 via-gray-950/60 to-cyan-500/5 border border-gray-800/40 rounded-2xl p-6 sm:p-8 overflow-hidden group ${className}`}
    >
      {/* Background radial highlight */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />

      <div className="relative z-10 space-y-4 max-w-2xl">
        <span className="inline-block bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">
          {data.badge}
        </span>
        <h3 className="text-xl sm:text-2xl font-extrabold text-gray-100 leading-tight">
          {data.title}
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          {data.desc}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <Link
            href={data.primary.href}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all duration-200 shadow-[var(--glow-cyan)] hover:scale-[1.01] active:scale-[0.99]"
          >
            <PrimaryIcon className="w-3.5 h-3.5" />
            {data.primary.label}
            <ArrowRight className="w-3 h-3" />
          </Link>
          
          <Link
            href={data.secondary.href}
            className="flex items-center justify-center gap-2 bg-gray-900/60 hover:bg-gray-800/80 text-gray-300 border border-gray-850 px-5 py-3 rounded-xl transition-all duration-200 text-xs font-semibold"
          >
            <SecondaryIcon className="w-3.5 h-3.5 text-cyan-400" />
            {data.secondary.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
