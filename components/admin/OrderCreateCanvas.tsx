'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Check
} from '@/components/common/Icons';
import { Product, ProductVariant, CartItem, StoreSettings, Order, StatusLogItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils/whatsapp';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface OrderCreateCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder: Order) => void;
  settings: StoreSettings;
}

export default function OrderCreateCanvas({ isOpen, onClose, onOrderCreated, settings }: OrderCreateCanvasProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active selection states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [chosenSize, setChosenSize] = useState('');
  const [chosenColor, setChosenColor] = useState('');
  const [chosenVariantId, setChosenVariantId] = useState('');
  const [chosenQuantity, setChosenQuantity] = useState('1');
  const [customUnitPrice, setCustomUnitPrice] = useState('');

  // Custom Item states
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('1');

  // Selected items list
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  // Customer search states
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Payment & cost options
  const [paymentMethod, setPaymentMethod] = useState('Cash on delivery');
  const [paymentMethods, setPaymentMethods] = useState<{ name: string; code: string }[]>([]);
  const [shippingFee, setShippingFee] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [staffNotes, setStaffNotes] = useState('');

  // Load products from DB on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, slug, price, compare_price, sku, stock, has_variants,
            images:product_images(id, url, sort_order, is_primary),
            variants:product_variants(id, color, size, stock, price, sku, active)
          `)
          .eq('is_active', true);

        if (error) throw error;

        if (data) {
          const mapped: Product[] = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price ? parseFloat(p.price.toString()) : 0,
            comparePrice: p.compare_price ? parseFloat(p.compare_price.toString()) : undefined,
            sku: p.sku || undefined,
            stock: p.stock || 0,
            hasVariants: p.has_variants || false,
            isService: false,
            isFeatured: false,
            isActive: true,
            enableSwatches: false,
            showSwatchesOnArchive: false,
            tags: [],
            images: (p.images || []).map((img: any) => ({
              id: img.id,
              productId: p.id,
              url: img.url,
              sortOrder: img.sort_order || 0,
              isPrimary: img.is_primary || false
            })),
            variants: (p.variants || []).filter((v: any) => v.active).map((v: any) => ({
              id: v.id,
              productId: p.id,
              color: v.color || undefined,
              size: v.size || undefined,
              stock: v.stock || 0,
              price: v.price ? parseFloat(v.price.toString()) : undefined,
              sku: v.sku || undefined,
              active: v.active || false,
              sortOrder: 0
            })),
            modifiers: [],
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString()
          }));
          setDbProducts(mapped);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load products list');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [isOpen]);

  // Fetch payment methods from DB on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchPaymentMethods = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('payment_methods')
          .select('name, code')
          .eq('active', true)
          .order('sort_order', { ascending: true });
        if (data && data.length > 0) {
          setPaymentMethods(data);
          if (!data.some(p => p.name === paymentMethod)) {
            setPaymentMethod(data[0].name);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPaymentMethods();
  }, [isOpen]);

  // Search customer by phone or name
  const searchCustomer = async (query: string) => {
    if (!query.trim()) {
      setCustomerResults([]);
      return;
    }
    setIsSearchingCustomer(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .or(`phone.ilike.%${query}%,name.ilike.%${query}%`)
        .is('deleted_at', null)
        .limit(5);
      setCustomerResults(data || []);
      setIsCustomerDropdownOpen(data != null && data.length > 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleCustomerSelect = async (c: any) => {
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    try {
      const supabase = createClient();
      let query = supabase
        .from('orders')
        .select('notes')
        .not('notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);
      if (c.id) {
        query = query.eq('customer_id', c.id);
      } else if (c.phone) {
        query = query.eq('customer_phone', c.phone);
      } else {
        setCustomerSearchQuery('');
        setCustomerResults([]);
        setIsCustomerDropdownOpen(false);
        return;
      }
      const { data: lastOrder } = await query.maybeSingle();
      if (lastOrder?.notes) {
        const addr = lastOrder.notes.match(/Address:\s*(.+)/i);
        const city = lastOrder.notes.match(/City:\s*(.+)/i);
        if (addr) setCustomerAddress(addr[1].trim());
        if (city) setCustomerCity(city[1].trim());
      }
    } catch (err) {
      console.error(err);
    }
    setCustomerSearchQuery('');
    setCustomerResults([]);
    setIsCustomerDropdownOpen(false);
  };

  // Click outside search dropdown close handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filter products based on search
  const filteredProducts = dbProducts.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
    (p.sku && p.sku.toLowerCase().includes(q)) ||
    (p.variants && p.variants.some(v => 
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.sku && v.sku.toLowerCase().includes(q)) ||
      (v.color && v.color.toLowerCase().includes(q)) ||
      (v.size && v.size.toLowerCase().includes(q)) ||
      (v.material && v.material.toLowerCase().includes(q)) ||
      (v.customValue && v.customValue.toLowerCase().includes(q))
    ));
  });

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setIsDropdownOpen(false);
    setChosenSize('');
    setChosenColor('');
    setChosenVariantId('');
    setChosenQuantity('1');
    setCustomUnitPrice(product.price.toString());
  };

  // Add catalog item to order
  const handleAddItem = () => {
    if (!selectedProduct) return;

    let finalVariant: ProductVariant | undefined = undefined;
    if (selectedProduct.hasVariants) {
      if (!chosenVariantId) {
        toast.error('Please select size/color options to match a variant');
        return;
      }
      finalVariant = selectedProduct.variants.find(v => v.id === chosenVariantId);
      if (!finalVariant) return;
    }

    const unitPrice = customUnitPrice !== '' ? parseFloat(customUnitPrice) : (finalVariant?.price ?? selectedProduct.price);
    const quantity = parseInt(chosenQuantity) || 1;

    // Check stock warning
    const availableStock = finalVariant ? finalVariant.stock : selectedProduct.stock;
    if (availableStock < quantity) {
      toast.warning(`Warning: Only ${availableStock} left in stock for this selection.`);
    }

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      selectedVariant: finalVariant,
      selectedModifiers: [],
      quantity,
      unitPrice,
      total: unitPrice * quantity
    };

    setSelectedItems(prev => [...prev, newItem]);
    setSelectedProduct(null);
    setSearchQuery('');
    setChosenSize('');
    setChosenColor('');
    setChosenVariantId('');
    setChosenQuantity('1');
    setCustomUnitPrice('');
    toast.success('Item added to order');
  };

  // Add custom item to order
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      toast.error('Please enter custom item name');
      return;
    }
    const price = parseFloat(customItemPrice) || 0;
    const quantity = parseInt(customItemQuantity) || 1;

    const dummyProduct: Product = {
      id: 'custom-' + crypto.randomUUID(),
      name: customItemName,
      slug: 'custom-item',
      price: price,
      stock: 9999,
      hasVariants: false,
      isService: true,
      isFeatured: false,
      isActive: true,
      enableSwatches: false,
      showSwatchesOnArchive: false,
      tags: [],
      images: [],
      variants: [],
      modifiers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product: dummyProduct,
      selectedModifiers: [],
      quantity,
      unitPrice: price,
      total: price * quantity
    };

    setSelectedItems(prev => [...prev, newItem]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQuantity('1');
    setIsAddingCustom(false);
    toast.success('Custom item added');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  // Cost totals
  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const shipCost = parseFloat(shippingFee) || 0;
  const discCost = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + shipCost - discCost);

  // Check if digital/paid payment
  const isPrepaid = (method: string) => {
    const m = method.toLowerCase();
    return m.includes('transfer') || m.includes('bank') || m.includes('nayapay') || m.includes('easypaisa') || m.includes('jazzcash') || m.includes('card') || m.includes('online');
  };

  // Create Order Submission
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Please provide customer name and phone');
      return;
    }
    if (!customerAddress.trim() || !customerCity.trim()) {
      toast.error('Please provide customer shipping address and city');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();

      // 1. Construct notes block matching storefront structure
      const notes = `Address: ${customerAddress.trim()}\nCity: ${customerCity.trim()}\nPayment Method: ${paymentMethod}`;

      // 2. Build initial timeline status logs
      const creationLog: StatusLogItem = {
        id: crypto.randomUUID(),
        type: 'creation',
        message: 'Order created from Admin console',
        createdAt: new Date().toISOString()
      };

      const finalLogs: StatusLogItem[] = [creationLog];

      if (isPrepaid(paymentMethod)) {
        finalLogs.push({
          id: crypto.randomUUID(),
          type: 'payment',
          message: `Payment verified via ${paymentMethod}`,
          notes: 'Prepaid order Confirmed by Admin',
          createdAt: new Date().toISOString()
        });
      }

      // 3. Save order record
      const orderPayload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        items: selectedItems,
        subtotal: subtotal,
        total: grandTotal,
        discount_amount: discCost,
        shipping_amount: shipCost,
        status: 'pending',
        notes: notes,
        staff_notes: staffNotes.trim() || null,
        status_logs: finalLogs,
        review_email_pending: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let newRow: any;
      let insertAttempt = 0;
      const MAX_ATTEMPTS = 3;
      while (insertAttempt < MAX_ATTEMPTS) {
        insertAttempt++;
        const { data: result, error: err } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select('*')
          .single();
        if (err) {
          const pgCode = (err as any)?.code;
          if (pgCode === '23505' && insertAttempt < MAX_ATTEMPTS) {
            console.warn(`[OrderCreate] 23505 duplicate order_number, retry ${insertAttempt}/${MAX_ATTEMPTS}`);
            await new Promise(r => setTimeout(r, 150));
            continue;
          }
          throw err;
        }
        newRow = result;
        break;
      }

      // 4. Update Stock Levels
      for (const item of selectedItems) {
        if (item.product.id.startsWith('custom-')) continue;

        if (item.selectedVariant) {
          const { data: vStockData } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.selectedVariant.id)
            .single();
          const currentVStock = vStockData?.stock || 0;
          const newVStock = Math.max(0, currentVStock - item.quantity);
          await supabase
            .from('product_variants')
            .update({ stock: newVStock })
            .eq('id', item.selectedVariant.id);

          // Recompute products.stock
          const { data: siblingVariants } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('product_id', item.product.id);
          const newProdStock = (siblingVariants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
          await supabase
            .from('products')
            .update({ stock: newProdStock })
            .eq('id', item.product.id);
        } else {
          const { data: pStockData } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product.id)
            .single();
          const currentPStock = pStockData?.stock || 0;
          const newPStock = Math.max(0, currentPStock - item.quantity);
          await supabase
            .from('products')
            .update({ stock: newPStock })
            .eq('id', item.product.id);
        }
      }

      toast.success(`Order created successfully: ${newRow.order_number}`);

      // Map to initial Order prop structure
      const mappedOrder: Order = {
        id: newRow.id,
        orderNumber: newRow.order_number,
        customerName: newRow.customer_name,
        customerPhone: newRow.customer_phone,
        items: newRow.items,
        subtotal: parseFloat(newRow.subtotal),
        total: parseFloat(newRow.total),
        discountAmount: parseFloat(newRow.discount_amount),
        shippingAmount: parseFloat(newRow.shipping_amount),
        status: newRow.status,
        notes: newRow.notes,
        staffNotes: newRow.staff_notes,
        statusLogs: newRow.status_logs,
        createdAt: newRow.created_at,
        updatedAt: newRow.updated_at
      };

      onOrderCreated(mappedOrder);

      // Reset forms
      setSelectedItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerCity('');
      setPaymentMethod('Cash on delivery');
      setShippingFee('0');
      setDiscountAmount('0');
      setStaffNotes('');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 transition-opacity animate-fade-in"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-[#16162a] border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col font-sans animate-slide-up md:animate-none">

        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Create order</h2>
            <p className="text-[11px] text-gray-400">Add catalog/custom products and customer checkout notes</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleCreateOrderSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Section: Select Products */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Products & Items</span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className="text-xs font-bold text-[#e94560] hover:underline"
              >
                {isAddingCustom ? 'Search catalog' : 'Add custom item'}
              </button>
            </div>

            {isAddingCustom ? (
              // Add Custom Item Form
              <div className="bg-gray-50 dark:bg-gray-900/60 p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
                <div className="text-[11px] font-bold text-gray-400 uppercase">New Custom Item Details</div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Item title (e.g. customized black shirt)"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Price (PKR)"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={customItemQuantity}
                      onChange={(e) => setCustomItemQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Add Custom Item to Order
                </button>
              </div>
            ) : (
              // Search Catalog Form
              <div className="space-y-3">
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search store catalog by product title/SKU..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560] transition-colors"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>

                  {isDropdownOpen && searchQuery.trim() && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 py-1 text-xs">
                      {isLoadingProducts ? (
                        <div className="py-3 text-center text-gray-400 flex items-center justify-center gap-1">
                          <Loader2 className="h-4 w-4 animate-spin text-[#e94560]" />
                          Loading...
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="py-3 text-center text-gray-400">No products found</div>
                      ) : (
                        filteredProducts.map(prod => {
                          const primaryImage = prod.images?.find((img: any) => img.isPrimary) || prod.images?.[0];
                          return (
                            <div
                              key={prod.id}
                              onClick={() => handleProductSelect(prod)}
                              className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                  {primaryImage?.url ? (
                                    <img
                                      src={primaryImage.url}
                                      alt={prod.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[8px] text-gray-400 font-bold flex items-center justify-center h-full w-full">N/A</span>
                                  )}
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white truncate">{prod.name}</span>
                              </div>
                              <span className="text-gray-400 font-bold flex-shrink-0">{formatPrice(prod.price, settings.currencySymbol)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Product Configuration */}
                {selectedProduct && (
                  <div className="bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedProduct.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Variant Selector swatches/buttons */}
                    {selectedProduct.hasVariants && (
                      <div className="space-y-3 bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">Select Options:</span>

                        {/* Size options */}
                        {Array.from(new Set(selectedProduct.variants.map(v => v.size).filter(Boolean))).length > 0 && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-500">Size:</span>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(selectedProduct.variants.map(v => v.size).filter(Boolean))).map(size => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    setChosenSize(size || '');
                                    const matched = selectedProduct.variants.find(v => v.size === size && (!chosenColor || v.color === chosenColor));
                                    if (matched) {
                                      setChosenVariantId(matched.id);
                                      setCustomUnitPrice(matched.price !== undefined ? matched.price.toString() : selectedProduct.price.toString());
                                    }
                                  }}
                                  className={`px-2 py-0.5 text-xs font-bold rounded border ${chosenSize === size
                                      ? 'border-[#e94560] bg-[#e94560]/10 text-[#e94560]'
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-200'
                                    }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color options */}
                        {Array.from(new Set(selectedProduct.variants.map(v => v.color).filter(Boolean))).length > 0 && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-500">Color:</span>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(selectedProduct.variants.map(v => v.color).filter(Boolean))).map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => {
                                    setChosenColor(color || '');
                                    const matched = selectedProduct.variants.find(v => v.color === color && (!chosenSize || v.size === chosenSize));
                                    if (matched) {
                                      setChosenVariantId(matched.id);
                                      setCustomUnitPrice(matched.price !== undefined ? matched.price.toString() : selectedProduct.price.toString());
                                    }
                                  }}
                                  className={`px-2 py-0.5 text-xs font-bold rounded border ${chosenColor === color
                                      ? 'border-[#e94560] bg-[#e94560]/10 text-[#e94560]'
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-200'
                                    }`}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quantity & Negotiated Pricing inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Negotiated Price</label>
                        <input
                          type="number"
                          value={customUnitPrice}
                          onChange={(e) => setCustomUnitPrice(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-900 dark:text-white rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Quantity</label>
                        <input
                          type="number"
                          value={chosenQuantity}
                          onChange={(e) => setChosenQuantity(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-900 dark:text-white rounded"
                          min="1"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-1.5 bg-[#e94560] hover:bg-[#d83f56] text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Add Selection to Order
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Render List of Added Items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/60 pt-4">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider block">Order Items List</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border border-gray-100 dark:border-gray-800 rounded-lg text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{item.product.name}</div>
                      {item.selectedVariant && (
                        <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          {item.selectedVariant.size && `Size: ${item.selectedVariant.size}`}
                          {item.selectedVariant.color && ` | Color: ${item.selectedVariant.color}`}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {item.quantity} x {formatPrice(item.unitPrice, settings.currencySymbol)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">{formatPrice(item.total, settings.currencySymbol)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Customer Checkout Details */}
          <div className="space-y-3.5 border-t border-gray-100 dark:border-gray-800/60 pt-4">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider block">Customer Checkout Info</span>

            {/* Customer auto-fetch search */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search existing customer by phone/name..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    searchCustomer(e.target.value);
                  }}
                  onFocus={() => customerResults.length > 0 && setIsCustomerDropdownOpen(true)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                {isSearchingCustomer && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              {isCustomerDropdownOpen && customerResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 py-1 text-xs">
                  {customerResults.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleCustomerSelect(c)}
                      className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">{c.name || 'Unknown'}</div>
                      <div className="text-gray-400">{c.phone || 'No phone'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Customer Name</span>
                <input
                  type="text"
                  required
                  placeholder="Shoaib Khan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp / Phone</span>
                <input
                  type="text"
                  required
                  placeholder="03001234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Shipping Address</span>
                <input
                  type="text"
                  required
                  placeholder="House 4, Street 2, Sector G-11"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">City</span>
                <input
                  type="text"
                  required
                  placeholder="Islamabad"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>
            </div>
          </div>

          {/* Section: Payments & Adjustments */}
          <div className="space-y-3.5 border-t border-gray-100 dark:border-gray-800/60 pt-4">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider block">Payments & Adjustments</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560] cursor-pointer"
                >
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map(pm => (
                      <option key={pm.code} value={pm.name}>{pm.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Cash on delivery">Cash on delivery (COD)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="NayaPay">NayaPay</option>
                      <option value="Credit/Debit Card">Credit/Debit Card</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Shipping Cost</span>
                <input
                  type="number"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Discount Amount</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Staff Notes (Internal)</span>
              <textarea
                placeholder="Negotiated discount over WhatsApp. Ship urgent."
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#e94560] h-16 resize-none"
              />
            </div>
          </div>

        </form>

        {/* Drawer Bottom Total and Create Trigger */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 text-xs md:text-sm space-y-3 select-none">
          <div className="space-y-1.5 font-semibold text-gray-500">
            <div className="flex items-center justify-between">
              <span>Subtotal:</span>
              <span className="text-gray-900 dark:text-white">{formatPrice(subtotal, settings.currencySymbol)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping Fee:</span>
              <span className="text-gray-900 dark:text-white">+{formatPrice(shipCost, settings.currencySymbol)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount:</span>
              <span className="text-gray-900 dark:text-white">-{formatPrice(discCost, settings.currencySymbol)}</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base font-bold border-t border-gray-200 dark:border-gray-850 pt-2 text-gray-900 dark:text-white">
              <span>Grand Total:</span>
              <span className="text-[#e94560]">{formatPrice(grandTotal, settings.currencySymbol)}</span>
            </div>
          </div>

          <button
            onClick={handleCreateOrderSubmit}
            disabled={isSaving}
            className="w-full py-2.5 bg-[#008060] hover:bg-[#006e52] disabled:opacity-50 text-white rounded-lg text-xs md:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving order...
              </>
            ) : (
              'Create order & Update stock'
            )}
          </button>
        </div>

      </div>
    </>
  );
}
