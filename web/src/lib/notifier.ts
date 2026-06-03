import fs from 'fs';
import path from 'path';

export interface NotificationPayload {
  id: string;
  type: 'JobCreated' | 'JobSettled' | 'JobDisputed' | 'PayoutUpdated';
  timestamp: string;
  title: string;
  message: string;
  txHash?: string;
}

/**
 * Dispatches notifications via Slack, email (Resend), or local JSON log for demo preview.
 */
export async function dispatchNotification(
  type: 'JobCreated' | 'JobSettled' | 'JobDisputed' | 'PayoutUpdated',
  details: {
    jobId?: string;
    payoutId?: string;
    status?: string;
    buyer?: string;
    seller?: string;
    amount?: string;
    currency?: string;
    txHash?: string;
  }
) {
  const timestamp = new Date().toISOString();
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

  let title = '';
  let message = '';

  switch (type) {
    case 'JobCreated':
      title = `🆕 Escrow Job Created (#${details.jobId})`;
      message = `A new escrow job has been initialized on Arc Testnet. Budget of ${details.amount} ${details.currency || 'USDC'} is locked. Buyer: ${details.buyer}, Seller: ${details.seller}.`;
      break;
    case 'JobSettled':
      title = `✅ Escrow Job Settled (#${details.jobId})`;
      message = `Escrow job #${details.jobId} has been successfully verified by AI Agent and settled. Payout released to seller: ${details.seller}.`;
      break;
    case 'JobDisputed':
      title = `⚠️ Escrow Job Disputed (#${details.jobId})`;
      message = `A dispute has been raised for escrow job #${details.jobId}. Automated verification suspended pending arbitration.`;
      break;
    case 'PayoutUpdated':
      title = `💰 Bank Payout ${details.status || 'Updated'} (#${details.payoutId})`;
      message = `Circle bank wire payout of ${details.amount} USD has been updated to status: ${details.status || 'unknown'}.`;
      break;
  }

  const notification: NotificationPayload = {
    id,
    type,
    timestamp,
    title,
    message,
    txHash: details.txHash,
  };

  console.log(`[Notifier] Dispatching alert: ${title} - ${message}`);

  // 1. Post to Slack if webhook URL is configured
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*${title}*\n${message}\n${details.txHash ? `<https://explorer.testnet.arc.network/tx/${details.txHash}|View on ArcScan>` : ''}`,
        }),
      });
    } catch (err) {
      console.error('Slack webhook dispatch failed:', err);
    }
  }

  // 2. Send email via Resend if API key is configured
  if (process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Meridian Treasury <onboarding@resend.dev>',
          to: process.env.NOTIFICATION_EMAIL,
          subject: title,
          html: `<p><strong>${title}</strong></p><p>${message}</p>${
            details.txHash ? `<p><a href="https://explorer.testnet.arc.network/tx/${details.txHash}">View on ArcScan</a></p>` : ''
          }`,
        }),
      });
    } catch (err) {
      console.error('Resend email dispatch failed:', err);
    }
  }

  // 3. Save to local public/notifications.json for UI feed integration
  try {
    const dir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, 'notifications.json');
    let current: NotificationPayload[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        current = JSON.parse(fileContent);
      } catch {
        current = [];
      }
    }
    current.unshift(notification);
    // Keep last 20 notifications
    if (current.length > 20) {
      current = current.slice(0, 20);
    }
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to log notification locally:', err);
  }

  return notification;
}
