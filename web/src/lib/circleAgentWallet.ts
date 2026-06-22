import { decodeFunctionData } from 'viem';
import crypto from 'crypto';
import {
  USDC_ABI,
  AUTO_ESCROW_ABI,
  AGENT_REGISTRY_ABI,
  TREASURY_VAULT_ABI,
  DISPUTE_DAO_ABI
} from './constants';

const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s/developer';

const ALL_ABIS = [
  ...USDC_ABI,
  ...AUTO_ESCROW_ABI,
  ...AGENT_REGISTRY_ABI,
  ...TREASURY_VAULT_ABI,
  ...DISPUTE_DAO_ABI
];

/**
 * Helper to decode raw contract callData hex strings into Circle API structure
 */
function decodeCallData(callData: `0x${string}`) {
  try {
    const decoded = decodeFunctionData({
      abi: ALL_ABIS,
      data: callData
    });

    const func = ALL_ABIS.find((x: any) => x.name === decoded.functionName && x.type === 'function');
    if (!func) {
      throw new Error(`Function ${decoded.functionName} not found in registered ABIs`);
    }

    const paramTypes = func.inputs.map((i: any) => i.type).join(',');
    const abiFunctionSignature = `${decoded.functionName}(${paramTypes})`;

    const abiParameters = (decoded.args || []).map((arg: any) => {
      if (typeof arg === 'bigint') {
        return arg.toString();
      }
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg);
      }
      return String(arg);
    });

    return { abiFunctionSignature, abiParameters };
  } catch (err: any) {
    console.error('Failed to decode function data:', err);
    throw new Error(`ABI decoding failed: ${err.message || err}`);
  }
}

/**
 * Generates the entity secret ciphertext required by Circle Developer-Controlled Wallets.
 */
async function getEntitySecretCiphertext(apiKey: string): Promise<string> {
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!entitySecret) {
    throw new Error('CIRCLE_ENTITY_SECRET environment variable is missing.');
  }

  const res = await fetch(`https://api.circle.com/v1/w3s/config/entity/publicKey`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Circle public key: ${res.statusText}`);
  }

  const payload = await res.json();
  const publicKeyPem = payload?.data?.publicKey;
  if (!publicKeyPem) {
    throw new Error('Public key missing from Circle response');
  }

  const entitySecretBuffer = Buffer.from(entitySecret, 'hex');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    entitySecretBuffer
  );

  return encrypted.toString('base64');
}

/**
 * Resolves a wallet set name (or UUID) to the actual UUID.
 */
async function resolveWalletSetId(apiKey: string, nameOrId: string, ciphertext: string): Promise<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(nameOrId)) {
    return nameOrId;
  }

  try {
    const res = await fetch(`https://api.circle.com/v1/w3s/walletSets`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      const walletSets = data?.data?.walletSets || [];
      const match = walletSets.find((ws: any) => ws.name === nameOrId);
      if (match) {
        return match.id;
      }
    }
  } catch (err) {
    console.error('Error listing wallet sets in resolveWalletSetId:', err);
  }

  // Not found, create it dynamically
  console.log(`Creating wallet set dynamically: ${nameOrId}`);
  const res = await fetch(`https://api.circle.com/v1/w3s/developer/walletSets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext: ciphertext,
      name: nameOrId,
    }),
  });

  const data = await res.json();
  if (res.ok && data?.data?.walletSet?.id) {
    return data.data.walletSet.id;
  }

  throw new Error(`Could not resolve or create wallet set ID for: ${nameOrId}. Response: ${JSON.stringify(data)}`);
}

/**
 * Polls for transaction completion and returns the transaction hash.
 */
async function pollTransactionForHash(apiKey: string, transactionId: string): Promise<string> {
  const url = `https://api.circle.com/v1/w3s/transactions/${transactionId}`;

  for (let i = 0; i < 45; i++) { // Poll for up to 45 seconds
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const tx = data?.data?.transaction;
        if (tx) {
          if (tx.txHash) {
            return tx.txHash;
          }
          if (tx.state === 'FAILED' || tx.state === 'CANCELLED') {
            throw new Error(`Circle transaction execution failed with state: ${tx.state}. Error: ${tx.errorReason || 'Unknown'}`);
          }
        }
      }
    } catch (err) {
      console.warn(`Polling transaction ${transactionId} attempt ${i} warning:`, err);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for on-chain txHash for transaction ID ${transactionId}`);
}

/**
 * Provisions a Developer-Controlled Wallet on Arc Testnet.
 */
export async function provisionAgentWallet(walletSetName: string = 'meridian-agent-set'): Promise<{ id: string; address: string }> {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error('CIRCLE_API_KEY is not configured in environment.');
  }

  const ciphertext = await getEntitySecretCiphertext(apiKey);
  const walletSetId = await resolveWalletSetId(apiKey, walletSetName, ciphertext);

  // Check if we already have a wallet in this set to avoid double provisioning
  try {
    const listRes = await fetch(`https://api.circle.com/v1/w3s/wallets?walletSetId=${walletSetId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = listData?.data?.wallets || [];
      const activeWallet = existing.find((w: any) => w.blockchain === 'ARC-TESTNET' && w.state === 'LIVE');
      if (activeWallet) {
        console.log(`Found existing active wallet on ARC-TESTNET in set ${walletSetName}: ${activeWallet.address}`);
        return {
          id: activeWallet.id,
          address: activeWallet.address,
        };
      }
    }
  } catch (err) {
    console.warn('Error checking existing wallets in set:', err);
  }

  console.log(`Provisioning real Circle Developer-Controlled Wallet in set ${walletSetName}...`);
  const response = await fetch(`${CIRCLE_API_URL}/wallets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext: ciphertext,
      walletSetId,
      blockchains: ['ARC-TESTNET'],
      count: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to provision real wallet via Circle API');
  }

  const wallet = data?.data?.wallets?.[0];
  if (!wallet) {
    throw new Error('Provisioning response did not contain wallet data.');
  }

  console.log(`Successfully provisioned Circle Wallet: ${wallet.address} (ID: ${wallet.id})`);
  return {
    id: wallet.id,
    address: wallet.address,
  };
}

/**
 * Executes a smart contract write interaction via Circle Developer-Controlled Wallet.
 */
export async function executeContractCall(
  walletId: string,
  contractAddress: string,
  abiOrCallData: any[] | string,
  functionName?: string,
  args?: any[]
): Promise<string> {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error('CIRCLE_API_KEY is not configured in environment.');
  }

  const ciphertext = await getEntitySecretCiphertext(apiKey);

  let abiFunctionSignature: string;
  let abiParameters: string[];

  if (typeof abiOrCallData === 'string' && abiOrCallData.startsWith('0x')) {
    const decoded = decodeCallData(abiOrCallData as `0x${string}`);
    abiFunctionSignature = decoded.abiFunctionSignature;
    abiParameters = decoded.abiParameters;
  } else {
    const abi = abiOrCallData as any[];
    const func = abi.find((x: any) => x.name === functionName && x.type === 'function');
    if (!func) {
      throw new Error(`Function "${functionName}" not found in provided ABI`);
    }
    const paramTypes = func.inputs.map((i: any) => i.type).join(',');
    abiFunctionSignature = `${functionName}(${paramTypes})`;
    abiParameters = (args || []).map((arg: any) => {
      if (typeof arg === 'bigint') {
        return arg.toString();
      }
      return String(arg);
    });
  }

  console.log(`Executing contract call to ${contractAddress} [${abiFunctionSignature}] via Circle Developer Wallet ${walletId}...`);
  const response = await fetch(`${CIRCLE_API_URL}/transactions/contractExecution`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext: ciphertext,
      walletId,
      contractAddress,
      feeLevel: 'MEDIUM',
      abiFunctionSignature,
      abiParameters,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Contract execution call rejected by Circle API');
  }

  const transactionId = data?.data?.id;
  if (!transactionId) {
    throw new Error('Contract execution response did not contain transaction ID.');
  }

  // Poll for the on-chain txHash
  return await pollTransactionForHash(apiKey, transactionId);
}
