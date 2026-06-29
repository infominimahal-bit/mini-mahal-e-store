'use client';

import React, { useRef, useState } from 'react';
import { StoreSettings, ThemeConfig } from '@/lib/types';
import { THEME_PRESETS, GOOGLE_FONTS } from '@/lib/themePresets';
import { 
  SlidersHorizontal, RefreshCw, Download, Upload, Check, ChevronRight
} from '@/components/common/Icons';
import { toast } from 'sonner';

interface AppearancePresetsListProps {
  settings: StoreSettings;
  onSelectPreset: (presetId: string, presetConfig: ThemeConfig) => void;
}

export function AppearancePresetsList({ settings, onSelectPreset }: AppearancePresetsListProps) {
  const currentPresetId = settings.theme_preset || 'classic_white';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
          Theme Presets
        </label>
        <span className="text-[10px] text-gray-400 font-semibold block">
          Select a starting preset theme below. You can customize colors, fonts, and borders further on the right side.
        </span>
      </div>

      <div className="space-y-3">
        {THEME_PRESETS.map((preset) => {
          const isActive = currentPresetId === preset.id;
          const { colors, fonts } = preset.config;
          
          return (
            <div
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset.id, preset.config);
                toast.info(`Theme Preset "${preset.name}" applied in preview.`);
              }}
              className={`group relative p-3.5 border rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/10 shadow-sm scale-102 ring-1 ring-[#e94560]/20'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] hover:border-gray-350 dark:hover:border-gray-700 hover:scale-101 hover:shadow-xs'
              }`}
            >
              {/* Checkmark badge */}
              {isActive && (
                <div className="absolute top-3.5 right-3.5 w-4.5 h-4.5 rounded-full bg-[#e94560] flex items-center justify-center text-white scale-110 shadow-sm">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <h4 className="text-xs font-black text-gray-900 dark:text-white group-hover:text-[#e94560] transition-colors flex items-center gap-1.5">
                    {preset.name}
                  </h4>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                    {preset.feel}
                  </p>
                </div>

                {/* Colors visual bar */}
                <div className="h-5 flex rounded-lg overflow-hidden border border-gray-150 dark:border-gray-700/50 shadow-xs">
                  <div className="flex-1" style={{ backgroundColor: colors.background }} title={`BG: ${colors.background}`} />
                  <div className="flex-1" style={{ backgroundColor: colors.surface }} title={`Surface: ${colors.surface}`} />
                  <div className="flex-1" style={{ backgroundColor: colors.primary }} title={`Primary: ${colors.primary}`} />
                  <div className="flex-1" style={{ backgroundColor: colors.accent }} title={`Accent: ${colors.accent}`} />
                </div>

                {/* Typography display */}
                <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/3 px-2 py-1 rounded-md">
                  <span className="truncate max-w-[100px]" title={`Heading: ${fonts.heading}`}>
                    {fonts.heading}
                  </span>
                  <span className="text-gray-300 dark:text-gray-700 font-normal">|</span>
                  <span className="truncate max-w-[100px]" title={`Body: ${fonts.body}`}>
                    {fonts.body}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AppearanceCustomizePanelProps {
  settings: StoreSettings;
  onUpdateSettings: (updates: Partial<StoreSettings>) => void;
}

export function AppearanceCustomizePanel({ settings, onUpdateSettings }: AppearanceCustomizePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCustomizeTab, setActiveCustomizeTab] = useState<'colors' | 'fonts' | 'elements'>('colors');

  const activePresetId = settings.theme_preset || 'classic_white';
  const defaultPreset = THEME_PRESETS.find(p => p.id === activePresetId) || THEME_PRESETS[0];
  
  // Dynamic safe config loading
  const themeConfig: ThemeConfig = settings.theme_config || defaultPreset.config;
  const colors = themeConfig.colors || defaultPreset.config.colors;
  const fonts = themeConfig.fonts || defaultPreset.config.fonts;
  const typography = themeConfig.typography || defaultPreset.config.typography;
  const buttons = themeConfig.buttons || defaultPreset.config.buttons;
  const cards = themeConfig.cards || defaultPreset.config.cards;

  const updateConfigField = <T extends keyof ThemeConfig>(
    section: T,
    field: keyof ThemeConfig[T],
    value: any
  ) => {
    const updatedConfig = {
      ...themeConfig,
      [section]: {
        ...themeConfig[section],
        [field]: value
      }
    };
    onUpdateSettings({ theme_config: updatedConfig });
  };

  // Reset to default active preset values
  const handleResetPreset = () => {
    if (confirm(`Reset theme variables back to standard "${defaultPreset.name}" configuration?`)) {
      onUpdateSettings({ theme_config: defaultPreset.config });
      toast.success(`Reset back to default "${defaultPreset.name}" settings.`);
    }
  };

  // Export current config as JSON file
  const handleExportJSON = () => {
    try {
      const exportData = {
        theme_preset: activePresetId,
        theme_config: themeConfig
      };
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${settings.storeName || 'ourstore'}-theme-config.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Theme Configuration JSON exported successfully.');
    } catch (err) {
      toast.error('Failed to export theme JSON');
    }
  };

  // Import config from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.theme_preset && json.theme_config) {
          onUpdateSettings({
            theme_preset: json.theme_preset,
            theme_config: json.theme_config
          });
          toast.success('Theme Configuration JSON imported and applied successfully.');
        } else {
          toast.error('Invalid theme config schema. Missing preset or config fields.');
        }
      } catch (err) {
        toast.error('Failed to parse uploaded JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset uploader input
  };

  return (
    <div className="space-y-6 select-none pb-6">
      {/* Sub tabs selector */}
      <div className="flex bg-gray-50 dark:bg-white/4 p-0.5 rounded-xl border border-gray-100 dark:border-gray-800">
        {[
          { id: 'colors', label: 'Colors' },
          { id: 'fonts', label: 'Fonts & Sizes' },
          { id: 'elements', label: 'Borders & Buttons' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCustomizeTab(tab.id as any)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeCustomizeTab === tab.id
                ? 'bg-[#e94560] text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Colors Tab */}
      {activeCustomizeTab === 'colors' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Theme Color Tokens</h4>
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Customize theme colors. Colors are double bound to text inputs and previewers.</p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {[
              { key: 'primary', label: 'Primary (Brand Navy)', desc: 'Header/Footer text, core blocks text' },
              { key: 'secondary', label: 'Secondary (Hover/Dark)', desc: 'General buttons hovers, footer headings' },
              { key: 'accent', label: 'Accent Highlight', desc: 'Banners, sales counters, interactive highlights' },
              { key: 'background', label: 'Body Background', desc: 'Default background behind all layouts' },
              { key: 'surface', label: 'Card Surface', desc: 'Background for category and product cards' },
              { key: 'textPrimary', label: 'Text Primary', desc: 'Body text, titles, text descriptions' },
              { key: 'textSecondary', label: 'Text Secondary (Muted)', desc: 'Muted info, tags list, subtitles' },
              { key: 'textHeading', label: 'Heading Font Color', desc: 'Custom color for all h1-h6 and heading blocks' },
              { key: 'textAccent', label: 'Accent Text Color', desc: 'Custom color for highlighted text elements' },
              { key: 'price', label: 'Price Display Color', desc: 'Custom color for product pricing and price ranges' },
              { key: 'border', label: 'Borders/Dividers', desc: 'Layout segment borders and list dividers' }
            ].map(item => {
              let val = colors[item.key as keyof typeof colors] || '';
              if (!val) {
                if (item.key === 'textHeading') {
                  val = colors.textPrimary || colors.primary || '#000000';
                } else if (item.key === 'textAccent') {
                  val = colors.accent || '#e94560';
                } else if (item.key === 'price') {
                  val = colors.accent || '#e94560';
                } else {
                  val = '#000000';
                }
              }
              return (
                <div key={item.key} className="space-y-1 p-2.5 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-100 dark:border-gray-800/80">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 leading-none">{item.label}</label>
                    <input
                      type="color"
                      value={val}
                      onChange={e => updateConfigField('colors', item.key as any, e.target.value)}
                      className="w-5 h-5 rounded border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={val}
                    onChange={e => updateConfigField('colors', item.key as any, e.target.value)}
                    className="w-full mt-1.5 px-2 py-1 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-800 rounded-md text-[10px] uppercase font-bold text-center"
                  />
                  <span className="text-[8px] text-gray-400 dark:text-gray-500 font-semibold block leading-tight mt-1 truncate">{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fonts & Sizes Tab */}
      {activeCustomizeTab === 'fonts' && (
        <div className="space-y-5">
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Typography Settings</h4>
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Modify Google Fonts and text viewport scales. Fonts fall back elegantly during transitions.</p>
          </div>

          <div className="space-y-4">
            {/* Heading Font Select */}
            <div className="space-y-1 p-3 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 block">Heading Typography Font</label>
              <select
                value={fonts.heading || 'Playfair Display'}
                onChange={e => updateConfigField('fonts', 'heading', e.target.value)}
                className="w-full mt-1.5 px-2 py-1.5 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-white"
              >
                {GOOGLE_FONTS.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-semibold block mt-1">Applied to Page Titles, Category headers, Product names, h1-h4 blocks.</span>
            </div>

            {/* Body Font Select */}
            <div className="space-y-1 p-3 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 block">Body Copy Font</label>
              <select
                value={fonts.body || 'Inter'}
                onChange={e => updateConfigField('fonts', 'body', e.target.value)}
                className="w-full mt-1.5 px-2 py-1.5 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-white"
              >
                {GOOGLE_FONTS.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-semibold block mt-1">Applied to description paragraphs, tags, reviews copy, inputs text, buttons.</span>
            </div>

            {/* Base Font Size Slider */}
            <div className="space-y-1.5 p-3 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300">Base Font Size</label>
                <span className="text-[10px] font-black text-[#e94560]">{typography.fontSizeBase || 16}px</span>
              </div>
              <input
                type="range"
                min={13}
                max={18}
                step={1}
                value={typography.fontSizeBase || 16}
                onChange={e => updateConfigField('typography', 'fontSizeBase', parseInt(e.target.value))}
                className="w-full accent-[#e94560]"
              />
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-semibold block mt-1">Controls storefront base html size. Affects overall scale of the elements.</span>
            </div>
          </div>
        </div>
      )}

      {/* Borders & Buttons Tab */}
      {activeCustomizeTab === 'elements' && (
        <div className="space-y-5">
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Borders & Button Styling</h4>
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Customize corners, outline borders, and fill variables for interactive controls.</p>
          </div>

          <div className="space-y-4">
            {/* Button Radius Slider */}
            <div className="space-y-1.5 p-3 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300">Button Corner Radius</label>
                <span className="text-[10px] font-black text-[#e94560]">{buttons.borderRadius ?? 0}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={buttons.borderRadius ?? 0}
                onChange={e => updateConfigField('buttons', 'borderRadius', parseInt(e.target.value))}
                className="w-full accent-[#e94560]"
              />
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-semibold block mt-1">Roundness of buttons, dropdown selects, and input boxes (0px is sharp).</span>
            </div>

            {/* Card Radius Slider */}
            <div className="space-y-1.5 p-3 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300">Card Corner Radius</label>
                <span className="text-[10px] font-black text-[#e94560]">{cards.borderRadius ?? 0}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={cards.borderRadius ?? 0}
                onChange={e => updateConfigField('cards', 'borderRadius', parseInt(e.target.value))}
                className="w-full accent-[#e94560]"
              />
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-semibold block mt-1">Roundness of product catalog cards, reviews tiles, slider containers.</span>
            </div>

            {/* Button Color overrides */}
            <div className="p-3 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-100 dark:border-gray-800/80 space-y-3.5">
              <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 block">Primary Button overrides</label>

              <div className="grid grid-cols-3 gap-2">
                {/* primaryBg */}
                <div className="space-y-1 text-center">
                  <span className="text-[8px] text-gray-400 font-bold block uppercase">Background</span>
                  <div className="flex justify-center">
                    <input
                      type="color"
                      value={buttons.primaryBg || colors.primary}
                      onChange={e => updateConfigField('buttons', 'primaryBg', e.target.value)}
                      className="w-5 h-5 rounded border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                    />
                  </div>
                </div>

                {/* primaryText */}
                <div className="space-y-1 text-center">
                  <span className="text-[8px] text-gray-400 font-bold block uppercase">Text Color</span>
                  <div className="flex justify-center">
                    <input
                      type="color"
                      value={buttons.primaryText || '#ffffff'}
                      onChange={e => updateConfigField('buttons', 'primaryText', e.target.value)}
                      className="w-5 h-5 rounded border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                    />
                  </div>
                </div>

                {/* primaryHover */}
                <div className="space-y-1 text-center">
                  <span className="text-[8px] text-gray-400 font-bold block uppercase">Hover Bg</span>
                  <div className="flex justify-center">
                    <input
                      type="color"
                      value={buttons.primaryHover || colors.secondary}
                      onChange={e => updateConfigField('buttons', 'primaryHover', e.target.value)}
                      className="w-5 h-5 rounded border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset Action Controllers */}
      <div className="border-t border-gray-150 dark:border-gray-850 pt-5 space-y-3">
        <button
          onClick={handleResetPreset}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all active:scale-97 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset Preset Defaults
        </button>

        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 hover:border-gray-350 dark:hover:border-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all active:scale-97 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 hover:border-gray-350 dark:hover:border-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all active:scale-97 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Import JSON
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJSON}
          accept=".json"
          className="hidden"
        />
      </div>
    </div>
  );
}
