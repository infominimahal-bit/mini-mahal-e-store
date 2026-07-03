'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Edit, Eye, Check, X, Mail } from '@/components/common/Icons';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  emailType: string;
  category: 'customer' | 'admin';
  label: string;
  description?: string;
  enabled: boolean;
  subject: string;
  customHtml?: string;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Record<string, EmailTemplate[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview Modal States
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewContent, setPreviewContent] = useState<{ subject: string; html: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/email-templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || {});
      } else {
        setError(data.error || 'Failed to fetch templates');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading templates');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnable = async (type: string, currentStatus: boolean) => {
    // Optimistic UI update
    const prevTemplates = { ...templates };
    const updated = { ...templates };
    for (const cat in updated) {
      updated[cat] = updated[cat].map(t => 
        t.emailType === type ? { ...t, enabled: !currentStatus } : t
      );
    }
    setTemplates(updated);

    try {
      const res = await fetch(`/api/email-templates/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentStatus })
      });
      const data = await res.json();
      if (!data.success) {
        // Rollback
        setTemplates(prevTemplates);
        toast.error(data.error || 'Failed to update status');
      } else {
        toast.success(`Template ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      }
    } catch (err: any) {
      setTemplates(prevTemplates);
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleOpenPreview = async (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewContent(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/email-templates/${template.emailType}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefaultMode: !template.customHtml })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewContent({ subject: data.subject, html: data.html });
      } else {
        toast.error(data.error || 'Failed to generate preview');
        setPreviewTemplate(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate preview');
      setPreviewTemplate(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!previewTemplate) return;
    try {
      setSendingTest(true);
      const res = await fetch(`/api/email-templates/${previewTemplate.emailType}/send-test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Test email dispatched successfully!');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <a href="/admin/settings" className="p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Email Notification Templates</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Customize subjects, HTML code and triggers</p>
          </div>
        </div>
        
        {/* Skeleton Loaders */}
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 w-full bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <a href="/admin/settings" className="p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </a>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Error</h1>
        </div>
        <div className="bg-red-55/10 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchTemplates} className="mt-4 px-4 py-2 bg-[#e94560] text-white rounded-xl text-xs font-bold transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/admin/settings" className="p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Email Notification Templates</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Customize subjects, HTML layouts, and email notifications</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      {['customer', 'admin'].map((category) => {
        const list = templates[category] || [];
        if (list.length === 0) return null;
        return (
          <div key={category} className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
            <h2 className="text-sm font-black text-[#e94560] uppercase tracking-wider">
              {category === 'customer' ? 'Customer Emails' : 'Admin Alerts'}
            </h2>
            <div className="divide-y divide-gray-150 dark:divide-gray-800">
              {list.map((template) => (
                <div key={template.emailType} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 first:pt-0 last:pb-0 gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{template.label}</span>
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400 font-bold font-mono uppercase">
                        {template.emailType}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {template.description || 'No description provided'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleEnable(template.emailType, template.enabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        template.enabled ? 'bg-[#10b981]' : 'bg-gray-200 dark:bg-gray-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          template.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenPreview(template)}
                        className="flex items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                        title="Preview template"
                      >
                        <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <a
                        href={`/admin/settings/email/templates/${template.emailType}`}
                        className="flex items-center justify-center p-2 rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] text-white hover:opacity-90 transition-all cursor-pointer"
                        title="Edit template"
                      >
                        <Edit className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
          <div className="bg-white dark:bg-[#16162a] w-full max-w-3xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Preview: {previewTemplate.label}
                </h3>
                {previewContent && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                    Subject: <span className="font-semibold text-gray-750 dark:text-gray-300">{previewContent.subject}</span>
                  </p>
                )}
              </div>
              <button 
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-black/20 flex flex-col justify-center min-h-[350px]">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e94560]"></div>
                  <p className="text-xs text-gray-500 font-semibold">Generating template mock preview...</p>
                </div>
              ) : previewContent ? (
                <iframe
                  title="Email Preview"
                  srcDoc={previewContent.html}
                  className="w-full h-[450px] border border-gray-200 dark:border-gray-800 rounded-xl bg-white"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-500 font-semibold">Failed to load preview details.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#111122]">
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !previewContent}
                className="flex items-center gap-2 rounded-xl border border-gray-250 dark:border-gray-850 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-5 py-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{sendingTest ? 'Sending Test...' : 'Send Test to My Email'}</span>
              </button>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] text-white hover:opacity-90 px-6 py-2.5 text-xs font-bold transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
