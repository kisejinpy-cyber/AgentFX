'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Search, RefreshCw, Copy, Check, Info, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { truncateAddress } from '@/lib/constants';

interface ComplianceLog {
  address: string;
  timestamp: string;
  category: string;
  status: string;
  score: string;
}

export function ComplianceDashboard() {
  const { addToast } = useToast();
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchAddr, setSearchAddr] = useState('');
  const [screenAddr, setScreenAddr] = useState('');
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compliance/check');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch compliance logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleScreenAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenAddr) return;
    setScreeningLoading(true);
    setScreeningResult(null);

    try {
      const res = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: screenAddr }),
      });
      const data = await res.json();
      setScreeningResult(data);
      fetchLogs(); // refresh logs if it got blocked
      
      addToast({
        type: data.blocked ? 'error' : 'success',
        title: data.blocked ? 'Address Flagged' : 'Address Cleared',
        message: data.blocked 
          ? `Risk category: ${data.category || 'High Risk'}` 
          : 'Address is compliant and cleared for transactions.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Screening Failed',
        message: 'Could not connect to the Compliance screening engine.',
      });
    } finally {
      setScreeningLoading(false);
    }
  };

  const copyAddress = async (addr: string, index: number) => {
    await navigator.clipboard.writeText(addr);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredLogs = logs.filter(log => 
    log.address.toLowerCase().includes(searchAddr.toLowerCase()) ||
    log.category.toLowerCase().includes(searchAddr.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Flagged Wallets</p>
            <p className="text-2xl font-mono text-gray-200 font-bold mt-0.5">{logs.length}</p>
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Compliance Engine Status</p>
            <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active / Protected
            </p>
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Audit Logs Version</p>
            <p className="text-xs text-gray-300 font-mono mt-1">Circle Compliance v1.0</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive manual screening panel */}
        <div className="lg:col-span-4 bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Compliance Screening Tool</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Verify compliance status of any wallet address manually.
            </p>
          </div>

          <form onSubmit={handleScreenAddress} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Blockchain Address
              </label>
              <input
                type="text"
                required
                value={screenAddr}
                onChange={(e) => setScreenAddr(e.target.value)}
                className="w-full bg-gray-950/50 border border-gray-800/60 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all"
                placeholder="0x..."
              />
            </div>

            <button
              type="submit"
              disabled={screeningLoading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
            >
              {screeningLoading ? 'Screening Address...' : 'Verify Wallet Compliance'}
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {screeningResult && (
            <div className={`p-4 border rounded-xl space-y-2.5 animate-fade-in ${
              screeningResult.blocked 
                ? 'bg-red-950/10 border-red-500/20' 
                : 'bg-emerald-950/10 border-emerald-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {screeningResult.blocked ? (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
                <span className={`text-xs font-bold ${screeningResult.blocked ? 'text-red-400' : 'text-emerald-400'}`}>
                  {screeningResult.blocked ? 'Address Flags Detected' : 'Compliance Cleared'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                {screeningResult.blocked 
                  ? 'Address is listed on international sanction registries or triggers risk indicators.' 
                  : 'Address is not flagged on any AML/KYC blocklists.'}
              </p>
              {screeningResult.blocked && (
                <div className="pt-2 border-t border-gray-800/30 space-y-1 font-mono text-[9px] text-gray-500">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="text-red-400">{screeningResult.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="text-red-400 font-bold">{screeningResult.score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span>{screeningResult.source}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test magic values reminder */}
          <div className="bg-gray-950/40 border border-gray-800/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sandbox Screening Tips</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
              Suffix addresses with magic values for test flags:
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9px] text-gray-500">
              <div>...9999 : Sanctions</div>
              <div>...8888 : Frozen</div>
              <div>...7777 : Developer</div>
              <div>...8999 : Severe Risk</div>
            </div>
          </div>
        </div>

        {/* Audit logs listing */}
        <div className="lg:col-span-8 bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-800/40">
            <div>
              <h3 className="text-sm font-semibold text-gray-200">Compliance Audit Trails</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Official transaction block logs for compliance reviews.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchAddr}
                onChange={(e) => setSearchAddr(e.target.value)}
                className="bg-gray-950/40 border border-gray-800/40 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder-gray-700 w-44"
                placeholder="Search logs..."
              />
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="p-1.5 rounded bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-all disabled:opacity-50"
                title="Refresh Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-600">
              No compliance logs found matching query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800/40 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/20 text-xs">
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-gray-850/20 transition-all">
                      <td className="py-3 px-3 font-mono text-gray-300 flex items-center gap-1.5">
                        {truncateAddress(log.address)}
                        <button
                          onClick={() => copyAddress(log.address, idx)}
                          className="text-gray-600 hover:text-gray-400 transition-colors"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          log.score === 'SEVERE'
                            ? 'bg-red-950/25 text-red-400 border-red-500/25'
                            : 'bg-amber-950/25 text-amber-400 border-amber-500/25'
                        }`}>
                          {log.score}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400 font-sans">{log.category}</td>
                      <td className="py-3 px-3 text-gray-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-900/10 text-red-400 border border-red-800/30">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
