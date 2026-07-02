import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { encrypt, decrypt } from '@/lib/encryption';
import { isRateLimited, getClientIp } from '@/lib/rateLimit';
import { trackMetric } from '@/app/api/metrics/route';
import { autoFundGasAndUSDC } from '@/lib/circleUserWallets';

const BANK_DB_PATH = path.join(process.cwd(), 'src/lib/bank_accounts_db.json');
const PAYOUT_DB_PATH = path.join(process.cwd(), 'src/lib/payouts_db.json');

function readDb(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading database ${filePath}:`, err);
    return [];
  }
}

function writeDb(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing database ${filePath}:`, err);
  }
}

export async function GET(req: NextRequest) {
  try {
    trackMetric('GET', '/api/payouts');
    const ip = getClientIp(req);
    if (isRateLimited(ip, 'payouts-get', { windowMs: 60 * 1000, maxRequests: 30 })) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    const bankAccounts = readDb(BANK_DB_PATH);
    const payouts = readDb(PAYOUT_DB_PATH);

    return NextResponse.json({
      bankAccounts,
      payouts,
    });
  } catch (err: any) {
    console.error('Error fetching payouts:', err);
    const isProd = process.env.NODE_ENV === 'production';
    const displayError = isProd ? 'An unexpected server error occurred.' : (err.message || 'Unknown error');
    return NextResponse.json({ error: displayError }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    trackMetric('POST', '/api/payouts');
    const ip = getClientIp(req);
    if (isRateLimited(ip, 'payouts-post', { windowMs: 60 * 1000, maxRequests: 15 })) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    const body = await req.json();
    const { action } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid action parameter' }, { status: 400 });
    }

    const bankAccounts = readDb(BANK_DB_PATH);
    const payouts = readDb(PAYOUT_DB_PATH);

    if (action === 'linkBank') {
      const { nickname, bankName, accountNumber, routingNumber, userAddress } = body;

      if (!nickname || !bankName || !accountNumber || !routingNumber || !userAddress) {
        return NextResponse.json({ error: 'Missing required bank parameters' }, { status: 400 });
      }

      // Input validation
      if (typeof nickname !== 'string' || nickname.trim().length === 0 || nickname.trim().length > 50) {
        return NextResponse.json({ error: 'Invalid nickname length' }, { status: 400 });
      }
      if (typeof bankName !== 'string' || bankName.trim().length === 0 || bankName.trim().length > 100) {
        return NextResponse.json({ error: 'Invalid bankName length' }, { status: 400 });
      }
      if (typeof accountNumber !== 'string' || !/^\d{4,17}$/.test(accountNumber.trim())) {
        return NextResponse.json({ error: 'Account number must be between 4 and 17 digits.' }, { status: 400 });
      }
      if (typeof routingNumber !== 'string' || !/^\d{9}$/.test(routingNumber.trim())) {
        return NextResponse.json({ error: 'Routing number must be exactly 9 digits.' }, { status: 400 });
      }
      if (typeof userAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(userAddress.trim())) {
        return NextResponse.json({ error: 'Invalid Ethereum/Arc address format' }, { status: 400 });
      }

      const cleanNickname = nickname.trim();
      const cleanBankName = bankName.trim();
      const cleanAccountNumber = accountNumber.trim();
      const cleanRoutingNumber = routingNumber.trim();
      const cleanAddress = userAddress.trim().toLowerCase();

      // Strictly encrypt bank account details
      const encrypted = encrypt(cleanAccountNumber);
      const maskedAccount = `******${cleanAccountNumber.slice(-4)}`;

      const newAccount = {
        id: `bank-${crypto.randomUUID()}`,
        nickname: cleanNickname,
        bankName: cleanBankName,
        currency: 'USD',
        status: 'pending_approval',
        maskedAccount,
        routingNumber: cleanRoutingNumber,
        iv: encrypted.iv,
        encryptedData: encrypted.encryptedData,
        tag: encrypted.tag,
        approvals: [cleanAddress],
        requiredApprovals: 2, // Multi-signature approval required
      };

      bankAccounts.push(newAccount);
      writeDb(BANK_DB_PATH, bankAccounts);

      return NextResponse.json({ success: true, account: newAccount });
    }

    if (action === 'approveBank') {
      const { bankId, userAddress } = body;

      if (!bankId || !userAddress) {
        return NextResponse.json({ error: 'Missing bankId or userAddress' }, { status: 400 });
      }

      if (typeof bankId !== 'string' || !/^[a-fA-F0-9-]{36,45}$/.test(bankId)) {
        return NextResponse.json({ error: 'Invalid bankId format' }, { status: 400 });
      }
      if (typeof userAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(userAddress.trim())) {
        return NextResponse.json({ error: 'Invalid Ethereum/Arc address format' }, { status: 400 });
      }

      const accountIdx = bankAccounts.findIndex((acc: any) => acc.id === bankId);
      if (accountIdx === -1) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }

      const account = bankAccounts[accountIdx];
      const normalizedAddress = userAddress.trim().toLowerCase();

      if (account.approvals.includes(normalizedAddress)) {
        return NextResponse.json({ error: 'Address has already approved this account' }, { status: 400 });
      }

      account.approvals.push(normalizedAddress);

      if (account.approvals.length >= account.requiredApprovals) {
        account.status = 'active';
      }

      bankAccounts[accountIdx] = account;
      writeDb(BANK_DB_PATH, bankAccounts);

      return NextResponse.json({ success: true, account });
    }

    if (action === 'triggerPayout') {
      const { escrowId, amount, bankAccountId } = body;

      if (escrowId === undefined || !amount || !bankAccountId) {
        return NextResponse.json({ error: 'Missing required payout parameters' }, { status: 400 });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000000) {
        return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 });
      }

      if (typeof bankAccountId !== 'string' || !/^[a-fA-F0-9-]{36,45}$/.test(bankAccountId)) {
        return NextResponse.json({ error: 'Invalid bankAccountId format' }, { status: 400 });
      }

      const bankAccount = bankAccounts.find((acc: any) => acc.id === bankAccountId);
      if (!bankAccount) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }

      if (bankAccount.status !== 'active') {
        return NextResponse.json({ error: 'Bank account is not active/approved' }, { status: 400 });
      }

      // Simulate Circle Mint /payouts API Call
      const payoutId = `payout_${crypto.randomUUID().slice(0, 8)}`;
      const apiKey = process.env.CIRCLE_API_KEY;

      console.log(`[Circle Payouts Sandbox] Initiating payout ${payoutId} for ${parsedAmount} USDC to bank ${bankAccount.nickname}`);

      if (apiKey) {
        // If API key is present, execute standard Sandbox payout endpoint mock
        try {
          const isProduction = process.env.CIRCLE_ENV === 'production';
          const baseUrl = isProduction ? 'https://api.circle.com' : 'https://api-sandbox.circle.com';
          const res = await fetch(`${baseUrl}/v1/payouts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              destination: {
                type: 'bank_wire',
                id: bankAccount.id,
              },
              amount: {
                amount: parsedAmount.toString(),
                currency: 'USD',
              },
              metadata: {
                beneficiaryEmail: 'treasury@meridian.com',
              },
            }),
          });
          const data = await res.json();
          console.log('[Circle Payouts Response]:', data);
        } catch (err) {
          console.error('[Circle API Payout Error]:', err);
        }
      }

      const newPayout = {
        id: payoutId,
        bankAccountId,
        bankName: bankAccount.bankName,
        amount: parsedAmount,
        currency: 'USD',
        status: 'pending',
        timestamp: new Date().toISOString(),
        escrowId: escrowId.toString(),
      };

      payouts.push(newPayout);
      writeDb(PAYOUT_DB_PATH, payouts);

      return NextResponse.json({ success: true, payout: newPayout });
    }

    if (action === 'requestFaucet') {
      const { userAddress } = body;
      if (!userAddress || typeof userAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(userAddress.trim())) {
        return NextResponse.json({ error: 'Invalid or missing userAddress' }, { status: 400 });
      }

      // Execute faucet transaction
      const { gasTxHash, usdcTxHash } = await autoFundGasAndUSDC(userAddress.trim(), true);
      return NextResponse.json({ success: true, gasTxHash, usdcTxHash });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling payouts route:', error);
    const isProd = process.env.NODE_ENV === 'production';
    const displayError = isProd ? 'An unexpected server error occurred.' : (error.message || 'Unknown error');
    return NextResponse.json({ error: displayError }, { status: 500 });
  }
}
