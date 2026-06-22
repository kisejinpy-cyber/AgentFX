'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
  Users,
  Sliders,
  Send,
  Plus,
  ThumbsUp,
  Inbox,
  User,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import {
  AUTO_ESCROW_ADDRESS,
  AUTO_ESCROW_ABI,
  DISPUTE_DAO_ADDRESS,
  DISPUTE_DAO_ABI,
  USDC_DECIMALS,
  truncateAddress,
  explorerAddressUrl
} from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import { getBootstrapDisputedJobs, getBootstrapDAOProposals } from '@/lib/bootstrapData';
import { Skeleton } from '@/components/ui/motion/LoadingLibrary';

interface EscrowData {
  id: number;
  buyer: string;
  seller: string;
  agent: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  deadline: bigint;
  state: number;
  createdAt: bigint;
  invoiceRef: string;
  milestoneCount: number;
  settlementToken: string;
  isDisputed: boolean;
  disputeReason: string;
  isSample?: boolean;
}

interface DisputeStateData {
  threshold: bigint;
  releaseVotes: bigint;
  refundVotes: bigint;
  resolved: boolean;
  humanArbiter: string;
}

interface ProposalData {
  id: number;
  jobId: number;
  buyerPercent: number;
  approvals: number;
  executed: boolean;
  isSample?: boolean;
}

export function DisputeBoard() {
  const { address } = useAccount();
  const { addToast, updateToast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [disputedJobs, setDisputedJobs] = useState<EscrowData[]>([]);
  const [selectedJob, setSelectedJob] = useState<EscrowData | null>(null);
  const [selectedJobAgents, setSelectedJobAgents] = useState<string[]>([]);
  const [agentVoteDetails, setAgentVoteDetails] = useState<Record<string, { hasVoted: boolean; vote: number }>>({});
  const [disputeState, setDisputeState] = useState<DisputeStateData | null>(null);
  
  const [daoProposals, setDaoProposals] = useState<ProposalData[]>([]);
  const [daoOwners, setDaoOwners] = useState<string[]>([]);
  const [daoThreshold, setDaoThreshold] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Forms inputs
  const [buyerPercentInput, setBuyerPercentInput] = useState<number>(50);
  const [daoJobId, setDaoJobId] = useState<string>('');
  const [daoBuyerPercent, setDaoBuyerPercent] = useState<number>(50);

  // Fetch all jobs to filter disputed ones
  const { data: nextId, refetch: refetchNextId } = useReadContract({
    address: AUTO_ESCROW_ADDRESS,
    abi: AUTO_ESCROW_ABI,
    functionName: 'nextEscrowId',
    query: { refetchInterval: 8000 }
  });

  const fetchJobDisputeDetails = useCallback(async (jobId: number, agents: string[]) => {
    if (jobId >= 9900) {
      setDisputeState({
        threshold: BigInt(2),
        releaseVotes: BigInt(1),
        refundVotes: BigInt(0),
        resolved: false,
        humanArbiter: '0x1087E71CD83101adF154d8215522EadA51Bf891E'
      });
      setAgentVoteDetails({
        '0x1087E71CD83101adF154d8215522EadA51Bf891E': { hasVoted: true, vote: 1 },
        '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C': { hasVoted: false, vote: 0 },
        '0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39Fc72d': { hasVoted: false, vote: 0 }
      });
      return;
    }

    const { createPublicClient, http } = await import('viem');
    const { arcTestnet } = await import('@/components/Web3Provider');
    const client = createPublicClient({ chain: arcTestnet, transport: http() });

    try {
      // 1. Fetch DisputeState
      const dsResult = await client.readContract({
        address: AUTO_ESCROW_ADDRESS as `0x${string}`,
        abi: AUTO_ESCROW_ABI,
        functionName: 'jobDisputeStates',
        args: [BigInt(jobId)]
      }) as [bigint, bigint, bigint, boolean, string];

      setDisputeState({
        threshold: dsResult[0],
        releaseVotes: dsResult[1],
        refundVotes: dsResult[2],
        resolved: dsResult[3],
        humanArbiter: dsResult[4]
      });

      // 2. Fetch vote status for each agent
      const details: Record<string, { hasVoted: boolean; vote: number }> = {};
      for (const agent of agents) {
        const hasVoted = await client.readContract({
          address: AUTO_ESCROW_ADDRESS as `0x${string}`,
          abi: AUTO_ESCROW_ABI,
          functionName: 'hasVoted',
          args: [BigInt(jobId), agent as `0x${string}`]
        }) as boolean;

        const vote = await client.readContract({
          address: AUTO_ESCROW_ADDRESS as `0x${string}`,
          abi: AUTO_ESCROW_ABI,
          functionName: 'agentVotes',
          args: [BigInt(jobId), agent as `0x${string}`]
        }) as number;

        details[agent] = { hasVoted, vote };
      }
      setAgentVoteDetails(details);
    } catch (err) {
      console.error('Error fetching dispute details:', err);
    }
  }, []);

  const fetchDisputedJobs = useCallback(async () => {
    if (nextId === undefined) return;
    const count = Number(nextId);
    
    // Fallback if count is 0
    if (count === 0) {
      setDisputedJobs(getBootstrapDisputedJobs(address));
      setLoading(false);
      return;
    }

    const { createPublicClient, http } = await import('viem');
    const { arcTestnet } = await import('@/components/Web3Provider');
    const client = createPublicClient({ chain: arcTestnet, transport: http() });

    const calls = [];
    for (let i = 0; i < count; i++) {
      calls.push({
        address: AUTO_ESCROW_ADDRESS as `0x${string}`,
        abi: AUTO_ESCROW_ABI,
        functionName: 'getJob',
        args: [BigInt(i)]
      });
    }

    try {
      const results = await Promise.all(
        calls.map(call => client.readContract(call).catch(() => null))
      );

      const disputed: EscrowData[] = [];
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res) {
          const [buyer, seller, agent, totalAmount, releasedAmount, deadline, state, createdAt, invoiceRef, milestoneCount, settlementToken, isDisputed, disputeReason] =
            res as [string, string, string, bigint, bigint, bigint, number, bigint, string, bigint, string, boolean, string];

          if (isDisputed) {
            disputed.push({
              id: i,
              buyer,
              seller,
              agent,
              totalAmount,
              releasedAmount,
              deadline,
              state: Number(state),
              createdAt,
              invoiceRef,
              milestoneCount: Number(milestoneCount),
              settlementToken,
              isDisputed,
              disputeReason
            });
          }
        }
      }

      // Blend real disputed jobs with mock ones
      const combined = [...disputed, ...getBootstrapDisputedJobs(address)];
      setDisputedJobs(combined);

      // Refresh currently selected job details if it's in the list
      if (selectedJob) {
        const updatedSelected = combined.find(j => j.id === selectedJob.id);
        if (updatedSelected) {
          setSelectedJob(updatedSelected);
          
          let agents: string[];
          if (selectedJob.id >= 9900) {
            agents = [
              '0x1087E71CD83101adF154d8215522EadA51Bf891E',
              '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C',
              '0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39Fc72d'
            ];
          } else {
            agents = await client.readContract({
              address: AUTO_ESCROW_ADDRESS as `0x${string}`,
              abi: AUTO_ESCROW_ABI,
              functionName: 'getJobAgents',
              args: [BigInt(selectedJob.id)]
            }) as string[];
          }
          setSelectedJobAgents(agents);
          await fetchJobDisputeDetails(selectedJob.id, agents);
        } else {
          setSelectedJob(null);
          setSelectedJobAgents([]);
          setDisputeState(null);
        }
      }

      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch disputed jobs:', e);
      setLoading(false);
    }
  }, [nextId, selectedJob, fetchJobDisputeDetails]);

  // Fetch DisputeDAO state
  const fetchDAOState = useCallback(async () => {
    const { createPublicClient, http } = await import('viem');
    const { arcTestnet } = await import('@/components/Web3Provider');
    const client = createPublicClient({ chain: arcTestnet, transport: http() });

    try {
      const threshold = await client.readContract({
        address: DISPUTE_DAO_ADDRESS as `0x${string}`,
        abi: DISPUTE_DAO_ABI,
        functionName: 'threshold'
      }) as bigint;

      const owners = await client.readContract({
        address: DISPUTE_DAO_ADDRESS as `0x${string}`,
        abi: DISPUTE_DAO_ABI,
        functionName: 'getOwners'
      }) as string[];

      const propCounter = await client.readContract({
        address: DISPUTE_DAO_ADDRESS as `0x${string}`,
        abi: DISPUTE_DAO_ABI,
        functionName: 'proposalCounter'
      }) as bigint;

      setDaoThreshold(Number(threshold));
      setDaoOwners(owners);

      const proposals: ProposalData[] = [];
      for (let i = 0; i < Number(propCounter); i++) {
        const prop = await client.readContract({
          address: DISPUTE_DAO_ADDRESS as `0x${string}`,
          abi: DISPUTE_DAO_ABI,
          functionName: 'proposals',
          args: [BigInt(i)]
        }) as [bigint, bigint, bigint, boolean];

        proposals.push({
          id: i,
          jobId: Number(prop[0]),
          buyerPercent: Number(prop[1]),
          approvals: Number(prop[2]),
          executed: prop[3]
        });
      }

      const combinedProposals = proposals.length === 0
        ? getBootstrapDAOProposals()
        : [...proposals.reverse(), ...getBootstrapDAOProposals()];
      setDaoProposals(combinedProposals);
    } catch (err) {
      console.error('Error fetching DAO state, using mock sandbox:', err);
      setDaoThreshold(2);
      setDaoOwners([
        '0x1087E71CD83101adF154d8215522EadA51Bf891E',
        '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C'
      ]);
      setDaoProposals(getBootstrapDAOProposals());
    }
  }, []);

  useEffect(() => {
    fetchDisputedJobs();
    fetchDAOState();
  }, [nextId, fetchDisputedJobs, fetchDAOState]);

  // Handle agent vote
  const handleAgentVote = async (decision: number) => {
    if (!selectedJob) return;
    setActing(true);
    const toastId = addToast({
      type: 'loading',
      title: 'Submitting Vote',
      message: `Recording ${decision === 1 ? 'Release' : 'Refund'} vote for Job #${selectedJob.id}...`
    });

    if (selectedJob.isSample) {
      await new Promise(r => setTimeout(r, 1000));
      updateToast(toastId, {
        type: 'success',
        title: 'Consensus Vote Recorded (Simulated)',
        message: `Your agent node vote of ${decision === 1 ? 'Release' : 'Refund'} has been recorded in sandbox.`,
      });
      setDisputeState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          releaseVotes: decision === 1 ? prev.releaseVotes + BigInt(1) : prev.releaseVotes,
          refundVotes: decision === 2 ? prev.refundVotes + BigInt(1) : prev.refundVotes
        };
      });
      if (address) {
        setAgentVoteDetails(prev => ({
          ...prev,
          [address]: { hasVoted: true, vote: decision }
        }));
      }
      setActing(false);
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: 'submitVote',
        args: [BigInt(selectedJob.id), decision]
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      updateToast(toastId, {
        type: 'success',
        title: 'Vote Submitted',
        message: `Agent consensus vote recorded.`,
        txHash
      });
      await fetchDisputedJobs();
    } catch (err: any) {
      updateToast(toastId, {
        type: 'error',
        title: 'Voting Failed',
        message: err.message || 'Verification or authorization issue.'
      });
    } finally {
      setActing(false);
    }
  };

  // Handle human resolution
  const handleHumanResolve = async () => {
    if (!selectedJob) return;
    setActing(true);
    const toastId = addToast({
      type: 'loading',
      title: 'Submitting Arbitration',
      message: `Resolving Job #${selectedJob.id} with ${buyerPercentInput}% to buyer...`
    });

    if (selectedJob.isSample) {
      await new Promise(r => setTimeout(r, 1000));
      updateToast(toastId, {
        type: 'success',
        title: 'Dispute Arbitrated (Simulated)',
        message: `Job #${selectedJob.id} resolved successfully in sandbox.`,
      });
      setDisputeState(prev => prev ? { ...prev, resolved: true } : null);
      setActing(false);
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: AUTO_ESCROW_ADDRESS,
        abi: AUTO_ESCROW_ABI,
        functionName: 'humanResolveDispute',
        args: [BigInt(selectedJob.id), BigInt(buyerPercentInput)]
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      updateToast(toastId, {
        type: 'success',
        title: 'Dispute Arbitrated',
        message: `Job #${selectedJob.id} resolved successfully.`,
        txHash
      });
      await fetchDisputedJobs();
    } catch (err: any) {
      updateToast(toastId, {
        type: 'error',
        title: 'Arbitration Failed',
        message: err.message || 'Only assigned human arbiter can execute fallback resolution.'
      });
    } finally {
      setActing(false);
    }
  };

  // Propose DisputeDAO resolution
  const handleProposeDao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daoJobId) return;
    setActing(true);
    const toastId = addToast({
      type: 'loading',
      title: 'Creating Proposal',
      message: `Proposing resolution for Job #${daoJobId}...`
    });

    if (parseInt(daoJobId) >= 9900) {
      await new Promise(r => setTimeout(r, 1000));
      updateToast(toastId, {
        type: 'success',
        title: 'DAO Proposal Created (Simulated)',
        message: `Multisig resolution proposal created in sandbox.`,
      });
      const newProp = {
        id: 900 + daoProposals.length + 1,
        jobId: parseInt(daoJobId),
        buyerPercent: daoBuyerPercent,
        approvals: 1,
        executed: false,
        isSample: true
      };
      setDaoProposals(prev => [newProp, ...prev]);
      setDaoJobId('');
      setActing(false);
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: DISPUTE_DAO_ADDRESS,
        abi: DISPUTE_DAO_ABI,
        functionName: 'proposeResolution',
        args: [BigInt(daoJobId), BigInt(daoBuyerPercent)]
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      updateToast(toastId, {
        type: 'success',
        title: 'DAO Proposal Created',
        message: `Multisig resolution proposal created.`,
        txHash
      });
      setDaoJobId('');
      await fetchDAOState();
    } catch (err: any) {
      updateToast(toastId, {
        type: 'error',
        title: 'Proposal Failed',
        message: err.message || 'Must be a registered DisputeDAO owner to propose.'
      });
    } finally {
      setActing(false);
    }
  };

  // Approve DisputeDAO proposal
  const handleApproveDaoProposal = async (propId: number) => {
    setActing(true);
    const toastId = addToast({
      type: 'loading',
      title: 'Approving Proposal',
      message: `Signing DAO approval for proposal #${propId}...`
    });

    if (propId >= 900) {
      await new Promise(r => setTimeout(r, 1000));
      updateToast(toastId, {
        type: 'success',
        title: 'Proposal Approved (Simulated)',
        message: `DAO approval signed. Execute triggered if threshold met.`,
      });
      setDaoProposals(prev => prev.map(p => {
        if (p.id === propId) {
          const nextApprovals = p.approvals + 1;
          const threshold = daoThreshold || 2;
          return {
            ...p,
            approvals: nextApprovals,
            executed: nextApprovals >= threshold ? true : p.executed
          };
        }
        return p;
      }));
      setActing(false);
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: DISPUTE_DAO_ADDRESS,
        abi: DISPUTE_DAO_ABI,
        functionName: 'approveProposal',
        args: [BigInt(propId), AUTO_ESCROW_ADDRESS]
      });

      const { createPublicClient, http } = await import('viem');
      const { arcTestnet } = await import('@/components/Web3Provider');
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      updateToast(toastId, {
        type: 'success',
        title: 'Proposal Approved',
        message: `DAO approval signed. Execute triggered if threshold met.`,
        txHash
      });
      await fetchDAOState();
      await fetchDisputedJobs();
    } catch (err: any) {
      updateToast(toastId, {
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Must be a DAO owner who has not voted.'
      });
    } finally {
      setActing(false);
    }
  };

  // Check user roles
  const isSelectedJobAgent = selectedJob?.isSample 
    ? true 
    : (address ? selectedJobAgents.some(a => a.toLowerCase() === address.toLowerCase()) : false);
  const isSelectedJobArbiter = selectedJob?.isSample 
    ? true 
    : (address && disputeState ? disputeState.humanArbiter.toLowerCase() === address.toLowerCase() : false);
  const isDaoOwner = (selectedJob?.isSample || daoProposals.some(p => p.isSample))
    ? true
    : (address ? daoOwners.some(o => o.toLowerCase() === address.toLowerCase()) : false);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section: Active Disputes list */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Active Disputes</h3>
                <p className="text-[10px] text-gray-500">Escrow files locked in deadlock</p>
              </div>
              <button
                onClick={() => { setLoading(true); fetchDisputedJobs(); }}
                className="text-[10px] text-gray-400 hover:text-white bg-gray-800/50 px-2 py-1 rounded transition-colors"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-800/40 bg-gray-950/30 space-y-2.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/5" />
                    </div>
                    <Skeleton className="h-6 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : disputedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-gray-800/60 rounded-xl bg-gray-950/20">
                <Inbox className="w-8 h-8 text-gray-700" />
                <p className="text-xs text-gray-500 font-medium">All systems green</p>
                <p className="text-[10px] text-gray-600">No active disputes registered</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto scrollbar-none">
                {disputedJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2.5
                      ${selectedJob?.id === job.id
                        ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.05)]'
                        : 'bg-gray-950/30 border-gray-800/40 hover:border-gray-700/60 hover:bg-gray-950/50'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-cyan-400">Job #{job.id}</span>
                        {job.invoiceRef && (
                          <span className="text-[10px] text-gray-500 truncate max-w-[120px] font-mono">
                            {job.invoiceRef}
                          </span>
                        )}
                        {job.isSample && (
                          <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded uppercase">
                            Sandbox
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-semibold text-gray-300">
                        {formatUnits(job.totalAmount, USDC_DECIMALS)} USDC
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-950/10 px-2 py-1 rounded border border-orange-900/20 max-w-max">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{job.disputeReason || 'No reason provided'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
                      <span>Buyer: {truncateAddress(job.buyer, 4)}</span>
                      <span>Seller: {truncateAddress(job.seller, 4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DisputeDAO configuration stats */}
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800/40 pb-3">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Human Fallback DAO
              </span>
              <span className="text-[10px] bg-purple-900/20 text-purple-400 px-2 py-0.5 rounded border border-purple-800/30 font-medium">
                Multisig active
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">DAO Address</span>
                <a href={explorerAddressUrl(DISPUTE_DAO_ADDRESS)} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-cyan-400 hover:underline">{truncateAddress(DISPUTE_DAO_ADDRESS, 6)}</a>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Quorum Requirement</span>
                <span className="text-gray-300 font-medium">{daoThreshold} of {daoOwners.length} approvals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Selected Dispute Vote Details & Resolution Actions */}
        <div className="lg:col-span-7 space-y-6">
          {selectedJob ? (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in">
              <div className="border-b border-gray-800/40 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-gray-200">
                    Dispute Details — Job #{selectedJob.id}
                  </h3>
                  {selectedJob.isSample ? (
                    <span className="text-xs bg-amber-950/20 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded font-mono uppercase">
                      Sandbox Simulation
                    </span>
                  ) : (
                    <span className="text-xs bg-red-950/20 text-red-400 border border-red-900/30 px-2 py-0.5 rounded font-mono">
                      LOCKED
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Total Budget: {formatUnits(selectedJob.totalAmount, USDC_DECIMALS)} USDC | Created on {new Date(Number(selectedJob.createdAt) * 1000).toLocaleDateString()}
                </p>
              </div>

              {/* Voting Progress bar */}
              {disputeState && (
                <div className="bg-gray-950/40 border border-gray-800/30 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Consensus Vote Progress</h4>
                  <div className="flex justify-between text-xs text-gray-300 font-mono">
                    <span>Release Votes: {Number(disputeState.releaseVotes)}</span>
                    <span>Required Quorum: {Number(disputeState.threshold)}</span>
                    <span>Refund Votes: {Number(disputeState.refundVotes)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all duration-300" 
                      style={{ width: `${(Number(disputeState.releaseVotes) / selectedJobAgents.length) * 100}%` }} />
                    <div className="bg-gray-800 h-full flex-1" />
                    <div className="bg-red-500 h-full transition-all duration-300" 
                      style={{ width: `${(Number(disputeState.refundVotes) / selectedJobAgents.length) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Authorized Agents Voting status */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned AI Agent Validators</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedJobAgents.map((agentAddr, idx) => {
                    const status = agentVoteDetails[agentAddr];
                    const isCurrentUser = address?.toLowerCase() === agentAddr.toLowerCase();
                    return (
                      <div key={agentAddr} className="bg-gray-950/20 border border-gray-800/40 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-300">Agent {idx + 1}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] bg-cyan-950/20 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-900/30">YOU</span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-gray-500 block">{truncateAddress(agentAddr, 6)}</span>
                        </div>

                        <div>
                          {status?.hasVoted ? (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1
                              ${status.vote === 1 
                                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30'
                                : 'bg-red-950/20 text-red-400 border border-red-900/30'
                              }`}
                            >
                              {status.vote === 1 ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {status.vote === 1 ? 'Voted Release' : 'Voted Refund'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Pending Vote
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vote actions for Agent */}
              {isSelectedJobAgent && disputeState && !disputeState.resolved && (
                <div className="border-t border-gray-800/40 pt-4 space-y-3 bg-cyan-950/5 p-4 rounded-xl border border-cyan-500/10">
                  <h4 className="text-xs font-semibold text-cyan-400 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Agent Action Box (You are an assigned agent)
                  </h4>
                  <p className="text-[10px] text-gray-500">Submit your verification signature to resolve the dispute.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAgentVote(1)}
                      disabled={acting}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      Vote Release (Pay Seller)
                    </button>
                    <button
                      onClick={() => handleAgentVote(2)}
                      disabled={acting}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      Vote Refund (Pay Buyer)
                    </button>
                  </div>
                </div>
              )}

              {/* Human override box */}
              {disputeState && !disputeState.resolved && (
                <div className="border-t border-gray-800/40 pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fallback Human Arbitration</h4>
                    {isSelectedJobArbiter && (
                      <span className="text-[9px] bg-purple-950/20 text-purple-400 px-2 py-0.5 rounded border border-purple-900/30">
                        DESIGNATED ARBITER
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-gray-950/30 border border-gray-800/40 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Refund allocation to Buyer</span>
                      <span className="text-xs font-mono font-semibold text-cyan-400">{buyerPercentInput}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={buyerPercentInput}
                      onChange={(e) => setBuyerPercentInput(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                      <span>0% (100% to Seller)</span>
                      <span>100% (100% to Buyer)</span>
                    </div>

                    <button
                      onClick={handleHumanResolve}
                      disabled={acting || !isSelectedJobArbiter}
                      className="w-full py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 border border-gray-700/50 disabled:opacity-40"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Execute Arbitrary Settlement
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center text-center py-20 gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sliders className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-300">Arbitration Panel</h4>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  Select an active dispute from the list on the left to inspect vote records, submit agent consensus, or call human fallback multisig arbitration.
                </p>
              </div>
            </div>
          )}

          {/* DisputeDAO Proposals list & Propose form */}
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800/40 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">DisputeDAO Proposals</h3>
                <p className="text-[10px] text-gray-500">Fallback multisig decisions feed</p>
              </div>
              {isDaoOwner && (
                <span className="text-[9px] bg-purple-950/20 text-purple-400 px-2 py-0.5 rounded border border-purple-900/30">
                  DAO MEMBER
                </span>
              )}
            </div>

            {/* Propose resolution form */}
            <form onSubmit={handleProposeDao} className="bg-gray-950/20 border border-gray-800/40 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400">Propose New Resolution</h4>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-4">
                  <input
                    type="number"
                    placeholder="Job ID"
                    required
                    value={daoJobId}
                    onChange={(e) => setDaoJobId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="sm:col-span-5 flex flex-col justify-center">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Buyer: {daoBuyerPercent}%</span>
                    <span>Seller: {100 - daoBuyerPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={daoBuyerPercent}
                    onChange={(e) => setDaoBuyerPercent(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={acting || !isDaoOwner}
                    className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Propose
                  </button>
                </div>
              </div>
            </form>

            {/* Proposals feed list */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-none">
              {daoProposals.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-600">No proposals created yet</div>
              ) : (
                daoProposals.map(prop => (
                  <div key={prop.id} className="p-3.5 rounded-xl bg-gray-950/30 border border-gray-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-300">Proposal #{prop.id}</span>
                        <span className="text-[10px] text-gray-500 font-mono">Job #{prop.jobId}</span>
                        {prop.isSample && (
                          <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded uppercase">
                            Sandbox
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Resolution: <span className="text-cyan-400 font-semibold">{prop.buyerPercent}% Refund</span> to buyer, {100 - prop.buyerPercent}% release to seller.
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0 self-end sm:self-auto">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-400 font-mono font-medium">
                          Approvals: {prop.approvals} / {daoThreshold}
                        </span>
                        {prop.executed && (
                          <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> Executed
                          </span>
                        )}
                      </div>

                      {!prop.executed && (
                        <button
                          onClick={() => handleApproveDaoProposal(prop.id)}
                          disabled={acting || !isDaoOwner}
                          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700/50 hover:border-gray-600 text-xs text-gray-300 flex items-center gap-1 transition-colors disabled:opacity-40"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-purple-400" />
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
