// ─── Arc Testnet Chain & Contract Constants ───
// Single source of truth for all blockchain addresses and chain config

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network';
export const ARC_TESTNET_WS = 'wss://rpc.testnet.arc.network';
export const ARC_TESTNET_EXPLORER = 'https://testnet.arcscan.app';

// USDC on Arc Testnet — native precompile address
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;
export const USDC_DECIMALS = 6;

// Deployed AutoEscrow contract
export const AUTO_ESCROW_ADDRESS = '0x08818076dCDbFe5b6ca0e4471c1fF8b11e568774' as const;
export const TREASURY_VAULT_ADDRESS = '0x5F1C01eE73FF50f0540Da476d148Ca8573d4e310' as const;

// ─── Minimal USDC ABI (only functions we use) ───
export const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ─── AutoEscrow v2 ABI (typed for wagmi) ───
export const AUTO_ESCROW_ABI = [
  // ─── Write Functions ───
  {
    name: 'createSimpleEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_seller', type: 'address' },
      { name: '_agent', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'createEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_seller', type: 'address' },
      { name: '_agent', type: 'address' },
      { name: '_deadline', type: 'uint256' },
      { name: '_invoiceRef', type: 'string' },
      { name: '_milestoneDescs', type: 'string[]' },
      { name: '_milestoneAmounts', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'completeMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_escrowId', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'releaseMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_escrowId', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'releaseAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'refundEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimTimeoutRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'raiseDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_escrowId', type: 'uint256' },
      { name: '_reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'resolveDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_escrowId', type: 'uint256' },
      { name: '_buyerPercent', type: 'uint256' },
    ],
    outputs: [],
  },
  // ─── Read Functions ───
  {
    name: 'escrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'agent', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'releasedAmount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'invoiceRef', type: 'string' },
      { name: 'milestoneCount', type: 'uint256' },
    ],
  },
  {
    name: 'milestones',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    outputs: [
      { name: 'description', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'completed', type: 'bool' },
      { name: 'released', type: 'bool' },
    ],
  },
  {
    name: 'nextEscrowId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'usdc',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getUserEscrowIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  // ─── Events ───
  {
    name: 'EscrowCreated',
    type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: false },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MilestoneCompleted',
    type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'completedBy', type: 'address', indexed: false },
    ],
  },
  {
    name: 'MilestoneReleased',
    type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'EscrowFullyReleased',
    type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'EscrowRefunded',
    type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'DisputeRaised',
    type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'raisedBy', type: 'address', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    name: 'DisputeResolved',
    type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'buyerAmount', type: 'uint256', indexed: false },
      { name: 'sellerAmount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ─── Helper: Build explorer URL ───
export function explorerTxUrl(txHash: string): string {
  return `${ARC_TESTNET_EXPLORER}/tx/${txHash}`;
}

export const TREASURY_VAULT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "threshold", "type": "uint256" },
      { "internalType": "address", "name": "yieldVault", "type": "address" }
    ],
    "name": "sweepExcessToYield",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export function explorerAddressUrl(address: string): string {
  return `${ARC_TESTNET_EXPLORER}/address/${address}`;
}

// ─── Helper: Truncate address ───
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// ─── Helper: Validate Ethereum address ───
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
