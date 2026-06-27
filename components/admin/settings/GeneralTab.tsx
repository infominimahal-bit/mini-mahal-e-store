'use client';

import React from 'react';
import { Trash2, Upload, Image as ImageIcon, Loader2 } from '@/components/common/Icons';

interface GeneralTabProps {
  storeName: string;
  setStoreName: (val: string) => void;
  storeUrl: string;
  setStoreUrl: (val: string) => void;
  whatsappNumber: string;
  setWhatsappNumber: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  currencySymbol: string;
  setCurrencySymbol: (val: string) => void;
  orderPrefix: string;
  setOrderPrefix: (val: string) => void;
  nextOrderSequence: number;
  setNextOrderSequence: (val: number) => void;
  tagline: string;
  setTagline: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  showStock: boolean;
  setShowStock: (val: boolean) => void;
  showComparePrice: boolean;
  setShowComparePrice: (val: boolean) => void;
  enableSearch: boolean;
  setEnableSearch: (val: boolean) => void;
  enableCategoryFilter: boolean;
  setEnableCategoryFilter: (val: boolean) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  logoWidth: number;
  setLogoWidth: (val: number) => void;
  faviconUrl: string;
  setFaviconUrl: (val: string) => void;
  handleRemoveImage: (type: 'logo' | 'favicon') => void;
}

import MediaSelectorModal from '../MediaSelectorModal';

export default function GeneralTab({
  storeName,
  setStoreName,
  storeUrl,
  setStoreUrl,
  whatsappNumber,
  setWhatsappNumber,
  currency,
  setCurrency,
  currencySymbol,
  setCurrencySymbol,
  orderPrefix,
  setOrderPrefix,
  nextOrderSequence,
  setNextOrderSequence,
  tagline,
  setTagline,
  address,
  setAddress,
  showStock,
  setShowStock,
  showComparePrice,
  setShowComparePrice,
  enableSearch,
  setEnableSearch,
  enableCategoryFilter,
  setEnableCategoryFilter,
  logoUrl,
  setLogoUrl,
  logoWidth,
  setLogoWidth,
  faviconUrl,
  setFaviconUrl,
  handleRemoveImage,
}: GeneralTabProps) {
  const [isMediaModalOpen, setIsMediaModalOpen] = React.useState(false);
  const [selectingType, setSelectingType] = React.useState<'logo' | 'favicon' | null>(null);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Core Settings */}
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">General Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Store Name *</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Store URL (e.g. https://www.totvogue.pk)</label>
            <input
              type="url"
              placeholder="e.g. https://www.totvogue.pk"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">WhatsApp Number * (Format: 923001234567)</label>
            <input
              type="text"
              required
              placeholder="e.g. 923001234567"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Currency Code</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Currency Symbol</label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Order Serial Prefix</label>
            <input
              type="text"
              value={orderPrefix}
              onChange={(e) => setOrderPrefix(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              placeholder="TV-"
            />
            <p className="mt-1 text-xs text-gray-400">Static prefix only (letters + dash). No numbers.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Next Order Serial Number</label>
            <input
              type="number"
              value={nextOrderSequence}
              onChange={(e) => setNextOrderSequence(parseInt(e.target.value) || 1)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              min="1"
            />
            <p className="mt-1 text-xs text-gray-400">Auto-increments after each order. System will zero-pad (e.g. 1 → 0001).</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tagline / Subheading</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Feature & Branding Settings */}
      <div className="space-y-6">
        {/* Feature Toggles */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Feature Toggles</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none text-gray-750 dark:text-gray-200">
              <input
                type="checkbox"
                checked={showStock}
                onChange={(e) => setShowStock(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Show stock indicator to customers</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none text-gray-750 dark:text-gray-200">
              <input
                type="checkbox"
                checked={showComparePrice}
                onChange={(e) => setShowComparePrice(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enable compare-at pricing (sale display)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none text-gray-750 dark:text-gray-200">
              <input
                type="checkbox"
                checked={enableSearch}
                onChange={(e) => setEnableSearch(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enable search bar</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none text-gray-750 dark:text-gray-200">
              <input
                type="checkbox"
                checked={enableCategoryFilter}
                onChange={(e) => setEnableCategoryFilter(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enable categories filter row</span>
            </label>
          </div>
        </div>

        {/* Logo, Favicon, Banner Uploads */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 transition-colors">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Store Branding Assets</h3>
          
          <div className="space-y-6">
            {/* Logo Upload Zone */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Store Logo</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/20 dark:bg-[#0f0f1b]/20">
                {logoUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="relative border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] flex items-center justify-center p-2"
                      style={{ width: `${logoWidth}px`, height: 'auto', minHeight: '60px' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Store Logo Preview" className="max-w-full max-h-24 object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('logo')}
                      className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}

                <div className="flex-1 flex flex-col items-center sm:items-start gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectingType('logo');
                      setIsMediaModalOpen(true);
                    }}
                    className="relative flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Select Media</span>
                  </button>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Select WebP &lt; 50 KB</span>
                </div>
              </div>

              {/* Logo Width Adjuster */}
              {logoUrl && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span>Logo Display Width</span>
                    <span>{logoWidth}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="30" 
                    max="240" 
                    step="10"
                    value={logoWidth}
                    onChange={(e) => setLogoWidth(Number(e.target.value))}
                    className="w-full mt-1.5 accent-[#e94560]"
                  />
                </div>
              )}
            </div>

            {/* Favicon Upload Zone */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Store Favicon</label>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/20 dark:bg-[#0f0f1b]/20">
                {faviconUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-12 w-12 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] flex items-center justify-center p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={faviconUrl} alt="Store Favicon Preview" className="h-full w-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('favicon')}
                      className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}

                <div className="flex-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectingType('favicon');
                      setIsMediaModalOpen(true);
                    }}
                    className="relative self-start flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Select Media</span>
                  </button>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    Browser tab ke liye small icon. Aap <strong className="text-gray-900 dark:text-white">.png</strong> ya <strong className="text-gray-900 dark:text-white">.ico</strong> dono formats use kar sakte hain (dono theek hain).
                    <br />
                    <span className="text-amber-500 font-semibold">Tip: Browser favicon ko bohot aggressive cache karta hai. Agar update na ho raha ho toh cache clear karein (Ctrl/Cmd + Shift + R) ya Incognito tab mein check karein.</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => {
          setIsMediaModalOpen(false);
          setSelectingType(null);
        }}
        onSelect={(urls) => {
          if (urls.length > 0) {
            if (selectingType === 'logo') {
              setLogoUrl(urls[0]);
            } else if (selectingType === 'favicon') {
              setFaviconUrl(urls[0]);
            }
          }
          setIsMediaModalOpen(false);
          setSelectingType(null);
        }}
        multiple={false}
      />
    </div>
  );
}
