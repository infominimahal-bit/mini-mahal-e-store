'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Save, Loader2 } from '@/components/common/Icons';
import { toast } from 'sonner';

interface EditSEOModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity_type: 'product' | 'category' | 'page';
  entity_id: string;
  seoData: any;
}

export function EditSEOModal({ isOpen, onClose, entity_type, entity_id, seoData }: EditSEOModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    seo_title: seoData?.seo_title || '',
    meta_description: seoData?.meta_description || '',
    focus_keyword: seoData?.focus_keyword || '',
    secondary_keywords: seoData?.secondary_keywords || '',
    lsi_tags: seoData?.lsi_tags || '',
    og_title: seoData?.og_title || '',
    og_description: seoData?.og_description || '',
    twitter_title: seoData?.twitter_title || '',
    twitter_description: seoData?.twitter_description || '',
    image_alt: seoData?.image_alt || '',
    long_description: seoData?.long_description || '',
    pinterest_description: seoData?.pinterest_description || '',
    faq_schema: seoData?.faq_schema || []
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('seo_meta')
        .upsert({
          entity_type,
          entity_id,
          ...form,
          is_optimized: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'entity_type,entity_id'
        });

      if (error) throw error;

      // Save back to main tables
      if (entity_type === 'product') {
        const tagsSet = new Set<string>();
        if (form.focus_keyword) {
          form.focus_keyword.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagsSet.add(t));
        }
        if (form.secondary_keywords) {
          form.secondary_keywords.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagsSet.add(t));
        }
        if (form.lsi_tags) {
          form.lsi_tags.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagsSet.add(t));
        }
        const tagsArray = Array.from(tagsSet);

        const { error: prodErr } = await supabase
          .from('products')
          .update({
            description: form.long_description,
            short_description: form.meta_description,
            meta_title: form.seo_title,
            meta_description: form.meta_description,
            tags: tagsArray,
            meta_sync_status: 'synced',
            meta_last_synced_at: new Date().toISOString()
          })
          .eq('id', entity_id);
        
        if (prodErr) throw prodErr;
      } else if (entity_type === 'category') {
        const { error: catErr } = await supabase
          .from('categories')
          .update({
            description: form.long_description,
            updated_at: new Date().toISOString()
          })
          .eq('id', entity_id);
        
        if (catErr) throw catErr;
      }

      toast.success('SEO metadata saved successfully!');
      onClose();
    } catch (err: any) {
      console.error('[Edit SEO Modal] Save failed:', err);
      toast.error(err.message || 'Failed to save overrides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
      <div className="bg-white dark:bg-[#16162a] rounded-2xl max-w-3xl w-full border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Edit SEO Copy overrides</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Customize specific search and social tags manually.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Focus Keyword */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Focus Keyword</label>
              <input
                type="text"
                name="focus_keyword"
                value={form.focus_keyword}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Secondary Keywords */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Secondary Keywords (comma separated)</label>
              <input
                type="text"
                name="secondary_keywords"
                value={form.secondary_keywords}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">LSI Keywords (comma separated)</label>
            <input
              type="text"
              name="lsi_tags"
              value={form.lsi_tags}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
            />
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Search Engine Listings */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Google Search Meta</h4>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">SEO Title</label>
                <span className={`text-[10px] ${form.seo_title.length > 60 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  {form.seo_title.length} / 60
                </span>
              </div>
              <input
                type="text"
                name="seo_title"
                value={form.seo_title}
                onChange={handleChange}
                maxLength={80}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Meta Description</label>
                <span className={`text-[10px] ${form.meta_description.length > 160 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  {form.meta_description.length} / 160
                </span>
              </div>
              <textarea
                name="meta_description"
                value={form.meta_description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Image Alt Text</label>
              <input
                type="text"
                name="image_alt"
                value={form.image_alt}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Social Media Snippets */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Social Media Overrides</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500">Facebook / Instagram</h5>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300">OG Title</label>
                  <input
                    type="text"
                    name="og_title"
                    value={form.og_title}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300">OG Description</label>
                  <textarea
                    name="og_description"
                    value={form.og_description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500">Twitter / X Card</h5>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Twitter Title</label>
                  <input
                    type="text"
                    name="twitter_title"
                    value={form.twitter_title}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Twitter Description</label>
                  <textarea
                    name="twitter_description"
                    value={form.twitter_description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Pinterest Pin Description</label>
                <input
                  type="text"
                  name="pinterest_description"
                  value={form.pinterest_description}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Copywriting */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Copywriting Copy</h4>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Long Form HTML Description</label>
              <textarea
                name="long_description"
                value={form.long_description}
                onChange={handleChange}
                rows={10}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-sm font-mono text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Save Actions */}
          <div className="sticky bottom-0 bg-white dark:bg-[#16162a] py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-sm cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm text-sm cursor-pointer min-h-[44px] active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
