'use client';

import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Bell, RefreshCw, Check, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

// Inline Slack icon definition since it's not exported by lucide-react version
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
      <path d="M5.04 15.12a2.52 2.52 0 1 1-2.52-2.52h2.52v2.52zM6.3 15.12a2.52 2.52 0 0 1 5.04 0v5.04a2.52 2.52 0 1 1-5.04 0v-5.04zM8.82 5.04a2.52 2.52 0 1 1 2.52-2.52v2.52h-2.52zM8.82 6.3a2.52 2.52 0 0 1 0 5.04H3.78a2.52 2.52 0 1 1 0-5.04h5.04zM18.96 8.82a2.52 2.52 0 1 1 2.52 2.52h-2.52V8.82zM17.7 8.82a2.52 2.52 0 0 1-5.04 0V3.78a2.52 2.52 0 1 1 5.04 0v5.04zM15.18 18.96a2.52 2.52 0 1 1-2.52 2.52v-2.52h2.52zM15.18 17.7a2.52 2.52 0 0 1 0-5.04h5.04a2.52 2.52 0 1 1 0 5.04h-5.04z" />
    </svg>
  );
}

interface NotificationItem {
  id: string;
  type: 'JobCreated' | 'JobSettled' | 'JobDisputed';
  timestamp: string;
  title: string;
  message: string;
  txHash?: string;
}

export function NotificationSettings() {
  const { addToast } = useToast();
  
  // Channels
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState('treasury@enterprise.com');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Events
  const [notifyOnCreated, setNotifyOnCreated] = useState(true);
  const [notifyOnSettled, setNotifyOnSettled] = useState(true);
  const [notifyOnDisputed, setNotifyOnDisputed] = useState(true);

  // Live Notification Feed
  const [feed, setFeed] = useState<NotificationItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const fetchFeed = async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch('/notifications.json');
      if (res.ok) {
        const data = await res.json();
        setFeed(data);
      }
    } catch (e) {
      console.warn('No notifications found yet.');
    } finally {
      setLoadingFeed(false);
    }
  };

  // Poll for simulated notifications every 5 seconds
  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Alert Preferences Saved',
      message: 'Your notification rules and channels have been updated successfully.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-800/40">
          <Bell className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-gray-200">Alert Preferences</h3>
        </div>

        {/* Channels Selection */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notification Channels</h4>
          
          <div className="space-y-3">
            {/* Email Channel */}
            <div className="p-4 bg-gray-950/20 border border-gray-800/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-200">Email Notifications</p>
                    <p className="text-[10px] text-gray-500">Send summary alerts to enterprise treasury</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded border-gray-800 bg-gray-900 text-cyan-500 focus:ring-cyan-500/30 w-4 h-4"
                />
              </div>
              {emailEnabled && (
                <div className="group relative space-y-1 animate-fade-in">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      Email Address <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                    </span>
                    <span className="text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                      Receives daily summaries and escrow status alerts
                    </span>
                  </div>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    placeholder="e.g. treasury@enterprise.com"
                  />
                </div>
              )}
            </div>

            {/* Slack Channel */}
            <div className="p-4 bg-gray-950/20 border border-gray-800/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <SlackIcon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-200">Slack Webhook Alerts</p>
                    <p className="text-[10px] text-gray-500">Dispatch instant notifications to channels</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={slackEnabled}
                  onChange={(e) => setSlackEnabled(e.target.checked)}
                  className="rounded border-gray-800 bg-gray-900 text-cyan-500 focus:ring-cyan-500/30 w-4 h-4"
                />
              </div>
              {slackEnabled && (
                <div className="group relative space-y-1 animate-fade-in">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      Webhook URL <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                    </span>
                    <span className="text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                      Incoming Slack webhook url for chat automation
                    </span>
                  </div>
                  <input
                    type="text"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                    placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  />
                </div>
              )}
            </div>

            {/* SMS/Twilio Channel */}
            <div className="p-4 bg-gray-950/20 border border-gray-800/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-200">SMS (Twilio) Notifications</p>
                    <p className="text-[10px] text-gray-500">Alert managers directly on mobile devices</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="rounded border-gray-800 bg-gray-900 text-cyan-500 focus:ring-cyan-500/30 w-4 h-4"
                />
              </div>
              {smsEnabled && (
                <div className="group relative space-y-1 animate-fade-in">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      Phone Number <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                    </span>
                    <span className="text-cyan-500/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                      Receives high-severity settlement & multi-sig SMS
                    </span>
                  </div>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-gray-800/60 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                    placeholder="e.g. +1 (555) 019-2834"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trigger Events */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">Notify Me On</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-3 bg-gray-950/35 border border-gray-800/30 rounded-xl cursor-pointer hover:border-cyan-500/20 transition-all">
              <input
                type="checkbox"
                checked={notifyOnCreated}
                onChange={(e) => setNotifyOnCreated(e.target.checked)}
                className="rounded border-gray-800 bg-gray-900 text-cyan-500 focus:ring-cyan-500/30 w-3.5 h-3.5"
              />
              <span className="text-[11px] text-gray-300 font-medium">Job Created</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-gray-950/35 border border-gray-800/30 rounded-xl cursor-pointer hover:border-cyan-500/20 transition-all">
              <input
                type="checkbox"
                checked={notifyOnSettled}
                onChange={(e) => setNotifyOnSettled(e.target.checked)}
                className="rounded border-gray-800 bg-gray-900 text-cyan-500 focus:ring-cyan-500/30 w-3.5 h-3.5"
              />
              <span className="text-[11px] text-gray-300 font-medium">Job Settled</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-gray-950/35 border border-gray-800/30 rounded-xl cursor-pointer hover:border-cyan-500/20 transition-all">
              <input
                type="checkbox"
                checked={notifyOnDisputed}
                onChange={(e) => setNotifyOnDisputed(e.target.checked)}
                className="rounded border-gray-800 bg-gray-900 text-cyan-500 focus:ring-cyan-500/30 w-3.5 h-3.5"
              />
              <span className="text-[11px] text-gray-300 font-medium">Job Disputed</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
        >
          Save Alert Preferences
        </button>
      </div>

      {/* Live Feed Panel */}
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800/40">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Live Webhook Alert Feed</h3>
          </div>
          <button
            onClick={fetchFeed}
            disabled={loadingFeed}
            className="p-1 rounded bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-50 transition-all"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFeed ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 gap-3 border border-dashed border-gray-850 rounded-xl bg-gray-950/20 text-center animate-fade-in">
            <Bell className="w-6 h-6 text-gray-700 animate-bounce" style={{ animationDuration: '3s' }} />
            <div>
              <p className="text-xs text-gray-300 font-semibold">Feed Silent</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed max-w-[280px] mx-auto font-sans">
                No webhooks or event signals captured yet. Deploy new escrows, triggers, or policies to see real-time dispatches.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {feed.map((item) => {
              let Icon = Bell;
              let borderClass = 'border-blue-500/25 bg-blue-500/5';
              let badgeColor = 'text-blue-400';

              if (item.type === 'JobSettled') {
                Icon = ShieldCheck;
                borderClass = 'border-emerald-500/25 bg-emerald-500/5';
                badgeColor = 'text-emerald-400';
              } else if (item.type === 'JobDisputed') {
                Icon = AlertTriangle;
                borderClass = 'border-amber-500/25 bg-amber-500/5';
                badgeColor = 'text-amber-400';
              }

              return (
                <div
                  key={item.id}
                  className={`p-3 border rounded-xl space-y-1.5 transition-all hover:scale-[1.01] ${borderClass}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${badgeColor}`} />
                      <span className="text-[11px] font-bold text-gray-300 leading-none">{item.title}</span>
                    </div>
                    <span className="text-[9px] text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{item.message}</p>
                  {item.txHash && (
                    <a
                      href={`https://explorer.testnet.arc.network/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-[9px] text-cyan-400/80 hover:text-cyan-400 hover:underline leading-none"
                    >
                      View on ArcScan →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
