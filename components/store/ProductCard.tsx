'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Eye } from '@/components/common/Icons';
import { Product, StoreSettings } from '@/lib/types';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils/whatsapp';
import dynamic from 'next/dynamic';
import { animateFlyTo } from '@/lib/utils/flyAnimation';
import { saveScrollPosition } from '@/lib/hooks/useScrollRestoration';
import { useTheme } from 'next-themes';
import { getSwatchStyle } from '@/lib/utils/swatch';

// Lazy load QuickViewModal to reduce initial JS bundle
const QuickViewModal = dynamic(() => import('./QuickViewModal'), {
  ssr: false,
  loading: () => null,
});

interface ProductCardProps {
  product: Product;
  currencySymbol?: string;
  settings?: StoreSettings | null;
}

export default function ProductCard({ product, currencySymbol = 'Rs.', settings }: ProductCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const addItem = useCartStore(state => state.addItem);
  const fallbackPlaceholder = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3C/svg%3E";
  const primaryImage = product.images.find(img => img.isPrimary)?.url || product.images[0]?.url || fallbackPlaceholder;

  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [touchActive, setTouchActive] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [userSelectedColor, setUserSelectedColor] = useState(false);

  // Settings properties
  const showStars = settings?.card_show_stars !== false;
  const showWishlist = settings?.card_show_wishlist !== false;
  const showQuickview = settings?.card_show_quickview !== false;
  const showQuickcart = settings?.card_show_quickcart !== false;
  const cardAlignment = settings?.card_alignment || 'left';
  const elementsOrder = settings?.card_elements_order || ['title', 'rating', 'price', 'swatches'];

  useEffect(() => {
    const checkWishlist = () => {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setIsInWishlist(wishlist.includes(product.id));
    };
    checkWishlist();
    window.addEventListener('wishlist-updated', checkWishlist);
    return () => {
      window.removeEventListener('wishlist-updated', checkWishlist);
    };
  }, [product.id]);

  const activeVariants = product.variants.filter(v => v.active);
  const defaultIndex = (settings?.defaultVariantIndex || 1) - 1;
  const defaultVar = activeVariants[defaultIndex] || activeVariants[0];

  // Selected variation attribute states
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedCustom, setSelectedCustom] = useState<string | null>(null);

  // Sync state when defaultVar changes
  useEffect(() => {
    setSelectedColor(defaultVar?.color || null);
    setSelectedSize(defaultVar?.size || null);
    setSelectedMaterial(defaultVar?.material || null);
    setSelectedCustom(defaultVar?.customValue || null);
    setUserSelectedColor(false);
  }, [defaultVar]);

  // Find currently matched variant based on selections
  const currentVariant = activeVariants.find(v => {
    const colorMatch = !selectedColor || v.color === selectedColor;
    const sizeMatch = !selectedSize || v.size === selectedSize;
    const materialMatch = !selectedMaterial || v.material === selectedMaterial;
    const customMatch = !selectedCustom || v.customValue === selectedCustom;
    return colorMatch && sizeMatch && materialMatch && customMatch;
  }) || activeVariants.find(v => {
    const colorMatch = !selectedColor || v.color === selectedColor;
    const sizeMatch = !selectedSize || v.size === selectedSize;
    return colorMatch && sizeMatch;
  }) || activeVariants.find(v => v.color === selectedColor) || activeVariants.find(v => v.size === selectedSize) || defaultVar;

  const currentImage = (userSelectedColor && currentVariant && currentVariant.imageUrl) || primaryImage;
  const currentPrice = (currentVariant && currentVariant.price) ? currentVariant.price : product.price;
  const currentComparePrice = (currentVariant && currentVariant.comparePrice) ? currentVariant.comparePrice : product.comparePrice;

  // Active price range logic
  const activePrices = activeVariants.map(v => v.price).filter((p): p is number => typeof p === 'number' && p > 0);
  const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : product.price;
  const maxPrice = activePrices.length > 0 ? Math.max(...activePrices) : product.price;
  const hasPriceRange = minPrice !== maxPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      setQuickViewOpen(true);
      return;
    }
    addItem(product, undefined, [], 1);
    toast.success(`${product.name} added to cart!`);

    // Trigger fly animation for adding to cart
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const targetId = isMobile ? 'header-cart-icon-mobile' : 'header-cart-icon-desktop';
    animateFlyTo(e.currentTarget as HTMLElement, targetId, primaryImage);
  };

  const showColors = (settings?.enableVariantSwatches !== false) && (settings?.card_show_swatches !== false);
  const showSizes = (settings?.enableVariantSwatches !== false) && (settings?.card_show_sizes !== false);
  const showMaterials = (settings?.enableVariantSwatches !== false) && (settings?.card_show_materials !== false);
  const showCustom = (settings?.enableVariantSwatches !== false) && (settings?.card_show_custom !== false);

  const displayDescription = (settings?.card_show_description !== false)
    ? (product.shortDescription || '')
    : '';

  const swatchShape = settings?.swatchShape ?? 'circle';
  const archiveSwatchSize = settings?.archiveSwatchSize ?? settings?.swatchSize ?? 'md';

  const getSwatchClasses = (type: 'color' | 'text', sizeKey: string, text: string) => {
    const heightMap: Record<string, string> = {
      xxs: 'h-4',
      xs: 'h-5',
      sm: 'h-6',
      md: 'h-7',
      lg: 'h-8',
      xl: 'h-9',
      xxl: 'h-10'
    };
    const widthMap: Record<string, string> = {
      xxs: 'w-4',
      xs: 'w-5',
      sm: 'w-6',
      md: 'w-7',
      lg: 'w-8',
      xl: 'w-9',
      xxl: 'w-10'
    };
    const fontMap: Record<string, string> = {
      xxs: 'text-[6px]',
      xs: 'text-[7.5px]',
      sm: 'text-[8.5px]',
      md: 'text-[9.5px]',
      lg: 'text-[11px]',
      xl: 'text-[12px]',
      xxl: 'text-[13px]'
    };

    const height = heightMap[sizeKey] || heightMap.md;
    const fontClass = fontMap[sizeKey] || fontMap.md;

    if (type === 'color') {
      const width = widthMap[sizeKey] || widthMap.md;
      return `${height} ${width}`;
    } else {
      const minWidthClass =
        sizeKey === 'xxs' ? 'min-w-[16px] px-0.5' :
          sizeKey === 'xs' ? 'min-w-[22px] px-1' :
            sizeKey === 'sm' ? 'min-w-[26px] px-1' :
              sizeKey === 'lg' ? 'min-w-[38px] px-2' :
                sizeKey === 'xl' ? 'min-w-[48px] px-2' :
                  sizeKey === 'xxl' ? 'min-w-[56px] px-2.5' :
                    'min-w-[32px] px-1.5';

      let adjustedFont = fontClass;
      if (text.length > 3) {
        adjustedFont =
          sizeKey === 'xxs' ? 'text-[5px]' :
            sizeKey === 'xs' ? 'text-[6px]' :
              sizeKey === 'sm' ? 'text-[7px]' :
                sizeKey === 'lg' ? 'text-[9px]' :
                  sizeKey === 'xl' ? 'text-[10px]' :
                    sizeKey === 'xxl' ? 'text-[11px]' :
                      'text-[8px]';
      }
      return `${height} ${minWidthClass} ${adjustedFont}`;
    }
  };

  const shapeMap: Record<string, string> = {
    circle: 'rounded-full',
    square: 'rounded-sm'
  };
  const shapeClass = shapeMap[swatchShape] || shapeMap.circle;

  // Group unique attribute values for display
  const colorVariants = product.variants
    .filter(v => v.color && v.active)
    .reduce<typeof product.variants>((acc, v) => {
      const exists = acc.find(e => e.color === v.color);
      if (!exists) acc.push(v);
      return acc;
    }, []);

  const sizeVariants = product.variants
    .filter(v => v.size && v.active)
    .reduce<typeof product.variants>((acc, v) => {
      const exists = acc.find(e => e.size === v.size);
      if (!exists) acc.push(v);
      return acc;
    }, []);

  const materialVariants = product.variants
    .filter(v => v.material && v.active)
    .reduce<typeof product.variants>((acc, v) => {
      const exists = acc.find(e => e.material === v.material);
      if (!exists) acc.push(v);
      return acc;
    }, []);

  const customVariants = product.variants
    .filter(v => v.customValue && v.active)
    .reduce<typeof product.variants>((acc, v) => {
      const exists = acc.find(e => e.customValue === v.customValue);
      if (!exists) acc.push(v);
      return acc;
    }, []);

  interface VariationGroup {
    type: 'color' | 'size' | 'material' | 'custom';
    name: string;
    variants: typeof product.variants;
  }

  const availableGroups: VariationGroup[] = [];
  if (colorVariants.length > 0 && settings?.card_show_type_color !== false) {
    availableGroups.push({ type: 'color', name: 'Color', variants: colorVariants });
  }
  if (sizeVariants.length > 0 && settings?.card_show_type_size !== false) {
    availableGroups.push({ type: 'size', name: 'Size', variants: sizeVariants });
  }
  if (materialVariants.length > 0 && settings?.card_show_type_material !== false) {
    availableGroups.push({ type: 'material', name: 'Material', variants: materialVariants });
  }
  if (customVariants.length > 0 && settings?.card_show_type_custom !== false) {
    const customName = product.variants.find(v => v.customOption)?.customOption || 'Custom';
    availableGroups.push({ type: 'custom', name: customName, variants: customVariants });
  }

  // Sort available groups based on product's variationOrder
  const variationOrder = product.variationOrder || ['color', 'size', 'material', 'custom'];
  availableGroups.sort((a, b) => {
    const aIdx = variationOrder.indexOf(a.type);
    const bIdx = variationOrder.indexOf(b.type);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const isSwatchesEnabled = settings?.enableVariantSwatches !== false;
  const showVariation1 = isSwatchesEnabled && (settings?.card_show_swatches !== false);
  const showVariation2 = isSwatchesEnabled && (settings?.card_show_sizes !== false);
  const showVariation3 = isSwatchesEnabled && (settings?.card_show_materials !== false);
  const showVariation4 = isSwatchesEnabled && (settings?.card_show_custom !== false);
  const showVariation5 = isSwatchesEnabled && (settings?.card_show_custom_2 !== false);

  const handleSelectAttribute = (attr: 'color' | 'size' | 'material' | 'customValue', val: string) => {
    const newSelections = {
      color: attr === 'color' ? val : selectedColor,
      size: attr === 'size' ? val : selectedSize,
      material: attr === 'material' ? val : selectedMaterial,
      customValue: attr === 'customValue' ? val : selectedCustom,
    };

    let matched = activeVariants.find(v => {
      return (!newSelections.color || v.color === newSelections.color) &&
        (!newSelections.size || v.size === newSelections.size) &&
        (!newSelections.material || v.material === newSelections.material) &&
        (!newSelections.customValue || v.customValue === newSelections.customValue);
    });

    if (!matched && attr !== 'color' && newSelections.color) {
      matched = activeVariants.find(v => v.color === newSelections.color && v[attr] === val);
    }

    if (!matched) {
      matched = activeVariants.find(v => v[attr] === val);
    }

    setUserSelectedColor(true);

    if (matched) {
      setSelectedColor(matched.color || null);
      setSelectedSize(matched.size || null);
      setSelectedMaterial(matched.material || null);
      setSelectedCustom(matched.customValue || null);
    } else {
      if (attr === 'color') setSelectedColor(val);
      if (attr === 'size') setSelectedSize(val);
      if (attr === 'material') setSelectedMaterial(val);
      if (attr === 'customValue') setSelectedCustom(val);
    }
  };

  const getAspectClass = (ratio?: string) => {
    switch (ratio) {
      case '3:4': return 'aspect-[3/4]';
      case '4:3': return 'aspect-[4/3]';
      case '16:9': return 'aspect-[16/9]';
      case 'auto': return 'aspect-auto';
      case '1:1':
      default:
        return 'aspect-square';
    }
  };

  const getTitleClampClass = (limit?: string) => {
    switch (limit) {
      case '1': return 'line-clamp-1 min-h-[14px] sm:min-h-[16px]';
      case 'none': return 'line-clamp-none';
      case '2':
      default:
        return 'line-clamp-2 min-h-[28px] sm:min-h-[32px]';
    }
  };

  const aspectClass = getAspectClass(settings?.imageAspectRatio);
  const titleClampClass = getTitleClampClass(settings?.titleLineLimit);

  const hasSecondImage = product.images.length > 1;
  const secondImage = hasSecondImage ? (product.images[1]?.url || product.images[0]?.url) : null;

  const alignClass = cardAlignment === 'center' ? 'items-center text-center' :
    cardAlignment === 'right' ? 'items-end text-right' :
      'items-start text-left';

  const swatchAlign = (settings?.archiveSwatchAlign || 'left') === 'center' ? 'justify-center' :
    (settings?.archiveSwatchAlign || 'left') === 'right' ? 'justify-end' :
      'justify-start';

  const renderedGroups: React.ReactNode[] = [];

  const renderGroupElement = (group: VariationGroup) => {
    if (group.type === 'color') {
      return (
        <div key="colors" className={`flex items-center gap-1.5 flex-wrap ${swatchAlign}`}>
          {group.variants.map((v, i) => {
            const bg = v.colorHex ? v.colorHex : undefined;
            const isActive = currentVariant?.color === v.color;
            const sSizeClass = getSwatchClasses('color', archiveSwatchSize, '');
            return (
              <button
                key={i}
                type="button"
                title={v.color}
                onMouseEnter={() => v.imageUrl ? setHoveredImage(v.imageUrl) : null}
                onMouseLeave={() => setHoveredImage(null)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectAttribute('color', v.color || '');
                }}
                className={`
                  relative flex items-center justify-center cursor-pointer flex-shrink-0 overflow-hidden transition-all duration-150 border swatch-btn
                  ${sSizeClass} ${shapeClass}
                  shadow-sm ${isActive ? 'scale-110' : 'hover:scale-110'}
                `}
                style={{
                  ...getSwatchStyle(v.colorHex),
                  borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                  boxShadow: isActive ? '0 0 0 1.5px var(--color-accent)' : 'none',
                }}
              >
                {v.imageUrl && (v.showImageSwatch || !v.colorHex) && (
                  <img
                    src={v.imageUrl}
                    alt={v.color || ''}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      );
    } else {
      const attrKey = group.type === 'size' ? 'size' : group.type === 'material' ? 'material' : 'customValue';
      return (
        <div key={group.type} className={`flex items-center gap-1.5 flex-wrap ${swatchAlign}`}>
          {group.variants.map((v, i) => {
            const val = group.type === 'size' ? v.size : group.type === 'material' ? v.material : v.customValue;
            const isActive = group.type === 'size'
              ? currentVariant?.size === v.size
              : group.type === 'material'
                ? currentVariant?.material === v.material
                : currentVariant?.customValue === v.customValue;
            const sSizeClass = getSwatchClasses('text', archiveSwatchSize, val || '');
            return (
              <button
                key={i}
                type="button"
                title={val || ''}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectAttribute(attrKey, val || '');
                }}
                className={`
                  relative flex items-center justify-center font-bold transition-all duration-150 cursor-pointer flex-shrink-0 overflow-hidden select-none border swatch-btn
                  ${sSizeClass} ${shapeClass}
                  ${isActive ? 'scale-110 shadow-sm font-black' : 'hover:scale-110'}
                `}
                style={{
                  borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                  color: isActive ? 'var(--color-text-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--color-surface)',
                  boxShadow: isActive ? '0 0 0 1px var(--color-accent)' : 'none',
                }}
              >
                <span className="whitespace-nowrap leading-none text-center">{val}</span>
              </button>
            );
          })}
        </div>
      );
    }
  };

  if (showVariation1 && availableGroups[0]) {
    renderedGroups.push(renderGroupElement(availableGroups[0]));
  }
  if (showVariation2 && availableGroups[1]) {
    renderedGroups.push(renderGroupElement(availableGroups[1]));
  }
  if (showVariation3 && availableGroups[2]) {
    renderedGroups.push(renderGroupElement(availableGroups[2]));
  }
  if (showVariation4 && availableGroups[3]) {
    renderedGroups.push(renderGroupElement(availableGroups[3]));
  }
  if (showVariation5 && availableGroups[4]) {
    renderedGroups.push(renderGroupElement(availableGroups[4]));
  }

  // Show up to 2 selectors at the same time
  const finalRenderedGroups = renderedGroups.slice(0, 2);

  const renderElement = (element: string) => {
    switch (element) {
      case 'title':
        return (
          <div
            key="title"
            className={`font-semibold text-[11px] sm:text-xs text-gray-900 dark:text-white group-hover:text-[#e94560] transition-colors leading-tight pb-0.5 ${titleClampClass}`}
          >
            {product.name}
          </div>
        );
      case 'rating':
        if (!showStars) return null;
        return (
          <div key="rating" className={`mt-1 flex items-center gap-0.5 text-[9px] text-amber-400 ${swatchAlign}`}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <svg
                key={idx}
                className={`h-2.5 w-2.5 ${idx < Math.round(product.rating || 5)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300 dark:text-gray-600'
                  }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold ml-0.5">
              ({product.reviewsCount || 0})
            </span>
          </div>
        );
      case 'price':
        return (
          <div key="price" className={`mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap ${swatchAlign}`}>
            <span className="product-price text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white">
              {hasPriceRange ? (
                `${formatPrice(minPrice, currencySymbol)} – ${formatPrice(maxPrice, currencySymbol)}`
              ) : (
                formatPrice(currentPrice, currencySymbol)
              )}
            </span>
            {!hasPriceRange && currentComparePrice && currentComparePrice > currentPrice && (
              <span className="text-[9px] text-gray-400 line-through">
                {formatPrice(currentComparePrice, currencySymbol)}
              </span>
            )}
          </div>
        );
      case 'swatches':
        if (product.showSwatchesOnArchive === false || finalRenderedGroups.length === 0) return null;
        return (
          <div key="swatches" className="flex flex-col gap-1 w-full mt-1 mb-1">
            {finalRenderedGroups}
          </div>
        );
      default:
        return null;
    }
  };

  const renderCardBadge = () => {
    const badgeClass = "bdg pointer-events-none";
    const badges: React.ReactNode[] = [];

    if (currentComparePrice && currentComparePrice > currentPrice) {
      badges.push(
        <span key="sale" className={`${badgeClass} bdg-sale`}>
          -{Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)}%
        </span>
      );
    }
    if (product.isFeatured) {
      badges.push(<span key="featured" className={`${badgeClass} bdg-hot`}>Featured</span>);
    }
    if (product.badgeEnabled && product.customBadge) {
      badges.push(
        <span
          key="custom"
          className={badgeClass}
          style={{
            backgroundColor: product.customBadge.bgColor,
            color: product.customBadge.textColor
          }}
        >
          {product.customBadge.name}
        </span>
      );
    }
    if (!product.isService && product.stock > 0 && product.stock <= 8) {
      badges.push(<span key="limited" className={`${badgeClass} bdg-new`}>Limited</span>);
    }

    if (badges.length === 0) return null;

    return (
      <div className="bdg-container pointer-events-none">
        {badges}
      </div>
    );
  };

  const renderActionButtons = (actionStyle?: string) => {
    return (
      <div className="aic">
        {showWishlist && (
          <button
            type="button"
            onClick={handleToggleWishlist}
            className="ai"
            title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`h-3.5 w-3.5 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        )}

        {showQuickview && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
            className="ai"
            title="Quick View"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}

        {showQuickcart && (
          <button
            type="button"
            onClick={handleAddToCart}
            className="ai"
            title={product.hasVariants ? "Choose Options" : "Add to Cart"}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let newWishlist;
    if (isInWishlist) {
      newWishlist = wishlist.filter((id: string) => id !== product.id);
      toast.success('Removed from wishlist');
    } else {
      newWishlist = [...wishlist, product.id];
      toast.success('Added to wishlist');

      // Trigger fly animation for adding to wishlist
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const targetId = isMobile ? 'mobile-bottom-wishlist-icon' : 'header-wishlist-icon-desktop';
      animateFlyTo(e.currentTarget as HTMLElement, targetId, primaryImage);
    }
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const activeImage = hoveredImage || currentImage;
  const activeStyle = settings?.card_style || 'style1';
  // Scoped CSS rules for 11 card designs matching showcase HTML exactly
  const customCss = `
    .z-card-container {
      --trans: all 0.35s cubic-bezier(0.4,0,0.2,1);
      --purple: #7c3aed;
      --blue: #2563eb;
      --green: #10b981;
      --red: #ef4444;
      --gold: #f59e0b;
      transition: var(--trans);
      font-family: 'Segoe UI', sans-serif;
      position: relative;
      width: 100%;
    }
    
    /* Shared components scoped inside z-card-container */
    .z-card-container .bdg-container {
      position: absolute; top: 12px; left: 12px;
      display: flex; flex-direction: column; gap: 4px;
      z-index: 10; align-items: flex-start;
    }
    .z-card-container .bdg {
      display: inline-block;
      padding: 3px 9px; border-radius: 20px;
      font-size: .6rem; font-weight: 800;
      letter-spacing: 1px; text-transform: uppercase;
      line-height: 1;
    }
    .z-card-container .bdg-new { background: #10b981; color: #fff; }
    .z-card-container .bdg-hot { background: #ef4444; color: #fff; }
    .z-card-container .bdg-sale { background: #f59e0b; color: #fff; }

    .z-card-container .aic {
      position: absolute; right: 6px; top: 6px;
      display: flex; flex-direction: column; gap: 5px;
      z-index: 20; opacity: 0; transform: translateX(18px);
      transition: var(--trans);
    }
    .z-card-container:hover .aic { opacity: 1; transform: translateX(0); }

    .z-card-container .ai {
      width: 30px; height: 30px; border-radius: 50%; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: .78rem; transition: var(--trans); position: relative;
      /* removed heavy backdrop-filter for performance */
    }
    .z-card-container .ai .tt {
      position: absolute; right: calc(100% + 8px); top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,.88); color: #fff;
      padding: 3px 9px; border-radius: 6px;
      font-size: .62rem; white-space: nowrap;
      opacity: 0; pointer-events: none;
      transition: opacity .2s; font-weight: 700;
    }
    .z-card-container .ai:hover .tt { opacity: 1; }

    .z-card-container .rat { display: flex; align-items: center; gap: 3px; margin-bottom: 3px; }
    .z-card-container .rat .st { color: #f59e0b; font-size: .62rem; }
    .z-card-container .rat .rc { font-size: .58rem; color: #888; }

    .z-card-container .swatches {
      display: flex; align-items: center; gap: 4px;
      flex-wrap: wrap;
    }
    .z-card-container .sw {
      width: 14px; height: 14px; border-radius: 50%;
      cursor: pointer; border: 2px solid rgba(255,255,255,.3);
      transition: var(--trans); flex-shrink: 0;
    }
    .z-card-container .sw:hover, .z-card-container .sw.on {
      transform: scale(1.25);
      border-color: rgba(255,255,255,.9);
      outline: 2px solid rgba(255,255,255,.4); outline-offset: 1px;
    }

    .z-card-container .spills { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
    .z-card-container .sp {
      border: none; border-radius: 6px;
      padding: 2px 7px; font-size: .6rem; font-weight: 700;
      cursor: pointer; transition: var(--trans);
    }

    .z-card-container .prow { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .z-card-container .pold { text-decoration: line-through; color: #888; font-size: .7rem; }

    .z-card-container .abtn {
      width: 100%; border: none; border-radius: 50px;
      padding: 7px 12px; font-size: .75rem; font-weight: 700;
      cursor: pointer; transition: var(--trans);
      display: flex; align-items: center; justify-content: center; gap: 5px;
      letter-spacing: .4px; white-space: nowrap;
    }
    .z-card-container .abtn:hover { transform: translateY(-2px); }
    .z-card-container .abtn:active { transform: scale(.97); }

    .z-card-container .cimg {
      width: 100%; object-fit: cover;
      transition: var(--trans); display: block;
    }


    /* Showcase 1: Neumorphic Soft UI (Grey Theme) */
    .z-card-container .sc1 {
        background: #e0e5ec;
        border-radius: 20px;
        box-shadow: 9px 9px 16px rgba(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5);
        border: 1px solid rgba(255,255,255,0.2);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
        color: #333;
    }
    .z-card-container .sc1:hover {
        box-shadow: 12px 12px 20px rgba(163,177,198,0.7), -12px -12px 20px rgba(255,255,255, 0.6);
        transform: translateY(-10px);
    }
    .z-card-container .sc1 .img-box {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 12px;
        padding: 10px;
        background: transparent;
    }
    .z-card-container .sc1 .img-box img {
        transition: all 0.5s ease;
        filter: drop-shadow(0 15px 15px rgba(0,0,0,0.15));
    }
    .z-card-container .sc1:hover .img-box img {
        transform: scale(1.05);
    }
    .z-card-container .sc1 .card-actions {
        position: absolute;
        bottom: -50px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        z-index: 10;
        transition: 0.4s ease;
    }
    .z-card-container .sc1:hover .card-actions {
        bottom: 15px;
    }
    .z-card-container .sc1 .action-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: #e0e5ec;
        box-shadow: 4px 4px 8px rgba(163,177,198,0.6), -4px -4px 8px rgba(255,255,255, 0.5);
        color: #555;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }
    .z-card-container .sc1 .action-btn:hover {
        box-shadow: inset 4px 4px 8px rgba(163,177,198,0.6), inset -4px -4px 8px rgba(255,255,255, 0.5);
        color: #3498db;
        transform: scale(1.05);
    }
    .z-card-container .sc1 .card-content {
        padding-top: 1rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc1 .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #333;
    }
    .z-card-container .sc1 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #ff4757;
    }

    /* Showcase 2: Color Block Neon */
    .z-card-container .sc2 {
        background: #2ed573;
        color: #fff;
        border-radius: 0;
        border: 5px solid #1e90ff;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
    }
    .z-card-container .sc2 .img-box {
        position: relative;
        width: 100%;
        background: #1e90ff;
        clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .z-card-container .sc2 .img-box img {
        transition: all 0.5s ease;
        filter: drop-shadow(0 10px 10px rgba(0,0,0,0.25));
    }
    .z-card-container .sc2:hover .img-box img {
        transform: scale(1.2) rotate(15deg);
    }
    .z-card-container .sc2 .card-actions {
        position: absolute;
        top: 20px;
        right: -60px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 10;
        transition: 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    .z-card-container .sc2:hover .card-actions {
        right: 15px;
    }
    .z-card-container .sc2 .action-btn {
        width: 40px;
        height: 40px;
        border-radius: 5px;
        border: none;
        background: #ffa502;
        color: #fff;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    }
    .z-card-container .sc2 .action-btn:hover {
        background: #ff4757;
        color: #fff;
        transform: scale(1.1);
    }
    .z-card-container .sc2 .card-content {
        padding: 1rem 1.25rem 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc2 .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #fff;
    }
    .z-card-container .sc2 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #111;
    }

    /* Showcase 3: Glassmorphism Glow */
    .z-card-container .sc3-wrap {
        background: url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop') center/cover;
        border-radius: 20px;
        padding: 15px;
        height: 100%;
    }
    .z-card-container .sc3 {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
    }
    .z-card-container .sc3:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-5px);
    }
    .z-card-container .sc3 .img-box {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .z-card-container .sc3 .img-box img {
        transition: all 0.5s ease;
        filter: drop-shadow(0 15px 15px rgba(0,0,0,0.3));
    }
    .z-card-container .sc3:hover .img-box img {
        transform: scale(1.05);
    }
    .z-card-container .sc3 .card-actions {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) scale(0);
        opacity: 0;
        background: rgba(255,255,255,0.2);
        padding: 10px;
        border-radius: 30px;
        backdrop-filter: blur(5px);
        display: flex;
        gap: 10px;
        z-index: 10;
        transition: all 0.3s ease;
    }
    .z-card-container .sc3:hover .card-actions {
        transform: translateX(-50%) scale(1);
        opacity: 1;
    }
    .z-card-container .sc3 .action-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: #fff;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: none;
        transition: all 0.3s ease;
    }
    .z-card-container .sc3 .action-btn:hover {
        background: rgba(255,255,255,0.4);
        transform: scale(1.1);
    }
    .z-card-container .sc3 .card-content {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc3 .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #fff;
    }
    .z-card-container .sc3 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #fff;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    /* Showcase 4: Claymorphism Coral */
    .z-card-container .sc4 {
        background: #ff7979;
        border-radius: 35px;
        box-shadow: 20px 20px 40px #d96666, -20px -20px 40px #ff8c8c, inset 6px 6px 15px rgba(255,255,255,0.4), inset -6px -6px 15px rgba(0,0,0,0.1);
        color: #fff;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
        padding: 10px;
    }
    .z-card-container .sc4 .img-box {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .z-card-container .sc4 .img-box img {
        transition: all 0.5s ease;
        filter: drop-shadow(0 15px 15px rgba(0,0,0,0.2));
    }
    .z-card-container .sc4:hover .img-box img {
        transform: translateY(-15px);
    }
    .z-card-container .sc4 .card-actions {
        position: absolute;
        top: -50px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        z-index: 10;
        transition: 0.5s ease;
    }
    .z-card-container .sc4:hover .card-actions {
        top: 20px;
    }
    .z-card-container .sc4 .action-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: #f6e58d;
        color: #333;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 4px 4px 10px rgba(0,0,0,0.1), inset 2px 2px 5px rgba(255,255,255,0.8);
        transition: all 0.3s ease;
    }
    .z-card-container .sc4 .action-btn:hover {
        background: #ffbe76;
        transform: scale(1.1);
    }
    .z-card-container .sc4 .card-content {
        padding: 1rem 1.25rem 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc4 .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #fff;
    }
    .z-card-container .sc4 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #ffeaa7;
    }

    /* Showcase 5: Detailed E-Commerce */
    .z-card-container .sc5 {
        border: 1px solid #eee;
        box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        border-radius: 20px;
        overflow: hidden;
        background: #fff;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
    }
    .z-card-container .sc5:hover {
        box-shadow: 0 15px 35px rgba(0,0,0,0.1);
    }
    .z-card-container .sc5 .img-box {
        position: relative;
        width: 100%;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .z-card-container .sc5 .img-box img {
        transition: all 0.5s ease;
    }
    .z-card-container .sc5:hover .img-box img {
        transform: scale(1.08);
    }
    .z-card-container .sc5 .card-actions {
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 10;
    }
    .z-card-container .sc5 .action-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: #fff;
        color: #333;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        transform: translateX(50px);
        opacity: 0;
        transition: all 0.3s ease;
    }
    .z-card-container .sc5:hover .action-btn {
        transform: translateX(0);
        opacity: 1;
    }
    .z-card-container .sc5 .action-btn:nth-child(1) { transition-delay: 0.1s; }
    .z-card-container .sc5 .action-btn:nth-child(2) { transition-delay: 0.2s; }
    .z-card-container .sc5 .action-btn:nth-child(3) { transition-delay: 0.3s; }
    .z-card-container .sc5 .action-btn:hover {
        background: #ff4757;
        color: #fff;
        transform: scale(1.1);
    }
    .z-card-container .sc5 .card-content {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc5 .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #333;
    }
    .z-card-container .sc5 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #ff4757;
    }

    /* Showcase 6: Dark Elegance Gold */
    .z-card-container .sc6 {
        background: #111;
        color: #f1f1f1;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
    }
    .z-card-container .sc6 .img-box {
        position: relative;
        width: 100%;
        background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .z-card-container .sc6 .img-box img {
        transition: all 0.5s ease;
        filter: drop-shadow(0 15px 15px rgba(0,0,0,0.5));
    }
    .z-card-container .sc6:hover .img-box img {
        transform: scale(1.1);
        filter: drop-shadow(0 20px 20px rgba(212, 175, 55, 0.2));
    }
    .z-card-container .sc6 .card-actions {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0;
        width: 100%;
        display: flex;
        gap: 15px;
        justify-content: center;
        background: rgba(0,0,0,0.7);
        padding: 20px 0;
        backdrop-filter: blur(4px);
        z-index: 10;
        transition: all 0.3s ease;
    }
    .z-card-container .sc6:hover .card-actions {
        opacity: 1;
    }
    .z-card-container .sc6 .action-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: transparent;
        color: #d4af37;
        border: 1px solid #d4af37;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }
    .z-card-container .sc6 .action-btn:hover {
        background: #d4af37;
        color: #111;
        transform: scale(1.1);
    }
    .z-card-container .sc6 .card-content {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc6 .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #f1f1f1;
    }
    .z-card-container .sc6 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #d4af37;
    }

    /* Showcase 7: Typographic Brutalist */
    .z-card-container .sc7 {
        border-radius: 0;
        border: 3px solid #000;
        box-shadow: 8px 8px 0px #000;
        background: #fff;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
        color: #000;
    }
    .z-card-container .sc7:hover {
        transform: translate(-4px, -4px);
        box-shadow: 12px 12px 0px #000;
    }
    .z-card-container .sc7 .img-box {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .z-card-container .sc7 .img-box img {
        transition: all 0.5s ease;
    }
    .z-card-container .sc7 .card-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 8px;
        z-index: 10;
    }
    .z-card-container .sc7 .action-btn {
        width: 40px;
        height: 40px;
        border: 2px solid #000;
        border-radius: 0;
        background: #fff;
        color: #000;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 3px 3px 0px #000;
        transition: all 0.3s ease;
    }
    .z-card-container .sc7 .action-btn:hover {
        background: #000;
        color: #fff;
        transform: translate(-2px, -2px);
        box-shadow: 5px 5px 0px #ff4757;
    }
    .z-card-container .sc7 .card-content {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc7 .card-title {
        font-family: 'Playfair Display', serif;
        font-size: 1.8rem;
        line-height: 1.1;
        text-transform: uppercase;
        font-weight: 700;
        margin-bottom: 0.5rem;
        color: #000;
    }
    .z-card-container .sc7 .card-price {
        font-size: 1.3rem;
        font-weight: 800;
        color: #000;
    }

    /* Showcase 8: Geometric Mondrian */
    .z-card-container .sc8 {
        border-radius: 0;
        border: 4px solid #000;
        background: #fff;
        overflow: visible;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
        color: #000;
    }
    .z-card-container .sc8:hover {
        border-color: #3742fa;
    }
    .z-card-container .sc8 .img-box {
        position: relative;
        width: 100%;
        border-bottom: 4px solid #000;
        background: #f1f2f6;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .z-card-container .sc8 .img-box img {
        transition: all 0.5s ease;
    }
    .z-card-container .sc8 .card-actions {
        position: absolute;
        bottom: -20px;
        right: 20px;
        display: flex;
        gap: 0;
        z-index: 10;
    }
    .z-card-container .sc8 .action-btn {
        width: 45px;
        height: 45px;
        border-radius: 0;
        border: 2px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        cursor: pointer;
        transform: translateY(20px);
        opacity: 0;
        transition: all 0.3s ease;
    }
    .z-card-container .sc8:hover .action-btn {
        transform: translateY(0);
        opacity: 1;
    }
    .z-card-container .sc8 .action-btn:nth-child(1) { background: #ff4757; color:#fff; transition-delay: 0.05s; }
    .z-card-container .sc8 .action-btn:nth-child(2) { background: #eccc68; color:#000; transition-delay: 0.1s; }
    .z-card-container .sc8 .action-btn:nth-child(3) { background: #1e90ff; color:#fff; transition-delay: 0.15s; }
    .z-card-container .sc8 .action-btn:hover {
        filter: brightness(1.2);
    }
    .z-card-content-geo {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
        background: #fff;
    }
    .z-card-container .sc8 .card-title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
        color: #000;
        text-transform: uppercase;
    }
    .z-card-container .sc8 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #ff4757;
    }

    /* Showcase 9: Material M3 Dynamic */
    .z-card-container .sc9 {
        background: #fdfcff;
        border-radius: 28px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
        color: #333;
    }
    .z-card-container .sc9:hover {
        background: #eaddff;
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .z-card-container .sc9 .img-box {
        position: relative;
        width: 100%;
        border-radius: 28px 28px 0 0;
        background: #f4eff4;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
        transition: 0.3s;
    }
    .z-card-container .sc9:hover .img-box {
        background: #d0bcff;
    }
    .z-card-container .sc9 .img-box img {
        transition: all 0.5s ease;
    }
    .z-card-container .sc9 .card-actions {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: #fff;
        border-radius: 20px;
        padding: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        transform: scale(0.8);
        opacity: 0;
        display: flex;
        gap: 5px;
        z-index: 10;
        transition: all 0.3s ease;
    }
    .z-card-container .sc9:hover .card-actions {
        transform: scale(1);
        opacity: 1;
    }
    .z-card-container .sc9 .action-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: transparent;
        box-shadow: none;
        color: #6750a4;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }
    .z-card-container .sc9 .action-btn:hover {
        background: #f3edf7;
        transform: scale(1.08);
    }
    .z-card-container .sc9 .card-content {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc9 .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #1c1b1f;
    }
    .z-card-container .sc9 .card-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #6750a4;
    }

    /* Showcase 10: Organic & Wavy */
    .z-card-container .sc10 {
        background: #fbe6d4;
        border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
        padding-top: 1.5rem;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        height: 100%;
        color: #333;
    }
    .z-card-container .sc10:hover {
        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
        background: #f5d3b3;
    }
    .z-card-container .sc10 .img-box {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
        background: transparent;
    }
    .z-card-container .sc10 .img-box img {
        transition: all 0.5s ease;
    }
    .z-card-container .sc10:hover .img-box img {
        transform: rotate(-10deg) scale(1.1);
    }
    .z-card-container .sc10 .card-actions {
        position: absolute;
        top: 20px;
        left: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 10;
    }
    .z-card-container .sc10 .action-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: #fff;
        color: #8e44ad;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translateX(-50px) rotate(-180deg);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .z-card-container .sc10:hover .action-btn {
        transform: translateX(0) rotate(0);
        opacity: 1;
    }
    .z-card-container .sc10 .action-btn:nth-child(1) { transition-delay: 0.05s; }
    .z-card-container .sc10 .action-btn:nth-child(2) { transition-delay: 0.1s; }
    .z-card-container .sc10 .action-btn:nth-child(3) { transition-delay: 0.15s; }
    .z-card-container .sc10 .action-btn:hover {
        background: #8e44ad;
        color: #fff;
        transform: scale(1.1);
    }
    .z-card-container .sc10 .card-content {
        padding: 1rem 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: flex-end;
    }
    .z-card-container .sc10 .card-title {
        font-family: 'Playfair Display', serif;
        font-style: italic;
        text-align: center;
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #333;
    }
    .z-card-container .sc10 .card-price {
        text-align: center;
        color: #8e44ad;
        font-size: 1.1rem;
        font-weight: 800;
    }

    @media (max-width: 640px) {
        /* General scaling overrides for 2-column mobile view */
        .grid-cols-2 .z-card-container .aic {
            opacity: 1 !important;
            transform: none !important;
            right: 4px !important;
            top: 4px !important;
            gap: 4px !important;
        }
        .grid-cols-2 .z-card-container .ai {
            width: 24px !important;
            height: 24px !important;
        }
        .grid-cols-2 .z-card-container .ai svg {
            width: 11px !important;
            height: 11px !important;
        }
        .grid-cols-2 .z-card-container .bdg-container {
            top: 6px !important;
            left: 6px !important;
            gap: 2px !important;
        }
        .grid-cols-2 .z-card-container .bdg {
            padding: 2px 6px !important;
            font-size: 0.5rem !important;
        }


        /* Showcase Overrides (Showcase 1 to Showcase 10) */
        .grid-cols-2 .z-card-container .sc1,
        .grid-cols-2 .z-card-container .sc2,
        .grid-cols-2 .z-card-container .sc3,
        .grid-cols-2 .z-card-container .sc4,
        .grid-cols-2 .z-card-container .sc5,
        .grid-cols-2 .z-card-container .sc6,
        .grid-cols-2 .z-card-container .sc7,
        .grid-cols-2 .z-card-container .sc8,
        .grid-cols-2 .z-card-container .sc9,
        .grid-cols-2 .z-card-container .sc10 {
            padding: 6px !important;
        }

        .grid-cols-2 .z-card-container .sc1 .img-box,
        .grid-cols-2 .z-card-container .sc2 .img-box,
        .grid-cols-2 .z-card-container .sc3 .img-box,
        .grid-cols-2 .z-card-container .sc4 .img-box,
        .grid-cols-2 .z-card-container .sc5 .img-box,
        .grid-cols-2 .z-card-container .sc6 .img-box,
        .grid-cols-2 .z-card-container .sc7 .img-box,
        .grid-cols-2 .z-card-container .sc8 .img-box,
        .grid-cols-2 .z-card-container .sc9 .img-box,
        .grid-cols-2 .z-card-container .sc10 .img-box {
            padding: 6px !important;
        }

        .grid-cols-2 .z-card-container .sc1 .card-content,
        .grid-cols-2 .z-card-container .sc2 .card-content,
        .grid-cols-2 .z-card-container .sc3 .card-content,
        .grid-cols-2 .z-card-container .sc4 .card-content,
        .grid-cols-2 .z-card-container .sc5 .card-content,
        .grid-cols-2 .z-card-container .sc6 .card-content,
        .grid-cols-2 .z-card-container .sc7 .card-content,
        .grid-cols-2 .z-card-container .z-card-content-geo,
        .grid-cols-2 .z-card-container .sc9 .card-content,
        .grid-cols-2 .z-card-container .sc10 .card-content {
            padding: 6px 0 0 0 !important;
        }

        .grid-cols-2 .z-card-container .sc1 .card-title,
        .grid-cols-2 .z-card-container .sc2 .card-title,
        .grid-cols-2 .z-card-container .sc3 .card-title,
        .grid-cols-2 .z-card-container .sc4 .card-title,
        .grid-cols-2 .z-card-container .sc5 .card-title,
        .grid-cols-2 .z-card-container .sc6 .card-title,
        .grid-cols-2 .z-card-container .sc7 .card-title,
        .grid-cols-2 .z-card-container .sc8 .card-title,
        .grid-cols-2 .z-card-container .sc9 .card-title,
        .grid-cols-2 .z-card-container .sc10 .card-title {
            font-size: 0.72rem !important;
            line-height: 1.25 !important;
        }

        .grid-cols-2 .z-card-container .sc1 .card-price,
        .grid-cols-2 .z-card-container .sc2 .card-price,
        .grid-cols-2 .z-card-container .sc3 .card-price,
        .grid-cols-2 .z-card-container .sc4 .card-price,
        .grid-cols-2 .z-card-container .sc5 .card-price,
        .grid-cols-2 .z-card-container .sc6 .card-price,
        .grid-cols-2 .z-card-container .sc7 .card-price,
        .grid-cols-2 .z-card-container .sc8 .card-price,
        .grid-cols-2 .z-card-container .sc9 .card-price,
        .grid-cols-2 .z-card-container .sc10 .card-price {
            font-size: 0.82rem !important;
        }

        /* Showcase-specific layout tweaks */
        .grid-cols-2 .z-card-container .sc3-wrap {
            padding: 6px !important;
            border-radius: 12px !important;
        }
        .grid-cols-2 .z-card-container .sc3 {
            border-radius: 10px !important;
        }
        .grid-cols-2 .z-card-container .sc4 {
            border-radius: 16px !important;
        }
        .grid-cols-2 .z-card-container .sc9 {
            border-radius: 16px !important;
        }
        .grid-cols-2 .z-card-container .sc9 .img-box {
            border-radius: 16px 16px 0 0 !important;
        }
        .grid-cols-2 .z-card-container .sc10 {
            padding-top: 0.75rem !important;
            border-radius: 20px !important;
        }

        /* Actions visibility and sizing on touch devices */
        .grid-cols-2 .z-card-container .sc1 .card-actions,
        .grid-cols-2 .z-card-container .sc2 .card-actions,
        .grid-cols-2 .z-card-container .sc3 .card-actions,
        .grid-cols-2 .z-card-container .sc4 .card-actions,
        .grid-cols-2 .z-card-container .sc5 .card-actions,
        .grid-cols-2 .z-card-container .sc6 .card-actions,
        .grid-cols-2 .z-card-container .sc7 .card-actions,
        .grid-cols-2 .z-card-container .sc8 .card-actions,
        .grid-cols-2 .z-card-container .sc9 .card-actions,
        .grid-cols-2 .z-card-container .sc10 .card-actions {
            opacity: 1 !important;
            display: flex !important;
        }
        
        .grid-cols-2 .z-card-container .sc1 .action-btn,
        .grid-cols-2 .z-card-container .sc2 .action-btn,
        .grid-cols-2 .z-card-container .sc3 .action-btn,
        .grid-cols-2 .z-card-container .sc4 .action-btn,
        .grid-cols-2 .z-card-container .sc5 .action-btn,
        .grid-cols-2 .z-card-container .sc6 .action-btn,
        .grid-cols-2 .z-card-container .sc7 .action-btn,
        .grid-cols-2 .z-card-container .sc8 .action-btn,
        .grid-cols-2 .z-card-container .sc9 .action-btn,
        .grid-cols-2 .z-card-container .sc10 .action-btn {
            width: 26px !important;
            height: 26px !important;
            font-size: 0.75rem !important;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.1) !important;
        }
        .grid-cols-2 .z-card-container .sc1 .action-btn svg,
        .grid-cols-2 .z-card-container .sc2 .action-btn svg,
        .grid-cols-2 .z-card-container .sc3 .action-btn svg,
        .grid-cols-2 .z-card-container .sc4 .action-btn svg,
        .grid-cols-2 .z-card-container .sc5 .action-btn svg,
        .grid-cols-2 .z-card-container .sc6 .action-btn svg,
        .grid-cols-2 .z-card-container .sc7 .action-btn svg,
        .grid-cols-2 .z-card-container .sc8 .action-btn svg,
        .grid-cols-2 .z-card-container .sc9 .action-btn svg,
        .grid-cols-2 .z-card-container .sc10 .action-btn svg {
            width: 12px !important;
            height: 12px !important;
        }
        
        .grid-cols-2 .z-card-container .sc1 .card-actions { bottom: 6px !important; left: 50% !important; transform: translateX(-50%) !important; }
        .grid-cols-2 .z-card-container .sc2 .card-actions { top: 6px !important; right: 6px !important; }
        .grid-cols-2 .z-card-container .sc3 .card-actions { bottom: 6px !important; left: 50% !important; transform: translateX(-50%) scale(1) !important; padding: 4px !important; }
        .grid-cols-2 .z-card-container .sc4 .card-actions { top: 6px !important; left: 50% !important; transform: translateX(-50%) !important; }
        .grid-cols-2 .z-card-container .sc5 .card-actions { bottom: 6px !important; right: 6px !important; }
        .grid-cols-2 .z-card-container .sc5 .action-btn { transform: none !important; opacity: 1 !important; }
        .grid-cols-2 .z-card-container .sc6 .card-actions { bottom: 0 !important; left: 0 !important; transform: none !important; padding: 6px 0 !important; gap: 8px !important; }
        .grid-cols-2 .z-card-container .sc7 .card-actions { top: 6px !important; right: 6px !important; }
        .grid-cols-2 .z-card-container .sc8 .card-actions { bottom: -8px !important; right: 8px !important; }
        .grid-cols-2 .z-card-container .sc8 .action-btn { transform: none !important; opacity: 1 !important; }
        .grid-cols-2 .z-card-container .sc9 .card-actions { bottom: 6px !important; left: 6px !important; transform: scale(1) !important; opacity: 1 !important; padding: 3px !important; }
        .grid-cols-2 .z-card-container .sc10 .card-actions { top: 6px !important; left: 6px !important; }
        .grid-cols-2 .z-card-container .sc10 .action-btn { transform: none !important; opacity: 1 !important; }
    }
  `;

  const stylesInjected = <style dangerouslySetInnerHTML={{ __html: customCss }} />;

  // Shared optimized images renderer respecting dynamic aspect ratio and hover style settings
  const renderCardImages = (fitClass: 'object-contain' | 'object-cover' = 'object-contain') => {
    const zoomClass = settings?.imageHoverStyle === 'zoom' 
      ? (touchActive ? 'scale-105' : 'group-hover:scale-105 group-active:scale-105') 
      : '';
    const fadeClass = (secondImage && !hoveredImage) 
      ? (touchActive ? 'opacity-0' : 'opacity-100 group-hover:opacity-0 group-active:opacity-0') 
      : '';

    return (
      <>
        <Image
          src={activeImage}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className={`${fitClass} transition-transform duration-500 ${zoomClass} ${fadeClass}`}
          priority={false}
          loading="lazy"
        />
        {secondImage && !hoveredImage && (
          <Image
            src={secondImage}
            alt={`${product.name} alternate`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={`${fitClass} absolute inset-0 transition-opacity duration-500 ${touchActive ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 group-active:opacity-100`}
            priority={false}
            loading="lazy"
          />
        )}
      </>
    );
  };

  // Shared optimized content block renderer respecting element ordering, alignment, and display toggles
  const renderShowcaseContent = (styleClass: string) => {
    const starsColor = 
      styleClass === 'sc2' ? 'rgba(255,255,255,.8)' : 
      styleClass === 'sc3' ? 'rgba(255,255,255,.9)' : 
      styleClass === 'sc4' ? '#ffeaa7' : 
      styleClass === 'sc6' ? '#d4af37' : 
      styleClass === 'sc7' ? '#000' :
      styleClass === 'sc8' ? '#000' :
      styleClass === 'sc9' ? '#6750a4' :
      styleClass === 'sc10' ? '#8e44ad' :
      '#f59e0b';
    
    const countColor = 
      styleClass === 'sc2' ? 'rgba(255,255,255,.4)' : 
      styleClass === 'sc3' ? 'rgba(255,255,255,.5)' : 
      styleClass === 'sc4' ? 'rgba(255,255,255,.6)' : 
      styleClass === 'sc7' ? '#555' :
      styleClass === 'sc8' ? '#666' :
      styleClass === 'sc9' ? '#666' :
      '#888';

    const poldStyle = 
      styleClass === 'sc2' ? { color: 'rgba(255,255,255,.5)' } : 
      styleClass === 'sc3' ? { color: 'rgba(255,255,255,.6)' } : 
      styleClass === 'sc4' ? { color: 'rgba(255,255,255,.6)' } : 
      styleClass === 'sc6' ? { color: 'rgba(255,255,255,.4)' } : 
      undefined;

    const descClass = 
      styleClass === 'sc2' ? 'text-white/70' : 
      styleClass === 'sc3' ? 'text-white/80' : 
      styleClass === 'sc4' ? 'text-white/80' : 
      styleClass === 'sc6' ? 'text-[#d4af37]/70' : 
      styleClass === 'sc7' ? 'text-gray-700' : 
      styleClass === 'sc8' ? 'text-gray-500' : 
      styleClass === 'sc10' ? 'text-gray-500' : 
      'text-gray-500';

    const contentClass = styleClass === 'sc8' 
      ? 'z-card-content-geo flex-grow flex flex-col justify-end' 
      : 'card-content';

    return (
      <div className={`${contentClass} ${alignClass}`}>
        {elementsOrder.map(element => {
          switch (element) {
            case 'title':
              return (
                <h3 key="title" className={`card-title ${titleClampClass}`}>
                  {product.name}
                </h3>
              );
            case 'rating':
              if (!showStars) return null;
              return (
                <div key="rating" className="rat">
                  <span className="st" style={{ color: starsColor }}>
                    {Array.from({ length: 5 }).map((_, idx) => idx < Math.round(product.rating || 5) ? '★' : '☆').join('')}
                  </span>
                  <span className="rc" style={{ color: countColor }}>({product.reviewsCount || 0})</span>
                </div>
              );
            case 'price':
              return (
                <div key="price" className="prow">
                  {currentComparePrice && currentComparePrice > currentPrice && (
                    <span className="pold mr-1.5" style={poldStyle}>
                      {formatPrice(currentComparePrice, currencySymbol)}
                    </span>
                  )}
                  <span className="card-price">{formatPrice(currentPrice, currencySymbol)}</span>
                </div>
              );
            case 'swatches':
              if (product.showSwatchesOnArchive === false || finalRenderedGroups.length === 0) return null;
              return (
                <div key="swatches" className="w-full mt-2" onClick={(e) => e.preventDefault()}>
                  {finalRenderedGroups}
                </div>
              );
            default:
              return null;
          }
        })}

        {displayDescription && (
          <p className={`text-[10px] line-clamp-2 mt-1 mb-2 leading-relaxed ${descClass}`}>
            {displayDescription}
          </p>
        )}
      </div>
    );
  };

  // Showcase 1: Neumorphic Soft UI (Grey Theme)
  if (activeStyle === 'showcase_1') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc1 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc1')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 2: Color Block Neon
  if (activeStyle === 'showcase_2') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc2 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc2')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 3: Glassmorphism Glow
  if (activeStyle === 'showcase_3') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <div className="sc3-wrap">
            <Link
              id={`product-card-${product.id}`}
              href={`/product/${product.slug}`}
              onClick={() => saveScrollPosition(product.id)}
              onTouchStart={() => setTouchActive(true)}
              onTouchEnd={() => setTouchActive(false)}
              onTouchCancel={() => setTouchActive(false)}
              className="sc3 group relative"
            >
              <div className={`img-box relative ${aspectClass} w-full`}>
                {renderCardBadge()}
                {renderCardImages('object-contain')}
                <div className="card-actions" onClick={(e) => e.preventDefault()}>
                  {showWishlist && (
                    <button
                      type="button"
                      onClick={handleToggleWishlist}
                      className="action-btn animate-fade-in"
                      title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  )}
                  {showQuickview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setQuickViewOpen(true);
                      }}
                      className="action-btn animate-fade-in"
                      title="Quick View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {showQuickcart && (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="action-btn animate-fade-in"
                      title="Add to Cart"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {renderShowcaseContent('sc3')}
            </Link>
          </div>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 4: Claymorphism Coral
  if (activeStyle === 'showcase_4') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc4 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full bg-[#fcefee]`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc4')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 5: Detailed E-Commerce
  if (activeStyle === 'showcase_5') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc5 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc5')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 6: Dark Elegance Gold
  if (activeStyle === 'showcase_6') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc6 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc6')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 7: Typographic Brutalist
  if (activeStyle === 'showcase_7') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc7 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc7')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 8: Geometric Mondrian
  if (activeStyle === 'showcase_8') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc8 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc8')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 9: Material M3 Dynamic
  if (activeStyle === 'showcase_9') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc9 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full bg-[#f0f4f9] rounded-2xl`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc9')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }

  // Showcase 10: Organic & Wavy
  if (activeStyle === 'showcase_10') {
    return (
      <>
        {stylesInjected}
        <div className="z-card-container flex flex-col h-full">
          <Link
            id={`product-card-${product.id}`}
            href={`/product/${product.slug}`}
            onClick={() => saveScrollPosition(product.id)}
            onTouchStart={() => setTouchActive(true)}
            onTouchEnd={() => setTouchActive(false)}
            onTouchCancel={() => setTouchActive(false)}
            className="sc10 group relative"
          >
            <div className={`img-box relative ${aspectClass} w-full`}>
              {renderCardBadge()}
              {renderCardImages('object-contain')}
              <div className="card-actions" onClick={(e) => e.preventDefault()}>
                {showWishlist && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="action-btn animate-fade-in"
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                {showQuickview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickViewOpen(true);
                    }}
                    className="action-btn animate-fade-in"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {showQuickcart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="action-btn animate-fade-in"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {renderShowcaseContent('sc10')}
          </Link>
        </div>
        {quickViewOpen && settings && (
          <QuickViewModal
            product={product}
            settings={settings}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </>
    );
  }















  // 00. DEFAULT STANDARD CARD STYLE (style1)
  return (
    <>
      <Link
        id={`product-card-${product.id}`}
        href={`/product/${product.slug}`}
        onClick={() => saveScrollPosition(product.id)}
        onTouchStart={() => setTouchActive(true)}
        onTouchEnd={() => setTouchActive(false)}
        onTouchCancel={() => setTouchActive(false)}
        className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] shadow-sm hover:shadow-md transition-all duration-300"
      >
        <div className={`relative ${aspectClass} w-full overflow-hidden bg-gray-50 dark:bg-black/10`}>
          <Image
            src={activeImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={`object-cover object-center transition-transform duration-500 ${settings?.imageHoverStyle === 'zoom' ? (touchActive ? 'scale-105' : 'group-hover:scale-105 group-active:scale-105') : ''} ${secondImage && !hoveredImage ? (touchActive ? 'opacity-0' : 'opacity-100 group-hover:opacity-0 group-active:opacity-0') : ''}`}
            priority={false}
            loading="lazy"
          />
          {secondImage && !hoveredImage && (
            <Image
              src={secondImage}
              alt={`${product.name} alternate`}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={`object-cover object-center absolute inset-0 transition-opacity duration-500 ${touchActive ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 group-active:opacity-100`}
              priority={false}
              loading="lazy"
            />
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 items-start pointer-events-none">
            {currentComparePrice && currentComparePrice > currentPrice && (
              <span className="rounded-full bg-[#e94560] px-2.5 py-0.5 text-[9px] font-black text-white shadow-sm uppercase tracking-wide">
                -{Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)}%
              </span>
            )}
            {product.isFeatured && (
              <span className="rounded-full bg-[#1a1a2e] px-2.5 py-0.5 text-[9px] font-black text-white shadow-sm uppercase tracking-wide">
                FEATURED
              </span>
            )}
            {product.badgeEnabled && product.customBadge && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[9px] font-black text-white shadow-sm uppercase tracking-wide"
                style={{
                  backgroundColor: product.customBadge.bgColor,
                  color: product.customBadge.textColor
                }}
              >
                {product.customBadge.name}
              </span>
            )}
            {!product.isService && product.stock > 0 && product.stock <= 8 && (
              <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[9px] font-black text-white shadow-sm uppercase tracking-wide">
                LIMITED
              </span>
            )}
          </div>

          <div className="absolute right-2 top-2.5 flex flex-col gap-1.5 z-20 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            {showWishlist && (
              <button
                type="button"
                onClick={handleToggleWishlist}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#16162a] shadow-md border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-[#e94560] dark:hover:text-[#e94560] transition-all cursor-pointer active:scale-90"
                title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart className={`h-3.5 w-3.5 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            )}

            {showQuickview && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuickViewOpen(true);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#16162a] shadow-md border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-[#e94560] dark:hover:text-[#e94560] transition-all cursor-pointer active:scale-90"
                title="Quick View"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}

            {showQuickcart && (
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#16162a] shadow-md border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-[#e94560] dark:hover:text-[#e94560] transition-all cursor-pointer active:scale-90"
                title={product.hasVariants ? "Choose Options" : "Add to Cart"}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className={`flex flex-grow flex-col p-2.5 sm:p-3 ${alignClass}`}>
          {elementsOrder.filter(el => el !== 'swatches').map(element => renderElement(element))}
          {displayDescription && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
              {displayDescription}
            </p>
          )}
          <div className="w-full opacity-100 max-h-[200px] overflow-hidden mt-2">
            {elementsOrder.includes('swatches') && renderElement('swatches')}
          </div>
        </div>
      </Link>

      {/* Quick View Modal */}
      {quickViewOpen && settings && (
        <QuickViewModal
          product={product}
          settings={settings}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
