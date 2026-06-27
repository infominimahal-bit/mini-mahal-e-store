'use client';

import React from 'react';
import { toast } from 'sonner';
import { ExternalLink } from '@/components/common/Icons';

interface EmailTabProps {
  smtpEmail: string;
  setSmtpEmail: (val: string) => void;
  smtpAppPassword: string;
  setSmtpAppPassword: (val: string) => void;
  smtpFromName: string;
  setSmtpFromName: (val: string) => void;
  adminNotificationEmail: string;
  setAdminNotificationEmail: (val: string) => void;
  lowStockThreshold: number;
  setLowStockThreshold: (val: number) => void;
  emailNotifications: Record<string, boolean>;
  setEmailNotifications: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  abandonedCartEmailEnabled: boolean;
  setAbandonedCartEmailEnabled: (val: boolean) => void;
  abandonedCartAdminNotify: boolean;
  setAbandonedCartAdminNotify: (val: boolean) => void;
  abandonedCartEmailSubject: string;
  setAbandonedCartEmailSubject: (val: string) => void;
  abandonedCartEmailTemplate: string;
  setAbandonedCartEmailTemplate: (val: string) => void;
}

const CUSTOMER_EMAILS = [
  { key: 'welcome', label: 'Welcome Email (on register)' },
  { key: 'password_reset', label: 'Password Reset Request' },
  { key: 'password_changed', label: 'Password Changed Confirmation' },
  { key: 'order_placed', label: 'Order Placed Confirmation' },
  { key: 'order_confirmed', label: 'Order Confirmed (admin approved)' },
  { key: 'order_shipped', label: 'Order Shipped + Tracking Info' },
  { key: 'order_delivered', label: 'Order Delivered Confirmation' },
  { key: 'order_cancelled', label: 'Order Cancelled Notification' },
  { key: 'order_refunded', label: 'Order Refunded Notification' },
  { key: 'review_request', label: 'Review Request (after delivery)' },
];

const ADMIN_EMAILS = [
  { key: 'admin_new_order', label: 'New Order Placed Alert' },
  { key: 'admin_order_cancelled', label: 'Order Cancelled Alert' },
  { key: 'admin_low_stock', label: 'Low Stock Alert Notification' },
  { key: 'admin_new_customer', label: 'New Customer Registered Alert' },
  { key: 'admin_new_review', label: 'New Review Submitted Notification' },
  { key: 'admin_contact_form', label: 'Contact Form Submission Alert' },
];

export default function EmailTab({
  smtpEmail,
  setSmtpEmail,
  smtpAppPassword,
  setSmtpAppPassword,
  smtpFromName,
  setSmtpFromName,
  adminNotificationEmail,
  setAdminNotificationEmail,
  lowStockThreshold,
  setLowStockThreshold,
  emailNotifications,
  setEmailNotifications,

  abandonedCartEmailEnabled,
  setAbandonedCartEmailEnabled,
  abandonedCartAdminNotify,
  setAbandonedCartAdminNotify,
  abandonedCartEmailSubject,
  setAbandonedCartEmailSubject,
  abandonedCartEmailTemplate,
  setAbandonedCartEmailTemplate,
}: EmailTabProps) {
  const [testing, setTesting] = React.useState(false);
  
  const handleToggleNotification = (key: string) => {
    setEmailNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSendTestEmail = async () => {
    if (!smtpEmail.trim()) {
      toast.error('Please enter a Gmail SMTP Address first');
      return;
    }
    try {
      setTesting(true);
      toast.loading('Sending test email...', { id: 'test-email' });
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Test email sent successfully!', { id: 'test-email' });
      } else {
        toast.error(data.error || 'Failed to send test email.', { id: 'test-email' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email.', { id: 'test-email' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Customization Manager Box */}
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Shopify-style Email Templates</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Customize HTML/subjects, load templates variables, reset defaults, and run email previews.
          </p>
        </div>
        <a
          href="/admin/settings/email/templates"
          className="rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] hover:opacity-90 active:scale-95 text-white px-5 py-3 text-xs font-bold text-center transition-all cursor-pointer shadow-md inline-block whitespace-nowrap"
        >
          🎨 Customizer Templates
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SMTP Server Credentials */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">SMTP Email Settings</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure Gmail SMTP settings to prepare email templates and notification parameters.
          </p>

          <div className="space-y-4 pt-2 border-t border-gray-150 dark:border-gray-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Gmail SMTP Address
              </label>
              <input
                type="email"
                value={smtpEmail}
                onChange={(e) => setSmtpEmail(e.target.value)}
                placeholder="e.g. admin@gmail.com"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Gmail App Password
              </label>
              <input
                type="password"
                value={smtpAppPassword}
                onChange={(e) => setSmtpAppPassword(e.target.value)}
                placeholder="16-character code (no spaces)"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
              <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300 space-y-1.5 leading-relaxed">
                <p className="font-bold flex items-center gap-1">
                  ⚠️ Note: Do not use your regular Gmail password.
                </p>
                <p>
                  You must enable <strong>2-Step Verification</strong> on your Google Account first, then generate a 16-character App Password.
                </p>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#e94560] dark:text-[#e94560] hover:underline"
                >
                  <span>Generate Gmail App Password</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                From Name (Sender)
              </label>
              <input
                type="text"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="e.g. Zaynahs E-Store"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Admin Notification Email
              </label>
              <input
                type="email"
                value={adminNotificationEmail}
                onChange={(e) => setAdminNotificationEmail(e.target.value)}
                placeholder="e.g. owner@gmail.com"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
              <p className="text-[10px] text-gray-450 mt-1">
                This email address receives admin stock warnings, custom order logs, and reviews.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Low Stock Warning Threshold
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value) || 5)}
                  className="w-24 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">units remaining</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                📧 {testing ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>

        {/* Abandoned Cart Email Settings */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Abandoned Cart Recovery</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Automatically follow up with customers who left items in their cart.
          </p>

          <div className="space-y-4 pt-2 border-t border-gray-150 dark:border-gray-800">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={abandonedCartEmailEnabled}
                onChange={(e) => setAbandonedCartEmailEnabled(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-750 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
              />
              <span className="text-xs font-semibold text-gray-750 dark:text-gray-350">
                Enable Recovery Email (5 mins delay)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={abandonedCartAdminNotify}
                onChange={(e) => setAbandonedCartAdminNotify(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-750 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
              />
              <span className="text-xs font-semibold text-gray-750 dark:text-gray-350">
                Notify Admin on Cart Abandoned
              </span>
            </label>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Recovery Email Subject
              </label>
              <input
                type="text"
                value={abandonedCartEmailSubject}
                onChange={(e) => setAbandonedCartEmailSubject(e.target.value)}
                placeholder="e.g. You left items in your cart!"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Recovery Email Template
              </label>
              <textarea
                value={abandonedCartEmailTemplate}
                onChange={(e) => setAbandonedCartEmailTemplate(e.target.value)}
                placeholder="Hi {{name}}, you left items in your cart..."
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all resize-none"
              />
              <p className="text-[10px] text-gray-450 mt-1">
                Use <code>{"{{name}}"}</code> for customer name, and <code>{"{{checkout_url}}"}</code> for the recovery checkout URL.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email Notification Toggles */}
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Email Notification Triggers</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enable or disable automated email notification templates for customers and administrators.
        </p>

        <div className="space-y-4 pt-2 border-t border-gray-150 dark:border-gray-800">
          
          {/* Customer Notifications */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e94560] mb-2.5">Customer Templates</h4>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
              {CUSTOMER_EMAILS.map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!emailNotifications[item.key]}
                    onChange={() => handleToggleNotification(item.key)}
                    className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-gray-750 dark:text-gray-350">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Admin Notifications */}
          <div className="pt-2 border-t border-gray-150 dark:border-gray-850">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e94560] mb-2.5">Admin Alerts</h4>
            <div className="space-y-2.5">
              {ADMIN_EMAILS.map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!emailNotifications[item.key]}
                    onChange={() => handleToggleNotification(item.key)}
                    className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-gray-750 dark:text-gray-350">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
