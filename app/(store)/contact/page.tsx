'use client';

import React from 'react';
import { Metadata } from 'next';

export default function ContactPage() {
  const [formData, setFormData] = React.useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-[60vh] bg-gray-50 dark:bg-[#0f0f1b] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#16162a] rounded-3xl border border-gray-150 dark:border-gray-800 p-8 sm:p-10 shadow-sm">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
          Contact Us
        </h1>

        {status === 'success' ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-2">Message Sent!</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Thank you for reaching out. We will get back to you shortly.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                placeholder="How can we help you?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Message *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent resize-y"
                placeholder="Write your message here..."
              />
            </div>

            {status === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-xl bg-[#e94560] hover:bg-[#d63850] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 text-sm transition-colors"
            >
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
