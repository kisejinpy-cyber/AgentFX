import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { encrypt, decrypt } from '@/lib/encryption';

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
  const bankAccounts = readDb(BANK_DB_PATH);
  const payouts = readDb(PAYOUT_DB_PATH);

  return NextResponse.json({
    bankAccounts,
    payouts,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const bankAccounts = readDb(BANK_DB_PATH);
    const payouts = readDb(PAYOUT_DB_PATH);

    if (action === 'linkBank') {
      const { nickname, bankName, accountNumber, routingNumber, userAddress } = body;

      if (!nickname || !bankName || !accountNumber || !routingNumber || !userAddress) {
        return NextResponse.json({ error: 'Missing required bank parameters' }, { status: 400 });
      }

      // Strictly encrypt bank account details
      const encrypted = encrypt(accountNumber);
      const maskedAccount = `******${accountNumber.slice(-4)}`;

      const newAccount = {
        id: `bank-${crypto.randomUUID()}`,
        nickname,
        bankName,
        currency: 'USD',
        status: 'pending_approval',
        maskedAccount,
        routingNumber,
        iv: encrypted.iv,
        encryptedData: encrypted.encryptedData,
        tag: encrypted.tag,
        approvals: [userAddress.toLowerCase()],
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

      const accountIdx = bankAccounts.findIndex((acc: any) => acc.id === bankId);
      if (accountIdx === -1) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }

      const account = bankAccounts[accountIdx];
      const normalizedAddress = userAddress.toLowerCase();

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

      if (!escrowId || !amount || !bankAccountId) {
        return NextResponse.json({ error: 'Missing required payout parameters' }, { status: 400 });
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

      console.log(`[Circle Payouts Sandbox] Initiating payout ${payoutId} for ${amount} USDC to bank ${bankAccount.nickname}`);

      if (apiKey) {
        // If API key is present, execute standard Sandbox payout endpoint mock
        try {
          const res = await fetch('https://api-sandbox.circle.com/v1/payouts', {
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
                amount: amount.toString(),
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
        amount: Number(amount),
        currency: 'USD',
        status: 'pending',
        timestamp: new Date().toISOString(),
        escrowId: escrowId.toString(),
      };

      payouts.push(newPayout);
      writeDb(PAYOUT_DB_PATH, payouts);

      return NextResponse.json({ success: true, payout: newPayout });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling payouts route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
