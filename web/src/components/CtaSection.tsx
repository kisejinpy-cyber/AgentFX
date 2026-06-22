import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

interface CtaSectionProps {
  title?: string;
  description?: string;
}

export function CtaSection({ 
  title = 'Ready to Automate Your Settlement Workflows?', 
  description = 'Deploy programmable AI agent fleets and protect your business from supply chain disputes and compliance liabilities.' 
}: CtaSectionProps) {
  return (
    <section className="bg-gradient-to-b from-gray-900/10 to-transparent border-t border-gray-900/60 py-20 text-center space-y-6 relative overflow-hidden">
      {/* Visual background glow elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] pointer-events-none rounded-full" />
      
      <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-100 max-w-xl mx-auto leading-tight">
          {title}
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs px-8 py-3.5 rounded-xl transition-all duration-300 shadow-[var(--glow-cyan)] hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            Launch Interactive Application
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link
            href="/docs"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900/60 border border-gray-800/80 hover:bg-gray-850 text-gray-300 font-bold text-xs px-8 py-3.5 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-700"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Read Integration Docs
          </Link>
        </div>
      </div>
    </section>
  );
}
