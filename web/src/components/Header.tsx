'use client';

import { useAccount, useConnect, useDisconnect, useBalance, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Shield, LogOut, Wallet, ChevronDown, ExternalLink, Copy, Check, Menu, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { TransitionLink as Link } from '@/components/ui/motion/TransitionLink';
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  USDC_ABI,
  ARC_TESTNET_EXPLORER,
  truncateAddress,
} from '@/lib/constants';
import { UnifiedBalanceWidget } from '@/components/UnifiedBalanceWidget';

export function Header() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Read USDC ERC-20 balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isDashboard, refetchInterval: 10_000 },
  });

  // Read native USDC balance (gas)
  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: !!address && isDashboard, refetchInterval: 10_000 },
  });

  const formattedUsdcBalance = usdcBalance
    ? Number(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  const formattedNativeBalance = nativeBalance
    ? Number(formatUnits(nativeBalance.value, 18)).toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      })
    : '0.0000';

  const copyAddress = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const isWrongNetwork = isConnected && chain?.id !== 5042002;

  if (!isDashboard) {
    // Marketing/Landing Page Header
    return (
      <header className="flex items-center justify-between py-5 border-b border-gray-800/30">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-[var(--glow-cyan)] group-hover:scale-105 transition-all duration-300">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-gray-100 leading-none block">
              Meridian
            </span>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">
              Treasury OS
            </p>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/docs" className={`text-xs font-semibold uppercase tracking-wider transition-colors hover:text-cyan-400 ${pathname === '/docs' ? 'text-cyan-400' : 'text-gray-400'}`}>
            Docs
          </Link>
          <Link href="/faq" className={`text-xs font-semibold uppercase tracking-wider transition-colors hover:text-cyan-400 ${pathname === '/faq' ? 'text-cyan-400' : 'text-gray-400'}`}>
            FAQ
          </Link>
          <Link href="/blog" className={`text-xs font-semibold uppercase tracking-wider transition-colors hover:text-cyan-400 ${pathname?.startsWith('/blog') ? 'text-cyan-400' : 'text-gray-400'}`}>
            Blog
          </Link>
          <Link href="/about" className={`text-xs font-semibold uppercase tracking-wider transition-colors hover:text-cyan-400 ${pathname === '/about' ? 'text-cyan-400' : 'text-gray-400'}`}>
            About
          </Link>
          <Link href="/contact" className={`text-xs font-semibold uppercase tracking-wider transition-colors hover:text-cyan-400 ${pathname === '/contact' ? 'text-cyan-400' : 'text-gray-400'}`}>
            Contact
          </Link>
        </nav>

        {/* Launch App Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all duration-200 shadow-[var(--glow-cyan)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wallet className="w-4 h-4" />
            Launch App
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="text-gray-400 hover:text-gray-200 focus:outline-none focus:text-cyan-400"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-[70px] left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/80 p-5 space-y-4 md:hidden animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link href="/docs" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-cyan-400">
                Docs
              </Link>
              <Link href="/faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-cyan-400">
                FAQ
              </Link>
              <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-cyan-400">
                Blog
              </Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-cyan-400">
                About
              </Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-cyan-400">
                Contact
              </Link>
            </nav>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm py-3 rounded-xl"
            >
              <Wallet className="w-4 h-4" />
              Launch App
            </Link>
          </div>
        )}
      </header>
    );
  }

  // Dashboard Header (unchanged behavior)
  return (
    <header className="flex items-center justify-between py-3 sm:py-5 px-1 sm:px-2 border-b border-gray-800/60 gap-2">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-[var(--glow-cyan)]">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <span className="text-sm sm:text-lg font-bold tracking-tight text-gray-100 leading-none block">
            Meridian
          </span>
          <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-medium hidden sm:block">
            Treasury OS
          </p>
        </div>
      </Link>

      {/* Right Side */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {isConnected && <UnifiedBalanceWidget />}

        {/* Network Badge */}
        <div className="hidden md:flex items-center bg-gray-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-800/60 text-xs gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isWrongNetwork ? 'bg-red-400' : 'bg-emerald-400'} animate-pulse`} />
          <span className="text-gray-400">
            {isWrongNetwork ? 'Wrong Network' : 'Arc Testnet'}
          </span>
        </div>

        {isConnected ? (
          <div className="relative">
            {/* Wallet Button */}
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 bg-gray-900/70 hover:bg-gray-800/80 border border-gray-800/60 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all duration-200 group focus:outline-none focus:border-cyan-500/50"
              aria-expanded={showDropdown}
              aria-haspopup="true"
              aria-label="Toggle wallet information and disconnect options"
            >
              {/* Balance */}
              <span className="text-[11px] sm:text-xs font-mono text-cyan-400 font-medium hidden sm:inline-block">
                ${formattedUsdcBalance}
              </span>
              <div className="w-px h-3.5 bg-gray-700/50 hidden sm:block" />
              {/* Address */}
              <span className="text-[11px] sm:text-xs font-mono text-gray-400 group-hover:text-gray-300 transition-colors">
                {truncateAddress(address || '')}
              </span>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border border-gray-800/60 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                  {/* Balances */}
                  <div className="p-4 border-b border-gray-800/40">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Balances</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">USDC (ERC-20)</span>
                        <span className="text-sm font-mono font-medium text-gray-200">${formattedUsdcBalance}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">USDC (Gas)</span>
                        <span className="text-sm font-mono font-medium text-gray-200">{formattedNativeBalance}</span>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="p-2">
                    <button
                      onClick={copyAddress}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Address'}
                    </button>
                    <a
                      href={`${ARC_TESTNET_EXPLORER}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on ArcScan
                    </a>
                    <button
                      onClick={() => { disconnect(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('circle-open-auth'));
              }
            }}
            disabled={isConnecting}
            className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-[10px] sm:text-xs px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all duration-200 shadow-[var(--glow-cyan)] disabled:opacity-60 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            {isConnecting ? 'Connecting...' : 'Sign in'}
          </button>
        )}
      </div>
    </header>
  );
}
