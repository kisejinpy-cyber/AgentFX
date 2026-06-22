// Meridian Treasury OS Sandbox Bootstrap Seeder Dataset
// Designed to ensure zero empty states for Day 0 launch / hackathon demos
// while maintaining absolute technical honesty via clear labeling.

export interface EscrowData {
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
  isSample?: boolean;
}

export interface EventLog {
  id: string;
  type: 'created' | 'released' | 'refunded' | 'dispute' | 'resolved' | 'milestone';
  escrowId: number;
  txHash: string;
  blockNumber: bigint;
  details: string;
  timestamp: number;
  isSample?: boolean;
}

export interface ProposalData {
  id: number;
  jobId: number;
  buyerPercent: number;
  approvals: number;
  executed: boolean;
  isSample?: boolean;
}

export interface DisputedJobData extends EscrowData {
  isDisputed: boolean;
  disputeReason: string;
}

// Generate realistic simulated records based on the connected user address
export function getBootstrapEscrows(connectedAddress?: string): EscrowData[] {
  const buyerAddr = connectedAddress || '0x32cd9d2A7522EadA51Bf891E1087E71C891E9cE7';
  const mockSeller1 = '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C';
  const mockSeller2 = '0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39Fc72d';
  const mockAgent1 = '0x1087E71CD83101adF154d8215522EadA51Bf891E';

  const baseTime = Math.floor(Date.now() / 1000);

  return [
    {
      id: 9901,
      buyer: buyerAddr,
      seller: mockSeller1,
      agent: mockAgent1,
      totalAmount: BigInt(5000000000), // $5,000.00 USDC
      releasedAmount: BigInt(5000000000),
      deadline: BigInt(baseTime - 86400 * 5),
      state: 1, // Released
      createdAt: BigInt(baseTime - 86400 * 10),
      invoiceRef: 'INV-2026-004',
      milestoneCount: 1,
      settlementToken: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01',
      isSample: true,
    },
    {
      id: 9902,
      buyer: mockSeller2,
      seller: buyerAddr,
      agent: mockSeller1,
      totalAmount: BigInt(1250000000), // $1,250.00 USDC
      releasedAmount: BigInt(0),
      deadline: BigInt(baseTime + 86400 * 4),
      state: 0, // Active
      createdAt: BigInt(baseTime - 86400 * 2),
      invoiceRef: 'PO-9942-A',
      milestoneCount: 2,
      settlementToken: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01',
      isSample: true,
    },
    {
      id: 9903,
      buyer: buyerAddr,
      seller: mockSeller2,
      agent: mockAgent1,
      totalAmount: BigInt(8500000000), // $8,500.00 USDC
      releasedAmount: BigInt(0),
      deadline: BigInt(baseTime + 86400 * 12),
      state: 3, // Disputed
      createdAt: BigInt(baseTime - 86400 * 3),
      invoiceRef: 'INV-2026-012',
      milestoneCount: 1,
      settlementToken: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01',
      isSample: true,
    },
    {
      id: 9904,
      buyer: mockSeller1,
      seller: buyerAddr,
      agent: mockAgent1,
      totalAmount: BigInt(15000000000), // $15,000.00 USDC
      releasedAmount: BigInt(7500000000),
      deadline: BigInt(baseTime + 86400 * 18),
      state: 0, // Active (Partial release)
      createdAt: BigInt(baseTime - 86400 * 5),
      invoiceRef: 'PO-1024-B',
      milestoneCount: 2,
      settlementToken: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01',
      isSample: true,
    },
    {
      id: 9905,
      buyer: buyerAddr,
      seller: mockSeller1,
      agent: mockAgent1,
      totalAmount: BigInt(6200000000), // $6,200.00 USDC
      releasedAmount: BigInt(6200000000),
      deadline: BigInt(baseTime - 86400 * 1),
      state: 4, // Resolved
      createdAt: BigInt(baseTime - 86400 * 8),
      invoiceRef: 'INV-2026-033',
      milestoneCount: 1,
      settlementToken: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01',
      isSample: true,
    }
  ];
}

// Generate realistic simulated events based on user address
export function getBootstrapEvents(connectedAddress?: string): EventLog[] {
  const userAddr = connectedAddress || '0x32cd9d2A7522EadA51Bf891E1087E71C891E9cE7';
  const buyerText = userAddr.substring(0, 6) + '...' + userAddr.slice(-4);
  const baseTime = Date.now();

  return [
    {
      id: 'sample-evt-1',
      type: 'dispute',
      escrowId: 9903,
      txHash: '0x32cd9da143b4fbea8e0d68cbca5dc48e6a18a01f5',
      blockNumber: BigInt(125890),
      details: `Dispute raised by Payer (${buyerText}): Shipper reported transit damage. Waiting for Agent verification.`,
      timestamp: baseTime - 2 * 60 * 60 * 1000,
      isSample: true,
    },
    {
      id: 'sample-evt-2',
      type: 'created',
      escrowId: 9903,
      txHash: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01ff',
      blockNumber: BigInt(125430),
      details: `$8,500 USDC locked by Payer (${buyerText}) → 0x9cE7a5...fc72d`,
      timestamp: baseTime - 4 * 60 * 60 * 1000,
      isSample: true,
    },
    {
      id: 'sample-evt-3',
      type: 'created',
      escrowId: 9902,
      txHash: '0xe6b13b821a58d28e7522eada51bf891e1087e71c4f',
      blockNumber: BigInt(123910),
      details: `$1,250 USDC locked by 0x9cE7a5...fc72d → Payer (${buyerText})`,
      timestamp: baseTime - 12 * 60 * 60 * 1000,
      isSample: true,
    },
    {
      id: 'sample-evt-4',
      type: 'released',
      escrowId: 9901,
      txHash: '0x78ef9da143b4fbea8e0d68cbca5dc48e6a18a01f4c',
      blockNumber: BigInt(119280),
      details: `$5,000 USDC released to 0xe6A13B...E71C after Logistics Node validation.`,
      timestamp: baseTime - 24 * 60 * 60 * 1000,
      isSample: true,
    },
    {
      id: 'sample-evt-5',
      type: 'resolved',
      escrowId: 9905,
      txHash: '0x43b4fbea8e0d68cbca5dc48e6a18a01f4c78ef9da1',
      blockNumber: BigInt(118540),
      details: `Escrow #9905 resolved via DisputeDAO: 100% split paid to 0xe6A13B...E71C.`,
      timestamp: baseTime - 36 * 60 * 60 * 1000,
      isSample: true,
    }
  ];
}

// Generate realistic simulated disputed jobs list
export function getBootstrapDisputedJobs(connectedAddress?: string): DisputedJobData[] {
  const buyerAddr = connectedAddress || '0x32cd9d2A7522EadA51Bf891E1087E71C891E9cE7';
  const mockSeller1 = '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C';
  const mockSeller2 = '0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39Fc72d';
  const mockAgent1 = '0x1087E71CD83101adF154d8215522EadA51Bf891E';
  const mockAgent2 = '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C';

  const baseTime = Math.floor(Date.now() / 1000);

  return [
    {
      id: 9903,
      buyer: buyerAddr,
      seller: mockSeller2,
      agent: mockAgent1,
      totalAmount: BigInt(8500000000), // $8,500.00
      releasedAmount: BigInt(0),
      deadline: BigInt(baseTime + 86400 * 12),
      state: 3, // Disputed
      createdAt: BigInt(baseTime - 86400 * 3),
      invoiceRef: 'INV-2026-012',
      milestoneCount: 1,
      settlementToken: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01',
      isDisputed: true,
      disputeReason: 'Freight forwarder logged temperature excursions. Cargo compliance screening flagged high risks.',
      isSample: true,
    },
    {
      id: 9906,
      buyer: mockSeller2,
      seller: buyerAddr,
      agent: mockAgent2,
      totalAmount: BigInt(4800000000), // $4,800.00
      releasedAmount: BigInt(2400000000),
      deadline: BigInt(baseTime + 86400 * 20),
      state: 3, // Disputed
      createdAt: BigInt(baseTime - 86400 * 6),
      invoiceRef: 'PO-2026-044',
      milestoneCount: 2,
      settlementToken: '0x1c881747ca1f4fbea8e0d68cbca5dc48e6a18a01',
      isDisputed: true,
      disputeReason: 'Milestone 2 deliverable source code lacks unit test coverage specified in the digital SLA.',
      isSample: true,
    }
  ];
}

// Generate realistic simulated DisputeDAO Proposals
export function getBootstrapDAOProposals(): ProposalData[] {
  return [
    {
      id: 901,
      jobId: 9905,
      buyerPercent: 0, // 0% to buyer, 100% to seller
      approvals: 2,
      executed: true,
      isSample: true,
    },
    {
      id: 902,
      jobId: 9903,
      buyerPercent: 60, // 60% refund to buyer, 40% payout to seller
      approvals: 1,
      executed: false,
      isSample: true,
    }
  ];
}

// Check if we should override with bootstrap data or blend
export function hasRealData(nextId?: bigint | number): boolean {
  if (nextId === undefined) return false;
  return Number(nextId) > 0;
}
