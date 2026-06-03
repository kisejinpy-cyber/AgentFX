'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { Bot, Shield, Search, Star, Award, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, truncateAddress } from '@/lib/constants';

export const STATIC_AGENTS = [
  {
    address: '0x1087E71CD83101adF154d8215522EadA51Bf891E',
    defaultName: 'Meridian Core Agent',
    defaultCapability: 'Automated Milestone Settlement & Financial Audits',
    fee: 'Free (Sponsored)',
  },
  {
    address: '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C',
    defaultName: 'TrustyEval Agent',
    defaultCapability: 'Web Development Deliverables Code Evaluation',
    fee: '5.00 USDC',
  },
  {
    address: '0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39Fc72d',
    defaultName: 'FastTrack Validator',
    defaultCapability: 'Sub-Second Low-Latency Milestone Verification',
    fee: '2.00 USDC',
  },
];

interface AgentDirectoryProps {
  onSelectAgent?: (address: string) => void;
}

export function AgentDirectory({ onSelectAgent }: AgentDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            On-Chain AI Agent Directory (ERC-8004)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Choose certified AI agents registered on Arc Testnet to verify and settle milestone payouts.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2 pl-9 pr-4 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {STATIC_AGENTS.map((staticAgent) => (
          <AgentCard
            key={staticAgent.address}
            address={staticAgent.address}
            defaultName={staticAgent.defaultName}
            defaultCapability={staticAgent.defaultCapability}
            fee={staticAgent.fee}
            onSelect={onSelectAgent}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}

interface AgentCardProps {
  address: string;
  defaultName: string;
  defaultCapability: string;
  fee: string;
  onSelect?: (address: string) => void;
  searchQuery: string;
}

function AgentCard({ address, defaultName, defaultCapability, fee, onSelect, searchQuery }: AgentCardProps) {
  // Live read of agent reputation data from blockchain
  const { data: agentData, isLoading } = useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    //@ts-ignore
    functionName: 'getAgent',
    args: [address],
    query: {
      refetchInterval: 15_000,
    },
  });

  // Parse result (Solidity returns: name, metadataUri, capability, trustScore, active)
  const name = agentData ? (agentData as any)[0] || defaultName : defaultName;
  const capability = agentData ? (agentData as any)[2] || defaultCapability : defaultCapability;
  const trustScore = agentData ? Number((agentData as any)[3]) : 100;
  const active = agentData ? (agentData as any)[4] : true;

  // Filter query match
  if (
    searchQuery &&
    !name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !capability.toLowerCase().includes(searchQuery.toLowerCase())
  ) {
    return null;
  }

  return (
    <div className="bg-gray-950/40 border border-gray-800/40 rounded-xl p-5 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 group">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-900/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-900/20 group-hover:border-purple-500/40 transition-colors">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-200">{name}</h4>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5">{truncateAddress(address, 5)}</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border ${
              active
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            <CheckCircle2 className="w-2.5 h-2.5" />
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed min-h-[36px]">{capability}</p>

        {/* Reputation Trust Score */}
        <div className="mt-5 bg-gray-900/50 rounded-lg p-3 border border-gray-800/20">
          <div className="flex justify-between items-center text-[10px] mb-1.5">
            <span className="text-gray-500 flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-400" />
              On-Chain Trust Score
            </span>
            <span className="font-semibold text-purple-400 flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-purple-400/20 text-purple-400" />
              {isLoading ? '...' : `${trustScore}%`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${isLoading ? 0 : trustScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800/30 flex items-center justify-between">
        <div className="text-[10px]">
          <span className="text-gray-500">Service Fee:</span>
          <p className="font-semibold text-gray-300 mt-0.5">{fee}</p>
        </div>

        {onSelect && active && (
          <button
            onClick={() => onSelect(address)}
            className="text-[10px] bg-purple-500/15 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/20 hover:bg-purple-500 hover:text-white hover:border-transparent transition-all duration-300"
          >
            Select Agent
          </button>
        )}
      </div>
    </div>
  );
}
