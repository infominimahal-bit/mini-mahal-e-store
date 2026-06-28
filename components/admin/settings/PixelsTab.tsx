'use client';

import React, { useState, useMemo } from 'react';
import { Smartphone, Monitor, HelpCircle, Globe, CheckCircle2, AlertTriangle } from '@/components/common/Icons';

interface PixelsTabProps {
  metaPixelId: string;
  setMetaPixelId: (val: string) => void;
  ga4MeasurementId: string;
  setGa4MeasurementId: (val: string) => void;
  gtmContainerId: string;
  setGtmContainerId: (val: string) => void;
  tiktokPixelId: string;
  setTiktokPixelId: (val: string) => void;
  twitterPixelId: string;
  setTwitterPixelId: (val: string) => void;
  snapchatPixelId: string;
  setSnapchatPixelId: (val: string) => void;
  pinterestTagId: string;
  setPinterestTagId: (val: string) => void;
  twitterHandle: string;
  setTwitterHandle: (val: string) => void;
  metaTitleSuffix: string;
  setMetaTitleSuffix: (val: string) => void;
  metaTitle: string;
  setMetaTitle: (val: string) => void;
  metaDescription: string;
  setMetaDescription: (val: string) => void;
  metaSyncEnabled: boolean;
  setMetaSyncEnabled: (val: boolean) => void;
  storeName: string;
  storeUrl: string;
  faviconUrl?: string;
}

export default function PixelsTab({
  metaPixelId,
  setMetaPixelId,
  ga4MeasurementId,
  setGa4MeasurementId,
  gtmContainerId,
  setGtmContainerId,
  tiktokPixelId,
  setTiktokPixelId,
  twitterPixelId,
  setTwitterPixelId,
  snapchatPixelId,
  setSnapchatPixelId,
  pinterestTagId,
  setPinterestTagId,
  twitterHandle,
  setTwitterHandle,
  metaTitleSuffix,
  setMetaTitleSuffix,
  metaTitle,
  setMetaTitle,
  metaDescription,
  setMetaDescription,
  metaSyncEnabled,
  setMetaSyncEnabled,
  storeName,
  storeUrl,
  faviconUrl,
}: PixelsTabProps) {
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');

  // Compute domain URL representation
  const cleanDomain = useMemo(() => {
    if (!storeUrl) return 'yourstore.com';
    try {
      const parsed = new URL(storeUrl);
      return parsed.hostname.replace(/^www\./, '');
    } catch (e) {
      return storeUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || 'yourstore.com';
    }
  }, [storeUrl]);

  // Compute final title and description strings
  const finalTitle = (metaTitle || storeName) + (metaTitleSuffix || '');
  const finalDesc = metaDescription || 'Please enter a homepage meta description to preview how your website summary text will appear in search results.';

  // Truncate strings specifically for Google Preview representation
  const displayTitle = finalTitle.length > 60 ? finalTitle.slice(0, 58) + '...' : finalTitle;
  const displayDesc = finalDesc.length > 160 ? finalDesc.slice(0, 158) + '...' : finalDesc;

  // Title Status Calculation
  const titleStatus = useMemo(() => {
    const len = finalTitle.length;
    if (len === 0) return { score: 'empty', label: 'Empty', color: 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' };
    if (len < 30) return { score: 'too_short', label: 'Too Short', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/50' };
    if (len <= 60) return { score: 'perfect', label: 'Perfect Length', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' };
    return { score: 'too_long', label: 'Too Long (Trims on Google)', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/50' };
  }, [finalTitle]);

  // Description Status Calculation
  const descStatus = useMemo(() => {
    const len = finalDesc.length;
    if (!metaDescription) return { score: 'empty', label: 'Empty', color: 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' };
    if (len < 110) return { score: 'too_short', label: 'Too Short', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/50' };
    if (len <= 160) return { score: 'perfect', label: 'Perfect Length', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' };
    return { score: 'too_long', label: 'Too Long (Trims on Google)', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/50' };
  }, [finalDesc, metaDescription]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* LEFT COLUMN: SEO Settings & Google Live Preview */}
      <div className="space-y-8">
        
        {/* Google Live Preview Card */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 transition-all">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Google Search Preview
              </h3>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                Live simulation of how your store appears in Google search results.
              </p>
            </div>

            {/* Mobile / Desktop Toggle Switch */}
            <div className="flex bg-gray-100 dark:bg-[#0f0f1b] p-0.5 rounded-xl border border-gray-200/50 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewDevice === 'desktop'
                    ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewDevice === 'mobile'
                    ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>
          </div>

          {/* Render Active Google Snippet Simulator */}
          <div className="border border-gray-200/60 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 p-5 rounded-2xl transition-all">
            {previewDevice === 'desktop' ? (
              /* Desktop Search Result Snippet */
              <div className="font-sans text-left max-w-full overflow-hidden leading-normal">
                {/* URL row */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200/65 dark:border-gray-700 shadow-sm shrink-0">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon" className="w-3.5 h-3.5 rounded-full object-contain" />
                    ) : (
                      <Globe className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                      {storeName}
                    </span>
                    <span className="text-[11px] text-gray-450 dark:text-gray-500 leading-none">
                      {storeUrl || `https://${cleanDomain}`}
                    </span>
                  </div>
                </div>
                {/* Title */}
                <a href="#" onClick={(e) => e.preventDefault()} className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] hover:underline block font-normal mb-1">
                  {displayTitle}
                </a>
                {/* Snippet */}
                <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed break-words font-normal">
                  {displayDesc}
                </p>
              </div>
            ) : (
              /* Mobile Search Result Snippet */
              <div className="font-sans text-left max-w-[340px] mx-auto overflow-hidden leading-normal">
                {/* URL / Favicon row */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200/65 dark:border-gray-700 shadow-sm shrink-0">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon" className="w-4.5 h-4.5 rounded-full object-contain" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">
                      {storeName}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                      {storeUrl || `https://${cleanDomain}`}
                    </span>
                  </div>
                </div>
                {/* Title */}
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[18px] text-[#15c] dark:text-[#8ab4f8] hover:underline block font-medium mb-1 leading-snug">
                  {displayTitle}
                </a>
                {/* Snippet */}
                <p className="text-[13px] text-[#4d5156] dark:text-[#bdc1c6] leading-snug break-words font-normal">
                  {displayDesc}
                </p>
              </div>
            )}
          </div>

          {/* Dynamic Analysis Scores Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Title Analysis */}
            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${titleStatus.color}`}>
              <div className="flex items-center justify-between font-bold">
                <span>Title Length</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{titleStatus.label}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1 text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-lg">{finalTitle.length} <span className="text-[10px] font-normal text-gray-500">chars</span></span>
                <span className="text-[10px] font-medium opacity-80">Ideal: 50-60</span>
              </div>
            </div>

            {/* Description Analysis */}
            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${descStatus.color}`}>
              <div className="flex items-center justify-between font-bold">
                <span>Description Length</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{descStatus.label}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1 text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-lg">{metaDescription ? finalDesc.length : 0} <span className="text-[10px] font-normal text-gray-500">chars</span></span>
                <span className="text-[10px] font-medium opacity-80">Ideal: 120-160</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEO & Social Meta Inputs */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">SEO & Social Meta</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure how your site title is displayed in search results and social cards.
          </p>

          <div className="space-y-4">
            {/* Meta Title */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Homepage Meta Title (SEO Title)
                  </label>
                  <div className="relative group inline-block text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-[11px] leading-relaxed text-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-gray-800">
                      The main title of your homepage shown in search results. Include your brand name and key products. Recommendation: 50-60 characters.
                    </div>
                  </div>
                </div>
                {titleStatus.score === 'perfect' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {titleStatus.score === 'empty' && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="e.g. Zaynahs E-Store | Kids Premium Clothing"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
              <span className="text-[10px] text-gray-450 dark:text-gray-500 mt-1 block">
                Leave blank to default to Store Name (e.g. "{metaTitle || storeName || 'TotVogue.pk'}").
              </span>
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Homepage Meta Description (SEO Description)
                  </label>
                  <div className="relative group inline-block text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-[11px] leading-relaxed text-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-gray-800">
                      A summary text that displays under your title in search results. Mention discounts, collections, and WhatsApp ordering. Ideal length: 120-160 characters.
                    </div>
                  </div>
                </div>
                {descStatus.score === 'perfect' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {descStatus.score === 'empty' && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </div>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="e.g. Shop the best premium quality kids wear, boys and girls clothing in Pakistan. Best fabric and designs with fast WhatsApp checkout."
                rows={4}
                maxLength={160}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all resize-none"
              />
              <div className="flex justify-between text-[10px] text-gray-450 dark:text-gray-500 mt-1">
                <span>Google search snippets main show hone wali summary text.</span>
                <span className={metaDescription.length > 160 ? 'text-red-500 font-bold' : ''}>
                  {metaDescription.length} / 160 chars
                </span>
              </div>
            </div>

            {/* Meta Title Suffix */}
            <div>
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Meta Title Suffix (e.g. " | Zaynahs")
                </label>
                <div className="relative group inline-block text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-[11px] leading-relaxed text-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-gray-800">
                    A branding suffix appended automatically to every product page and collection page title (e.g., 'Product Name | BrandName').
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={metaTitleSuffix}
                onChange={(e) => setMetaTitleSuffix(e.target.value)}
                placeholder="e.g.  | Zaynahs"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>

            {/* Twitter Handle */}
            <div>
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Twitter / X Handle (e.g. "@zaynahs_pk")
                </label>
                <div className="relative group inline-block text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-[11px] leading-relaxed text-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-gray-800">
                    The Twitter creator/site handle for meta tag cards (e.g. @my_brand) used when users share your links on Twitter/X.
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                placeholder="e.g. @zaynahs_pk"
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Analytics & Tracking Pixels */}
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Tracking & Analytics Pixels</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enter pixel IDs to automatically capture PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase events.
        </p>

        <div className="space-y-4">
          {/* Meta Catalog Sync Toggle */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-gray-50/50 dark:bg-[#0f0f1b]/50 border border-gray-200 dark:border-gray-800 transition-colors">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Meta Catalog Syncing
              </label>
              <span className="text-[10px] text-gray-450 dark:text-gray-550 block mt-0.5 font-semibold">
                Sync store products and categories directly to Meta Product Catalog.
              </span>
            </div>
            <input
              type="checkbox"
              checked={metaSyncEnabled}
              onChange={(e) => setMetaSyncEnabled(e.target.checked)}
              className="w-10 h-6 rounded-full bg-gray-200 dark:bg-gray-800 checked:bg-[#e94560] appearance-none cursor-pointer transition-all relative after:content-[''] after:absolute after:h-5 after:w-5 after:bg-white after:rounded-full after:top-[2px] after:left-[2px] checked:after:left-[18px] after:transition-all shrink-0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Meta Pixel ID (Facebook)
            </label>
            <input
              type="text"
              value={metaPixelId}
              onChange={(e) => setMetaPixelId(e.target.value)}
              placeholder="e.g. 1234567890"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Google Analytics 4 (GA4) Measurement ID
            </label>
            <input
              type="text"
              value={ga4MeasurementId}
              onChange={(e) => setGa4MeasurementId(e.target.value)}
              placeholder="e.g. G-XXXXXXX"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Google Tag Manager (GTM) Container ID
            </label>
            <input
              type="text"
              value={gtmContainerId}
              onChange={(e) => setGtmContainerId(e.target.value)}
              placeholder="e.g. GTM-XXXXXXX"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              TikTok Pixel ID
            </label>
            <input
              type="text"
              value={tiktokPixelId}
              onChange={(e) => setTiktokPixelId(e.target.value)}
              placeholder="e.g. CXXXXXXXXXXXXXXXXXXX"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Snapchat Pixel ID
            </label>
            <input
              type="text"
              value={snapchatPixelId}
              onChange={(e) => setSnapchatPixelId(e.target.value)}
              placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pinterest Tag ID
            </label>
            <input
              type="text"
              value={pinterestTagId}
              onChange={(e) => setPinterestTagId(e.target.value)}
              placeholder="e.g. 26XXXXXXXXXXX"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Twitter / X Pixel ID
            </label>
            <input
              type="text"
              value={twitterPixelId}
              onChange={(e) => setTwitterPixelId(e.target.value)}
              placeholder="e.g. xxxxx"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
