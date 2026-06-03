import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/webhookSecurity';
import { dispatchNotification } from '@/lib/notifier';
import { formatUnits } from 'viem';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-circle-signature');
    const keyId = req.headers.get('x-circle-key-id');
    const timestampHeader = req.headers.get('x-circle-timestamp');

    // 1. Get raw request body as text for cryptographic signature check
    const rawBody = await req.text();

    // 2. Validate webhook signature
    const isValid = await verifyWebhookSignature({
      rawBody,
      signature,
      keyId,
      timestampHeader,
    });

    if (!isValid) {
      console.warn('[Circle Webhook] Invalid webhook signature detected.');
      return new NextResponse(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse payload after signature is verified
    const payload = JSON.parse(rawBody);
    console.log('[Circle Webhook] Signature verified. Processing event:', payload.notificationType);

    // 4. Handle Smart Contract Platform event log
    if (payload.notificationType === 'contracts.eventLog') {
      const eventLog = payload.notification;
      const eventName = eventLog?.eventName;
      const data = eventLog?.data;
      const txHash = eventLog?.txHash;

      console.log(`[Circle Webhook] Event logged: ${eventName} on tx ${txHash}`);

      if (eventName === 'JobCreated' && data) {
        // Parse budget to friendly number representation
        let budget = '0.00';
        try {
          const rawBudget = BigInt(data.budget || '0');
          budget = Number(formatUnits(rawBudget, 6)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } catch (e) {
          console.error('Error parsing event budget:', e);
        }

        const isEURC = data.settlementToken?.toLowerCase() === '0x89b50855aa3be2f677cd6303cec089b5f319d72a';
        const currency = isEURC ? 'EURC' : 'USDC';

        await dispatchNotification('JobCreated', {
          jobId: data.jobId ? data.jobId.toString() : '?',
          buyer: data.employer,
          seller: data.worker,
          amount: budget,
          currency,
          txHash,
        });
      } else if (eventName === 'JobSettled' && data) {
        await dispatchNotification('JobSettled', {
          jobId: data.jobId ? data.jobId.toString() : '?',
          seller: data.worker,
          txHash,
        });

        // Automatically trigger Circle Mint payout to active bank account
        try {
          const BANK_DB_PATH = path.join(process.cwd(), 'src/lib/bank_accounts_db.json');
          const PAYOUT_DB_PATH = path.join(process.cwd(), 'src/lib/payouts_db.json');

          if (fs.existsSync(BANK_DB_PATH)) {
            const bankData = JSON.parse(fs.readFileSync(BANK_DB_PATH, 'utf8'));
            const activeBank = bankData.find((acc: any) => acc.status === 'active');
            if (activeBank) {
              const escrowId = data.jobId ? data.jobId.toString() : '?';
              let amountVal = 1000.00; // fallback default
              try {
                if (data.budget) {
                  amountVal = Number(formatUnits(BigInt(data.budget), 6));
                }
              } catch (e) {
                console.error('Error parsing settlement budget amount:', e);
              }

              const payoutId = `payout_${crypto.randomUUID().slice(0, 8)}`;
              
              let payouts = [];
              if (fs.existsSync(PAYOUT_DB_PATH)) {
                payouts = JSON.parse(fs.readFileSync(PAYOUT_DB_PATH, 'utf8'));
              }
              
              const newPayout = {
                id: payoutId,
                bankAccountId: activeBank.id,
                bankName: activeBank.bankName,
                amount: amountVal,
                currency: 'USD',
                status: 'pending',
                timestamp: new Date().toISOString(),
                escrowId,
              };
              
              payouts.push(newPayout);
              fs.writeFileSync(PAYOUT_DB_PATH, JSON.stringify(payouts, null, 2), 'utf8');
              console.log(`[Circle Webhook] Automated payout triggered for escrow #${escrowId}: ${amountVal} USD to ${activeBank.bankName}`);
            }
          }
        } catch (err) {
          console.error('[Circle Webhook] Failed to auto-trigger payout:', err);
        }
      } else if (eventName === 'JobDisputed' && data) {
        await dispatchNotification('JobDisputed', {
          jobId: data.jobId ? data.jobId.toString() : '?',
          txHash,
        });
      }
    }

    // 5. Handle Circle Payout webhook status update
    if (payload.notificationType === 'payouts.updated') {
      const payoutNotification = payload.notification;
      if (payoutNotification) {
        const { id, status, amount } = payoutNotification;
        console.log(`[Circle Webhook] Payout status update received: ${id} -> ${status}`);
        
        const PAYOUT_DB_PATH = path.join(process.cwd(), 'src/lib/payouts_db.json');
        try {
          if (fs.existsSync(PAYOUT_DB_PATH)) {
            const fileData = fs.readFileSync(PAYOUT_DB_PATH, 'utf8');
            let payouts = JSON.parse(fileData);
            const payoutIdx = payouts.findIndex((p: any) => p.id === id);
            if (payoutIdx !== -1) {
              payouts[payoutIdx].status = status.toLowerCase(); // pending, processing, settled, failed
              fs.writeFileSync(PAYOUT_DB_PATH, JSON.stringify(payouts, null, 2), 'utf8');
              console.log(`[Circle Webhook] Persistent payout DB updated for ID ${id}`);
            }
          }
        } catch (dbErr) {
          console.error('[Circle Webhook] Failed to update payouts database:', dbErr);
        }

        await dispatchNotification('PayoutUpdated', {
          payoutId: id,
          status,
          amount: amount?.amount || '0.00',
        });
      }
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Circle Webhook] Error processing webhook:', error);
    return new NextResponse(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
