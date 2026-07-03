'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { StoreSettings } from '@/lib/types';
import { Loader2, Check, X, Package, ChevronLeft, Upload, AlertTriangle, Search, ChevronDown, Eye, Save } from '@/components/common/Icons';
import { usePostExCityFetcher } from '@/hooks/usePostExCityFetcher';

interface ManifestOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  notes: string;
  total: number;
  items: any[];
}

interface EditableRow {
  selected: boolean;
  name: string;
  phone: string;
  address: string;
  city: string;
  cod: string;
  kg: string;
  shipmentType: string;
  fragile: string;
  pieces: string;
  remarks: string;
  invoiceDivision: string;
  paymentMethod: string;
  productDetail: string;
}

interface Props {
  orders: ManifestOrder[];
  settings: StoreSettings;
  onGoBack: () => void;
}

function CitySelect({
  value,
  cities,
  loading,
  disabled,
  onChange,
}: {
  value: string;
  cities: string[];
  loading: boolean;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popHeight = 260;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < popHeight && spaceAbove > spaceBelow) {
      // Open upward
      setPopoverStyle({
        position: 'fixed',
        left: rect.left + 'px',
        top: Math.max(8, rect.top - popHeight) + 'px',
        width: Math.max(rect.width, 200) + 'px',
      });
    } else {
      // Open downward
      setPopoverStyle({
        position: 'fixed',
        left: rect.left + 'px',
        top: rect.bottom + 4 + 'px',
        width: Math.max(rect.width, 200) + 'px',
      });
    }
  }, [open]);

  const filtered = cities.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => { if (!disabled) setOpen(!open); }}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer truncate"
      >
        <span className="truncate">{value || (loading ? 'Loading...' : 'Select city')}</span>
        <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
      </button>

      {open && mounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={popoverStyle}
          className="z-[99999] bg-white dark:bg-[#1a1a30] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-gray-100 dark:border-gray-800">
            <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city..."
              className="w-full text-xs font-semibold bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No cities match</div>
            ) : (
              filtered.map(city => (
                <button
                  key={city}
                  type="button"
                  onClick={() => { onChange(city); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors ${
                    city === value ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {city}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function PostExRowDetailsModal({
  order,
  row,
  settings,
  onClose,
  onSave,
}: {
  order: ManifestOrder;
  row: EditableRow;
  settings: StoreSettings;
  onClose: () => void;
  onSave: (updates: Partial<EditableRow>) => void;
}) {
  const [form, setForm] = useState({
    shipmentType: row.shipmentType,
    fragile: row.fragile,
    pieces: row.pieces,
    remarks: row.remarks,
    invoiceDivision: row.invoiceDivision,
    paymentMethod: row.paymentMethod,
    productDetail: row.productDetail,
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60  p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#16162a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Order {order.orderNumber} Details
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Advanced shipping specifications</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Shipment Type</label>
            <select
              value={form.shipmentType}
              onChange={(e) => setForm(f => ({ ...f, shipmentType: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="Normal">Normal</option>
              <option value="Reversed">Reversed</option>
              <option value="Replacement">Replacement</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Fragile</label>
            <select
              value={form.fragile}
              onChange={(e) => setForm(f => ({ ...f, fragile: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Invoice Division</label>
              <input
                type="number"
                value={form.invoiceDivision}
                onChange={(e) => setForm(f => ({ ...f, invoiceDivision: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pieces</label>
              <input
                type="number"
                value={form.pieces}
                onChange={(e) => setForm(f => ({ ...f, pieces: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
              rows={2}
              placeholder="if the number is unavailable please reach on whatsapp"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Products</label>
            <input
              type="text"
              value={form.productDetail}
              onChange={(e) => setForm(f => ({ ...f, productDetail: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Payment Method</label>
            <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-3.5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
              {form.paymentMethod}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => onSave(form)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            Save Details Change State
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PostExBookingManifestTable({ orders, settings, onGoBack }: Props) {
  const router = useRouter();
  const { cities, loading: citiesLoading } = usePostExCityFetcher(settings);
  const [rows, setRows] = useState<Record<string, EditableRow>>({});
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Record<string, { success: boolean; tracking?: string; error?: string }>>({});
  const [selectAll, setSelectAll] = useState(true);
  const [detailRowId, setDetailRowId] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, EditableRow> = {};
    orders.forEach(o => {
      const cleanCity = (o.shippingCity || '').split(',')[0].trim();
      const guessedCity = cleanCity
        || cities.find(c => o.shippingAddress?.toUpperCase().includes(c))
        || '';

      // Payment method from order notes
      let paymentMethod = 'Cash on delivery';
      const noteLines = (o.notes || '').split('\n');
      noteLines.forEach(line => {
        const lower = line.toLowerCase().trim();
        if (lower.startsWith('payment method:')) {
          const pm = line.substring('payment method:'.length).trim();
          if (pm) paymentMethod = pm;
        }
      });

      // Pieces: auto from items if setting enabled, else default
      const autoPieces = settings.postex_pieces_check === '1';
      const piecesCount = autoPieces
        ? (o.items?.length || 1).toString()
        : (settings.postex_default_items || '1');

      initial[o.id] = {
        selected: true,
        name: o.customerName || '',
        phone: o.customerPhone || '',
        address: o.shippingAddress || '',
        city: guessedCity,
        cod: o.total?.toString() || '0',
        kg: settings.postex_default_weight || '0.5',
        shipmentType: 'Normal',
        fragile: 'No',
        pieces: piecesCount,
        remarks: settings.postex_default_remarks || '',
        invoiceDivision: '1',
        paymentMethod,
        productDetail: settings.postex_default_product || '',
      };
    });
    setRows(initial);
    setSelectAll(true);
  }, [orders, cities, settings]);

  const updateRow = useCallback((id: string, field: keyof EditableRow, value: any) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }, []);

  const toggleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setRows(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { next[id] = { ...next[id], selected: newVal }; });
      return next;
    });
  };

  const completedCount = Object.values(results).filter(r => r.success).length;
  const failedCount = Object.values(results).filter(r => !r.success).length;
  const allDone = Object.keys(rows).length > 0 && Object.keys(results).length === Object.keys(rows).length;

  const handleUpload = async () => {
    const selected = Object.entries(rows).filter(([, r]) => r.selected);
    if (selected.length === 0) return;

    setUploading(true);
    const cns: string[] = [];
    for (const [id, row] of selected) {
      try {
        const res = await fetch('/api/courier/postex/fulfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: id,
            customerName: row.name,
            customerPhone: row.phone,
            deliveryAddress: row.address,
            cityName: row.city,
            total: row.cod,
            weight: row.kg,
            packetCount: row.pieces,
            remarks: row.remarks,
            orderType: row.shipmentType,
            productDetail: row.productDetail,
          }),
        });
        const data = await res.json();
        if (data.success && data.trackingNumber) cns.push(data.trackingNumber);
        setResults(prev => ({
          ...prev,
          [id]: { success: data.success, tracking: data.trackingNumber, error: data.error },
        }));
      } catch (err: any) {
        setResults(prev => ({
          ...prev,
          [id]: { success: false, error: err.message },
        }));
      }
    }
    setUploading(false);

    // Download real PDF labels from PostEx if setting enabled and at least one succeeded
    if (settings.postex_auto_download_label && cns.length > 0) {
      window.open(`/api/courier/postex/labels?cns=${cns.join(',')}`, '_blank');
    }
  };

  const activeDetail = detailRowId ? rows[detailRowId] : null;
  const detailOrder = detailRowId ? orders.find(o => o.id === detailRowId) : null;

  const handleDetailSave = (id: string, updates: Partial<EditableRow>) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
    setDetailRowId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f1e]">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-[#16162a] border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">PostEx</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">Create Booking with PostEx</p>
            </div>
          </div>
          <button
            onClick={onGoBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Go Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Summary bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {Object.keys(rows).length} order{Object.keys(rows).length !== 1 ? 's' : ''} loaded
            </span>
            {completedCount > 0 && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                {completedCount} booked
              </span>
            )}
            {failedCount > 0 && (
              <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50">
                {failedCount} failed
              </span>
            )}
          </div>
          {citiesLoading && (
            <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading cities...
            </span>
          )}
        </div>

        {/* === DESKTOP TABLE === */}
        <div className="hidden md:block bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-12">#</th>
                  <th className="py-3 px-3">Order</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Address</th>
                  <th className="py-3 px-3">City</th>
                  <th className="py-3 px-3 w-24">COD</th>
                  <th className="py-3 px-3 w-20">KG</th>
                  <th className="py-3 px-3 w-20">Specs</th>
                  <th className="py-3 px-3 w-14">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {orders.map((order, idx) => {
                  const row = rows[order.id];
                  if (!row) return null;
                  const res = results[order.id];
                  return (
                    <tr key={order.id} className={`hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors ${res?.success ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''} ${res && !res.success ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => updateRow(order.id, 'selected', e.target.checked)}
                          disabled={!!res}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3 text-xs font-bold text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{order.orderNumber}</span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          value={row.name}
                          onChange={(e) => updateRow(order.id, 'name', e.target.value)}
                          disabled={!!res}
                          className="w-full min-w-[100px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          value={row.phone}
                          onChange={(e) => updateRow(order.id, 'phone', e.target.value)}
                          disabled={!!res}
                          className="w-full min-w-[110px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          value={row.address}
                          onChange={(e) => updateRow(order.id, 'address', e.target.value)}
                          disabled={!!res}
                          className="w-full min-w-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[120px]">
                        <CitySelect
                          value={row.city}
                          cities={cities}
                          loading={citiesLoading}
                          disabled={!!res}
                          onChange={(v) => updateRow(order.id, 'city', v)}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          value={row.cod}
                          onChange={(e) => updateRow(order.id, 'cod', e.target.value)}
                          disabled={!!res}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          value={row.kg}
                          onChange={(e) => updateRow(order.id, 'kg', e.target.value)}
                          disabled={!!res}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 px-3">
                        {res ? (
                          res.success ? <Check className="h-4 w-4 text-emerald-500" /> : <span title={res.error}><AlertTriangle className="h-4 w-4 text-red-500" /></span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {row.pieces}pcs
                            </span>
                            {row.shipmentType !== 'Normal' && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                {row.shipmentType}
                              </span>
                            )}
                            {row.fragile === 'Yes' && (
                              <span className="text-[9px]" title="Fragile">📦</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {res?.success ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : res && !res.success ? (
                          <span title={res.error}><AlertTriangle className="h-4 w-4 text-red-500" /></span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDetailRowId(order.id)}
                            className="relative p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                            {(row.shipmentType !== 'Normal' || row.fragile === 'Yes' || row.remarks || row.pieces !== '1') && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#16162a]" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* === MOBILE CARDS === */}
        <div className="md:hidden space-y-3">
          {orders.map((order, idx) => {
            const row = rows[order.id];
            if (!row) return null;
            const res = results[order.id];
            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-[#16162a] rounded-2xl border p-4 shadow-sm space-y-3 transition-colors ${
                  res?.success ? 'border-emerald-200 dark:border-emerald-900/50' :
                  res && !res.success ? 'border-red-200 dark:border-red-900/50' :
                  'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) => updateRow(order.id, 'selected', e.target.checked)}
                      disabled={!!res}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">#{order.orderNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!res && (
                      <button
                        type="button"
                        onClick={() => setDetailRowId(order.id)}
                        className="relative p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        {(row.shipmentType !== 'Normal' || row.fragile === 'Yes' || row.remarks || row.pieces !== '1') && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#16162a]" />
                        )}
                      </button>
                    )}
                    {res?.success && <Check className="h-5 w-5 text-emerald-500" />}
                    {res && !res.success && <span title={res.error}><AlertTriangle className="h-5 w-5 text-red-500" /></span>}
                  </div>
                </div>
                {/* Error message */}
                {res && !res.success && (
                  <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{res.error}</span>
                  </div>
                )}
                {/* Specs bar for mobile */}
                {!res && (row.shipmentType !== 'Normal' || row.fragile === 'Yes' || row.remarks || row.pieces !== '1') && (
                  <div className="flex flex-wrap items-center gap-1.5 -mt-1">
                    <span className="text-[10px] font-bold text-gray-400">{row.pieces}pcs</span>
                    {row.shipmentType !== 'Normal' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                        {row.shipmentType}
                      </span>
                    )}
                    {row.fragile === 'Yes' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold">
                        Fragile
                      </span>
                    )}
                    {row.remarks && (
                      <span className="text-[9px] text-gray-400 truncate max-w-[120px]">"{row.remarks}"</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Name</label>
                    <input value={row.name} onChange={(e) => updateRow(order.id, 'name', e.target.value)} disabled={!!res}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Phone</label>
                    <input value={row.phone} onChange={(e) => updateRow(order.id, 'phone', e.target.value)} disabled={!!res}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">City</label>
                    <CitySelect
                      value={row.city}
                      cities={cities}
                      loading={citiesLoading}
                      disabled={!!res}
                      onChange={(v) => updateRow(order.id, 'city', v)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Address</label>
                    <input value={row.address} onChange={(e) => updateRow(order.id, 'address', e.target.value)} disabled={!!res}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white disabled:opacity-50" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">COD (Rs)</label>
                      <input value={row.cod} onChange={(e) => updateRow(order.id, 'cod', e.target.value)} disabled={!!res}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500 disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">KG</label>
                      <input value={row.kg} onChange={(e) => updateRow(order.id, 'kg', e.target.value)} disabled={!!res}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white disabled:opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom actions bar */}
        <div className="sticky bottom-0 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!allDone ? (
              <button
                onClick={handleUpload}
                disabled={uploading || Object.values(rows).filter(r => r.selected).length === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading Bookings...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload Booking</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="h-5 w-5" />
                All bookings uploaded
              </div>
            )}
            <button
              onClick={onGoBack}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Go Back
            </button>
          </div>

          {Object.keys(results).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {orders.map(o => {
                const res = results[o.id];
                if (!res) return null;
                return (
                  <span key={o.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    res.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                  }`} title={res.success ? '' : res.error}>
                    {res.success ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                    {o.orderNumber}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Row Modal */}
      {detailRowId && activeDetail && detailOrder && (
        <PostExRowDetailsModal
          order={detailOrder}
          row={activeDetail}
          settings={settings}
          onClose={() => setDetailRowId(null)}
          onSave={(updates) => handleDetailSave(detailRowId, updates)}
        />
      )}
    </div>
  );
}
