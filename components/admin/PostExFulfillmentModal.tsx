'use client';

import React, { useState } from 'react';
import { StoreSettings, StatusLogItem } from '@/lib/types';
import { Loader2, Check, X, Send, Package, MapPin, User as UserIcon, DollarSign, ExternalLink, ShoppingBag } from '@/components/common/Icons';
import { formatPrice } from '@/lib/utils/whatsapp';

interface FulfillSuccess {
  trackingNumber: string;
  trackingUrl: string;
  courierName: string;
  waLink: string;
  dispatchLog: StatusLogItem;
  waLog: StatusLogItem;
}

interface PostExFulfillmentModalProps {
  order: any;
  settings: StoreSettings;
  onClose: () => void;
  onSuccess: (data: FulfillSuccess) => void;
}

export default function PostExFulfillmentModal({ order, settings, onClose, onSuccess }: PostExFulfillmentModalProps) {
  const [weight, setWeight] = useState('0.5');
  const [packetCount, setPacketCount] = useState('1');
  const [remarks, setRemarks] = useState(
    settings.postex_default_remarks || 'Call before delivery, customer is a serious buyer'
  );
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    trackingNumber?: string;
    trackingUrl?: string;
    waLink?: string;
    error?: string;
  } | null>(null);

  const customerName = order.customer_name || order.customers?.name || '—';
  const customerPhone = order.customer_phone || order.customers?.phone || '—';
  const shippingAddress = order.shipping_address || '—';
  const shippingCity = order.shipping_city || '—';
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const itemName = orderItems[0]?.name || 'Kids Clothes';
  const itemQuantity = orderItems.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
  const totalCOD = order.total
    ? formatPrice(parseFloat(order.total), settings.currencySymbol)
    : `Rs. 0`;

  const currencySymbol = settings.currencySymbol || 'Rs.';

  const handleFulfill = async () => {
    setDispatching(true);
    setResult(null);
    try {
      const res = await fetch('/api/courier/postex/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          weight,
          packetCount,
          remarks,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const tn = data.trackingNumber || '';
        const tu = data.trackingUrl || '';

        const dispatchLog: StatusLogItem = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'status_change',
          message: `Order has been booked at PostEx with Tracking # ${tn}`,
          status: 'shipped',
          createdAt: new Date().toISOString(),
        };

        const waLog: StatusLogItem = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'whatsapp_notification',
          message: data.waLink
            ? `WhatsApp tracking alert ready for ${customerPhone}`
            : 'WhatsApp notification skipped (no template configured)',
          notes: data.waLink || '',
          status: 'shipped',
          createdAt: new Date().toISOString(),
        };

        setResult({ success: true, trackingNumber: tn, trackingUrl: tu, waLink: data.waLink || '' });

        // Open printable label in new tab if setting enabled
        if (settings.postex_auto_download_label && tn) {
          window.open(`/api/courier/postex/labels?cns=${tn}`, '_blank', 'noopener,noreferrer');
        }

        setTimeout(() => {
          onSuccess({
            trackingNumber: tn,
            trackingUrl: tu,
            courierName: 'PostEx',
            waLink: data.waLink || '',
            dispatchLog,
            waLog,
          });
        }, 1200);
      } else {
        setResult({ success: false, error: data.error || 'Fulfillment failed' });
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Fulfillment failed' });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#16162a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Fulfill Order via PostEx Logistics Engine
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {order.orderNumber || order.id?.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={dispatching}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Customer & Shipping Manifest */}
          <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer & Shipping Manifest Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Customer Name</label>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-[#0f0f1b] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <UserIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{customerName}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Contact Phone</label>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-[#0f0f1b] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>{customerPhone}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Delivery City</label>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-[#0f0f1b] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{shippingCity}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Shipping Address</label>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-[#0f0f1b] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 truncate">
                  {shippingAddress}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total COD Cash</label>
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#0f0f1b] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{totalCOD}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Product Info</label>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-[#0f0f1b] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <ShoppingBag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{itemName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Parcel Details */}
          <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Editable Parcel Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Parcel Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.5"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total Quantity</label>
                <input
                  type="number"
                  value={packetCount}
                  onChange={(e) => setPacketCount(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Ship Note / Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Call before delivery"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>

          {/* Action Button */}
          {!result?.success && (
            <button
              type="button"
              onClick={handleFulfill}
              disabled={dispatching}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {dispatching ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Dispatching to PostEx...</>
              ) : (
                <><Send className="h-4 w-4" /> CONFIRM & SEND PARCEL TO POSTEX API</>
              )}
            </button>
          )}

          {/* Error */}
          {result && !result.success && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">{result.error}</p>
            </div>
          )}

          {/* Success Response */}
          {result && result.success && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800">
                <Check className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800 dark:text-green-200">Parcel dispatched successfully!</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">Tracking details generated below.</p>
                </div>
              </div>

              {/* PostEx Response Cards */}
              <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">PostEx Automated Data Response</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Generated Tracking CN</label>
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0f0f1b] px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Package className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{result.trackingNumber}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Carrier Tracking URL</label>
                    <a
                      href={result.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0f0f1b] px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-colors truncate"
                    >
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{result.trackingUrl}</span>
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Status Update: SHIPPED</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
