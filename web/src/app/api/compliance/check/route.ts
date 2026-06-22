import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isRateLimited, getClientIp } from '@/lib/rateLimit';
import { trackMetric } from '@/app/api/metrics/route';

// Local file storage path for compliance logs inside the workspace
const LOG_FILE_PATH = path.join(process.cwd(), 'src/lib/compliance_db.json');

// Mock OFAC sanctioned addresses for testing
const STATIC_SANCTIONED_ADDRESSES = new Set([
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'.toLowerCase(),
  '0x1533C3962F8b28Ba27caAD2E2054895221000000'.toLowerCase(),
]);

interface ComplianceLog {
  address: string;
  timestamp: string;
  category: string;
  status: string;
  score: string;
}

const SEED_LOGS: ComplianceLog[] = [
  {
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
    category: 'OFAC Sanctioned Entity',
    status: 'DENIED',
    score: 'SEVERE',
  },
  {
    address: '0x1533C3962F8b28Ba27caAD2E2054895221000000'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 4).toISOString(),
    category: 'OFAC Sanctioned Entity',
    status: 'DENIED',
    score: 'SEVERE',
  },
  {
    address: '0xf92f9d2a7522eada51bf891e1087e71c891e9999'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 6).toISOString(),
    category: 'Circle Sanctions Blocklist',
    status: 'DENIED',
    score: 'SEVERE',
  },
  {
    address: '0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39F8888'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 9).toISOString(),
    category: 'Frozen Wallet',
    status: 'DENIED',
    score: 'HIGH',
  },
  {
    address: '0xe6A13B821A58d28e7522EadA51Bf891E1087E71C'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 12).toISOString(),
    category: 'Custom Developer Blocklist',
    status: 'DENIED',
    score: 'HIGH',
  },
  {
    address: '0x32cd9d2A7522EadA51Bf891E1087E71C891E9999'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 15).toISOString(),
    category: 'Severe Sanctions Risk',
    status: 'DENIED',
    score: 'SEVERE',
  },
  {
    address: '0x1087E71CD83101adF154d8215522EadA51Bf8899'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 18).toISOString(),
    category: 'Severe Terrorist Financing',
    status: 'DENIED',
    score: 'SEVERE',
  },
  {
    address: '0xe6a13b821a58d28e7522eada51bf891e1087e8889'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 20).toISOString(),
    category: 'Severe CSAM Risk',
    status: 'DENIED',
    score: 'SEVERE',
  },
  {
    address: '0x32cd9d2a7522eada51bf891e1087e71c891e7779'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 25).toISOString(),
    category: 'Severe Illicit Activity',
    status: 'DENIED',
    score: 'SEVERE',
  },
  {
    address: '0x9ce7a5b39a6e7d0816759bbe0b075fa0b39f9999'.toLowerCase(),
    timestamp: new Date(Date.now() - 86400 * 1000 * 28).toISOString(),
    category: 'Circle Sanctions Blocklist',
    status: 'DENIED',
    score: 'SEVERE',
  }
];

// Ensure the directory and file exist
function ensureLogFile() {
  const dir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let shouldSeed = false;
  if (!fs.existsSync(LOG_FILE_PATH)) {
    shouldSeed = true;
  } else {
    try {
      const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8').trim();
      if (!content || content === '[]' || content === '""') {
        shouldSeed = true;
      }
    } catch {
      shouldSeed = true;
    }
  }

  if (shouldSeed) {
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(SEED_LOGS, null, 2), 'utf-8');
  }
}

// Read logs helper
function readLogs(): ComplianceLog[] {
  ensureLogFile();
  try {
    const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error reading compliance logs:', e);
    return [];
  }
}

// Write logs helper
function writeLogs(logs: ComplianceLog[]) {
  ensureLogFile();
  try {
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing compliance logs:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    trackMetric('POST', '/api/compliance/check');
    const ip = getClientIp(req);
    if (isRateLimited(ip, 'compliance-check-post', { windowMs: 60 * 1000, maxRequests: 15 })) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Invalid address parameter' }, { status: 400 });
    }

    const normalizedAddress = address.trim().toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAddress)) {
      return NextResponse.json({ error: 'Invalid Ethereum/Arc address format' }, { status: 400 });
    }

    let blocked = false;
    let category = 'Approved';
    let score = 'LOW';
    let source = 'Local Screening';

    // 1. Check Magic values (Circle address suffixes)
    if (normalizedAddress.endsWith('9999')) {
      blocked = true;
      category = 'Circle Sanctions Blocklist';
      score = 'SEVERE';
    } else if (normalizedAddress.endsWith('8888')) {
      blocked = true;
      category = 'Frozen Wallet';
      score = 'HIGH';
    } else if (normalizedAddress.endsWith('7777')) {
      blocked = true;
      category = 'Custom Developer Blocklist';
      score = 'HIGH';
    } else if (normalizedAddress.endsWith('8999')) {
      blocked = true;
      category = 'Severe Sanctions Risk';
      score = 'SEVERE';
    } else if (normalizedAddress.endsWith('8899')) {
      blocked = true;
      category = 'Severe Terrorist Financing';
      score = 'SEVERE';
    } else if (normalizedAddress.endsWith('8889')) {
      blocked = true;
      category = 'Severe CSAM Risk';
      score = 'SEVERE';
    } else if (normalizedAddress.endsWith('7779')) {
      blocked = true;
      category = 'Severe Illicit Activity';
      score = 'SEVERE';
    } else if (STATIC_SANCTIONED_ADDRESSES.has(normalizedAddress)) {
      blocked = true;
      category = 'OFAC Sanctioned Entity';
      score = 'SEVERE';
    }

    // 2. Call Circle Compliance Screening API if API key is present
    const circleApiKey = process.env.CIRCLE_API_KEY;
    if (circleApiKey && !blocked) {
      try {
        const idempotencyKey = crypto.randomUUID();
        const response = await fetch('https://api.circle.com/v1/w3s/compliance/screening/addresses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${circleApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idempotencyKey,
            address: normalizedAddress,
            chain: 'ETH', // EVM-compatible checks
          }),
        });

        if (response.ok) {
          const data = await response.json();
          source = 'Circle Compliance API';
          if (data.result === 'DENIED' || (data.decision?.actions && data.decision.actions.includes('DENY'))) {
            blocked = true;
            score = 'HIGH';
            category = data.decision?.reasons?.[0]?.riskCategories?.[0] || 'Sanctions';
          }
        }
      } catch (err) {
        console.error('Circle Compliance API check failed, falling back to local:', err);
      }
    }

    // 3. Log blocked events to database for Audit trails
    if (blocked) {
      const logs = readLogs();
      // Avoid duplicate logs for the same address in the last 1 minute
      const duplicate = logs.find(
        (log) =>
          log.address.toLowerCase() === normalizedAddress &&
          Date.now() - new Date(log.timestamp).getTime() < 60000
      );

      if (!duplicate) {
        const newLog: ComplianceLog = {
          address: normalizedAddress,
          timestamp: new Date().toISOString(),
          category,
          status: 'DENIED',
          score,
        };
        logs.unshift(newLog);
        writeLogs(logs);
      }

      return NextResponse.json({
        blocked: true,
        category,
        score,
        source,
        reason: 'Risk screening flagged the address on sanctions watchlists.',
      });
    }

    return NextResponse.json({ blocked: false });
  } catch (err: any) {
    console.error('Compliance screening handler error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    const displayError = isProd ? 'An unexpected server error occurred.' : (err.message || 'Unknown error');
    return NextResponse.json({ error: displayError }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    trackMetric('GET', '/api/compliance/check');
    const ip = getClientIp(req);
    if (isRateLimited(ip, 'compliance-check-get', { windowMs: 60 * 1000, maxRequests: 30 })) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    const logs = readLogs();
    return NextResponse.json(logs);
  } catch (err: any) {
    console.error('Compliance GET handler error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    const displayError = isProd ? 'An unexpected server error occurred.' : (err.message || 'Unknown error');
    return NextResponse.json({ error: displayError }, { status: 500 });
  }
}
