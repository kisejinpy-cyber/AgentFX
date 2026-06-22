'use client';

import { useState } from 'react';
import { Bot, Plus, Shield, Network, Zap, CheckCircle, ExternalLink, Loader2, Database } from 'lucide-react';
import { truncateAddress } from '@/lib/constants';
import { GatewayFunding } from '@/components/GatewayFunding';
import { useModal } from '@/components/ui/modals/ModalContext';
import { interpretError } from '@/components/ui/modals/ErrorInterpreter';

interface Agent {
  id: string;
  name: string;
  walletId: string;
  address: string;
  policy: string;
  status: 'active' | 'provisioning';
}

export function AgentFleetPanel() {
  const { openModal, replaceModal } = useModal();
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'ag-1',
      name: 'Logistics Oracle Node',
      walletId: 'w-c8a7b6...',
      address: '0x1087E71CD83101adF154d8215522EadA51Bf891E',
      policy: 'Release Milestones Only',
      status: 'active',
    }
  ]);
  const [provisioning, setProvisioning] = useState(false);

  const handleProvision = async () => {
    setProvisioning(true);
    const modalId = openModal('processing', {
      title: 'Provisioning AI Agent',
      message: 'Creating secure developer-controlled smart wallet and assigning verification policies.',
      statusText: 'Contacting Circle Infrastructure...',
    });

    try {
      const res = await fetch('/api/agent/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to provision agent');

      setAgents(prev => [
        ...prev,
        {
          id: `ag-${prev.length + 1}`,
          name: 'AI Delivery Verifier (Prod)',
          walletId: data.id || `w-prod-${Math.random().toString(36).substring(7)}`,
          address: data.address,
          policy: 'Auto-Release Verified Escrows',
          status: 'active',
        }
      ]);

      replaceModal(modalId, 'success', {
        title: 'AI Agent Provisioned',
        message: `Successfully provisioned new agent smart account: ${data.address}. Relaying policy is active.`,
      });
    } catch (e: any) {
      console.error(e);
      const errInfo = interpretError(e);
      replaceModal(modalId, 'error', {
        title: 'Provisioning Failed',
        message: errInfo.message,
        errorDetails: e.message || String(e),
      });
    }
    setProvisioning(false);
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800/40 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" />
            Agent Fleet (Circle Wallets)
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Manage autonomous AI agents powered by Circle Programmable Wallets.
          </p>
        </div>
        <button 
          onClick={handleProvision}
          disabled={provisioning}
          className="text-[10px] bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/30 hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {provisioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Provision Agent
        </button>
      </div>

      {/* Agent List */}
      <div className="divide-y divide-gray-800/30">
        {agents.map(agent => (
          <div key={agent.id} className="p-5 hover:bg-gray-800/10 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/20 border border-purple-800/30 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    {agent.name}
                    <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Active
                    </span>
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-gray-500">{truncateAddress(agent.address)}</span>
                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                      <Network className="w-3 h-3" />
                      ID: {agent.walletId}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-900/10 border border-amber-800/30 px-2 py-1 rounded">
                  <Shield className="w-3 h-3" />
                  {agent.policy}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nanopayments Layer */}
      <div className="border-t border-gray-850 p-5 bg-gray-900/10">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          Gateway Nanopayment Management
        </h4>
        <GatewayFunding />
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 bg-gray-950/30 border-t border-gray-800/30 flex items-start gap-2">
        <Zap className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Agents use <strong className="text-gray-400">Circle Programmable Wallets</strong> (SCA) with Gas Station policies. 
          The agent backend signs transactions via API, completely abstracting private keys and gas fees from the enterprise user.
        </p>
      </div>
    </div>
  );
}
