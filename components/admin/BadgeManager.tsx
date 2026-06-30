'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { Badge } from '@/lib/types';
import { createBadge, updateBadge, deleteBadge } from '@/lib/services/badges';
import { toast } from 'sonner';

interface BadgeManagerProps {
  initialBadges: Badge[];
}

export default function BadgeManager({ initialBadges }: BadgeManagerProps) {
  const [badges, setBadges] = useState<Badge[]>(initialBadges);
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [bgColor, setBgColor] = useState('#e94560');
  const [textColor, setTextColor] = useState('#ffffff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenNew = () => {
    setEditId(null);
    setName('');
    setBgColor('#e94560');
    setTextColor('#ffffff');
    setIsOpen(true);
  };

  const handleOpenEdit = (badge: Badge) => {
    setEditId(badge.id);
    setName(badge.name);
    setBgColor(badge.bgColor);
    setTextColor(badge.textColor);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this badge? This will remove it from all linked products.')) return;
    try {
      await deleteBadge(id);
      setBadges(prev => prev.filter(b => b.id !== id));
      toast.success('Badge deleted successfully');
    } catch (err) {
      toast.error('Failed to delete badge');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Badge Name is required');
    if (!bgColor.trim()) return toast.error('Background Color is required');
    if (!textColor.trim()) return toast.error('Text Color is required');

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      bgColor: bgColor.trim(),
      textColor: textColor.trim()
    };

    try {
      if (editId) {
        const updated = await updateBadge(editId, payload);
        setBadges(prev => prev.map(b => b.id === editId ? updated : b));
        toast.success('Badge updated successfully');
      } else {
        const created = await createBadge(payload);
        setBadges(prev => [created, ...prev]);
        toast.success('Badge created successfully');
      }
      setIsOpen(false);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save badge';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex justify-between items-center bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Total Saved Badges: {badges.length}
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] text-white px-5 py-2.5 text-sm font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Create Badge</span>
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map(badge => (
          <div 
            key={badge.id} 
            className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-5 text-gray-900 dark:text-white transition-colors"
          >
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 dark:text-white text-base truncate max-w-[150px]">{badge.name}</h3>
                <span 
                  className="px-2.5 py-0.5 text-xs font-extrabold uppercase rounded-lg shadow-sm tracking-wider"
                  style={{ backgroundColor: badge.bgColor, color: badge.textColor }}
                >
                  {badge.name}
                </span>
              </div>
              
              <div className="mt-4 flex gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                <div>
                  <span className="block font-bold text-[10px] uppercase text-gray-400">Background</span>
                  <code className="bg-gray-50 dark:bg-[#0f0f1b] px-1.5 py-0.5 rounded font-mono text-[11px]">{badge.bgColor}</code>
                </div>
                <div>
                  <span className="block font-bold text-[10px] uppercase text-gray-400">Text Color</span>
                  <code className="bg-gray-50 dark:bg-[#0f0f1b] px-1.5 py-0.5 rounded font-mono text-[11px]">{badge.textColor}</code>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3.5 border-t border-gray-100 dark:border-gray-800 justify-end">
              <button
                onClick={() => handleOpenEdit(badge)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#e94560] bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(badge.id)}
                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {badges.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No badges found. Click "Create Badge" to add one!</p>
        </div>
      )}

      {/* modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-[#16162a] w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden animate-scale-in text-gray-900 dark:text-white will-change-transform">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editId ? 'Edit Badge' : 'Create New Badge'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Badge Label Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-[#0f0f1b] px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="e.g. New, Hot, Sale"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Background *</label>
                  <div className="flex gap-2 items-center mt-1.5">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-10 w-10 p-0 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      required
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-[#0f0f1b] px-3 py-2 text-sm font-medium font-mono text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Text Color *</label>
                  <div className="flex gap-2 items-center mt-1.5">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-10 w-10 p-0 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      required
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-[#0f0f1b] px-3 py-2 text-sm font-medium font-mono text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Badge visual preview */}
              <div className="pt-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Live Preview</span>
                <div className="flex justify-center p-8 bg-gray-50 dark:bg-[#0f0f1b]/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <span 
                    className="px-3.5 py-1 text-xs font-extrabold uppercase rounded-lg shadow-sm tracking-wider"
                    style={{ backgroundColor: bgColor, color: textColor }}
                  >
                    {name || 'PREVIEW PILL'}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 text-center border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#16162a] hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl py-3 text-sm font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`relative overflow-hidden flex-1 flex items-center justify-center text-center rounded-xl py-3 text-sm font-bold shadow-md cursor-pointer transition-all ${
                    isSubmitting
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-[#1a1a2e] hover:bg-[#e94560] text-white'
                  }`}
                >
                  {isSubmitting && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] pointer-events-none z-10 bg-inherit">
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      <div className="flex items-center gap-2 relative z-10">
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span className="text-white">Saving...</span>
                      </div>
                    </div>
                  )}
                  <span className={`transition-opacity ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                    Save Badge
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
