// ─── Arc Testnet Chain & Contract Constants ───
// Single source of truth for all blockchain addresses and chain config

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network';
export const ARC_TESTNET_WS = 'wss://rpc.testnet.arc.network';
export const ARC_TESTNET_EXPLORER = 'https://testnet.arcscan.app';

// USDC on Arc Testnet — native precompile address
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;
export const USDC_DECIMALS = 6;
export const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as const;

// Deployed AutoEscrow contract
export const AUTO_ESCROW_ADDRESS = '0x581854b3fa015569b67A9AABa564c46b4EDCbDd0' as const;
export const TREASURY_VAULT_ADDRESS = '0xc84AA7bF6DdBB5A11d811230B45ca6a802d7BE12' as const;
export const AGENT_REGISTRY_ADDRESS = '0xC3B49a82B853e77d8724ac404EA4eA9C59005f7e' as const;
export const USYC_VAULT_ADDRESS = '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C' as const;

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

// ─── AutoEscrow v3 ABI (imported dynamically) ───
import AUTO_ESCROW_ABI_JSON from '../components/AutoEscrowABI.json';
export const AUTO_ESCROW_ABI = AUTO_ESCROW_ABI_JSON;

import AGENT_REGISTRY_ABI_JSON from '../components/AgentRegistryABI.json';
export const AGENT_REGISTRY_ABI = AGENT_REGISTRY_ABI_JSON;

// ─── Helper: Build explorer URL ───
export function explorerTxUrl(txHash: string): string {
  return `${ARC_TESTNET_EXPLORER}/tx/${txHash}`;
}

import TREASURY_VAULT_ABI_JSON from '../components/TreasuryVaultABI.json';
export const TREASURY_VAULT_ABI = TREASURY_VAULT_ABI_JSON;

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

import DISPUTE_DAO_ABI_JSON from '../components/DisputeDAOABI.json';
export const DISPUTE_DAO_ABI = DISPUTE_DAO_ABI_JSON;

export const DISPUTE_DAO_ADDRESS = "0xB0c27DbBEB7dC99294902EF70E954DC4836C14a8";
