'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface TransferState {
  progress: number; // 0 to 100
  speed?: string; // e.g. "2.4 MB/s"
  eta?: string; // e.g. "12s"
  status: 'active' | 'paused' | 'failed' | 'completed';
}

export interface AIState {
  text: string;
  status: 'thinking' | 'streaming' | 'done';
}

export type AnimationSpeed = 'ultra-fast' | 'fast' | 'normal' | 'slow';
export type AnimationCurve = 'standard' | 'smooth' | 'spring' | 'entrance' | 'exit';

interface LoadingContextType {
  // Route Transitions
  isNavigating: boolean;
  startNavigation: (toUrl?: string) => void;
  endNavigation: () => void;

  // API Requests
  activeRequests: Set<string>;
  startRequest: (id: string) => void;
  endRequest: (id: string) => void;

  // File Transfer Monitoring (Upload / Download)
  transfers: Record<string, TransferState>;
  startTransfer: (id: string) => void;
  updateTransfer: (id: string, updates: Partial<TransferState>) => void;
  endTransfer: (id: string) => void;

  // AI Stream Monitoring
  aiStreams: Record<string, AIState>;
  updateAIStream: (id: string, updates: Partial<AIState>) => void;
  clearAIStream: (id: string) => void;

  // Accessibility Settings
  prefersReducedMotion: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

import { usePathname } from 'next/navigation';

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeRequests, setActiveRequests] = useState<Set<string>>(new Set());
  const [transfers, setTransfers] = useState<Record<string, TransferState>>({});
  const [aiStreams, setAiStreams] = useState<Record<string, AIState>>({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Automatically close route progress triggers when path finishes hydration
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Monitor media query for accessibility standard prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const startNavigation = useCallback((toUrl?: string) => {
    setIsNavigating(true);
    // Auto timeout fail-safe if route change hangs
    setTimeout(() => setIsNavigating(false), 8000);
  }, []);

  const endNavigation = useCallback(() => {
    setIsNavigating(false);
  }, []);

  const startRequest = useCallback((id: string) => {
    setActiveRequests((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const endRequest = useCallback((id: string) => {
    setActiveRequests((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const startTransfer = useCallback((id: string) => {
    setTransfers((prev) => ({
      ...prev,
      [id]: { progress: 0, status: 'active' },
    }));
  }, []);

  const updateTransfer = useCallback((id: string, updates: Partial<TransferState>) => {
    setTransfers((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], ...updates },
      };
    });
  }, []);

  const endTransfer = useCallback((id: string) => {
    setTransfers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateAIStream = useCallback((id: string, updates: Partial<AIState>) => {
    setAiStreams((prev) => ({
      ...prev,
      [id]: {
        text: prev[id]?.text || '',
        status: prev[id]?.status || 'thinking',
        ...updates,
      },
    }));
  }, []);

  const clearAIStream = useCallback((id: string) => {
    setAiStreams((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        isNavigating,
        startNavigation,
        endNavigation,
        activeRequests,
        startRequest,
        endRequest,
        transfers,
        startTransfer,
        updateTransfer,
        endTransfer,
        aiStreams,
        updateAIStream,
        clearAIStream,
        prefersReducedMotion,
      }}
    >
      {children}
      {/* Route Top Loading Indicator */}
      {isNavigating && <TopProgressBar />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Global top-of-viewport slim progress indicator (resembling Vercel / GitHub progress routing)
function TopProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; // Tick slowly up to 90%
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[1000] pointer-events-none overflow-hidden bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
