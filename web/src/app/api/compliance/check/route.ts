import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

// Ensure the directory and file exist
function ensureLogFile() {
  const dir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE_PATH)) {
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
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
    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Invalid address parameter' }, { status: 400 });
    }

    const normalizedAddress = address.trim().toLowerCase();
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
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const logs = readLogs();
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
