import { TransitionLink as Link } from '@/components/ui/motion/TransitionLink';
import { Shield, MessageSquare, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-800/40 mt-auto bg-gray-950/60 backdrop-blur-md relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-gray-900/60">
          
          {/* Brand Info Column */}
          <div className="md:col-span-4 space-y-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-gray-200 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded p-1 w-fit"
            >
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="font-bold tracking-tight text-sm uppercase">Meridian</span>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
              The stablecoin commerce stack for autonomous AI agent fleets and SMEs. Automate cross-border settlements with gasless transactions and instant finality.
            </p>
            {/* Status Panel */}
            <div className="bg-gray-900/35 border border-gray-850 rounded-xl p-3 max-w-xs space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 font-medium">Arc Network</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  OPERATIONAL
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 font-medium">Circle Gateway</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  OPERATIONAL
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 font-medium">AI Coordinator</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Spacer for structure */}
          <div className="hidden md:block md:col-span-1" />

          {/* Links: Product */}
          <div className="col-span-2 md:col-span-2 space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link href="/dashboard" className="text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5">
                  Escrow Dashboard
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5">
                  Integration Docs
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5">
                  FAQ Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Links: Company */}
          <div className="col-span-2 md:col-span-2 space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link href="/about" className="text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5">
                  Contact Support
                </Link>
              </li>
              <li>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5"
                >
                  GitHub Source
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
            </ul>
          </div>

          {/* Links: Legal */}
          <div className="col-span-2 md:col-span-3 space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link href="/privacy" className="text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded py-0.5">
                  Terms of Service
                </Link>
              </li>
              <li className="pt-2 flex items-center gap-3">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Visit our GitHub"
                  className="text-gray-600 hover:text-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded p-1 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                  </svg>
                </a>
                <a 
                  href="https://discord.gg" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Join our Discord"
                  className="text-gray-600 hover:text-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded p-1"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-600">
          <span>&copy; {new Date().getFullYear()} Meridian Treasury OS. All rights reserved.</span>
          <div className="flex items-center gap-1.5">
            <span>Built on Arc Testnet</span>
            <span>&bull;</span>
            <span>Gas-abstracted USDC</span>
            <span>&bull;</span>
            <span>EIP-5792 Compliant</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
