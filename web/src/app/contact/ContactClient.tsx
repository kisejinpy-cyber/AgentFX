'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Mail, MessageSquare, Send, CheckCircle, Code } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';

import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';

export default function ContactClient() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('general');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    
    setSending(true);
    // Simulate real API submission latency
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSubmitted(true);
    setEmail('');
    setMessage('');
  };

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Navigation Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Contact Channels */}
          <div className="md:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
                <Mail className="w-4 h-4" />
                Get In Touch
              </div>
              <h1 className="text-3xl font-extrabold text-gray-100">Contact Support</h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Have questions about integrating Meridian or need help setting up your Developer-Controlled wallet? We are here to assist.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-900/20 border border-gray-850 rounded-xl p-4 flex gap-4 items-center">
                <div className="w-9 h-9 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Email Address</h4>
                  <p className="text-xs text-gray-500">support@meridian-treasury.io</p>
                </div>
              </div>

              <div className="bg-gray-900/20 border border-gray-850 rounded-xl p-4 flex gap-4 items-center">
                <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Developer Discord</h4>
                  <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-cyan-400">
                    Join Discord Community
                  </a>
                </div>
              </div>

              <div className="bg-gray-900/20 border border-gray-850 rounded-xl p-4 flex gap-4 items-center">
                <div className="w-9 h-9 bg-gray-850/40 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-200">GitHub Source Code</h4>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-cyan-400">
                    Report Bugs / Request Features
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="md:col-span-7 bg-gray-900/30 border border-gray-850 rounded-2xl p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-10 space-y-4 animate-fade-in">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-200">Message Received!</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Thank you for reaching out. A Meridian developer support specialist will get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold mt-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Category</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl p-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Enterprise Partnership</option>
                    <option value="bug">Report a Bug</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl p-3 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you are building or describe the issue..."
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl p-3 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs py-3.5 rounded-xl transition-all duration-200 shadow-[var(--glow-cyan)] disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Submit Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Related Content & Context */}
        <RelatedContent currentSlug="contact" category="Documentation" />

        {/* Support Recovery CTA */}
        <div className="mt-8 border-t border-gray-900 pt-8">
          <CtaBlock context="support" />
        </div>

      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
