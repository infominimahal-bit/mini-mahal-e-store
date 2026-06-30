'use client';

import React, { useState, useMemo } from 'react';
import { Product, CartItem, ProductVariant, StoreSettings, Order } from '@/lib/types';
import { formatPrice } from '@/lib/utils/whatsapp';
import { Trash2, Package, Search, Plus, X, Tag, Truck, Check } from '@/components/common/Icons';
import { updateOrderDetails } from '@/lib/services/orders';
import { toast } from 'sonner';

interface OrderEditorProps {
  order: Order;
  settings: StoreSettings;
  products: Product[];
  onSave: (updatedOrder: Order) => void;
  onCancel: () => void;
}

export default function OrderEditor({ order: initialOrder, settings, products, onSave, onCancel }: OrderEditorProps) {
  const [items, setItems] = useState<(CartItem & { _isNew?: boolean })[]>(initialOrder.items || []);
  const [discountAmount, setDiscountAmount] = useState<number>(initialOrder.discountAmount || 0);
  const [shippingAmount, setShippingAmount] = useState<number>(initialOrder.shippingAmount || 0);
  const [discountCode, setDiscountCode] = useState<string>(initialOrder.discountCode || '');
  
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Financials
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [items]);

  const effectiveDiscountAmount = useMemo(() => {
    return discountType === 'percentage' 
      ? (subtotal * discountPercent / 100)
      : discountAmount;
  }, [discountType, discountPercent, discountAmount, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal + shippingAmount - effectiveDiscountAmount);
  }, [subtotal, shippingAmount, effectiveDiscountAmount]);

  const updateItemTotal = (item: CartItem & { _isNew?: boolean }) => {
    const baseTotal = item.unitPrice * item.quantity;
    const discountAmt = item.discountType === 'percent' 
      ? (baseTotal * (item.discountValue || 0) / 100) 
      : (item.discountValue || 0);
    item.discountAmount = discountAmt;
    item.total = Math.max(0, baseTotal - discountAmt);
  };

  const handleItemDiscountChange = (idx: number, type: 'fixed' | 'percent', value: number) => {
    const newItems = [...items];
    newItems[idx].discountType = type;
    newItems[idx].discountValue = value;
    updateItemTotal(newItems[idx]);
    setItems(newItems);
  };

  const handleQuantityChange = (idx: number, qty: number) => {
    const newItems = [...items];
    if (qty < 1) {
      newItems.splice(idx, 1);
    } else {
      newItems[idx].quantity = qty;
      updateItemTotal(newItems[idx]);
    }
    setItems(newItems);
  };

  const handleRemoveItem = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    setItems(newItems);
  };

  const handleAddProduct = (product: Product, variant?: ProductVariant) => {
    // Determine unit price
    const defaultVariant = variant || (product.hasVariants && product.variants?.length > 0 ? product.variants[0] : undefined);
    const unitPrice = defaultVariant?.price || product.price || 0;
    
    // Check if item already exists
    const existingIdx = items.findIndex(item => 
      item.product.id === product.id && 
      item.selectedVariant?.id === defaultVariant?.id
    );

    if (existingIdx >= 0) {
      handleQuantityChange(existingIdx, items[existingIdx].quantity + 1);
    } else {
      const newItem: CartItem & { _isNew?: boolean } = {
        id: Math.random().toString(36).substring(7),
        product,
        selectedVariant: defaultVariant,
        selectedModifiers: [],
        quantity: 1,
        unitPrice,
        total: unitPrice,
        _isNew: true
      };
      updateItemTotal(newItem);
      setItems([...items, newItem]);
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleVariantChange = (idx: number, variantId: string) => {
    const newItems = [...items];
    const variant = newItems[idx].product.variants?.find(v => v.id === variantId);
    if (variant) {
      newItems[idx].selectedVariant = variant;
      newItems[idx].unitPrice = variant.price || newItems[idx].product.price || 0;
      updateItemTotal(newItems[idx]);
      setItems(newItems);
    }
  };

  const handleSelectOption = (idx: number, type: 'color' | 'size' | 'material' | 'customValue', value: string) => {
    const item = items[idx];
    const activeVariants = item.product.variants || [];
    
    const colors = Array.from(new Set(activeVariants.map(v => v.color).filter(Boolean))) as string[];
    const sizes = Array.from(new Set(activeVariants.map(v => v.size).filter(Boolean))) as string[];
    const materials = Array.from(new Set(activeVariants.map(v => v.material).filter(Boolean))) as string[];
    const customValues = Array.from(new Set(activeVariants.map(v => v.customValue).filter(Boolean))) as string[];

    const currentColor = type === 'color' ? value : item.selectedVariant?.color;
    const currentSize = type === 'size' ? value : item.selectedVariant?.size;
    const currentMaterial = type === 'material' ? value : item.selectedVariant?.material;
    const currentCustomValue = type === 'customValue' ? value : item.selectedVariant?.customValue;

    // Try to find exact match
    let match = activeVariants.find(v => {
      const colorMatch = !colors.length || v.color === currentColor;
      const sizeMatch = !sizes.length || v.size === currentSize;
      const materialMatch = !materials.length || v.material === currentMaterial;
      const customMatch = !customValues.length || v.customValue === currentCustomValue;
      return colorMatch && sizeMatch && materialMatch && customMatch;
    });

    // If no exact match, find fallback for the selected option
    if (!match) {
      match = activeVariants.find(v => {
        if (type === 'color') return v.color === value;
        if (type === 'size') return v.size === value;
        if (type === 'material') return v.material === value;
        if (type === 'customValue') return v.customValue === value;
        return false;
      });
    }

    if (match) {
      const newItems = [...items];
      newItems[idx].selectedVariant = match;
      newItems[idx].unitPrice = match.price || newItems[idx].product.price || 0;
      updateItemTotal(newItems[idx]);
      setItems(newItems);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const newLogs: any[] = [];
      const now = new Date().toISOString();

      const addedItems = items.filter(i => i._isNew);
      if (addedItems.length > 0) {
        newLogs.push({
          id: Math.random().toString(36).substring(7),
          type: 'status_change',
          message: 'Items added to order',
          notes: addedItems.map(i => `+ ${i.product.name} (x${i.quantity})`).join('\n'),
          createdAt: now
        });
      }

      const removedItems = (initialOrder.items || []).filter(oi => 
        !items.some(i => i.id === oi.id)
      );
      if (removedItems.length > 0) {
        newLogs.push({
          id: Math.random().toString(36).substring(7),
          type: 'status_change',
          message: 'Items removed from order',
          notes: removedItems.map(i => `- ${i.product.name} (x${i.quantity})`).join('\n'),
          createdAt: now
        });
      }

      const modifiedItems = items.filter(i => !i._isNew);
      const qtyChanges: string[] = [];
      modifiedItems.forEach(i => {
        const orig = (initialOrder.items || []).find(oi => oi.id === i.id);
        if (orig && orig.quantity !== i.quantity) {
          qtyChanges.push(`~ ${i.product.name}: qty changed from ${orig.quantity} to ${i.quantity}`);
        }
      });
      if (qtyChanges.length > 0) {
        newLogs.push({
          id: Math.random().toString(36).substring(7),
          type: 'status_change',
          message: 'Item quantities updated',
          notes: qtyChanges.join('\n'),
          createdAt: now
        });
      }

      const updatedLogs = [...(initialOrder.statusLogs || []), ...newLogs];

      const cleanItems = items.map(i => {
        const { _isNew, ...rest } = i;
        if (_isNew) {
          return { ...rest, addedLater: true };
        }
        return rest;
      });

      const updated = await updateOrderDetails(initialOrder.id, {
        items: cleanItems,
        subtotal,
        total,
        discountAmount: effectiveDiscountAmount,
        shippingAmount,
        discountCode,
        statusLogs: updatedLogs
      });
      toast.success('Order updated successfully');
      onSave(updated);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQ = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQ) || 
      (p.sku && p.sku.toLowerCase().includes(lowerQ))
    ).slice(0, 10);
  }, [searchQuery, products]);

  return (
    <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-[#16162a] z-10">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-500" />
          Edit Order
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={onCancel}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Items List */}
        <div className="space-y-3">
          {items.map((item, idx) => {
            const variantStr = item.selectedVariant ? Object.values({
              color: item.selectedVariant.color,
              size: item.selectedVariant.size,
              material: item.selectedVariant.material,
              custom: item.selectedVariant.customValue
            }).filter(Boolean).join(', ') : '';

            return (
              <div key={`${item.product.id}-${idx}`} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-[#16162a] shadow-xs">
                {/* Top: image + name + variants */}
                <div className="flex items-start gap-3">
                  {item.product.images && item.product.images.length > 0 ? (
                    <div className="h-14 w-14 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <img 
                        src={item.product.images[0].url} 
                        alt={item.product.name} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">
                        {item.product.name}
                      </h4>
                      {item._isNew && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          NEW
                        </span>
                      )}
                    </div>
                    {item.product.hasVariants && item.product.variants && item.product.variants.length > 0 ? (
                      <div className="mt-2.5 space-y-3">
                        {/* Color Group */}
                        {(() => {
                          const activeVariants = item.product.variants || [];
                          const colors = Array.from(new Set(activeVariants.map(v => v.color).filter(Boolean))) as string[];
                          if (colors.length === 0) return null;
                          return (
                            <div>
                              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Color</div>
                              <div className="flex flex-wrap gap-1.5">
                                {colors.map(color => {
                                  const isSelected = item.selectedVariant?.color === color;
                                  return (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={() => handleSelectOption(idx, 'color', color)}
                                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                                        isSelected 
                                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold' 
                                          : 'bg-white dark:bg-[#16162a] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                                      }`}
                                    >
                                      {color}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Size Group */}
                        {(() => {
                          const activeVariants = item.product.variants || [];
                          const sizes = Array.from(new Set(activeVariants.map(v => v.size).filter(Boolean))) as string[];
                          if (sizes.length === 0) return null;
                          return (
                            <div>
                              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Size</div>
                              <div className="flex flex-wrap gap-1.5">
                                {sizes.map(size => {
                                  const isSelected = item.selectedVariant?.size === size;
                                  return (
                                    <button
                                      key={size}
                                      type="button"
                                      onClick={() => handleSelectOption(idx, 'size', size)}
                                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                                        isSelected 
                                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold' 
                                          : 'bg-white dark:bg-[#16162a] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                                      }`}
                                    >
                                      {size}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Material Group */}
                        {(() => {
                          const activeVariants = item.product.variants || [];
                          const materials = Array.from(new Set(activeVariants.map(v => v.material).filter(Boolean))) as string[];
                          if (materials.length === 0) return null;
                          return (
                            <div>
                              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Material</div>
                              <div className="flex flex-wrap gap-1.5">
                                {materials.map(mat => {
                                  const isSelected = item.selectedVariant?.material === mat;
                                  return (
                                    <button
                                      key={mat}
                                      type="button"
                                      onClick={() => handleSelectOption(idx, 'material', mat)}
                                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                                        isSelected 
                                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold' 
                                          : 'bg-white dark:bg-[#16162a] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                                      }`}
                                    >
                                      {mat}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Custom Option Group */}
                        {(() => {
                          const activeVariants = item.product.variants || [];
                          const customOptionName = activeVariants[0]?.customOption;
                          const customValues = Array.from(new Set(activeVariants.map(v => v.customValue).filter(Boolean))) as string[];
                          if (customValues.length === 0) return null;
                          return (
                            <div>
                              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{customOptionName || 'Custom Option'}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {customValues.map(val => {
                                  const isSelected = item.selectedVariant?.customValue === val;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleSelectOption(idx, 'customValue', val)}
                                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                                        isSelected 
                                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold' 
                                          : 'bg-white dark:bg-[#16162a] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : variantStr && (
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {variantStr}
                      </p>
                    )}
                    {!item.product.hasVariants && (
                      <p className="text-xs text-gray-500 mt-1 font-semibold">
                        {formatPrice(item.unitPrice, settings.currencySymbol)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom: Item Discount + qty + price + delete */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 gap-3">
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Discount:</span>
                    <select 
                      value={item.discountType || 'fixed'}
                      onChange={e => handleItemDiscountChange(idx, e.target.value as 'fixed' | 'percent', item.discountValue || 0)}
                      className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-1"
                    >
                      <option value="fixed">{settings.currencySymbol}</option>
                      <option value="percent">%</option>
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={item.discountValue || ''}
                      onChange={e => handleItemDiscountChange(idx, item.discountType || 'fixed', parseFloat(e.target.value) || 0)}
                      className="w-16 text-right px-2 py-1 text-xs bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-700 rounded font-semibold focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button 
                        onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                        className="h-8 w-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 font-medium text-base"
                      >−</button>
                      <div className="h-8 flex items-center justify-center text-sm font-bold border-x border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-white/5 w-10">
                        {item.quantity}
                      </div>
                      <button 
                        onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                        className="h-8 w-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 font-medium text-base"
                      >+</button>
                    </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {item.discountAmount && item.discountAmount > 0 ? (
                        <>
                          <div className="text-[10px] text-gray-400 line-through">
                            {formatPrice(item.unitPrice * item.quantity, settings.currencySymbol)}
                          </div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white text-rose-600 dark:text-rose-400">
                            {formatPrice(item.total, settings.currencySymbol)}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatPrice(item.total, settings.currencySymbol)}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(idx)}
                      className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-2 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search / Add Products */}
        <div className="relative mt-2">
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-gray-50/50 dark:bg-gray-800/50 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-shadow">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="text"
              placeholder="Search products to add..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
              }}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 p-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden max-h-64 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No products found</div>
              ) : (
                <div className="py-2">
                  {filteredProducts.map(product => {
                    const hasVariants = product.hasVariants && product.variants?.length > 0;
                    
                    return (
                      <div key={product.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <button 
                          onClick={() => handleAddProduct(product)}
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {product.images && product.images[0] ? (
                              <img src={product.images[0].url} className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-700" alt="" />
                            ) : <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800" />}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                {product.name}
                              </span>
                              {product.hasVariants && product.variants?.length > 0 && (
                                <span className="text-xs text-gray-400">
                                  {product.variants.length} variations
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {formatPrice(product.price, settings.currencySymbol)}
                            </span>
                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Financial Adjustments */}
        <div className="bg-gray-50 dark:bg-gray-900/30 -mx-5 -mb-5 px-5 py-5 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Subtotal</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatPrice(subtotal, settings.currencySymbol)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm gap-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
              <Tag className="w-4 h-4" /> Discount
              <input 
                type="text"
                placeholder="Code (optional)"
                value={discountCode}
                onChange={e => setDiscountCode(e.target.value)}
                className="w-28 text-xs px-2 py-1 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <select 
                value={discountType}
                onChange={e => setDiscountType(e.target.value as any)}
                className="text-xs bg-transparent border-none text-gray-500 focus:ring-0 p-0 pr-4"
              >
                <option value="fixed">{settings.currencySymbol}</option>
                <option value="percentage">%</option>
              </select>
              <input 
                type="number" 
                min="0"
                value={discountType === 'percentage' ? discountPercent || '' : discountAmount || ''}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  if (discountType === 'percentage') {
                     setDiscountPercent(val);
                  } else {
                     setDiscountAmount(val);
                  }
                }}
                className="w-20 text-right px-2 py-1 text-sm bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-700 rounded-md font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-sm gap-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
              <Truck className="w-4 h-4" /> Shipping
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">+ {settings.currencySymbol}</span>
              <input 
                type="number" 
                min="0"
                value={shippingAmount || ''}
                onChange={e => setShippingAmount(parseFloat(e.target.value) || 0)}
                className="w-20 text-right px-2 py-1 text-sm bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-700 rounded-md font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
            <span className="font-bold text-gray-900 dark:text-white">Total</span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {formatPrice(total, settings.currencySymbol)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
