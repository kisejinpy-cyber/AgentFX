'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  Activity,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Zap,
  ExternalLink,
  Loader2,
  ArrowUpRight,
} from 'lucide-react';
import {
  AUTO_ESCROW_ADDRESS,
  AUTO_ESCROW_ABI,
  USDC_DECIMALS,
  truncateAddress,
  explorerTxUrl,
  explorerAddressUrl,
} from '@/lib/constants';
import { formatUnits } from 'viem';

import { getBootstrapEvents, EventLog } from '@/lib/bootstrapData';

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  created:   { icon: Plus, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
  released:  { icon: CheckCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  refunded:  { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
  dispute:   { icon: AlertTriangle, color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  resolved:  { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  milestone: { icon: Zap, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
};

export function ActivityLog() {
  const { address } = useAccount();
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const { createPublicClient, http, parseAbiItem } = await import('viem');
        const { arcTestnet } = await import('@/components/Web3Provider');
        const client = createPublicClient({ chain: arcTestnet, transport: http() });

        // Fetch multiple event types in parallel
        const [createdLogs, releasedLogs, refundedLogs, disputeLogs, resolvedLogs] = await Promise.all([
          client.getLogs({
            address: AUTO_ESCROW_ADDRESS,
            event: parseAbiItem('event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, address agent, uint256 totalAmount, uint256 deadline)'),
            fromBlock: BigInt(0),
            toBlock: 'latest',
          }).catch(() => []),
          client.getLogs({
            address: AUTO_ESCROW_ADDRESS,
            event: parseAbiItem('event EscrowFullyReleased(uint256 indexed escrowId, uint256 totalAmount)'),
            fromBlock: BigInt(0),
            toBlock: 'latest',
          }).catch(() => []),
          client.getLogs({
            address: AUTO_ESCROW_ADDRESS,
            event: parseAbiItem('event EscrowRefunded(uint256 indexed escrowId, uint256 amount)'),
            fromBlock: BigInt(0),
            toBlock: 'latest',
          }).catch(() => []),
          client.getLogs({
            address: AUTO_ESCROW_ADDRESS,
            event: parseAbiItem('event DisputeRaised(uint256 indexed escrowId, address raisedBy, string reason)'),
            fromBlock: BigInt(0),
            toBlock: 'latest',
          }).catch(() => []),
          client.getLogs({
            address: AUTO_ESCROW_ADDRESS,
            event: parseAbiItem('event DisputeResolved(uint256 indexed escrowId, uint256 buyerAmount, uint256 sellerAmount)'),
            fromBlock: BigInt(0),
            toBlock: 'latest',
          }).catch(() => []),
        ]);

        const allEvents: EventLog[] = [];

        for (const log of createdLogs) {
          const args = log.args as { escrowId?: bigint; buyer?: string; seller?: string; totalAmount?: bigint };
          const amt = args.totalAmount ? Number(formatUnits(args.totalAmount, USDC_DECIMALS)).toLocaleString() : '?';
          allEvents.push({
            id: `c-${log.transactionHash}-${log.logIndex}`,
            type: 'created',
            escrowId: Number(args.escrowId || 0),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            details: `$${amt} USDC locked by ${truncateAddress(args.buyer || '')} → ${truncateAddress(args.seller || '')}`,
            timestamp: Date.now(),
          });
        }

        for (const log of releasedLogs) {
          const args = log.args as { escrowId?: bigint; totalAmount?: bigint };
          const amt = args.totalAmount ? Number(formatUnits(args.totalAmount, USDC_DECIMALS)).toLocaleString() : '?';
          allEvents.push({
            id: `r-${log.transactionHash}-${log.logIndex}`,
            type: 'released',
            escrowId: Number(args.escrowId || 0),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            details: `$${amt} USDC released to seller`,
            timestamp: Date.now(),
          });
        }

        for (const log of refundedLogs) {
          const args = log.args as { escrowId?: bigint; amount?: bigint };
          const amt = args.amount ? Number(formatUnits(args.amount, USDC_DECIMALS)).toLocaleString() : '?';
          allEvents.push({
            id: `x-${log.transactionHash}-${log.logIndex}`,
            type: 'refunded',
            escrowId: Number(args.escrowId || 0),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            details: `$${amt} USDC refunded to buyer`,
            timestamp: Date.now(),
          });
        }

        for (const log of disputeLogs) {
          const args = log.args as { escrowId?: bigint; raisedBy?: string; reason?: string };
          allEvents.push({
            id: `d-${log.transactionHash}-${log.logIndex}`,
            type: 'dispute',
            escrowId: Number(args.escrowId || 0),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            details: `Dispute raised by ${truncateAddress(args.raisedBy || '')}${args.reason ? `: ${args.reason}` : ''}`,
            timestamp: Date.now(),
          });
        }

        for (const log of resolvedLogs) {
          const args = log.args as { escrowId?: bigint; buyerAmount?: bigint; sellerAmount?: bigint };
          allEvents.push({
            id: `s-${log.transactionHash}-${log.logIndex}`,
            type: 'resolved',
            escrowId: Number(args.escrowId || 0),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            details: 'Dispute resolved by agent',
            timestamp: Date.now(),
          });
        }

        // Sort by blockNumber descending (newest first)
        allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!cancelled) {
          const finalEvents = allEvents.length === 0 
            ? getBootstrapEvents(address)
            : [...allEvents, ...getBootstrapEvents(address)];
          setEvents(finalEvents);
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to fetch activity:', e);
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    // Refresh every 15s
    const interval = setInterval(fetchEvents, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [address]);

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800/40 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          On-Chain Activity
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] bg-gray-800/50 px-2.5 py-1 rounded-full text-gray-400 border border-gray-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Events
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          <span className="text-sm text-gray-500">Fetching contract events...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Activity className="w-8 h-8 text-gray-700" />
          <p className="text-sm text-gray-500">No activity yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800/20 max-h-[400px] overflow-y-auto">
          {events.map((event) => {
            const config = EVENT_CONFIG[event.type];
            const Icon = config.icon;
            return (
              <div key={event.id} className="px-5 py-3 hover:bg-gray-800/10 transition-colors flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${config.bgColor}`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${config.color}`}>
                      Escrow #{event.escrowId}
                    </span>
                    <span className="text-[10px] text-gray-600 capitalize">{event.type}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed truncate">{event.details}</p>
                </div>
                {!event.isSample ? (
                  <a
                    href={explorerTxUrl(event.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-cyan-400 transition-colors shrink-0 mt-1"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase mt-1 shrink-0">
                    Sample
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
