'use client';

import React from 'react';

interface FooterTabProps {
  footerCol1Title: string;
  setFooterCol1Title: (val: string) => void;
  footerText: string;
  setFooterText: (val: string) => void;
  footerCol2Title: string;
  setFooterCol2Title: (val: string) => void;
  footerCol2Text: string;
  setFooterCol2Text: (val: string) => void;
  footerCol3Title: string;
  setFooterCol3Title: (val: string) => void;
  footerCol4Title: string;
  setFooterCol4Title: (val: string) => void;
  footerCol4Text: string;
  setFooterCol4Text: (val: string) => void;
  footerBottomText: string;
  setFooterBottomText: (val: string) => void;
  storeName: string;

  footerShowPayments: boolean;
  setFooterShowPayments: (val: boolean) => void;
  footerShowMenu: boolean;
  setFooterShowMenu: (val: boolean) => void;
  footerShowNewsletter: boolean;
  setFooterShowNewsletter: (val: boolean) => void;
  footerShowSocial: boolean;
  setFooterShowSocial: (val: boolean) => void;

  socialFacebook: string;
  setSocialFacebook: (val: string) => void;
  socialInstagram: string;
  setSocialInstagram: (val: string) => void;
  socialYoutube: string;
  setSocialYoutube: (val: string) => void;
  socialWhatsapp: string;
  setSocialWhatsapp: (val: string) => void;
  socialTiktok: string;
  setSocialTiktok: (val: string) => void;
  socialSnapchat: string;
  setSocialSnapchat: (val: string) => void;
  socialTwitter: string;
  setSocialTwitter: (val: string) => void;

  floatingContactsEnabled: boolean;
  setFloatingContactsEnabled: (val: boolean) => void;
  floatingWhatsappEnabled: boolean;
  setFloatingWhatsappEnabled: (val: boolean) => void;
  floatingInstagramEnabled: boolean;
  setFloatingInstagramEnabled: (val: boolean) => void;
  floatingTiktokEnabled: boolean;
  setFloatingTiktokEnabled: (val: boolean) => void;
  floatingSnapchatEnabled: boolean;
  setFloatingSnapchatEnabled: (val: boolean) => void;
  floatingTwitterEnabled: boolean;
  setFloatingTwitterEnabled: (val: boolean) => void;

  floatingContactsPosition: 'left' | 'right';
  setFloatingContactsPosition: (val: 'left' | 'right') => void;
  floatingContactsScale: number;
  setFloatingContactsScale: (val: number) => void;
  floatingContactsBottomMobile: number;
  setFloatingContactsBottomMobile: (val: number) => void;
  floatingContactsBottomDesktop: number;
  setFloatingContactsBottomDesktop: (val: number) => void;
  floatingContactsSideMobile: number;
  setFloatingContactsSideMobile: (val: number) => void;
  floatingContactsSideDesktop: number;
  setFloatingContactsSideDesktop: (val: number) => void;
  floatingWhatsappPreset: string;
  setFloatingWhatsappPreset: (val: string) => void;
  floatingWhatsappNumber: string;
  setFloatingWhatsappNumber: (val: string) => void;
}

export default function FooterTab({
  footerCol1Title,
  setFooterCol1Title,
  footerText,
  setFooterText,
  footerCol2Title,
  setFooterCol2Title,
  footerCol2Text,
  setFooterCol2Text,
  footerCol3Title,
  setFooterCol3Title,
  footerCol4Title,
  setFooterCol4Title,
  footerCol4Text,
  setFooterCol4Text,
  footerBottomText,
  setFooterBottomText,
  storeName,
  footerShowPayments,
  setFooterShowPayments,
  footerShowMenu,
  setFooterShowMenu,
  footerShowNewsletter,
  setFooterShowNewsletter,
  footerShowSocial,
  setFooterShowSocial,
  socialFacebook,
  setSocialFacebook,
  socialInstagram,
  setSocialInstagram,
  socialYoutube,
  setSocialYoutube,
  socialWhatsapp,
  setSocialWhatsapp,
  socialTiktok,
  setSocialTiktok,
  socialSnapchat,
  setSocialSnapchat,
  socialTwitter,
  setSocialTwitter,
  floatingContactsEnabled,
  setFloatingContactsEnabled,
  floatingWhatsappEnabled,
  setFloatingWhatsappEnabled,
  floatingInstagramEnabled,
  setFloatingInstagramEnabled,
  floatingTiktokEnabled,
  setFloatingTiktokEnabled,
  floatingSnapchatEnabled,
  setFloatingSnapchatEnabled,
  floatingTwitterEnabled,
  setFloatingTwitterEnabled,
  floatingContactsPosition,
  setFloatingContactsPosition,
  floatingContactsScale,
  setFloatingContactsScale,
  floatingContactsBottomMobile,
  setFloatingContactsBottomMobile,
  floatingContactsBottomDesktop,
  setFloatingContactsBottomDesktop,
  floatingContactsSideMobile,
  setFloatingContactsSideMobile,
  floatingContactsSideDesktop,
  setFloatingContactsSideDesktop,
  floatingWhatsappPreset,
  setFloatingWhatsappPreset,
  floatingWhatsappNumber,
  setFloatingWhatsappNumber,
}: FooterTabProps) {
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 transition-colors">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Shopify-Style Footer Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1 & 2 Config */}
          <div className="space-y-4 border-r border-gray-100 dark:border-gray-800/80 pr-0 md:pr-6">
            <span className="text-xs font-bold text-[#e94560] block uppercase tracking-wider">Footer Columns 1 & 2</span>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Column 1 Title (Brand / About)</label>
              <input
                type="text"
                value={footerCol1Title}
                onChange={(e) => setFooterCol1Title(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Column 1 Description (Footer Text)</label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={4}
                placeholder="Brief information about your brand, address, or customer support details."
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Column 2 Title (Customer Support)</label>
                <input
                  type="text"
                  value={footerCol2Title}
                  onChange={(e) => setFooterCol2Title(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Column 2 Text (Support Details)</label>
                <textarea
                  value={footerCol2Text}
                  onChange={(e) => setFooterCol2Text(e.target.value)}
                  rows={4}
                  placeholder="Enter phone/email/timing lines. Support multiline."
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Column 3 & 4 Config */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-[#e94560] block uppercase tracking-wider">Footer Columns 3 & 4</span>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Column 3 Title (Quick Links)</label>
              <input
                type="text"
                value={footerCol3Title}
                onChange={(e) => setFooterCol3Title(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">Column 3 renders your storefront navigation menu links automatically.</p>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Column 4 Title (Newsletter)</label>
                <input
                  type="text"
                  value={footerCol4Title}
                  onChange={(e) => setFooterCol4Title(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Column 4 Text (Newsletter Prompt)</label>
                <textarea
                  value={footerCol4Text}
                  onChange={(e) => setFooterCol4Text(e.target.value)}
                  rows={4}
                  placeholder="Enter newsletter subscription instructions."
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Bottom copyright text editor */}
          <div className="col-span-1 md:col-span-2 border-t border-gray-200 dark:border-gray-800 pt-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Footer Copyright Text</label>
            <input
              type="text"
              value={footerBottomText}
              onChange={(e) => setFooterBottomText(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
              placeholder={`e.g. © ${new Date().getFullYear()} ${storeName || 'OurStore E-Store'}. All rights reserved.`}
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">This will edit the entire copyright text at the bottom of the page.</p>
          </div>

        </div>
      </div>

      {/* Footer Content Visibility */}
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 transition-colors">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Footer Content Visibility</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Enable or disable individual sections of the store footer globally.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Show Navigation Menu */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Quick Links Menu</span>
              <span className="text-[10px] text-gray-400">Show Quick Links navigation links</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={footerShowMenu}
                onChange={(e) => setFooterShowMenu(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
            </label>
          </div>

          {/* Show Newsletter */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Newsletter Signup</span>
              <span className="text-[10px] text-gray-400">Show email newsletter subscription form</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={footerShowNewsletter}
                onChange={(e) => setFooterShowNewsletter(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
            </label>
          </div>

          {/* Show Social Media */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Social Media Links</span>
              <span className="text-[10px] text-gray-400">Show social channel icons</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={footerShowSocial}
                onChange={(e) => setFooterShowSocial(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
            </label>
          </div>

          {/* Show Payments */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Payment Badges</span>
              <span className="text-[10px] text-gray-400">Show checkout credit card logos at the bottom</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={footerShowPayments}
                onChange={(e) => setFooterShowPayments(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
            </label>
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 transition-colors">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Social Media Links</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Add URLs to your active social channels. Supported icons will be displayed in Column 4 of the footer.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Facebook Page URL</label>
              <input
                type="url"
                placeholder="https://facebook.com/yourpage"
                value={socialFacebook}
                onChange={(e) => setSocialFacebook(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Instagram Profile URL</label>
              <input
                type="url"
                placeholder="https://instagram.com/yourusername"
                value={socialInstagram}
                onChange={(e) => setSocialInstagram(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">YouTube Channel URL</label>
              <input
                type="url"
                placeholder="https://youtube.com/@yourchannel"
                value={socialYoutube}
                onChange={(e) => setSocialYoutube(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">WhatsApp Contact Number</label>
              <input
                type="text"
                placeholder="e.g. 923001234567"
                value={socialWhatsapp}
                onChange={(e) => setSocialWhatsapp(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">Format: 923001234567 (no spaces or +).</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">TikTok Profile URL</label>
              <input
                type="url"
                placeholder="https://tiktok.com/@yourusername"
                value={socialTiktok}
                onChange={(e) => setSocialTiktok(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Snapchat Profile URL</label>
              <input
                type="url"
                placeholder="https://snapchat.com/add/yourusername"
                value={socialSnapchat}
                onChange={(e) => setSocialSnapchat(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Twitter (X) Profile URL</label>
              <input
                type="url"
                placeholder="https://twitter.com/yourusername"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Contacts Adjustment System */}
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 transition-colors">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Floating Contact Buttons Customizer</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure floating contact buttons at the bottom corners of your storefront.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={floatingContactsEnabled}
              onChange={(e) => setFloatingContactsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]" />
          </label>
        </div>

        {floatingContactsEnabled && (
          <div className="space-y-6 animate-fade-in">
            {/* Toggles for Individual Platforms */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#e94560] block uppercase tracking-wider font-semibold">Active Platforms</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {/* WhatsApp */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/30 cursor-pointer">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">WhatsApp</span>
                  <input
                    type="checkbox"
                    checked={floatingWhatsappEnabled}
                    onChange={(e) => setFloatingWhatsappEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                </label>
                {/* Instagram */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/30 cursor-pointer">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Instagram</span>
                  <input
                    type="checkbox"
                    checked={floatingInstagramEnabled}
                    onChange={(e) => setFloatingInstagramEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                </label>
                {/* TikTok */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/30 cursor-pointer">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">TikTok</span>
                  <input
                    type="checkbox"
                    checked={floatingTiktokEnabled}
                    onChange={(e) => setFloatingTiktokEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                </label>
                {/* Snapchat */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/30 cursor-pointer">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Snapchat</span>
                  <input
                    type="checkbox"
                    checked={floatingSnapchatEnabled}
                    onChange={(e) => setFloatingSnapchatEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                </label>
                {/* Twitter */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/30 cursor-pointer">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Twitter (X)</span>
                  <input
                    type="checkbox"
                    checked={floatingTwitterEnabled}
                    onChange={(e) => setFloatingTwitterEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                </label>
              </div>
            </div>

            {/* Layout Alignment & Scale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 dark:border-gray-800/80 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Position Placement</label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFloatingContactsPosition('left')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                      floatingContactsPosition === 'left'
                        ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white dark:border-[#e94560] dark:bg-[#e94560]'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    Left Corner
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloatingContactsPosition('right')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                      floatingContactsPosition === 'right'
                        ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white dark:border-[#e94560] dark:bg-[#e94560]'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    Right Corner
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Icon Scale (Size)</label>
                  <span className="text-xs font-extrabold text-[#e94560]">{Math.round(floatingContactsScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={floatingContactsScale}
                  onChange={(e) => setFloatingContactsScale(parseFloat(e.target.value))}
                  className="mt-3.5 w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-1">
                  <span>Small (50%)</span>
                  <span>Standard (100%)</span>
                  <span>Large (200%)</span>
                </div>
              </div>
            </div>

            {/* Offset Adjustments */}
            <div className="border-t border-gray-100 dark:border-gray-800/80 pt-4 space-y-4">
              <span className="text-xs font-bold text-[#e94560] block uppercase tracking-wider font-semibold">Position Offset Coordinates</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Vertical Offset Mobile */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Vertical Offset - Mobile</label>
                    <span className="text-xs font-bold text-gray-950 dark:text-white">{floatingContactsBottomMobile}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="4"
                    value={floatingContactsBottomMobile}
                    onChange={(e) => setFloatingContactsBottomMobile(parseInt(e.target.value))}
                    className="mt-2.5 w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-semibold">Distance from bottom of mobile screen (prevents overlapping bottom bar).</p>
                </div>

                {/* Vertical Offset Desktop */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Vertical Offset - Desktop</label>
                    <span className="text-xs font-bold text-gray-950 dark:text-white">{floatingContactsBottomDesktop}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="4"
                    value={floatingContactsBottomDesktop}
                    onChange={(e) => setFloatingContactsBottomDesktop(parseInt(e.target.value))}
                    className="mt-2.5 w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
                  />
                </div>

                {/* Side Offset Mobile */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Side Side-Offset - Mobile</label>
                    <span className="text-xs font-bold text-gray-955 dark:text-white">{floatingContactsSideMobile}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="2"
                    value={floatingContactsSideMobile}
                    onChange={(e) => setFloatingContactsSideMobile(parseInt(e.target.value))}
                    className="mt-2.5 w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-505 mt-1 font-semibold">Distance from left/right screen edges on mobile.</p>
                </div>

                {/* Side Offset Desktop */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Side Side-Offset - Desktop</label>
                    <span className="text-xs font-bold text-gray-955 dark:text-white">{floatingContactsSideDesktop}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="2"
                    value={floatingContactsSideDesktop}
                    onChange={(e) => setFloatingContactsSideDesktop(parseInt(e.target.value))}
                    className="mt-2.5 w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Config Fields */}
            {floatingWhatsappEnabled && (
              <div className="border-t border-gray-100 dark:border-gray-800/80 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">WhatsApp Floating Button Contact Number</label>
                  <input
                    type="text"
                    value={floatingWhatsappNumber}
                    onChange={(e) => setFloatingWhatsappNumber(e.target.value)}
                    placeholder="e.g. 923001234567 (leave blank to use main store number)"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">If blank, falls back to the main WhatsApp contact number configured in settings.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">WhatsApp Floating Greeting Preset Message</label>
                  <input
                    type="text"
                    value={floatingWhatsappPreset}
                    onChange={(e) => setFloatingWhatsappPreset(e.target.value)}
                    placeholder="Hello! I am visiting your store and have a question."
                    className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">Pre-filled text message loaded when a customer starts a WhatsApp chat from the floating button.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
