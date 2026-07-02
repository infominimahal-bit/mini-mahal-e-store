'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ChevronRight, 
  Loader2, 
  Zap, 
  Play, 
  X, 
  CheckCircle2, 
  FolderOpen, 
  Package, 
  Images 
} from '@/components/common/Icons';

interface Stats {
  products: { total: number; optimized: number };
  categories: { total: number; optimized: number };
  media: { total: number; optimized: number };
}

export default function BulkConsoleClient() {
  const [loading, setLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [stats, setStats] = useState<Stats>({
    products: { total: 0, optimized: 0 },
    categories: { total: 0, optimized: 0 },
    media: { total: 0, optimized: 0 }
  });

  const [running, setRunning] = useState(false);
  const [currentType, setCurrentType] = useState<'products' | 'categories' | 'media' | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitData();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchInitData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Check global AI enable setting
      const { data: aiData } = await supabase
        .from('ai_settings')
        .select('ai_enabled')
        .eq('id', '00000000-0000-4000-8000-000000000002')
        .single();
      
      const enabled = aiData?.ai_enabled ?? false;
      setAiEnabled(enabled);

      if (enabled) {
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to load initial bulk console data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const supabase = createClient();

      // 1. Products stats
      const { count: prodTotal } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });
      
      const { count: prodOptimized } = await supabase
        .from('seo_meta')
        .select('entity_id', { count: 'exact', head: true })
        .eq('entity_type', 'product')
        .eq('is_optimized', true);

      // 2. Categories stats
      const { count: catTotal } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true });
      
      const { count: catOptimized } = await supabase
        .from('seo_meta')
        .select('entity_id', { count: 'exact', head: true })
        .eq('entity_type', 'category')
        .eq('is_optimized', true);

      // 3. Media library stats
      const { count: mediaTotal } = await supabase
        .from('media_library')
        .select('id', { count: 'exact', head: true });
      
      const { count: mediaOptimized } = await supabase
        .from('media_library')
        .select('id', { count: 'exact', head: true })
        .eq('ai_generated', true);

      setStats({
        products: { total: prodTotal || 0, optimized: prodOptimized || 0 },
        categories: { total: catTotal || 0, optimized: catOptimized || 0 },
        media: { total: mediaTotal || 0, optimized: mediaOptimized || 0 }
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const handleStartBulk = async (type: 'products' | 'categories' | 'media') => {
    if (running) return;

    setRunning(true);
    setCurrentType(type);
    setLogs([]);
    addLog(`Starting bulk run for ${type.toUpperCase()}...`);

    const supabase = createClient();
    let pendingItems: any[] = [];

    try {
      if (type === 'products') {
        const { data: prods, error: prodErr } = await supabase
          .from('products')
          .select('id, name');
        if (prodErr) throw prodErr;

        const { data: metas, error: metaErr } = await supabase
          .from('seo_meta')
          .select('entity_id')
          .eq('entity_type', 'product')
          .eq('is_optimized', true);
        if (metaErr) throw metaErr;

        const optimizedIds = new Set(metas?.map(m => m.entity_id) || []);
        pendingItems = (prods || []).filter(p => !optimizedIds.has(p.id));
      } else if (type === 'categories') {
        const { data: cats, error: catErr } = await supabase
          .from('categories')
          .select('id, name');
        if (catErr) throw catErr;

        const { data: metas, error: metaErr } = await supabase
          .from('seo_meta')
          .select('entity_id')
          .eq('entity_type', 'category')
          .eq('is_optimized', true);
        if (metaErr) throw metaErr;

        const optimizedIds = new Set(metas?.map(m => m.entity_id) || []);
        pendingItems = (cats || []).filter(c => !optimizedIds.has(c.id));
      } else if (type === 'media') {
        const { data, error } = await supabase
          .from('media_library')
          .select('id, file_url, original_filename')
          .or('ai_generated.eq.false,ai_generated.is.null');
        if (error) throw error;

        pendingItems = data || [];
      }

      if (pendingItems.length === 0) {
        addLog(`No pending ${type} found. Database is 100% optimized for this group!`);
        setRunning(false);
        await fetchStats();
        return;
      }

      addLog(`Loaded ${pendingItems.length} items to optimize.`);
      setProgress({ current: 0, total: pendingItems.length });

      let isAborted = false;
      stopRef.current = () => {
        isAborted = true;
      };

      for (let i = 0; i < pendingItems.length; i++) {
        if (isAborted) {
          addLog('Bulk optimization aborted by user.');
          break;
        }

        const item = pendingItems[i];
        const label = item.name || item.original_filename || item.file_name || 'Unnamed Item';
        addLog(`[${i + 1}/${pendingItems.length}] Optimizing: "${label}"...`);
        setProgress((prev) => ({ ...prev, current: i + 1 }));

        try {
          let res;
          if (type === 'media') {
            res = await fetch('/api/media/ai-meta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_url: item.file_url, media_id: item.id })
            });
          } else {
            res = await fetch('/api/seo/optimize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entity_type: type === 'products' ? 'product' : 'category', entity_id: item.id })
            });
          }

          const data = await res.json();
          if (res.ok && !data.error) {
            if (data.skipped) {
              addLog(`⚠️ Skipped "${label}": ${data.message || 'API keys not configured.'}`);
            } else {
              addLog(`✅ Successfully optimized "${label}"!`);
            }
          } else {
            addLog(`❌ Failed for "${label}": ${data.error || 'Server returned error.'}`);
          }
        } catch (err: any) {
          addLog(`❌ Connection Error for "${label}": ${err.message || err}`);
        }

        // Delay to prevent rate limits
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      addLog('Bulk run complete.');
    } catch (err: any) {
      addLog(`❌ Bulk process crashed: ${err.message || err}`);
    } finally {
      setRunning(false);
      setCurrentType(null);
      await fetchStats();
    }
  };

  const handleStop = () => {
    if (stopRef.current) {
      addLog('Graceful stop requested. Finishing current item...');
      stopRef.current();
    }
  };

  const getPercent = (optimized: number, total: number) => {
    if (total === 0) return 100;
    return Math.round((optimized / total) * 100);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 max-w-xl mx-auto mt-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
        <span>Initializing Bulk Console...</span>
      </div>
    );
  }

  if (!aiEnabled) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link href="/admin/seo" className="hover:text-blue-600">SEO Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 dark:text-white">Bulk Console</span>
        </div>

        <div className="bg-white dark:bg-[#16162a] p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
          <Zap className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">AI Copilot is Globally Disabled</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            To run bulk SEO copywriting or media vision tag generation, you must first enable the AI features globally in the settings panel.
          </p>
          <Link 
            href="/admin/settings?tab=ai_settings" 
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm text-sm"
          >
            Configure AI Settings
          </Link>
        </div>
      </div>
    );
  }

  // Calculate percentages
  const prodPercent = getPercent(stats.products.optimized, stats.products.total);
  const catPercent = getPercent(stats.categories.optimized, stats.categories.total);
  const mediaPercent = getPercent(stats.media.optimized, stats.media.total);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Link href="/admin/seo" className="hover:text-blue-600">SEO Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-950 dark:text-white">Bulk AI Console</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Bulk AI SEO Console</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Run visual bulk processes to generate copywriting content and image metadata tags.</p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Products Card */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Products SEO
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full">
              {prodPercent}% Done
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {stats.products.optimized} <span className="text-sm text-gray-400 font-semibold">/ {stats.products.total}</span>
            </div>
            <div className="text-xs text-gray-500">
              {stats.products.total - stats.products.optimized} pending items remaining
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${prodPercent}%` }} />
          </div>
          <button
            onClick={() => handleStartBulk('products')}
            disabled={running || stats.products.total - stats.products.optimized === 0}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-100 dark:disabled:bg-gray-850 disabled:text-gray-400 rounded-xl text-xs font-bold transition-all"
          >
            Optimize Products
          </button>
        </div>

        {/* Categories Card */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-emerald-500" />
              Categories SEO
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
              {catPercent}% Done
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {stats.categories.optimized} <span className="text-sm text-gray-400 font-semibold">/ {stats.categories.total}</span>
            </div>
            <div className="text-xs text-gray-500">
              {stats.categories.total - stats.categories.optimized} pending items remaining
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${catPercent}%` }} />
          </div>
          <button
            onClick={() => handleStartBulk('categories')}
            disabled={running || stats.categories.total - stats.categories.optimized === 0}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 dark:disabled:bg-gray-850 disabled:text-gray-400 rounded-xl text-xs font-bold transition-all"
          >
            Optimize Categories
          </button>
        </div>

        {/* Media Vision Card */}
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Images className="w-5 h-5 text-purple-500" />
              Vision Tagging
            </span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded-full">
              {mediaPercent}% Done
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {stats.media.optimized} <span className="text-sm text-gray-400 font-semibold">/ {stats.media.total}</span>
            </div>
            <div className="text-xs text-gray-500">
              {stats.media.total - stats.media.optimized} pending items remaining
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${mediaPercent}%` }} />
          </div>
          <button
            onClick={() => handleStartBulk('media')}
            disabled={running || stats.media.total - stats.media.optimized === 0}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-100 dark:disabled:bg-gray-850 disabled:text-gray-400 rounded-xl text-xs font-bold transition-all"
          >
            Run Media Analysis
          </button>
        </div>
      </div>

      {/* Runner progress bar */}
      {running && (
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-gray-900 dark:text-white flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              Running bulk job for {currentType?.toUpperCase()}...
            </span>
            <span className="text-gray-500">
              {progress.current} of {progress.total} items ({Math.round((progress.current / progress.total) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }} 
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              Stop Running Job
            </button>
          </div>
        </div>
      )}

      {/* Terminal logs box */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-850 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Live Logs Output</span>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="text-xs font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              Clear Logs
            </button>
          )}
        </div>
        <div 
          ref={logContainerRef}
          className="p-6 bg-gray-950 text-emerald-400 font-mono text-xs overflow-y-auto max-h-[300px] h-[300px] space-y-1 overscroll-contain select-text"
        >
          {logs.length === 0 ? (
            <div className="text-gray-600 italic">No logs available. Select one of the bulk actions above to start processing.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="leading-relaxed whitespace-pre-wrap">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
