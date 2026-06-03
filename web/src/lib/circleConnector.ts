import { createConnector } from 'wagmi';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { arcTestnet } from '@/components/Web3Provider';

export function circleConnector() {
  return createConnector((config) => {
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });

    const provider = {
      request: async ({ method, params }: { method: string; params?: any[] }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          const addr = typeof window !== 'undefined' ? localStorage.getItem('circle_wallet_address') : null;
          return addr ? [addr] : [];
        }
        if (method === 'eth_chainId') {
          return `0x${arcTestnet.id.toString(16)}`;
        }
        if (method === 'eth_sendTransaction') {
          const tx = params?.[0];
          if (!tx) throw new Error('Transaction is missing');

          if (typeof window !== 'undefined') {
            console.log('🔄 Intercepted eth_sendTransaction. Routing via Circle Gas Station /api/sponsor.', tx);
            
            // Dispatch event to show PIN verification / challenge modal
            const event = new CustomEvent('circle-sign-transaction', {
              detail: { tx }
            });
            window.dispatchEvent(event);

            // Wait for the challenge to be solved or canceled
            return new Promise((resolve, reject) => {
              const handleSuccess = (e: Event) => {
                const customEvent = e as CustomEvent;
                if (customEvent.detail.to.toLowerCase() === tx.to.toLowerCase()) {
                  window.removeEventListener('circle-sign-success', handleSuccess);
                  window.removeEventListener('circle-sign-failure', handleFailure);
                  resolve(customEvent.detail.hash);
                }
              };
              const handleFailure = (e: Event) => {
                const customEvent = e as CustomEvent;
                window.removeEventListener('circle-sign-success', handleSuccess);
                window.removeEventListener('circle-sign-failure', handleFailure);
                reject(new Error(customEvent.detail.error || 'Transaction rejected by user'));
              };
              window.addEventListener('circle-sign-success', handleSuccess);
              window.addEventListener('circle-sign-failure', handleFailure);
            });
          }
          throw new Error('Window context is not available');
        }

        // Delegate all other methods to the public RPC client
        return (publicClient as any).request({ method, params });
      },
      on: (event: string, listener: (...args: any[]) => void) => {},
      removeListener: (event: string, listener: (...args: any[]) => void) => {},
    };

    return {
      id: 'circle',
      name: 'Circle SCA',
      type: 'circle',
      async connect(options: any = {}) {
        const addr = typeof window !== 'undefined' ? localStorage.getItem('circle_wallet_address') : null;
        if (!addr) {
          throw new Error('Not logged into Circle Wallet');
        }
        return {
          accounts: [addr as `0x${string}`],
          chainId: arcTestnet.id,
        };
      },
      async disconnect() {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('circle_wallet_address');
          localStorage.removeItem('circle_user_token');
          localStorage.removeItem('circle_email');
        }
        config.emitter.emit('disconnect');
      },
      async getAccounts() {
        const addr = typeof window !== 'undefined' ? localStorage.getItem('circle_wallet_address') : null;
        return addr ? [addr as `0x${string}`] : [];
      },
      async getChainId() {
        return arcTestnet.id;
      },
      async getProvider() {
        return provider;
      },
      async getWalletClient() {
        const addr = typeof window !== 'undefined' ? localStorage.getItem('circle_wallet_address') : null;
        if (!addr) throw new Error('Not connected');
        
        return createWalletClient({
          account: addr as `0x${string}`,
          chain: arcTestnet,
          transport: custom(provider),
        });
      },
      async isAuthorized() {
        if (typeof window !== 'undefined') {
          return !!localStorage.getItem('circle_wallet_address');
        }
        return false;
      },
      onAccountsChanged(accounts: any[]) {
        config.emitter.emit('change', { accounts: accounts.map(a => a as `0x${string}`) });
      },
      onChainChanged(chainId: any) {
        config.emitter.emit('change', { chainId: Number(chainId) });
      },
      onDisconnect() {
        config.emitter.emit('disconnect');
      },
    } as any;
  });
}
