'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Mail, Eye, Check, X, Save, RefreshCw } from '@/components/common/Icons';
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

const VARIABLES_BY_TYPE: Record<string, string[]> = {
  welcome: ['brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'current_year'],
  password_reset: ['brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'reset_link', 'current_year'],
  password_changed: ['brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'current_year'],
  order_placed: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_subtotal', 'order_shipping_fee', 'order_status', 'order_items_html',
    'shipping_address.name', 'shipping_address.phone', 'shipping_address.street', 'shipping_address.city', 'shipping_address.full'
  ],
  order_confirmed: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_subtotal', 'order_shipping_fee', 'order_status', 'order_items_html',
    'shipping_address.name', 'shipping_address.phone', 'shipping_address.street', 'shipping_address.city', 'shipping_address.full'
  ],
  order_processing: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_subtotal', 'order_shipping_fee', 'order_status', 'order_items_html',
    'shipping_address.name', 'shipping_address.phone', 'shipping_address.street', 'shipping_address.city', 'shipping_address.full'
  ],
  order_shipped: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_subtotal', 'order_shipping_fee', 'order_status', 'order_items_html',
    'shipping_address.name', 'shipping_address.phone', 'shipping_address.street', 'shipping_address.city', 'shipping_address.full',
    'tracking_number', 'courier_name', 'tracking_url', 'estimated_delivery'
  ],
  order_out_for_delivery: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_subtotal', 'order_shipping_fee', 'order_status', 'order_items_html',
    'shipping_address.name', 'shipping_address.phone', 'shipping_address.street', 'shipping_address.city', 'shipping_address.full'
  ],
  order_delivered: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_subtotal', 'order_shipping_fee', 'order_status', 'order_items_html',
    'shipping_address.name', 'shipping_address.phone', 'shipping_address.street', 'shipping_address.city', 'shipping_address.full'
  ],
  order_cancelled: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_status', 'cancel_reason'
  ],
  order_refunded: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_status', 'refund_amount'
  ],
  review_request: ['brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'current_year'],
  admin_new_order: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'currency', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_subtotal', 'order_shipping_fee', 'order_status', 'order_items_html',
    'shipping_address.full', 'admin_panel_url'
  ],
  admin_order_cancelled: [
    'brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_email', 'current_year',
    'order_id', 'order_date', 'order_total', 'order_status', 'cancel_reason', 'admin_panel_url'
  ],
  admin_low_stock: ['brand_name', 'site_url', 'product_name', 'product_stock', 'admin_panel_url', 'current_year'],
  admin_new_customer: ['brand_name', 'site_url', 'customer_name', 'customer_email', 'admin_panel_url', 'current_year'],
  admin_new_review: ['brand_name', 'site_url', 'product_name', 'review_rating', 'review_text', 'review_author', 'admin_panel_url', 'current_year'],
  admin_contact_form: ['brand_name', 'site_url', 'customer_name', 'customer_email', 'contact_name', 'contact_subject', 'contact_message', 'current_year']
};

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const emailType = params.type as string;

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [enabled, setEnabled] = useState(true);
  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState<'default' | 'custom'>('default');
  const [customHtml, setCustomHtml] = useState('');

  // Preview state
  const [previewContent, setPreviewContent] = useState<{ subject: string; html: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [emailType]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/email-templates/${emailType}`);
      const data = await res.json();
      if (data.success && data.template) {
        const t = data.template;
        setTemplate(t);
        setEnabled(t.enabled);
        setSubject(t.subject);
        setCustomHtml(t.customHtml || '');
        setMode(t.customHtml ? 'custom' : 'default');
      } else {
        toast.error('Failed to load template details');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while loading template');
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('html-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const placeholder = `{{${variable}}}`;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    setCustomHtml(newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        subject,
        enabled,
        customHtml: mode === 'custom' ? customHtml : null
      };

      const res = await fetch(`/api/email-templates/${emailType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Template saved successfully!');
        setTemplate(data.template);
      } else {
        toast.error(data.error || 'Failed to save template');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('This will discard your custom HTML template and use the built-in design. Continue?')) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/email-templates/${emailType}?action=reset`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Template reset to default successfully');
        setTemplate(data.template);
        setCustomHtml('');
        setMode('default');
      } else {
        toast.error(data.error || 'Failed to reset template');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error resetting template');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPreview = async () => {
    setShowPreviewModal(true);
    setPreviewContent(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/email-templates/${emailType}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          customHtml: mode === 'custom' ? customHtml : null,
          isDefaultMode: mode === 'default'
        })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewContent({ subject: data.subject, html: data.html });
      } else {
        toast.error(data.error || 'Failed to load preview');
        setShowPreviewModal(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load preview');
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setSendingTest(true);
      const res = await fetch(`/api/email-templates/${emailType}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          customHtml: mode === 'custom' ? customHtml : null,
          isDefaultMode: mode === 'default'
        })
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
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e94560]"></div>
        <p className="text-xs text-gray-500 font-bold">Loading template customizer...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12 max-w-5xl">
        <h2 className="text-sm font-bold text-red-500">Template Not Found</h2>
        <a href="/admin/settings/email/templates" className="mt-4 inline-block text-xs font-bold text-[#e94560] hover:underline">
          Return to templates list
        </a>
      </div>
    );
  }

  const availableVars = VARIABLES_BY_TYPE[emailType] || [];

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/admin/settings/email/templates" className="p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit: {template.label}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{template.description}</p>
          </div>
        </div>
        
        {/* Toggle Enable at Top */}
        <div className="flex items-center gap-3 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-xl transition-colors">
          <span className="text-xs font-bold text-gray-750 dark:text-gray-300">Enabled</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enabled ? 'bg-[#10b981]' : 'bg-gray-200 dark:bg-gray-800'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form Editor Side */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
            {/* Subject Line */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-5/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
              <p className="text-[10px] text-gray-450 mt-1">
                Supports placeholders like <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-600 dark:text-gray-300">&#123;&#123;brand_name&#125;&#125;</code> and <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-600 dark:text-gray-300">&#123;&#123;order_id&#125;&#125;</code>.
              </p>
            </div>

            {/* Mode Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Template Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                  mode === 'default'
                    ? 'border-[#1a1a2e] dark:border-[#e94560] bg-gray-50/20 dark:bg-white/5'
                    : 'border-gray-250 dark:border-gray-850 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="template-mode"
                      checked={mode === 'default'}
                      onChange={() => setMode('default')}
                      className="text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                    />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Default Template</span>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">
                    Uses built-in Shopify-style responsive layout with your store colors and branding.
                  </span>
                </label>

                <label className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                  mode === 'custom'
                    ? 'border-[#1a1a2e] dark:border-[#e94560] bg-gray-50/20 dark:bg-white/5'
                    : 'border-gray-250 dark:border-gray-850 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="template-mode"
                      checked={mode === 'custom'}
                      onChange={() => setMode('custom')}
                      className="text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                    />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Custom Template (HTML)</span>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">
                    Write raw HTML code. Fully customizable layout, typography and items display.
                  </span>
                </label>
              </div>
            </div>

            {/* Custom HTML Textarea Editor */}
            {mode === 'custom' && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Custom HTML Body
                  </label>
                  {template.customHtml && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-[10px] font-bold text-[#e94560] hover:underline"
                    >
                      Reset to Default Layout
                    </button>
                  )}
                </div>
                <textarea
                  id="html-textarea"
                  value={customHtml}
                  onChange={(e) => setCustomHtml(e.target.value)}
                  placeholder="<html>\n<body style='font-family: sans-serif;'>\n  ...\n</body>\n</html>"
                  className="w-full h-80 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#0f0f1b] px-4 py-3 text-xs font-mono text-gray-200 focus:border-[#e94560] focus:outline-none transition-all resize-y"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Variable Selector */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e94560]">Template Variables</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Click any variable tag below to insert it at the cursor position inside the HTML editor.
            </p>
            
            <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
              {availableVars.length > 0 ? (
                availableVars.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    disabled={mode === 'default'}
                    className="px-2 py-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-[10px] font-semibold text-gray-700 dark:text-gray-300 font-mono transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={mode === 'default' ? 'Switch to Custom HTML to use variables selector' : `Click to insert {{${v}}}`}
                  >
                    &#123;&#123;{v}&#125;&#125;
                  </button>
                ))
              ) : (
                <span className="text-xs text-gray-400">No variables available</span>
              )}
            </div>
            
            {mode === 'default' && (
              <p className="text-[10px] text-amber-500 font-semibold bg-amber-50 dark:bg-amber-950/10 p-3 rounded-xl">
                💡 Variable insertion is disabled in Default mode, as placeholders are pre-rendered automatically in the Shopify layout.
              </p>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e94560]">Test & Confirm</h3>
            
            <button
              type="button"
              onClick={handleOpenPreview}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span>Preview template</span>
            </button>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              <span>{sendingTest ? 'Sending Test...' : 'Send Test Email'}</span>
            </button>

            <div className="border-t border-gray-150 dark:border-gray-800 my-2 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] text-white hover:opacity-90 px-4 py-3 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
          <div className="bg-white dark:bg-[#16162a] w-full max-w-3xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Preview: {template.label}
                </h3>
                {previewContent && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                    Subject: <span className="font-semibold text-gray-750 dark:text-gray-300">{previewContent.subject}</span>
                  </p>
                )}
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
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
                className="flex items-center gap-2 rounded-xl border border-gray-250 dark:border-gray-850 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-750 dark:text-gray-300 px-5 py-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{sendingTest ? 'Sending Test...' : 'Send Test to My Email'}</span>
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
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
