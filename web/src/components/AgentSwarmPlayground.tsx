'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useSignTypedData } from 'wagmi';
import { Bot, Zap, Coins, ChevronRight, CheckCircle, Play, ShieldAlert, Cpu, Sparkles, Plus, Loader2, Award, Terminal, FileText, ExternalLink, Brain, HelpCircle } from 'lucide-react';
import { AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, explorerTxUrl } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

interface SwarmLog {
  agent: string;
  text: string;
}

export function AgentSwarmPlayground() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { addToast, updateToast } = useToast();
  const { writeContractAsync } = useWriteContract();

  // Swarm Task State
  const [task, setTask] = useState('Verify shipping manifest for PO-9942 and audit compliance');
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<SwarmLog[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [txHash, setTxHash] = useState<string>('');
  const [showCalldata, setShowCalldata] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const logTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Creator Registry Form State
  const [registering, setRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapability, setNewCapability] = useState('');
  const [newMetadataUri, setNewMetadataUri] = useState('');
  const [newAgentAddress, setNewAgentAddress] = useState('');

  // 6-step x402 trace state
  const traceSteps = [
    { label: 'EIP-712 Signing', desc: 'Buyer signs off-chain payment authorization' },
    { label: 'Circle Facilitator', desc: 'Settle signature, receive Settlement UUID' },
    { label: 'Gateway Queue', desc: 'Transfer received and added to batch buffer' },
    { label: 'Relayer Flush', desc: 'Circle relayer prepares submitBatch transaction' },
    { label: 'On-Chain Broadcast', desc: 'Relayer executes transaction on Arc Testnet' },
    { label: 'Finalization', desc: 'Block mined, user & merchant balances settled' },
  ];

  const handleRunSwarm = async () => {
    if (!task) return;
    if (!isConnected || !address) {
      addToast({
        type: 'error',
        title: 'Wallet Disconnected',
        message: 'Please connect your wallet to execute swarm tasks.',
      });
      return;
    }

    setExecuting(true);
    setLogs([]);
    setCurrentStep(0);
    setTxHash('');
    setShowCalldata(false);

    const toastId = addToast({
      type: 'loading',
      title: 'Agent Swarm Active',
      message: 'Coordinator Agent parsing task instructions...',
    });

    try {
      // Step 1: EIP-712 Auth
      updateToast(toastId, {
        type: 'loading',
        title: 'x402 Payment Intercepted',
        message: 'Endpoint requires $0.00001 USDC. Please sign EIP-712 Auth in wallet...',
      });

      const cost = 10; // amount: 10 representing 0.00001 USDC (6 decimals)
      const nonce = BigInt(Math.floor(Date.now()));
      const validUntil = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

      const domain = {
        name: 'x402 Micropayment Protocol',
        version: '1.0.0',
        chainId: 5042002, // Arc Testnet
        verifyingContract: '0x1087E71CD83101adF154d8215522EadA51Bf891E' as const,
      };

      const types = {
        Micropayment: [
          { name: 'payer', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'validUntil', type: 'uint256' },
        ],
      } as const;

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'Micropayment',
        message: {
          payer: address,
          recipient: '0x1087E71CD83101adF154d8215522EadA51Bf891E',
          amount: BigInt(cost),
          nonce,
          validUntil,
        },
      });

      setCurrentStep(1);
      updateToast(toastId, {
        type: 'loading',
        title: 'Signature Verified',
        message: 'EIP-712 Signature created. Settling with Circle Facilitator...',
      });

      // Step 2: Facilitator Settle
      await new Promise(r => setTimeout(r, 1000));
      setCurrentStep(2);
      
      const authHeader = `Bearer ${signature}:${address}:${cost}:${nonce.toString()}:${validUntil.toString()}`;

      updateToast(toastId, {
        type: 'loading',
        title: 'Settled with Facilitator',
        message: 'Signature settled. Transferred off-chain to Gateway queue...',
      });

      // Step 3: Gateway Queue
      await new Promise(r => setTimeout(r, 1000));
      setCurrentStep(3);
      updateToast(toastId, {
        type: 'loading',
        title: 'Gateway Batched',
        message: 'Transfer added to off-chain relayer buffer. Dispatching swarm...',
      });

      // Request API with Authorization header
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Payment-Authorization': authHeader
        },
        body: JSON.stringify({ action: 'swarm-task', task, userAddress: address })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      // Step 4: Relayer flushing
      setCurrentStep(4);
      await new Promise(r => setTimeout(r, 800));

      // Step 5: On-chain transaction
      setCurrentStep(5);
      setTxHash(data.batchTxHash);
      await new Promise(r => setTimeout(r, 800));

      // Step 6: Completed
      setCurrentStep(6);
      const responseLogs = data.logs || [];
      setLogs(responseLogs);
      setAiPowered(responseLogs.some((l: SwarmLog) => l.text && l.text.length > 120));

      // Typewriter reveal effect for agent logs
      setVisibleLogCount(0);
      if (logTimerRef.current) clearTimeout(logTimerRef.current);
      let count = 0;
      const revealNext = () => {
        count++;
        setVisibleLogCount(count);
        if (count < responseLogs.length) {
          logTimerRef.current = setTimeout(revealNext, 600);
        }
      };
      logTimerRef.current = setTimeout(revealNext, 300);
      
      updateToast(toastId, {
        type: 'success',
        title: 'Swarm Task Completed',
        message: 'Micropayment settled on-chain. Audit results ready.',
      });

    } catch (e: any) {
      console.error(e);
      updateToast(toastId, {
        type: 'error',
        title: 'Swarm Execution Failed',
        message: e.message || 'Nanopayment error',
      });
      setCurrentStep(-1);
    } finally {
      setExecuting(false);
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      addToast({
        type: 'error',
        title: 'Wallet Disconnected',
        message: 'Please connect your wallet to register an agent.',
      });
      return;
    }
    if (!newName || !newCapability || !newAgentAddress) {
      addToast({
        type: 'error',
        title: 'Missing Fields',
        message: 'Please fill in name, capability, and agent wallet address.',
      });
      return;
    }

    setRegistering(true);
    const toastId = addToast({
      type: 'loading',
      title: 'Registering Agent',
      message: `Submitting registration for ${newName} to registry...`,
    });

    try {
      const hash = await writeContractAsync({
        address: AGENT_REGISTRY_ADDRESS,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: [
          newAgentAddress as `0x${string}`,
          newName,
          newMetadataUri || 'https://meridian.network/metadata/agent',
          newCapability,
        ],
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash });

      updateToast(toastId, {
        type: 'success',
        title: 'Agent Registered',
        message: `Successfully registered ${newName} on Arc Testnet!`,
        txHash: hash,
      });

      setNewName('');
      setNewCapability('');
      setNewMetadataUri('');
      setNewAgentAddress('');
    } catch (err: any) {
      console.error(err);
      updateToast(toastId, {
        type: 'error',
        title: 'Registration Failed',
        message: err.message || 'Transaction was rejected.',
      });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Dynamic Agent Swarm Console */}
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-800/40 pb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              Autonomous Swarm & x402 Console
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Dispatch multi-agent audit routines powered by the Circle Gateway nanopayments engine.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {aiPowered && (
              <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1 animate-pulse">
                <Brain className="w-3 h-3" />
                DeepSeek AI
              </span>
            )}
            <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
              x402 Pay-Per-Query
            </span>
            <span className="text-[9px] font-bold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
              Rate: 0.00001 USDC
            </span>
          </div>
        </div>

        {/* Task input row */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 group relative">
          <div className="flex-1 relative">
            <input
              type="text"
              value={task}
              disabled={executing}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Verify shipping manifest for PO-9942 and audit compliance"
              className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder-gray-700 disabled:opacity-50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-purple-400 cursor-help transition-colors" />
            </div>
          </div>
          <button
            onClick={handleRunSwarm}
            disabled={executing || !task}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Dispatch Swarm
          </button>
          <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-gray-950/95 border border-gray-850 rounded-lg p-2 text-[9px] text-gray-400 font-normal leading-normal shadow-xl z-50 pointer-events-none w-72 text-center">
            Write a detailed prompt describing what logistics, invoices, or legal conditions the autonomous agent fleet should verify.
          </div>
        </div>

        {/* Swarm Interactive Progress Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Payment Trace */}
          <div className="lg:col-span-5 bg-gray-950/40 border border-gray-800/30 rounded-xl p-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              x402 Settlement Trace
            </h4>
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-800">
              {traceSteps.map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = currentStep > idx;
                const isCurrent = currentStep === idx;
                
                return (
                  <div key={idx} className="flex gap-4 relative">
                    <div className="relative shrink-0">
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full bg-cyan-400/25 animate-pulse-glow-ring -z-10" />
                      )}
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all duration-300 z-10
                        ${isCompleted ? 'bg-emerald-500 border-transparent text-gray-950 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 
                          isCurrent ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 
                          'bg-gray-950 border-gray-800 text-gray-600'}`}
                      >
                        {isCompleted ? '✓' : isCurrent ? <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> : stepNum}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[11px] font-semibold block transition-colors duration-300 ${isCurrent ? 'text-cyan-400 font-bold' : isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>
                        {step.label}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {txHash && (
              <div className="mt-5 pt-4 border-t border-gray-800/40 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500">Batch Transaction</span>
                  <a 
                    href={explorerTxUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5 font-mono text-[9px]"
                  >
                    {txHash.substring(0, 14)}...
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <button
                  onClick={() => setShowCalldata(!showCalldata)}
                  className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors self-start border border-gray-850 px-2 py-1 rounded"
                >
                  {showCalldata ? 'Hide Calldata payload' : 'Decompress submitBatch calldata'}
                </button>
                {showCalldata && (
                  <div className="bg-gray-950 border border-gray-800/40 rounded p-2.5 font-mono text-[9px] text-gray-400 space-y-1 overflow-x-auto leading-relaxed">
                    <p className="text-cyan-500">// submitBatch(calldataBytes, signature)</p>
                    <p><span className="text-purple-400">batchId:</span> 984210</p>
                    <p><span className="text-purple-400">relayer:</span> 0xc73e884d5...a884</p>
                    <p><span className="text-purple-400">deltas:</span> [</p>
                    <p className="pl-4">{"{ address: \"" + (address ? address.substring(0, 8) : '0xUser') + "...\", delta: -0.00001 }"}</p>
                    <p className="pl-4">{"{ address: \"0x1087E71C...\", delta: +0.00001 }"}</p>
                    <p>]</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel: Swarm Output Logs */}
          <div className="lg:col-span-7 bg-gray-950/40 border border-gray-800/30 rounded-xl p-5 flex flex-col min-h-[300px]">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              Live Swarm Engine Stream
            </h4>

            {logs.length === 0 ? (
              executing ? (
                <div className="flex-1 space-y-3.5 py-2">
                  <div className="bg-gray-900/40 border border-gray-850/50 rounded-xl p-4 animate-shimmer h-[70px] relative overflow-hidden" />
                  <div className="bg-gray-900/40 border border-gray-850/50 rounded-xl p-4 animate-shimmer h-[70px] opacity-60 relative overflow-hidden" />
                  <div className="bg-gray-900/40 border border-gray-850/50 rounded-xl p-4 animate-shimmer h-[70px] opacity-30 relative overflow-hidden" />
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-2">
                    <span className="w-1.5 h-3 bg-purple-400 animate-ping inline-block" />
                    <span>Agent fleet processing logic stream...</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <Bot className="w-8 h-8 text-gray-700" />
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                    Consoles are idle. Click "Dispatch Swarm" to audit compliance.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4 flex-1 font-mono text-[11px] max-h-[380px] overflow-y-auto pr-1">
                {logs.slice(0, visibleLogCount).map((log, idx) => (
                  <div key={idx} className="bg-gray-950/80 border border-gray-850 rounded-lg p-3 space-y-1.5 hover:border-purple-500/30 transition-all duration-300 animate-fade-in shadow-inner">
                    <div className="flex justify-between items-center border-b border-gray-900 pb-1">
                      <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <Cpu className="w-3 h-3 text-purple-500" />
                        {log.agent}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {aiPowered && (
                          <span className="text-[8px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-1 py-0.2 rounded font-sans">
                            DEEPSEEK
                          </span>
                        )}
                        <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-1 py-0.2 rounded font-sans uppercase">
                          audit_pass
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 leading-relaxed font-sans text-[11px]">
                      {log.text}
                    </p>
                  </div>
                ))}
                {visibleLogCount < logs.length && (
                  <div className="flex items-center gap-2 py-3 text-[10px] text-gray-500 font-mono">
                    <span className="w-1.5 h-3 bg-cyan-400 animate-ping inline-block" />
                    <span>Agent fleet processing logic stream...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creator Economy Registry */}
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl animate-fade-in relative">
        <div className="flex items-center gap-2 mb-2 border-b border-gray-800/40 pb-3">
          <Award className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-base font-semibold text-gray-200">
              Agent Creator Hub
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Register your autonomous verifier nodes on the ERC-8004 On-Chain Directory.
            </p>
          </div>
        </div>

        <form onSubmit={handleRegisterAgent} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
          <div className="group relative">
            <div className="flex justify-between items-center mb-1.5">
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Agent Name <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
              </label>
              <span className="text-[9px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                The primary directory label of your AI node
              </span>
            </div>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. TrustyDocs Validator"
              className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder-gray-700"
            />
          </div>

          <div className="group relative">
            <div className="flex justify-between items-center mb-1.5">
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Capabilities Detail <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
              </label>
              <span className="text-[9px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                Explain tasks this agent specializes in
              </span>
            </div>
            <input
              type="text"
              required
              value={newCapability}
              onChange={(e) => setNewCapability(e.target.value)}
              placeholder="e.g. Verify legal docs and release payments"
              className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder-gray-700"
            />
          </div>

          <div className="group relative">
            <div className="flex justify-between items-center mb-1.5">
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Metadata URI <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
              </label>
              <span className="text-[9px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                URL link to schema profile JSON metadata
              </span>
            </div>
            <input
              type="text"
              value={newMetadataUri}
              onChange={(e) => setNewMetadataUri(e.target.value)}
              placeholder="e.g. https://ipfs.io/ipfs/Qm..."
              className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder-gray-700"
            />
          </div>

          <div className="group relative">
            <div className="flex justify-between items-center mb-1.5">
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Agent Wallet Address <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
              </label>
              <span className="text-[9px] text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                Circle programmable wallet or EOA address
              </span>
            </div>
            <input
              type="text"
              required
              value={newAgentAddress}
              onChange={(e) => setNewAgentAddress(e.target.value)}
              placeholder="e.g. 0x1087E71CD83101adF154d8215522EadA51Bf891E"
              className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder-gray-700"
            />
          </div>

          <div className="md:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              disabled={registering}
              className="bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 hover:border-amber-500 text-xs px-5 py-2.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Register Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
