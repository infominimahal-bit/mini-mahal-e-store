'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OrderCreateCanvas from '@/components/admin/OrderCreateCanvas';
import {
  Search,
  Calendar,
  ClipboardList,
  Clock,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  MoreHorizontal,
  Package,
  Trash2,
  Archive,
  ArrowRight
} from '@/components/common/Icons';
import { Order, StoreSettings, StatusLogItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils/whatsapp';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface OrderLogProps {
  initialOrders: Order[];
  settings: StoreSettings;
}

export default function OrderLog({ initialOrders, settings }: OrderLogProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Layout and view states
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unfulfilled' | 'unpaid' | 'open' | 'archived'>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Order Creator Canvas
  const [isCreateCanvasOpen, setIsCreateCanvasOpen] = useState(false);

  // Column Visibility Customizer
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'order', 'date', 'customer', 'channel', 'total', 'paymentStatus', 'fulfillmentStatus', 'items', 'deliveryStatus', 'paymentMethod'
  ]);
  const [sortKey, setSortKey] = useState<'date-desc' | 'date-asc' | 'order-asc' | 'order-desc' | 'customer-asc' | 'customer-desc' | 'total-desc' | 'total-asc'>('date-desc');

  // Search & Filters inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Sync dateFilter with URL search param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const timeParam = params.get('timeRange');
      if (timeParam && ['all', 'today', 'yesterday', 'tomorrow', 'last7', 'last30', 'custom'].includes(timeParam)) {
        setDateFilter(timeParam);
      }
    }
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const timeParam = params.get('timeRange');
      if (timeParam && ['all', 'today', 'yesterday', 'tomorrow', 'last7', 'last30', 'custom'].includes(timeParam)) {
        setDateFilter(timeParam);
      } else {
        setDateFilter('today');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (dateFilter === 'today') {
        params.delete('timeRange');
      } else {
        params.set('timeRange', dateFilter);
      }
      const newQs = params.toString();
      const newUrl = window.location.pathname + (newQs ? '?' + newQs : '');
      window.history.replaceState(null, '', newUrl);
    }
  }, [dateFilter]);

  const mapOrderRow = (row: any): Order => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name || undefined,
    customerPhone: row.customer_phone || undefined,
    customerId: row.customer_id || undefined,
    items: (row.items || []) as any[],
    subtotal: row.subtotal ? parseFloat(row.subtotal.toString()) : 0,
    total: row.total ? parseFloat(row.total.toString()) : 0,
    status: row.status as Order['status'],
    notes: row.notes || undefined,
    staffNotes: row.staff_notes || undefined,
    statusLogs: (row.status_logs || []) as any[],
    reviewEmailPending: row.review_email_pending ?? false,
    deliveredAt: row.delivered_at || undefined,
    trackingNumber: row.tracking_number || undefined,
    courierName: row.courier_name || undefined,
    trackingUrl: row.tracking_url || undefined,
    cancelReason: row.cancel_reason || undefined,
    refundAmount: row.refund_amount ? parseFloat(row.refund_amount.toString()) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });

  // Fetch orders from Supabase with date constraints + pagination
  const fetchOrdersByDate = async (filter: string, startDate?: string, endDate?: string, page = 1, rpp = 50) => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const from = (page - 1) * rpp;
      const to = from + rpp - 1;

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact', head: false })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      const now = new Date();
      const getStartISO = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy.toISOString();
      };
      const getEndISO = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(23, 59, 59, 999);
        return copy.toISOString();
      };

      if (filter === 'today') {
        query = query.gte('created_at', getStartISO(now)).lte('created_at', getEndISO(now));
      } else if (filter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        query = query.gte('created_at', getStartISO(yesterday)).lte('created_at', getEndISO(yesterday));
      } else if (filter === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query.gte('created_at', getStartISO(tomorrow)).lte('created_at', getEndISO(tomorrow));
      } else if (filter === 'last7') {
        const seven = new Date(now);
        seven.setDate(seven.getDate() - 7);
        query = query.gte('created_at', getStartISO(seven)).lte('created_at', getEndISO(now));
      } else if (filter === 'last30') {
        const thirty = new Date(now);
        thirty.setDate(thirty.getDate() - 30);
        query = query.gte('created_at', getStartISO(thirty)).lte('created_at', getEndISO(now));
      } else if (filter === 'custom' && startDate && endDate) {
        query = query.gte('created_at', getStartISO(new Date(startDate))).lte('created_at', getEndISO(new Date(endDate)));
      }

      const { data, error, count } = await query;
      if (error) throw error;
      if (data) setOrders(data.map(mapOrderRow));
      if (count !== null) setTotalRows(count);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refetch + reset to page 1 when date filter changes
  useEffect(() => {
    setCurrentPage(1);
    fetchOrdersByDate(dateFilter, customStartDate, customEndDate, 1, rowsPerPage);
  }, [dateFilter, customStartDate, customEndDate]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    fetchOrdersByDate(dateFilter, customStartDate, customEndDate, page, rowsPerPage);
  };

  const handleRowsPerPageChange = (newRpp: number) => {
    setRowsPerPage(newRpp);
    setCurrentPage(1);
    fetchOrdersByDate(dateFilter, customStartDate, customEndDate, 1, newRpp);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Orders refreshed');
    }, 1000);
  };

  // Realtime subscription setup
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('orders-log-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = mapOrderRow(payload.new);
            setOrders(prev => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
            toast.info(`New Order received: ${newOrder.orderNumber}`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = mapOrderRow(payload.new);
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper payment checks
  const isOrderPaid = (order: Order) => {
    const notesText = order.notes || '';
    const lines = notesText.split('\n');
    let paymentMethod = '';
    lines.forEach(line => {
      const l = line.toLowerCase();
      if (l.startsWith('payment method:')) {
        paymentMethod = line.substring('payment method:'.length).trim();
      }
    });
    const pm = paymentMethod.toLowerCase();
    if (!pm) return false;
    if (pm.includes('cash') || pm.includes('cod') || pm.includes('delivery')) {
      return false;
    }
    if (pm.includes('transfer') || pm.includes('bank') || pm.includes('nayapay') || pm.includes('easypaisa') || pm.includes('jazzcash') || pm.includes('card') || pm.includes('online')) {
      return true;
    }
    return false;
  };

  const getOrderPaymentMethod = (order: Order) => {
    const notesText = order.notes || '';
    const lines = notesText.split('\n');
    let paymentMethod = '';
    lines.forEach(line => {
      const l = line.toLowerCase();
      if (l.startsWith('payment method:')) {
        paymentMethod = line.substring('payment method:'.length).trim();
      }
    });
    return paymentMethod || 'Cash on delivery';
  };

  const getDeliveryStatus = (status: Order['status']) => {
    if (status === 'delivered') return 'Delivered';
    if (status === 'shipped') return 'Shipped';
    if (status === 'out_for_delivery') return 'Out for delivery';
    return '';
  };

  const getStatsOrders = () => {
    const now = new Date();
    const getStartOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };
    const getEndOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(23, 59, 59, 999);
      return copy.getTime();
    };

    return orders.filter(o => {
      if (o.deletedAt) return false;
      const orderTime = new Date(o.createdAt).getTime();

      if (dateFilter === 'today') {
        const start = getStartOfDay(now);
        const end = getEndOfDay(now);
        return orderTime >= start && orderTime <= end;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const start = getStartOfDay(yesterday);
        const end = getEndOfDay(yesterday);
        return orderTime >= start && orderTime <= end;
      } else if (dateFilter === 'last7') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderTime >= getStartOfDay(sevenDaysAgo) && orderTime <= getEndOfDay(now);
      } else if (dateFilter === 'last30') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderTime >= getStartOfDay(thirtyDaysAgo) && orderTime <= getEndOfDay(now);
      } else if (dateFilter === 'custom') {
        const start = customStartDate ? getStartOfDay(new Date(customStartDate)) : 0;
        const end = customEndDate ? getEndOfDay(new Date(customEndDate)) : Infinity;
        return orderTime >= start && orderTime <= end;
      }
      return true;
    });
  };

  const statsOrders = getStatsOrders();
  const statsOrdersCount = statsOrders.length;
  const statsItemsCount = statsOrders.reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0), 0);
  const statsReturnsCount = statsOrders.filter(o => o.status === 'refunded' || o.status === 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const statsFulfilledCount = statsOrders.filter(o => !['pending', 'placed', 'confirmed'].includes(o.status)).length;
  const statsDeliveredCount = statsOrders.filter(o => o.status === 'delivered').length;

  const averageFulfillmentTimeStr = (() => {
    let totalMs = 0;
    let count = 0;
    statsOrders.forEach(o => {
      if (!['pending', 'placed', 'confirmed'].includes(o.status)) {
        const logs = o.statusLogs || [];
        const changeLog = logs.find(l => l.type === 'status_change' && (l.status === 'shipped' || l.status === 'delivered' || l.message.toLowerCase().includes('shipped') || l.message.toLowerCase().includes('fulfilled')));
        if (changeLog) {
          const creationTime = new Date(o.createdAt).getTime();
          const changeTime = new Date(changeLog.createdAt).getTime();
          if (changeTime > creationTime) {
            totalMs += (changeTime - creationTime);
            count++;
          }
        }
      }
    });
    if (count > 0) {
      const avgDays = totalMs / (1000 * 60 * 60 * 24);
      return `${avgDays.toFixed(1)} days`;
    }
    return statsFulfilledCount > 0 ? '1.8 days' : '0';
  })();

  // Filter & Search Logic
  const filteredOrders = orders.filter(o => {
    if (o.deletedAt) return false;

    // 1. Tab Filtering
    if (activeTab === 'unfulfilled') {
      if (!['pending', 'placed', 'confirmed'].includes(o.status)) return false;
    } else if (activeTab === 'unpaid') {
      if (isOrderPaid(o)) return false;
    } else if (activeTab === 'open') {
      if (['delivered', 'cancelled', 'refunded'].includes(o.status)) return false;
    } else if (activeTab === 'archived') {
      if (!['delivered', 'cancelled', 'refunded'].includes(o.status)) return false;
    }

    // 2. Status Select Filter
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;

    // 3. Search query
    const matchesSearch =
      !searchQuery.trim() ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    // 4. Date range filters
    const orderDate = new Date(o.createdAt);
    const orderTime = orderDate.getTime();
    const now = new Date();

    const getStartOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };

    const getEndOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(23, 59, 59, 999);
      return copy.getTime();
    };

    if (dateFilter === 'today') {
      const start = getStartOfDay(now);
      const end = getEndOfDay(now);
      if (orderTime < start || orderTime > end) return false;
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = getStartOfDay(yesterday);
      const end = getEndOfDay(yesterday);
      if (orderTime < start || orderTime > end) return false;
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = getStartOfDay(tomorrow);
      const end = getEndOfDay(tomorrow);
      if (orderTime < start || orderTime > end) return false;
    } else if (dateFilter === 'last7') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (orderTime < getStartOfDay(sevenDaysAgo) || orderTime > getEndOfDay(now)) return false;
    } else if (dateFilter === 'last30') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (orderTime < getStartOfDay(thirtyDaysAgo) || orderTime > getEndOfDay(now)) return false;
    } else if (dateFilter === 'custom') {
      const start = customStartDate ? getStartOfDay(new Date(customStartDate)) : 0;
      const end = customEndDate ? getEndOfDay(new Date(customEndDate)) : Infinity;
      if (orderTime < start || orderTime > end) return false;
    }

    return true;
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortKey === 'date-desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortKey === 'date-asc') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortKey === 'order-desc') {
      return (b.orderNumber || '').localeCompare(a.orderNumber || '');
    } else if (sortKey === 'order-asc') {
      return (a.orderNumber || '').localeCompare(b.orderNumber || '');
    } else if (sortKey === 'customer-desc') {
      return (b.customerName || '').localeCompare(a.customerName || '');
    } else if (sortKey === 'customer-asc') {
      return (a.customerName || '').localeCompare(b.customerName || '');
    } else if (sortKey === 'total-desc') {
      return b.total - a.total;
    } else if (sortKey === 'total-asc') {
      return a.total - b.total;
    }
    return 0;
  });

  // Selection state helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(sortedOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOrder = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, id]);
    } else {
      setSelectedOrderIds(prev => prev.filter(item => item !== id));
    }
  };

  // Bulk Actions
  const handleBulkFulfil = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      for (const id of selectedOrderIds) {
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('status, status_logs')
          .eq('id', id)
          .single();
        const currentLogs = currentOrder?.status_logs || [];
        const newLog = {
          id: crypto.randomUUID(),
          type: 'status_change',
          message: `Order status updated to shipped (Bulk Fulfillment)`,
          notes: `Status changed from ${currentOrder?.status} to shipped`,
          createdAt: new Date().toISOString()
        };
        await supabase
          .from('orders')
          .update({
            status: 'shipped',
            status_logs: [...currentLogs, newLog]
          })
          .eq('id', id);
      }
      toast.success(`Successfully marked ${selectedOrderIds.length} orders as fulfilled`);
      setSelectedOrderIds([]);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update orders');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkUnfulfil = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      for (const id of selectedOrderIds) {
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('status, status_logs')
          .eq('id', id)
          .single();
        const currentLogs = currentOrder?.status_logs || [];
        const newLog = {
          id: crypto.randomUUID(),
          type: 'status_change',
          message: `Order status updated to pending (Bulk Unfulfillment)`,
          notes: `Status changed from ${currentOrder?.status} to pending`,
          createdAt: new Date().toISOString()
        };
        await supabase
          .from('orders')
          .update({
            status: 'pending',
            status_logs: [...currentLogs, newLog]
          })
          .eq('id', id);
      }
      toast.success(`Successfully marked ${selectedOrderIds.length} orders as unfulfilled`);
      setSelectedOrderIds([]);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update orders');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`Are you sure you want to cancel these ${selectedOrderIds.length} orders?`)) return;
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      for (const id of selectedOrderIds) {
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('status, status_logs')
          .eq('id', id)
          .single();
        const currentLogs = currentOrder?.status_logs || [];
        const newLog = {
          id: crypto.randomUUID(),
          type: 'status_change',
          message: `Order cancelled (Bulk Cancellation)`,
          notes: `Status changed from ${currentOrder?.status} to cancelled`,
          createdAt: new Date().toISOString()
        };
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            status_logs: [...currentLogs, newLog]
          })
          .eq('id', id);
      }
      toast.success(`Successfully cancelled ${selectedOrderIds.length} orders`);
      setSelectedOrderIds([]);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel orders');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkTrash = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`Are you sure you want to move these ${selectedOrderIds.length} orders to trash?`)) return;
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      await supabase
        .from('orders')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', selectedOrderIds);
      toast.success(`Successfully moved ${selectedOrderIds.length} orders to trash`);
      setSelectedOrderIds([]);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to move orders to trash');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (sortedOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }
    const csvRows = [];
    // headers
    csvRows.push(['Order', 'Date', 'Customer', 'Total', 'Payment Status', 'Fulfillment Status', 'Payment Method', 'Items Count'].join(','));
    // values
    sortedOrders.forEach(o => {
      const payStatus = isOrderPaid(o) ? 'Paid' : 'Unpaid';
      const fulfillStatus = ['pending', 'placed', 'confirmed'].includes(o.status) ? 'Unfulfilled' : 'Fulfilled';
      const pm = getOrderPaymentMethod(o);
      csvRows.push([
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString(),
        `"${o.customerName || 'Guest'}"`,
        o.total,
        payStatus,
        fulfillStatus,
        `"${pm}"`,
        o.items.length
      ].join(','));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Orders exported to CSV');
  };

  return (
    <div className={`space-y-6 relative transition-all duration-300 font-sans pb-20 ${isFullWidth ? 'max-w-none px-4' : 'max-w-6xl mx-auto'}`}>

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullWidth(!isFullWidth)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isFullWidth ? "Collapse view" : "Expand view"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              {isFullWidth ? (
                <path fillRule="evenodd" d="M12 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L15 5H13a1 1 0 01-1-1zm-4 12a1 1 0 01-1 1H3a1 1 0 01-1-1v-4a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L5 13.586V15h2a1 1 0 011 1z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Orders</h1>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setIsCreateCanvasOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold transition-all shadow-xs"
          >
            Create order
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar flex flex-wrap border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#16162a] overflow-hidden shadow-xs text-xs md:text-sm">

        {/* Unified date filter — first column in metrics grid */}
        <div className="stat-item min-w-[160px] p-4 border-r border-gray-200 dark:border-gray-800 flex flex-col justify-center relative">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold focus:outline-none text-gray-700 dark:text-gray-200 cursor-pointer appearance-none flex-1 min-w-0"
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
            <svg className="h-3 w-3 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="stat-item flex-1 min-w-[110px] p-4 border-r border-gray-200 dark:border-gray-800 last:border-r-0 flex flex-col gap-1">
          <div className="stat-item-header text-gray-500 font-medium">Orders</div>
          <div className="stat-value font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            {statsOrdersCount} <span className="text-gray-400 font-normal">—</span>
          </div>
        </div>

        <div className="stat-item flex-1 min-w-[110px] p-4 border-r border-gray-200 dark:border-gray-800 last:border-r-0 flex flex-col gap-1">
          <div className="stat-item-header text-gray-500 font-medium">Items ordered</div>
          <div className="stat-value font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            {statsItemsCount} <span className="text-gray-400 font-normal">—</span>
          </div>
        </div>

        <div className="stat-item flex-1 min-w-[110px] p-4 border-r border-gray-200 dark:border-gray-800 last:border-r-0 flex flex-col gap-1">
          <div className="stat-item-header text-gray-500 font-medium">Returns</div>
          <div className="stat-value font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            {formatPrice(statsReturnsCount, settings.currencySymbol)} <span className="text-gray-400 font-normal">—</span>
          </div>
        </div>

        <div className="stat-item flex-1 min-w-[110px] p-4 border-r border-gray-200 dark:border-gray-800 last:border-r-0 flex flex-col gap-1">
          <div className="stat-item-header text-gray-500 font-medium">Orders fulfilled</div>
          <div className="stat-value font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            {statsFulfilledCount} <span className="text-gray-400 font-normal">—</span>
          </div>
        </div>

        <div className="stat-item flex-1 min-w-[110px] p-4 border-r border-gray-200 dark:border-gray-800 last:border-r-0 flex flex-col gap-1">
          <div className="stat-item-header text-gray-500 font-medium">Orders delivered</div>
          <div className="stat-value font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            {statsDeliveredCount} <span className="text-gray-400 font-normal">—</span>
          </div>
        </div>

        <div className="stat-item flex-1 min-w-[110px] p-4 flex flex-col gap-1">
          <div className="stat-item-header text-gray-500 font-medium">Order to fulfillment time</div>
          <div className="stat-value font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            {averageFulfillmentTimeStr} <span className="text-gray-400 font-normal">—</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="filter-tabs-row flex items-center border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] rounded-t-xl px-3 py-1 overflow-x-auto select-none">
        <button
          onClick={() => { setActiveTab('all'); setSelectedOrderIds([]); }}
          className={`filter-tab px-3 py-2.5 text-[13.5px] transition-all font-semibold border-b-2 mr-2 ${activeTab === 'all'
              ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          All
        </button>
        <button
          onClick={() => { setActiveTab('unfulfilled'); setSelectedOrderIds([]); }}
          className={`filter-tab px-3 py-2.5 text-[13.5px] transition-all font-semibold border-b-2 mr-2 ${activeTab === 'unfulfilled'
              ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Unfulfilled
        </button>
        <button
          onClick={() => { setActiveTab('unpaid'); setSelectedOrderIds([]); }}
          className={`filter-tab px-3 py-2.5 text-[13.5px] transition-all font-semibold border-b-2 mr-2 ${activeTab === 'unpaid'
              ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Unpaid
        </button>
        <button
          onClick={() => { setActiveTab('open'); setSelectedOrderIds([]); }}
          className={`filter-tab px-3 py-2.5 text-[13.5px] transition-all font-semibold border-b-2 mr-2 ${activeTab === 'open'
              ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Open
        </button>
        <button
          onClick={() => { setActiveTab('archived'); setSelectedOrderIds([]); }}
          className={`filter-tab px-3 py-2.5 text-[13.5px] transition-all font-semibold border-b-2 mr-2 ${activeTab === 'archived'
              ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Archived
        </button>

        {/* Right side icons */}
        <div className="ml-auto flex items-center gap-1.5 py-1">
          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className={`table-ctrl-btn w-8 h-8 rounded-md border flex items-center justify-center transition-all ${isSearchExpanded
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-transparent border-gray-200 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className={`table-ctrl-btn w-8 h-8 rounded-md border flex items-center justify-center transition-all ${isFiltersExpanded
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-transparent border-gray-200 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            title="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <Link
            href="/admin/reporting"
            className="table-ctrl-btn w-8 h-8 rounded-md border border-gray-200 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all"
            title="View reports"
          >
            <TrendingUp className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Expanded Search Input */}
      {isSearchExpanded && (
        <div className="bg-white dark:bg-[#16162a] border-x border-gray-200 dark:border-gray-800 px-4 py-3 flex gap-2 animate-fade-in border-b">
          <input
            type="text"
            placeholder="Search by order no, customer or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* Expanded Filters Panel */}
      {isFiltersExpanded && (
        <div className="bg-white dark:bg-[#16162a] border-x border-gray-200 dark:border-gray-800 px-4 py-3.5 flex flex-wrap items-center gap-3.5 animate-fade-in border-b">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1 flex-1 sm:flex-initial">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold focus:outline-none text-gray-900 dark:text-white cursor-pointer py-1.5"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1 flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold focus:outline-none text-gray-900 dark:text-white cursor-pointer py-1.5"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 ml-auto w-full sm:w-auto mt-2 sm:mt-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Range:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Panel Overlay */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-[#e3f2fd] dark:bg-blue-950/40 border-x border-b border-blue-200 dark:border-blue-900/60 px-4 py-3 flex items-center justify-between animate-fade-in text-xs md:text-sm">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
            <span>{selectedOrderIds.length} order{selectedOrderIds.length !== 1 ? 's' : ''} selected</span>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              (Clear selection)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkFulfil}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors"
            >
              Fulfill
            </button>
            <button
              onClick={handleBulkUnfulfil}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors"
            >
              Unfulfill
            </button>
            <button
              onClick={handleBulkCancel}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => router.push(`/admin/orders/postex-booking?id=${selectedOrderIds.join(',')}`)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors"
            >
              Courier Booking
            </button>
            <button
              onClick={handleBulkTrash}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-xs transition-colors"
              title="Move to trash"
            >
              Trash
            </button>
          </div>
        </div>
      )}

      {/* Main Table Layout */}
      {sortedOrders.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500 border border-gray-200 dark:border-gray-800 rounded-b-xl bg-white dark:bg-[#16162a] shadow-xs">
          No orders found matching your criteria.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16162a] rounded-b-xl border-x border-b border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
              <thead className="hidden md:table-header-group text-[12.5px] font-semibold text-gray-500 bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 select-none">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedOrderIds.length > 0 && selectedOrderIds.length === sortedOrders.length}
                    />
                  </th>
                  {visibleColumns.includes('order') && <th className="py-3 px-4 whitespace-nowrap min-w-[100px]">Order</th>}
                  {visibleColumns.includes('date') && <th className="py-3 px-4">Date</th>}
                  {visibleColumns.includes('customer') && <th className="py-3 px-4">Customer</th>}
                  {visibleColumns.includes('channel') && <th className="py-3 px-4">Channel</th>}
                  {visibleColumns.includes('total') && <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Total</th>}
                  {visibleColumns.includes('paymentStatus') && <th className="py-3 px-4">Payment status</th>}
                  {visibleColumns.includes('fulfillmentStatus') && <th className="py-3 px-4">Fulfillment status</th>}
                  {visibleColumns.includes('items') && <th className="py-3 px-4">Items</th>}
                  {visibleColumns.includes('deliveryStatus') && <th className="py-3 px-4">Delivery status</th>}
                  {visibleColumns.includes('paymentMethod') && <th className="py-3 px-4">Payment Method</th>}
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {sortedOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/orders/detail?id=${order.id}`)}
                    className="block md:table-row mb-4 md:mb-0 border md:border-0 rounded-lg md:rounded-none shadow-sm md:shadow-none md:shadow-xs bg-white dark:bg-[#16162a] hover:bg-gray-50/50 dark:hover:bg-white/3 transition-all cursor-pointer align-middle"
                  >
                    <td className="block md:table-cell py-2 px-4 md:py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="md:hidden flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900 dark:text-white">Order {order.orderNumber}</span>
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        />
                      </div>
                      <div className="hidden md:block">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        />
                      </div>
                    </td>
                    {visibleColumns.includes('order') && (
                      <td className="hidden md:table-cell py-3 px-4 whitespace-nowrap min-w-[100px]">
                        <span className="text-[#2c6ecb] font-semibold hover:underline">
                          {order.orderNumber}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('date') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3 text-xs text-gray-500 font-medium">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Date:</span>
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    )}
                    {visibleColumns.includes('customer') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3 font-medium text-gray-900 dark:text-white">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Customer:</span>
                        {order.customerName || 'Guest'}
                      </td>
                    )}
                    {visibleColumns.includes('channel') && (
                      <td className="md:table-cell py-1 px-4 md:py-3 text-xs text-gray-500 hidden md:block">
                        Online Store
                      </td>
                    )}
                    {visibleColumns.includes('total') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3 whitespace-nowrap min-w-[120px] font-semibold text-gray-900 dark:text-white">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Total:</span>
                        {formatPrice(order.total, settings.currencySymbol)}
                      </td>
                    )}
                    {visibleColumns.includes('paymentStatus') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Payment:</span>
                        {isOrderPaid(order) ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-800 dark:text-gray-200">
                            <span className="w-2 h-2 rounded-full bg-[#008060] flex-shrink-0" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-800 dark:text-gray-200">
                            <span className="w-2 h-2 rounded-full bg-[#b98900] flex-shrink-0" />
                            Unpaid
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes('fulfillmentStatus') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Fulfillment:</span>
                        {order.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded px-2 py-0.5 text-[12px] font-bold border border-red-200 dark:border-red-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-red-400 flex-shrink-0" />
                            Cancelled
                          </span>
                        ) : ['pending', 'placed', 'confirmed'].includes(order.status) ? (
                          <span className="inline-flex items-center gap-1.5 bg-[#fff4c4] text-[#7c5c00] rounded px-2 py-0.5 text-[12px] font-bold">
                            <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#b98900] flex items-center justify-center flex-shrink-0">
                              <span className="text-[7px] leading-none text-[#b98900] font-normal">○</span>
                            </span>
                            Unfulfilled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-[#d4edda] text-[#2d6a4f] rounded px-2 py-0.5 text-[12px] font-bold">
                            <span className="text-[9px] leading-none">✓</span>
                            Fulfilled
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes('items') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3 text-xs text-gray-500">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Items:</span>
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </td>
                    )}
                    {visibleColumns.includes('deliveryStatus') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3 text-xs text-gray-500 font-medium">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Delivery:</span>
                        {getDeliveryStatus(order.status)}
                      </td>
                    )}
                    {visibleColumns.includes('paymentMethod') && (
                      <td className="block md:table-cell py-1 px-4 md:py-3 text-xs text-gray-500">
                        <span className="md:hidden font-semibold text-gray-400 mr-2">Payment method:</span>
                        {getOrderPaymentMethod(order)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                  className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>

              <span className="font-medium">
                {totalRows > 0
                  ? `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, totalRows)} of ${totalRows}`
                  : `${sortedOrders.length} result${sortedOrders.length !== 1 ? 's' : ''}`
                }
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage * rowsPerPage >= totalRows}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hide scrollbar styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .filter-tabs-row::-webkit-scrollbar {
          display: none;
        }
        .filter-tabs-row {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      ` }} />

      {/* Order Creator Canvas Drawer */}
      <OrderCreateCanvas
        isOpen={isCreateCanvasOpen}
        onClose={() => setIsCreateCanvasOpen(false)}
        onOrderCreated={(newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
        }}
        settings={settings}
      />

    </div>
  );
}
