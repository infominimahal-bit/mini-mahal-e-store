'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getOrderById } from '@/lib/services/orders';
import { 
  ArrowLeft, 
  Package, 
  MapPin, 
  Clock, 
  ClipboardList, 
  User as UserIcon, 
  MoreVertical,
  Printer,
  ChevronDown,
  Trash2,
  ExternalLink,
  Edit,
  Save,
  Check,
  MoreHorizontal,
  X
} from '@/components/common/Icons';
import { Order, StoreSettings, StatusLogItem } from '@/lib/types';
import { formatPrice, cleanWhatsAppPhone } from '@/lib/utils/whatsapp';
import { updateOrderDetails, deleteOrder } from '@/lib/services/orders';
import { toast } from 'sonner';
import OrderEditor from './OrderEditor';
import { getAllProductsAdmin } from '@/lib/services/products';

interface OrderDetailCanvasProps {
  order: Order;
  settings: StoreSettings;
}

export default function OrderDetailCanvas({ order: initialOrder, settings }: OrderDetailCanvasProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isFulfillDropdownOpen, setIsFulfillDropdownOpen] = useState(false);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Adjacent order navigation
  const [prevOrderId, setPrevOrderId] = useState<string | null>(null);
  const [nextOrderId, setNextOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdjacent = async () => {
      const supabase = createClient();

      const [prevResult, nextResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id')
          .lt('created_at', order.createdAt)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('orders')
          .select('id')
          .gt('created_at', order.createdAt)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      setPrevOrderId(prevResult.data?.id ?? null);
      setNextOrderId(nextResult.data?.id ?? null);
    };

    fetchAdjacent();
  }, [order.id, order.createdAt]);

  const searchParams = useSearchParams();

  // Sync with server-rendered prop when searchParams change triggers server re-render
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // Client-side refetch when URL id param changes (catches cases where server doesn't re-render)
  const [clientId, setClientId] = useState(searchParams.get('id'));

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId && urlId !== clientId) {
      const prevClientId = clientId;
      setClientId(urlId);
      if (urlId !== initialOrder.id) {
        getOrderById(urlId).then((fresh) => {
          if (fresh) {
            setOrder(fresh);
            setPrevOrderId(null);
            setNextOrderId(null);
          }
        }).catch(console.error);
      }
    }
  }, [searchParams, clientId, initialOrder.id]);

  const paymentMethod = (() => {
    const notesText = order.notes || '';
    const lines = notesText.split('\n');
    let pm = '';
    lines.forEach(line => {
      const l = line.toLowerCase();
      if (l.startsWith('payment method:')) {
        pm = line.substring('payment method:'.length).trim();
      }
    });
    return pm || 'Cash on delivery';
  })();

  const isPaid = (() => {
    const pm = paymentMethod.toLowerCase();
    if (pm.includes('cash') || pm.includes('cod') || pm.includes('delivery')) {
      return false;
    }
    if (pm.includes('transfer') || pm.includes('bank') || pm.includes('nayapay') || pm.includes('easypaisa') || pm.includes('jazzcash') || pm.includes('card') || pm.includes('online')) {
      return true;
    }
    return false;
  })();

  React.useEffect(() => {
    if (isEditingOrder && allProducts.length === 0) {
      getAllProductsAdmin().then(setAllProducts).catch(console.error);
    }
  }, [isEditingOrder, allProducts.length]);

  // Edit states
  const [staffNoteInput, setStaffNoteInput] = useState(order.staffNotes || '');
  
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState(order.customerName || '');
  const [editCustomerPhone, setEditCustomerPhone] = useState(order.customerPhone || '');

  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [courierName, setCourierName] = useState(order.courierName || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Structured address edit states
  const [editAddress, setEditAddress] = useState('');
  const [editApt, setEditApt] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPostal, setEditPostal] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPayment, setEditPayment] = useState('');
  const [editOtherNotes, setEditOtherNotes] = useState('');

  React.useEffect(() => {
    if (isEditingCustomer || isEditingNotes) {
      const lines = (order.notes || '').split('\n');
      
      let parsedAddress = '';
      let parsedApt = '';
      let parsedCity = '';
      let parsedPostal = '';
      let parsedPayment = '';
      let parsedContact = '';
      const unstructuredLines: string[] = [];

      lines.forEach(line => {
        if (!line.trim()) return;
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('address:')) parsedAddress = line.substring('address:'.length).trim();
        else if (lowerLine.startsWith('apt/suite:')) parsedApt = line.substring('apt/suite:'.length).trim();
        else if (lowerLine.startsWith('city:')) parsedCity = line.substring('city:'.length).trim();
        else if (lowerLine.startsWith('postal:')) parsedPostal = line.substring('postal:'.length).trim();
        else if (lowerLine.startsWith('contact:')) parsedContact = line.substring('contact:'.length).trim();
        else if (lowerLine.startsWith('payment method:')) parsedPayment = line.substring('payment method:'.length).trim();
        else if (lowerLine.startsWith('notes:')) unstructuredLines.push(line.substring('notes:'.length).trim());
        else if (!line.includes(':')) unstructuredLines.push(line);
      });
      
      setEditAddress(parsedAddress);
      setEditApt(parsedApt);
      setEditCity(parsedCity);
      setEditPostal(parsedPostal);
      setEditContact(parsedContact);
      setEditPayment(parsedPayment);
      setEditOtherNotes(unstructuredLines.join('\n'));
    }
  }, [isEditingCustomer, isEditingNotes, order.notes]);

  const handleSaveNotes = async () => {
    try {
      setIsUpdating(true);
      
      const lines = (order.notes || '').split('\n');
      const retainedLines: string[] = [];
      lines.forEach(line => {
         if (!line.trim()) return;
         const lower = line.toLowerCase();
         if (lower.startsWith('notes:')) return;
         if (!line.includes(':')) return;
         retainedLines.push(line);
      });
      
      const newNotesLines = [...retainedLines];
      if (editOtherNotes.trim()) {
         newNotesLines.push(`Notes: ${editOtherNotes.trim()}`);
      }

      const updated = await updateOrderDetails(order.id, { 
        notes: newNotesLines.join('\n')
      });
      setOrder(updated);
      setIsEditingNotes(false);
      toast.success('Notes updated');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update notes');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCustomer = async () => {
    try {
      setIsUpdating(true);
      
      const lines = (order.notes || '').split('\n');
      
      const retainedLines: string[] = [];
      lines.forEach(line => {
        if (!line.trim()) return;
        const lower = line.toLowerCase();
        if (lower.startsWith('notes:')) retainedLines.push(line);
        else if (lower.startsWith('coordinates:')) retainedLines.push(line);
        else if (!line.includes(':')) retainedLines.push(line);
        else if (lower.startsWith('volume discount:')) retainedLines.push(line);
        else if (lower.startsWith('coupon discount:')) retainedLines.push(line);
        else if (lower.startsWith('shipping:')) retainedLines.push(line);
        else if (lower.startsWith('order no:')) retainedLines.push(line);
        else if (lower.startsWith('grand total:')) retainedLines.push(line);
      });
      
      const newNotesLines = [];
      
      if (editAddress.trim()) newNotesLines.push(`Address: ${editAddress.trim()}`);
      if (editApt.trim()) newNotesLines.push(`Apt/Suite: ${editApt.trim()}`);
      if (editCity.trim()) newNotesLines.push(`City: ${editCity.trim()}`);
      if (editPostal.trim()) newNotesLines.push(`Postal: ${editPostal.trim()}`);
      if (editCustomerPhone.trim()) newNotesLines.push(`Phone: ${editCustomerPhone.trim()}`);
      if (editContact.trim()) newNotesLines.push(`Contact: ${editContact.trim()}`);
      
      retainedLines.forEach(l => newNotesLines.push(l));

      if (editPayment.trim()) newNotesLines.push(`Payment Method: ${editPayment.trim()}`);

      const updated = await updateOrderDetails(order.id, { 
        customerName: editCustomerName,
        customerPhone: editCustomerPhone,
        notes: newNotesLines.join('\n')
      });
      setOrder(updated);
      setIsEditingCustomer(false);
      toast.success('Customer details updated');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update customer details');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeStyles = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
      case 'shipped':
      case 'out_for_delivery':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
      case 'pending':
      case 'placed':
      case 'confirmed':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'cancelled':
        return 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50';
      case 'refunded':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700';
      default:
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
    }
  };

  const handleStatusChange = async (newStatus: Order['status']) => {
    try {
      setIsUpdating(true);
      const newLog: StatusLogItem = {
        id: crypto.randomUUID(),
        type: 'status_change',
        message: `Order status updated to ${newStatus}`,
        notes: `Status changed from ${order.status} to ${newStatus}`,
        createdAt: new Date().toISOString()
      };
      const newLogs = [...(order.statusLogs || []), newLog];
      const updated = await updateOrderDetails(order.id, { 
        status: newStatus,
        statusLogs: newLogs
      });
      setOrder(updated);
      toast.success(`Order status updated to ${newStatus}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
      setIsDropdownOpen(false);
    }
  };

  const handleMoveToTrash = async () => {
    if (!confirm('Are you sure you want to move this order to trash?')) return;
    try {
      setIsUpdating(true);
      await deleteOrder(order.id);
      toast.success('Order moved to trash');
      router.push('/admin/orders');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelShipment = async () => {
    const tn = order.trackingNumber;
    if (!tn) return;
    if (!confirm(`Are you sure you want to cancel shipment ${tn} on PostEx and revert order to Pending?`)) return;
    try {
      setIsUpdating(true);
      const res = await fetch('/api/courier/postex/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (data.success) {
        const cancelLog: StatusLogItem = {
          id: Math.random().toString(36).substring(7),
          type: 'status_change',
          message: `Shipment cancelled with PostEx`,
          notes: `Tracking ${tn} cancelled, order reverted to Pending`,
          createdAt: new Date().toISOString(),
        };
        const updatedLogs = [...(order.statusLogs || []), cancelLog];
        const updated = await updateOrderDetails(order.id, {
          status: 'pending',
          trackingNumber: '',
          courierName: '',
          trackingUrl: '',
          statusLogs: updatedLogs,
        });
        setOrder(updated);
        toast.success(`Shipment cancelled: ${data.message}`);
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to cancel shipment');
      }
    } catch (err) {
      toast.error('Failed to cancel shipment');
    } finally {
      setIsUpdating(false);
      setIsDropdownOpen(false);
    }
  };

  const handleSaveStaffNote = async () => {
    if (!staffNoteInput.trim()) return;
    try {
      setIsUpdating(true);
      const newLog = {
        id: Math.random().toString(36).substring(7),
        type: 'staff_note' as const,
        message: 'Admin commented',
        notes: staffNoteInput,
        createdAt: new Date().toISOString()
      };
      const updatedLogs = [...(order.statusLogs || []), newLog];
      
      const updated = await updateOrderDetails(order.id, { 
        statusLogs: updatedLogs,
        staffNotes: staffNoteInput 
      });
      
      setOrder(updated);
      setStaffNoteInput('');
      toast.success('Comment added to timeline');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateTracking = async () => {
    try {
      setIsUpdating(true);
      const updated = await updateOrderDetails(order.id, {
        trackingNumber,
        courierName,
        trackingUrl,
      });
      setOrder(updated);
      setIsEditingTracking(false);
      toast.success('Tracking details updated');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update tracking');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTimelineComment = async (logId: string) => {
    if (!order.statusLogs) return;
    if (!window.confirm('Delete this comment?')) return;
    const newLogs = order.statusLogs.filter(l => l.id !== logId);
    try {
      setIsUpdating(true);
      const updated = await updateOrderDetails(order.id, { statusLogs: newLogs });
      setOrder(updated);
      toast.success('Comment deleted');
    } catch (e) {
      toast.error('Failed to delete comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateTimelineComment = async (logId: string) => {
    if (!order.statusLogs) return;
    const newLogs = order.statusLogs.map(l => l.id === logId ? { ...l, notes: editingCommentText } : l);
    try {
      setIsUpdating(true);
      const updated = await updateOrderDetails(order.id, { statusLogs: newLogs });
      setOrder(updated);
      setEditingCommentId(null);
      toast.success('Comment updated');
    } catch (e) {
      toast.error('Failed to update comment');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-full sm:max-w-6xl mx-auto space-y-6 pb-20 font-sans overflow-x-hidden w-full">
      
      {/* Detail Topbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button 
              onClick={() => router.push('/admin/orders')}
              className="p-1 -ml-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              title="Back to orders"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 flex-shrink-0" title="Archive">
                <Package className="h-4 w-4" />
              </span>
              <span className="text-[20px] font-bold text-gray-900 dark:text-white leading-none whitespace-nowrap">
                {order.orderNumber}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 ml-1">
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 bg-[#d4edda] text-[#2d6a4f] dark:bg-[#d4edda]/20 dark:text-[#a0dcb3] rounded-[6px] px-2 py-0.5 text-[13px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] dark:bg-[#a0dcb3]" />
                  Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-[#fff4c4] text-[#7c5c00] dark:bg-[#fff4c4]/20 dark:text-[#d4c382] rounded-[6px] px-2 py-0.5 text-[13px] font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b98900] dark:bg-[#d4c382]" />
                  Unpaid
                </span>
              )}
              {order.status === 'cancelled' ? (
                <span className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[13px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-red-400" />
                  Cancelled
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[13px] font-semibold ${
                   order.status === 'pending' || order.status === 'placed' || order.status === 'confirmed'
                   ? 'bg-[#fff4c4] text-[#7c5c00] dark:bg-[#fff4c4]/20 dark:text-[#d4c382]'
                   : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                }`}>
                  {order.status === 'pending' || order.status === 'placed' || order.status === 'confirmed' ? (
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-[#b98900] dark:border-[#d4c382]" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {order.status === 'pending' || order.status === 'placed' || order.status === 'confirmed' ? 'Unfulfilled' : 'Fulfilled'}
                </span>
              )}
            </div>
          </div>
          <div className="text-[13px] text-gray-500 dark:text-gray-400 ml-9">
            {new Date(order.createdAt).toLocaleString('en-US', { 
              month: 'long', day: 'numeric', year: 'numeric'
            })} at {new Date(order.createdAt).toLocaleString('en-US', { 
              hour: 'numeric', minute: '2-digit', hour12: true
            }).toLowerCase()} from Online Store
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => { if (nextOrderId) router.push(`/admin/orders/detail?id=${nextOrderId}`); }}
              disabled={!nextOrderId}
              className="px-2.5 py-1.5 bg-white dark:bg-[#16162a] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200 dark:border-gray-800"
              title="Newer order"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              onClick={() => { if (prevOrderId) router.push(`/admin/orders/detail?id=${prevOrderId}`); }}
              disabled={!prevOrderId}
              className="px-2.5 py-1.5 bg-white dark:bg-[#16162a] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Older order"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          <button
            onClick={() => setIsEditingOrder(true)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#16162a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-[13.5px] font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            Edit
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#16162a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-[13.5px] font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            Print
          </button>

                <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-2.5 py-1.5 rounded-xl bg-[#f6f6f7] dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-[#babfc3] dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-[13.5px] font-semibold shadow-sm transition-colors flex items-center gap-1 whitespace-nowrap"
                title="More actions"
              >
                <span className="hidden sm:inline">More actions</span>
                <span className="sm:hidden">⋯</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Fulfillment</div>
                  <button
                    onClick={() => {
                      router.push(`/admin/orders/postex-booking?id=${order.id}`);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Book at PostEx
                  </button>
                  
                  <div className="border-t border-gray-100 dark:border-gray-800/60 my-1" />
                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Change Status</div>
                  
                  <button onClick={() => handleStatusChange('pending')} className="w-full text-left px-4 py-1.5 text-[13.5px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 text-amber-600">Mark as Pending</button>
                  <button onClick={() => handleStatusChange('confirmed')} className="w-full text-left px-4 py-1.5 text-[13.5px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 text-blue-600">Mark as Confirmed</button>
                  <button onClick={() => handleStatusChange('shipped')} className="w-full text-left px-4 py-1.5 text-[13.5px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 text-purple-600">Mark as Shipped</button>
                  <button onClick={() => handleStatusChange('delivered')} className="w-full text-left px-4 py-1.5 text-[13.5px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 text-emerald-600">Mark as Delivered</button>
                  <button onClick={() => handleStatusChange('cancelled')} className="w-full text-left px-4 py-1.5 text-[13.5px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 text-red-600">Mark as Cancelled</button>

                  {order.trackingNumber && (
                    <>
                      <div className="border-t border-gray-100 dark:border-gray-800/60 my-1" />
                      <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Courier</div>
                      <button
                        onClick={handleCancelShipment}
                        disabled={isUpdating}
                        className="w-full text-left px-4 py-2 text-[13.5px] font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2"
                      >
                        Cancel Shipment
                      </button>
                    </>
                  )}
                  <div className="border-t border-gray-100 dark:border-gray-800/60 my-1" />
                  <button
                    onClick={() => {
                      handleMoveToTrash();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-[13.5px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    Move to Trash
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isEditingOrder ? (
        <OrderEditor 
          order={order}
          settings={settings}
          products={allProducts}
          onSave={(updated) => {
            setOrder(updated);
            setIsEditingOrder(false);
            router.refresh();
          }}
          onCancel={() => setIsEditingOrder(false)}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-4 items-start">
        
        {/* Left Column */}
        <div className="flex flex-col gap-4">
          
          {/* UNFULFILLED SECTION */}
          <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#16162a]">
              <div className="flex items-center gap-2">
                {order.status === 'cancelled' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 dark:bg-red-400" />
                    Cancelled ({order.items.length})
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold ${
                     order.status === 'pending' || order.status === 'placed' || order.status === 'confirmed'
                     ? 'bg-[#fff4c4] text-[#7c5c00] dark:bg-[#fff4c4]/20 dark:text-[#d4c382]'
                     : 'bg-[#d4edda] text-[#2d6a4f] dark:bg-[#d4edda]/20 dark:text-[#a0dcb3]'
                  }`}>
                    {order.status === 'pending' || order.status === 'placed' || order.status === 'confirmed' ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-[#b98900] dark:border-[#d4c382]" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {order.status === 'pending' || order.status === 'placed' || order.status === 'confirmed' ? 'Unfulfilled' : 'Fulfilled'} ({order.items.length})
                  </span>
                )}
              </div>
              <div className="relative">
                <button 
                  onClick={() => setIsFulfillDropdownOpen(!isFulfillDropdownOpen)}
                  className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {isFulfillDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFulfillDropdownOpen(false)} />
                    <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 py-1">
                      {order.status === 'pending' || order.status === 'placed' || order.status === 'confirmed' ? (
                        <button
                          onClick={() => {
                            handleStatusChange('shipped');
                            setIsFulfillDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Mark as fulfilled
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleStatusChange('pending');
                            setIsFulfillDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Mark as unfulfilled
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a]">
              <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-0.5">Payment Method</div>
              <div className="text-[13.5px] font-medium text-gray-900 dark:text-white">{paymentMethod}</div>
            </div>

            {/* Product Rows */}
            {order.items.map((item, idx) => {
              const variantStr = item.selectedVariant ? Object.values({
                c: item.selectedVariant.color,
                s: item.selectedVariant.size,
                m: item.selectedVariant.material,
                cu: item.selectedVariant.customValue
              }).filter(Boolean).join(' / ') : '';
              
              return (
                <div key={idx} className="flex items-start gap-3 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] last:border-b-0">
                  <div
                    className="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 bg-[#f6f6f7] dark:bg-gray-800 flex items-center justify-center cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (item.product.images && item.product.images.length > 0) {
                        setLightboxImage(item.product.images[0].url);
                      }
                    }}
                    title="View full size"
                  >
                    {item.product.images && item.product.images.length > 0 ? (
                      <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <div
                        className="text-[13.5px] font-medium text-[#2c6ecb] dark:text-blue-400 cursor-pointer hover:underline line-clamp-2"
                        onClick={() => window.open(`/admin/products/${item.product.id}`, '_blank')}
                        title="Edit product"
                      >
                        {item.product.name}
                      </div>
                      {item.addedLater && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          Added Later
                        </span>
                      )}
                    </div>
                    {variantStr && (
                      <div className="inline-block bg-[#f1f1f1] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 text-[12px] text-gray-600 dark:text-gray-300 mb-1">
                        {variantStr}
                      </div>
                    )}
                    <div className="text-[12.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      {item.product.sku && <>SKU: {item.product.sku}<br/></>}
                      Customer name: {order.customerName || 'Guest Customer'}
                    </div>
                  </div>
                  <div className="text-right text-[13.5px] text-gray-500 dark:text-gray-400 sm:whitespace-nowrap shrink-0 flex flex-col items-end">
                    <span className="sm:inline">{formatPrice(item.unitPrice, settings.currencySymbol)} <span className="mx-2">×</span> {item.quantity}</span>
                    {item.discountAmount && item.discountAmount > 0 ? (
                      <>
                        <div className="text-[12px] text-rose-500 font-medium mt-0.5">
                          Discount: -{formatPrice(item.discountAmount, settings.currencySymbol)}
                        </div>
                        <div className="text-gray-900 dark:text-white font-semibold mt-1">
                          {formatPrice(item.total, settings.currencySymbol)}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-900 dark:text-white font-semibold mt-1">
                        {formatPrice(item.total, settings.currencySymbol)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

           </div>

          {/* PAID SECTION */}
          <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 bg-[#d4edda] text-[#2d6a4f] dark:bg-[#d4edda]/20 dark:text-[#a0dcb3] rounded-md px-2.5 py-1 text-[12.5px] font-semibold">
                  <Check className="h-3 w-3" /> Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-[#fff4c4] text-[#7c5c00] dark:bg-[#fff4c4]/20 dark:text-[#d4c382] rounded-md px-2.5 py-1 text-[12.5px] font-semibold">
                  <Clock className="h-3 w-3" /> Pending Payment
                </span>
              )}
            </div>

            <div className="px-4 py-2">
              <div className="flex justify-between items-start py-2 border-b border-[#f1f1f1] dark:border-gray-800 last:border-0 text-[13.5px]">
                <div>
                  <div className="text-gray-900 dark:text-white">Subtotal</div>
                  <div className="text-[12px] text-gray-500 dark:text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="font-medium text-gray-900 dark:text-white">{formatPrice(order.subtotal || order.total, settings.currencySymbol)}</div>
              </div>
              {(() => {
                const discountAmount = order.discountAmount || 0;
                if (discountAmount > 0) {
                  return (
                    <div className="flex justify-between items-start py-2 border-b border-[#f1f1f1] dark:border-gray-800 last:border-0 text-[13.5px]">
                      <div>
                        <div className="text-gray-900 dark:text-white">Discount</div>
                      </div>
                      <div className="font-medium text-emerald-600 dark:text-emerald-400">-{formatPrice(discountAmount, settings.currencySymbol)}</div>
                    </div>
                  );
                }
                return null;
              })()}
              {(() => {
                const shipAmount = order.shippingAmount || 0;
                const effectiveShip = shipAmount > 0 ? shipAmount : (order.total > order.subtotal ? order.total - order.subtotal : 0);
                const shipLabel = order.shippingMethodName || 'Delivery Charges';
                return (
                  <div className="flex justify-between items-start py-2 border-b border-[#f1f1f1] dark:border-gray-800 last:border-0 text-[13.5px]">
                    <div>
                      <div className="text-gray-900 dark:text-white">{shipLabel}</div>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">{effectiveShip > 0 ? formatPrice(effectiveShip, settings.currencySymbol) : 'Free'}</div>
                  </div>
                );
              })()}
              <div className="flex justify-between items-start py-2 border-b border-[#f1f1f1] dark:border-gray-800 last:border-0 text-[13.5px]">
                <div className="font-bold text-gray-900 dark:text-white">Total</div>
                <div className="font-bold text-gray-900 dark:text-white">{formatPrice(order.total, settings.currencySymbol)}</div>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-[#f1f1f1] dark:border-gray-800 last:border-0 text-[13.5px]">
                <div className="text-gray-500 dark:text-gray-400">{isPaid ? 'Paid' : 'Unpaid'}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatPrice(isPaid ? order.total : 0, settings.currencySymbol)}
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 text-[13.5px] font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800">
              Timeline
            </div>
            <div className="p-4">
              <div className="flex items-start gap-2.5 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#5c6bc0] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 uppercase">
                  {settings.storeName ? settings.storeName.substring(0, 2) : 'AD'}
                </div>
                <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-gray-300 transition-all bg-white dark:bg-gray-800">
                  <textarea
                    value={staffNoteInput}
                    onChange={(e) => setStaffNoteInput(e.target.value)}
                    placeholder="Leave a comment..."
                    rows={staffNoteInput ? 3 : 1}
                    className="w-full bg-transparent border-none px-3.5 py-2.5 text-[13.5px] text-gray-900 dark:text-white outline-none resize-none placeholder-gray-500"
                  />
                  {staffNoteInput && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                      <button 
                        onClick={handleSaveStaffNote} 
                        disabled={isUpdating}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-[13px] font-semibold rounded-md transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {(!order.statusLogs || order.statusLogs.length === 0) ? (
                  <div className="text-[13px] text-gray-500 text-center py-2">No timeline events</div>
                ) : (
                  [...order.statusLogs].reverse().map((log, logIdx) => (
                    <div key={log.id || logIdx} className="flex gap-3">
                      <div className="w-8 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-[#16162a] z-10 ${
                          log.type === 'creation' ? 'bg-blue-100 text-blue-600' :
                          log.type === 'payment' ? 'bg-emerald-100 text-emerald-600' :
                          log.type === 'status_change' ? 'bg-amber-100 text-amber-600' :
                          log.type === 'whatsapp_notification' ? 'bg-green-100 text-green-600' :
                          log.type === 'staff_note' ? 'bg-[#5c6bc0] text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {log.type === 'staff_note' ? (
                            <span className="text-[11px] font-bold uppercase">{settings.storeName ? settings.storeName.substring(0, 2) : 'AD'}</span>
                          ) : log.type === 'creation' ? <Package className="h-4 w-4" /> :
                           log.type === 'payment' ? <Check className="h-4 w-4" /> :
                           log.type === 'status_change' ? <ClipboardList className="h-4 w-4" /> :
                           <Clock className="h-4 w-4" />}
                        </div>
                        {logIdx !== order.statusLogs!.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-800 -mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4 pt-1">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            {editingCommentId === log.id ? (
                                <div className="space-y-2 mt-1">
                                  <textarea
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 focus:ring-1 focus:ring-blue-500 resize-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleUpdateTimelineComment(log.id)} className="text-[12px] font-bold text-blue-600">Save</button>
                                    <button onClick={() => setEditingCommentId(null)} className="text-[12px] font-semibold text-gray-500">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="text-[13.5px] font-medium text-gray-900 dark:text-white">
                                    {log.message}
                                  </div>
                                  {log.notes && (
                                    <div className={`mt-1 text-[13px] p-3 rounded-md border whitespace-pre-wrap ${
                                      log.type === 'payment'
                                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold'
                                        : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {log.notes}
                                    </div>
                                  )}
                                  
                                  {log.type === 'staff_note' && editingCommentId !== log.id && (
                                    <div className="flex gap-3 mt-2">
                                      <button onClick={() => { setEditingCommentId(log.id); setEditingCommentText(log.notes || ''); }} className="text-[12px] font-semibold text-blue-600 hover:underline">Edit</button>
                                      <button onClick={() => handleDeleteTimelineComment(log.id)} className="text-[12px] font-semibold text-red-600 hover:underline">Delete</button>
                                    </div>
                                  )}
                                </>
                              )}
                          </div>
                          <div className="text-[12px] text-gray-400 whitespace-nowrap mt-0.5">
                            {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          
          {/* NOTES CARD */}
          <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <div className="text-[13.5px] font-bold text-gray-900 dark:text-white flex items-center gap-2">Notes</div>
              {!isEditingNotes && (
                <button 
                  onClick={() => setIsEditingNotes(true)}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-[#f1f1f1] dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Edit Notes"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="p-4 text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {isEditingNotes ? (
                <div className="space-y-3">
                  <textarea 
                    value={editOtherNotes}
                    onChange={e => setEditOtherNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    placeholder="Leave a note..."
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => setIsEditingNotes(false)} className="text-[13px] font-medium text-gray-600 hover:bg-gray-100 px-2 py-1 rounded">Cancel</button>
                    <button 
                      onClick={handleSaveNotes} 
                      disabled={isUpdating} 
                      className="text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const notesText = order.notes || '';
                  const lines = notesText.split('\n');
                  const unstructuredLines: string[] = [];
                  lines.forEach(line => {
                    const lowerLine = line.toLowerCase();
                    if (lowerLine.startsWith('notes:')) unstructuredLines.push(line.substring('notes:'.length).trim());
                    else if (!line.includes(':') && line.trim().length > 0) unstructuredLines.push(line);
                  });
                  if (unstructuredLines.length === 0) return <span>No notes from customer</span>;
                  return unstructuredLines.map((line, i) => <div key={i}>{line}</div>);
                })()
              )}
            </div>
          </div>

          {/* CUSTOMER CARD */}
          <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <div className="text-[13.5px] font-bold text-gray-900 dark:text-white">Customer</div>
              {!isEditingCustomer ? (
                <button 
                  onClick={() => setIsEditingCustomer(true)}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-[#f1f1f1] dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Edit Customer"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => setIsEditingCustomer(false)} className="text-[12px] font-medium text-gray-600 px-1.5 hover:underline">Cancel</button>
                  <button onClick={handleSaveCustomer} disabled={isUpdating} className="text-[12px] font-bold text-blue-600 px-1.5 hover:underline">Save</button>
                </div>
              )}
            </div>
            
            <div className="p-4">
              {isEditingCustomer ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">Name</label>
                      <input 
                        type="text"
                        value={editCustomerName}
                        onChange={e => setEditCustomerName(e.target.value)}
                        className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">Phone</label>
                      <input 
                        type="text"
                        value={editCustomerPhone}
                        onChange={e => setEditCustomerPhone(e.target.value)}
                        className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">Address</label>
                    <input 
                      type="text"
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                      className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">Apt/Suite</label>
                    <input 
                      type="text"
                      value={editApt}
                      onChange={e => setEditApt(e.target.value)}
                      className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">City</label>
                      <input 
                        type="text"
                        value={editCity}
                        onChange={e => setEditCity(e.target.value)}
                        className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">Postal Code</label>
                      <input 
                        type="text"
                        value={editPostal}
                        onChange={e => setEditPostal(e.target.value)}
                        className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">Contact / Email</label>
                    <input 
                      type="text"
                      value={editContact}
                      onChange={e => setEditContact(e.target.value)}
                      className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">Payment Method</label>
                    <input 
                      type="text"
                      value={editPayment}
                      onChange={e => setEditPayment(e.target.value)}
                      className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-[13px]">
                  <div>
                    <a className="text-[13.5px] font-semibold text-[#2c6ecb] dark:text-blue-400 cursor-pointer hover:underline decoration-[#2c6ecb]">
                      {order.customerName || 'Guest Customer'}
                    </a>
                    <div className="text-[12.5px] text-gray-500 dark:text-gray-400 mt-0.5">No orders</div>
                  </div>
                  
                  <div>
                    <div className="text-[12px] font-semibold text-gray-900 dark:text-white mb-1.5">Contact information</div>
                    {order.customerPhone ? (
                      <>
                        <span className="text-gray-900 dark:text-white block text-[13px]">
                          {order.customerPhone}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={`tel:${order.customerPhone.replace(/[\s\-\(\)]/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-[12px] font-semibold transition-colors border border-gray-200 dark:border-gray-700"
                            title="Call customer"
                          >
                            <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span className="hidden sm:inline">Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${cleanWhatsAppPhone(order.customerPhone)}?text=${encodeURIComponent(`Hello ${order.customerName || 'Customer'}, we are contacting you regarding your ${settings.storeName || 'order'} ${order.orderNumber} for ${settings.currencySymbol || 'Rs.'}${order.total}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[12px] font-semibold transition-colors border border-emerald-200 dark:border-emerald-900/50"
                            title={`Message via WhatsApp regarding ${order.orderNumber}`}
                          >
                            <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 italic">No phone</div>
                    )}
                    {(() => {
                      const notesText = order.notes || '';
                      const lines = notesText.split('\n');
                      const contactLine = lines.find(l => l.toLowerCase().startsWith('contact:'));
                      if (contactLine) {
                        return <div className="text-[#2c6ecb] dark:text-blue-400 hover:underline cursor-pointer block mt-1">{contactLine.substring('contact:'.length).trim()}</div>
                      }
                      return null;
                    })()}
                  </div>

                  <hr className="border-t border-gray-200 dark:border-gray-800 my-2" />

                  <div>
                    <div className="text-[12px] font-semibold text-gray-900 dark:text-white mb-1.5">Shipping address</div>
                    <div className="text-gray-900 dark:text-white leading-relaxed">
                      {order.customerName || 'Guest Customer'}<br/>
                      {(() => {
                        const notesText = order.notes || '';
                        const lines = notesText.split('\n');
                        let addr = '', apt = '', city = '', postal = '', coords = '';
                        lines.forEach(line => {
                          const l = line.toLowerCase();
                          if (l.startsWith('address:')) addr = line.substring('address:'.length).trim();
                          if (l.startsWith('apt/suite:')) apt = line.substring('apt/suite:'.length).trim();
                          if (l.startsWith('city:')) city = line.substring('city:'.length).trim();
                          if (l.startsWith('postal:')) postal = line.substring('postal:'.length).trim();
                          if (l.startsWith('coordinates:')) coords = line.substring('coordinates:'.length).trim();
                        });
                        
                        const addrParts = [];
                        if (addr) addrParts.push(addr);
                        if (apt) addrParts.push(apt);
                        
                        const cityParts = [];
                        if (city) cityParts.push(city);
                        if (postal) cityParts.push(postal);
                        
                        return (
                          <>
                            {addrParts.length > 0 && <>{addrParts.join(', ')}<br/></>}
                            {cityParts.length > 0 && <>{cityParts.join(' ')}<br/></>}
                            {coords && (
                              <div className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-1">
                                GPS Location: <span className="font-mono bg-gray-50 dark:bg-gray-800 px-1 py-0.5 rounded border border-gray-100 dark:border-gray-700">{coords}</span>
                              </div>
                            )}
                            {!addr && !city && <span className="text-gray-500 italic">No address provided</span>}
                            {(coords || addr || city) && (
                              <a 
                                href={coords ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addr} ${city}`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[12.5px] text-[#2c6ecb] dark:text-blue-400 cursor-pointer hover:underline block mt-1"
                              >
                                View map
                              </a>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <hr className="border-t border-gray-200 dark:border-gray-800 my-2" />

                  <div>
                    <div className="text-[12px] font-semibold text-gray-900 dark:text-white mb-1.5">Billing address</div>
                    <div className="text-gray-500 dark:text-gray-400">Same as shipping address</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* TRACKING / TAGS CARD (Adapting Tracking to act like Tags/Risk) */}
          <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <div className="text-[13.5px] font-bold text-gray-900 dark:text-white">Tracking Information</div>
              <button 
                onClick={() => setIsEditingTracking(!isEditingTracking)}
                className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-[#f1f1f1] dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Edit Tracking"
              >
                {isEditingTracking ? <Check className="h-4 w-4 text-emerald-600" /> : <Edit className="h-4 w-4" />}
              </button>
            </div>
            <div className="p-4">
              {isEditingTracking ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking Number"
                    className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Courier Name"
                    className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="Tracking URL"
                    className="w-full text-[13px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={handleUpdateTracking} disabled={isUpdating} className="text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded">Save</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-[13px]">
                  {order.trackingNumber ? (
                    <>
                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>Courier:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{order.courierName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>Number:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{order.trackingNumber}</span>
                      </div>
                      {order.trackingUrl && (
                        <div className="pt-2">
                          <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-[#2c6ecb] dark:text-blue-400 hover:underline text-[12.5px] font-semibold block">
                            Track Shipment &rarr;
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500 text-[13px]">No tracking information added yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-[#16162a] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImage}
              alt="Product image"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
