import { NextResponse } from 'next/server';

// Global registry for request metrics
const globalWithMetrics = global as typeof globalThis & {
  requestCounter?: Record<string, number>;
  startTime?: number;
};

if (!globalWithMetrics.requestCounter) {
  globalWithMetrics.requestCounter = {
    'GET /api/metrics': 0,
    'POST /api/agent': 0,
    'POST /api/circle-session': 0,
    'POST /api/compliance/check': 0,
    'POST /api/payouts': 0,
    'POST /api/sponsor': 0,
  };
}

if (!globalWithMetrics.startTime) {
  globalWithMetrics.startTime = Date.now();
}

/**
 * Tracks API requests. Call this in middleware or handlers to record metrics.
 */
export function trackMetric(method: string, endpoint: string) {
  const key = `${method} ${endpoint}`;
  if (globalWithMetrics.requestCounter) {
    if (globalWithMetrics.requestCounter[key] !== undefined) {
      globalWithMetrics.requestCounter[key]++;
    } else {
      globalWithMetrics.requestCounter[key] = 1;
    }
  }
}

export async function GET() {
  const uptime = Math.floor((Date.now() - (globalWithMetrics.startTime || Date.now())) / 1000);
  const memoryUsage = process.memoryUsage();
  
  // Format metrics in Prometheus Exposition Format
  let prometheusOutput = '';

  // Uptime metric
  prometheusOutput += '# HELP node_process_uptime_seconds Uptime of the Next.js process in seconds.\n';
  prometheusOutput += '# TYPE node_process_uptime_seconds gauge\n';
  prometheusOutput += `node_process_uptime_seconds ${uptime}\n\n`;

  // Memory usage metrics
  prometheusOutput += '# HELP node_memory_rss_bytes Resident Set Size (RSS) in bytes.\n';
  prometheusOutput += '# TYPE node_memory_rss_bytes gauge\n';
  prometheusOutput += `node_memory_rss_bytes ${memoryUsage.rss}\n\n`;

  prometheusOutput += '# HELP node_memory_heap_used_bytes Heap memory used in bytes.\n';
  prometheusOutput += '# TYPE node_memory_heap_used_bytes gauge\n';
  prometheusOutput += `node_memory_heap_used_bytes ${memoryUsage.heapUsed}\n\n`;

  // API request counts
  prometheusOutput += '# HELP api_requests_total Total number of API requests received.\n';
  prometheusOutput += '# TYPE api_requests_total counter\n';
  if (globalWithMetrics.requestCounter) {
    for (const [route, count] of Object.entries(globalWithMetrics.requestCounter)) {
      const parts = route.split(' ');
      const method = parts[0];
      const path = parts[1] || '';
      prometheusOutput += `api_requests_total{method="${method}",path="${path}"} ${count}\n`;
    }
  }

  // Increment the metric endpoint call counter
  trackMetric('GET', '/api/metrics');

  return new Response(prometheusOutput, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
      'Cache-Control': 'no-store',
    },
  });
}
