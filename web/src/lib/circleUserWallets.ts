import fs from 'fs';
import path from 'path';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { provisionAgentWallet, executeContractCall } from './circleAgentWallet';

const DB_PATH = path.resolve(process.cwd(), 'src/lib/circle_users_db.json');
const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  }
];

interface UserWalletData {
  email: string;
  walletId: string;
  address: string;
  isSimulated: boolean;
}

/**
 * Loads user wallets from local JSON database.
 */
function readDb(): Record<string, UserWalletData> {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading circle_users_db.json:', err);
  }
  return {};
}

/**
 * Saves user wallets to local JSON database.
 */
function writeDb(db: Record<string, UserWalletData>) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing circle_users_db.json:', err);
  }
}

/**
 * Get or provision a user wallet (Real Circle Developer-Controlled Wallet).
 */
export async function getOrCreateUserWallet(email: string, pin: string): Promise<UserWalletData> {
  const cleanEmail = email.toLowerCase();
  const db = readDb();

  // Overwrite and discard any legacy simulated entries
  if (db[cleanEmail] && !db[cleanEmail].isSimulated) {
    return db[cleanEmail];
  }

  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error('CIRCLE_API_KEY environment variable is not set. Cannot provision user wallet.');
  }

  console.log(`💼 Provisioning real Circle Developer-Controlled Wallet for user: ${cleanEmail}`);
  const wallet = await provisionAgentWallet('meridian-user-fleet');
  
  const newWallet: UserWalletData = {
    email: cleanEmail,
    walletId: wallet.id,
    address: wallet.address,
    isSimulated: false,
  };

  db[cleanEmail] = newWallet;
  writeDb(db);

  // Auto-fund new account with Faucet USDC & gas if empty for seamless testnet UX
  await autoFundGasAndUSDC(wallet.address);

  return newWallet;
}

/**
 * Executes a transaction (contract execution or token transfer) on behalf of the user.
 */
export async function executeUserTransaction(
  email: string,
  pin: string,
  contractAddress: string,
  callData: string
): Promise<string> {
  const cleanEmail = email.toLowerCase();
  const db = readDb();
  const walletData = db[cleanEmail];

  if (!walletData || walletData.isSimulated) {
    throw new Error(`Real wallet not found for user: ${email}. Please log in first to provision.`);
  }

  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error('CIRCLE_API_KEY environment variable is not set. Cannot execute transaction.');
  }

  console.log(`⚡ Routing transaction via Circle DCW for ${cleanEmail} (Wallet ID: ${walletData.walletId})`);
  return await executeContractCall(walletData.walletId, contractAddress, callData);
}

/**
 * Faucet funding utility for developer testing.
 */
export async function autoFundGasAndUSDC(recipientAddress: string, force = false): Promise<{ gasTxHash?: string; usdcTxHash?: string }> {
  try {
    const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http() });
    const gasBalance = await publicClient.getBalance({ address: recipientAddress as `0x${string}` });

    let gasTxHash: `0x${string}` | undefined;
    let usdcTxHash: `0x${string}` | undefined;

    // Fund with gas (1.0 USDC) and USDC tokens (100 USDC) if balance is low or force is true
    if (force || gasBalance < parseEther('0.5')) {
      const rawKey = process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
      if (rawKey) {
        const faucetKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
        const faucetAccount = privateKeyToAccount(faucetKey);
        const faucetWallet = createWalletClient({ account: faucetAccount, chain: ARC_TESTNET, transport: http() });

        console.log(`🎁 [Gas Station Faucet] Refueling gas for recipient: ${recipientAddress}`);
        gasTxHash = await faucetWallet.sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: parseEther('1.0'),
        });
        await publicClient.waitForTransactionReceipt({ hash: gasTxHash });

        console.log(`🎁 [Gas Station Faucet] Transferring 100 USDC tokens to: ${recipientAddress}`);
        usdcTxHash = await faucetWallet.writeContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [recipientAddress as `0x${string}`, BigInt(100000000)], // 100 USDC (6 decimals)
        });
        await publicClient.waitForTransactionReceipt({ hash: usdcTxHash });
      }
    }
    return { gasTxHash, usdcTxHash };
  } catch (err: any) {
    console.warn(`[Auto-Fund] Faucet refueling failed for ${recipientAddress}:`, err);
    throw err;
  }
}
