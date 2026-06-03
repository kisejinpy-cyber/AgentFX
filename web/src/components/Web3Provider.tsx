'use client';

import { createConfig, http, WagmiProvider, useAccount, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineChain } from 'viem';
import { ReactNode, useState, useEffect } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_RPC,
  ARC_TESTNET_WS,
  ARC_TESTNET_EXPLORER,
} from '@/lib/constants';
import { ComplianceBlock } from '@/components/ComplianceBlock';

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  network: 'arcTestnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET_RPC],
      webSocket: [ARC_TESTNET_WS],
    },
    public: {
      http: [ARC_TESTNET_RPC],
      webSocket: [ARC_TESTNET_WS],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: ARC_TESTNET_EXPLORER },
  },
});

import { circleConnector } from '@/lib/circleConnector';

const config = createConfig({
  chains: [arcTestnet],
  connectors: [circleConnector()],
  transports: {
    [arcTestnet.id]: http(),
  },
  ssr: true, // Prevent hydration mismatch
});

function ComplianceGuard({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isBlocked, setIsBlocked] = useState(false);
  const [category, setCategory] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setIsBlocked(false);
      setChecking(false);
      return;
    }

    let active = true;
    setChecking(true);

    fetch('/api/compliance/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data.blocked) {
            setIsBlocked(true);
            setCategory(data.category || 'Regulatory Sanctions');
          } else {
            setIsBlocked(false);
          }
        }
      })
      .catch((err) => {
        console.error('Compliance guard failed:', err);
      })
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [address, isConnected]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin" />
          <ShieldCheck className="w-6 h-6 text-cyan-400 absolute" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-gray-200">Verifying Identity Compliance</p>
          <p className="text-[10px] text-gray-500">Screening wallet address against regulatory databases...</p>
        </div>
      </div>
    );
  }

  if (isBlocked && address) {
    return (
      <ComplianceBlock
        address={address}
        category={category}
        onDisconnect={() => disconnect()}
      />
    );
  }

  return <>{children}</>;
}

export function Web3Provider({ children }: { children: ReactNode }) {
  // Create QueryClient inside component to avoid SSR issues
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ComplianceGuard>
          {children}
        </ComplianceGuard>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
