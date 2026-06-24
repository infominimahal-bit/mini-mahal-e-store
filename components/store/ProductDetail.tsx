'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Heart,
  Share2,
  Eye,
  HelpCircle,
  Copy,
  X,
  Package,
  Truck,
  Tag,
  ZoomIn,
  Clock,
  Play,
  Ruler
} from '@/components/common/Icons';
import { StoreSettings, Product, ProductVariant, ProductModifier, PaymentMethod } from '@/lib/types';
import { getProductsClient } from '@/lib/services/products-client';
import PaymentBadges from '@/components/common/PaymentBadges';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, cleanWhatsAppPhone } from '@/lib/utils/whatsapp';
import { toast } from 'sonner';
import VariantSelector from './VariantSelector';
import { trackEvent } from '@/lib/trackEvent';
import { animateFlyTo } from '@/lib/utils/flyAnimation';

interface ProductDetailProps {
  product: Product;
  settings: StoreSettings;
  averageRating?: { average: number; count: number };
  socialProofCount?: number;
}

const isHtml = (str: string) => /<[a-z][\s\S]*>/i.test(str);

export default function ProductDetail({ product, settings, averageRating, socialProofCount = 0 }: ProductDetailProps) {
  const addItem = useCartStore(state => state.addItem);
  const sizeGuide = product.sizeGuide;

  // Images setup
  const images = React.useMemo(() => {
    return product.images.length > 0
      ? [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
      : [{ id: 'dummy', productId: product.id, url: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3C/svg%3E", alt: product.name, sortOrder: 0, isPrimary: true, createdAt: '' }];
  }, [product.images, product.id, product.name]);

  const [activeImage, setActiveImage] = useState(images.find(img => img.isPrimary)?.url || images[0].url);
  const [activeImageIndex, setActiveImageIndex] = useState(
    Math.max(0, images.findIndex(img => img.url === (images.find(i => i.isPrimary)?.url || images[0].url)))
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const fallbackPlaceholder = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3C/svg%3E";

  // Lightbox Zoom and Pan states
  const [lightboxZoomScale, setLightboxZoomScale] = useState(1);
  const [lightboxZoomPos, setLightboxZoomPos] = useState({ x: 0, y: 0 });
  const [lightboxIsDragging, setLightboxIsDragging] = useState(false);
  const lightboxDragStart = useRef({ x: 0, y: 0 });
  const lightboxWasDragging = useRef(false);
  const lightboxTouchStartPos = useRef({ x: 0, y: 0 });
  const lastTap = useRef<number | null>(null);
  const initialPinchDistance = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(1);


  const resetLightboxZoom = () => {
    setLightboxZoomScale(1);
    setLightboxZoomPos({ x: 0, y: 0 });
    setLightboxIsDragging(false);
    lightboxWasDragging.current = false;
  };

  const handleLightboxZoomIn = () => {
    setLightboxZoomScale(prev => Math.min(prev + 0.5, 4.0));
  };

  const handleLightboxZoomOut = () => {
    setLightboxZoomScale(prev => {
      const next = Math.max(prev - 0.5, 1.0);
      if (next === 1.0) {
        setLightboxZoomPos({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Reset zoom on active image index change or lightbox close
  useEffect(() => {
    resetLightboxZoom();
  }, [activeImageIndex, lightboxOpen]);

  // Mouse handlers for desktop dragging
  const handleLightboxMouseDown = (e: React.MouseEvent) => {
    if (lightboxZoomScale <= 1) return;
    setLightboxIsDragging(true);
    lightboxWasDragging.current = false;
    lightboxDragStart.current = {
      x: e.clientX - lightboxZoomPos.x,
      y: e.clientY - lightboxZoomPos.y
    };
  };

  const handleLightboxMouseMove = (e: React.MouseEvent) => {
    if (!lightboxIsDragging || lightboxZoomScale <= 1) return;
    const newX = e.clientX - lightboxDragStart.current.x;
    const newY = e.clientY - lightboxDragStart.current.y;
    lightboxWasDragging.current = true;
    setLightboxZoomPos({ x: newX, y: newY });
  };

  const handleLightboxMouseUp = () => {
    setLightboxIsDragging(false);
  };

  // Embla carousel for mobile touch swipe
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true
  });

  // Keep activeImageIndex in sync when user swipes
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setActiveImageIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Lightbox swipe gesture handlers
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.targetTouches.length === 2) {
      // Pinch gesture start
      const dx = e.targetTouches[0].clientX - e.targetTouches[1].clientX;
      const dy = e.targetTouches[0].clientY - e.targetTouches[1].clientY;
      initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      initialPinchScale.current = lightboxZoomScale;
      setLightboxIsDragging(false);
    } else if (e.targetTouches.length === 1) {
      if (lightboxZoomScale > 1) {
        setLightboxIsDragging(true);
        lightboxWasDragging.current = false;
        lightboxDragStart.current = {
          x: e.targetTouches[0].clientX - lightboxZoomPos.x,
          y: e.targetTouches[0].clientY - lightboxZoomPos.y
        };
        lightboxTouchStartPos.current = {
          x: e.targetTouches[0].clientX,
          y: e.targetTouches[0].clientY
        };
      } else {
        touchStartX.current = e.targetTouches[0].clientX;
        touchEndX.current = 0; // Reset on new touch
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches.length === 2 && initialPinchDistance.current !== null) {
      // Pinching
      const dx = e.targetTouches[0].clientX - e.targetTouches[1].clientX;
      const dy = e.targetTouches[0].clientY - e.targetTouches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const factor = currentDist / initialPinchDistance.current;
      const newScale = Math.max(1, Math.min(4, initialPinchScale.current * factor));
      setLightboxZoomScale(newScale);
      if (newScale === 1) {
        setLightboxZoomPos({ x: 0, y: 0 });
      }
    } else if (e.targetTouches.length === 1) {
      if (lightboxZoomScale > 1) {
        if (!lightboxIsDragging) return;
        const newX = e.targetTouches[0].clientX - lightboxDragStart.current.x;
        const newY = e.targetTouches[0].clientY - lightboxDragStart.current.y;

        const dx = Math.abs(e.targetTouches[0].clientX - lightboxTouchStartPos.current.x);
        const dy = Math.abs(e.targetTouches[0].clientY - lightboxTouchStartPos.current.y);
        if (dx > 5 || dy > 5) {
          lightboxWasDragging.current = true;
        }
        setLightboxZoomPos({ x: newX, y: newY });
      } else {
        touchEndX.current = e.targetTouches[0].clientX;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.targetTouches.length < 2) {
      initialPinchDistance.current = null;
    }

    if (lightboxZoomScale > 1) {
      setLightboxIsDragging(false);
    } else {
      if (images.length <= 1) return;
      if (touchEndX.current === 0) {
        touchStartX.current = 0;
        touchEndX.current = 0;
        return;
      }
      const diff = touchStartX.current - touchEndX.current;
      const swipeThreshold = 50; // min px to trigger swipe
      if (diff > swipeThreshold) {
        setActiveImageIndex(i => (i + 1) % images.length);
      } else if (diff < -swipeThreshold) {
        setActiveImageIndex(i => (i - 1 + images.length) % images.length);
      }
      touchStartX.current = 0;
      touchEndX.current = 0;
    }
  };

  // Selection states
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.hasVariants && product.variants.length > 0
      ? product.variants.filter(v => v.active)[0]
      : undefined
  );

  const [selectedModifiers, setSelectedModifiers] = useState<ProductModifier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeDetailTab, setActiveDetailTab] = useState<'description' | 'faq' | 'returns'>('description');
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const handleVariantChange = useCallback((v: ProductVariant) => {
    setSelectedVariant(v);
    if (v.imageUrl) {
      // Try to match the variant image to one of the gallery images
      const idx = images.findIndex(img => img.url === v.imageUrl);
      if (idx !== -1) {
        // Found — switch gallery to that index so arrows work from here
        emblaApi?.scrollTo(idx);
      } else {
        // Variant image not in gallery — keep current index, just update activeImage fallback
        setActiveImage(v.imageUrl);
      }
    }
  }, [images, emblaApi]);

  // Client-side states (avoid hydration mismatch)
  const [mounted, setMounted] = useState(false);
  const [viewerCount, setViewerCount] = useState(23);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [productUrl, setProductUrl] = useState('');

  // Flash Sale Timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: true, isIncoming: false, isInfinite: false });

  // Bundle states
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  // Per-bundle variant selection: map from product id → selected variant id
  const [bundleVariantSelections, setBundleVariantSelections] = useState<Record<string, string>>({});

  // Size Guide state
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Dynamic social feed items
  const parsedFeeds = React.useMemo(() => {
    const items = settings.social_feeds_items;
    if (!items) return [];
    try {
      const arr = typeof items === 'string' ? JSON.parse(items) : items;
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, [settings.social_feeds_items]);

  useEffect(() => {
    setMounted(true);
    const min = settings.minViews ?? 10;
    const max = settings.maxViews ?? 50;
    setViewerCount(Math.floor(Math.random() * (max - min + 1)) + min);
    setProductUrl(window.location.href);
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    setIsWishlisted(wishlist.includes(product.id));

    // Track initial ViewContent event if product has no active variants
    if (!product.hasVariants || !product.variants || product.variants.filter(v => v.active).length === 0) {
      trackEvent('ViewContent', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price,
        currency: settings.currency || 'PKR'
      });
    }

    // Update recently viewed products in localStorage
    try {
      const recentStr = localStorage.getItem('recently-viewed') || '[]';
      const recent: string[] = JSON.parse(recentStr);
      const filtered = recent.filter(id => id !== product.id);
      const updated = [product.id, ...filtered].slice(0, 10);
      localStorage.setItem('recently-viewed', JSON.stringify(updated));
      window.dispatchEvent(new Event('recently-viewed-updated'));
    } catch (err) {
      console.error('Failed to update recently viewed:', err);
    }

    // Fetch products for bundle recommendations — ONLY show if admin explicitly selected FBT products
    const loadBundleData = async () => {
      try {
        if (product.frequentlyBoughtTogetherIds && product.frequentlyBoughtTogetherIds.length > 0) {
          const data = await getProductsClient();
          const filtered = data.filter((p: Product) => product.frequentlyBoughtTogetherIds?.includes(p.id));
          setBundleProducts(filtered);
          setSelectedBundleIds(filtered.map((p: Product) => p.id));
          // Default each bundle product's variant to its first active variant
          const defaultSelections: Record<string, string> = {};
          filtered.forEach((p: Product) => {
            if (p.hasVariants && p.variants.length > 0) {
              const firstActive = p.variants.filter(v => v.active)[0];
              if (firstActive) defaultSelections[p.id] = firstActive.id;
            }
          });
          setBundleVariantSelections(defaultSelections);
        }
        // No fallback — if FBT not set, section stays hidden (bundleProducts = [])
      } catch (err) {
        console.error('Failed to load bundle products:', err);
      }
    };
    loadBundleData();

    // Timer countdown loop
    const updateTimeLeft = () => {
      let isFlashSaleActive = false;
      let targetDateStr: string | undefined = undefined;
      let isIncoming = false;
      let isInfinite = false;

      const now = new Date().getTime();

      // Check product level first
      const prodStart = product.flashSaleStartDate ? new Date(product.flashSaleStartDate).getTime() : 0;
      const prodEnd = product.flashSaleEndDate ? new Date(product.flashSaleEndDate).getTime() : 0;

      if (product.flashSaleEnabled) {
        if (!product.flashSaleStartDate && !product.flashSaleEndDate) {
          isFlashSaleActive = true;
          isInfinite = true;
        } else if (prodEnd > now || (prodStart > now && prodEnd === 0)) {
          isFlashSaleActive = true;
          if (prodStart > now) {
            isIncoming = true;
            targetDateStr = product.flashSaleStartDate!;
          } else {
            targetDateStr = product.flashSaleEndDate;
          }
        }
      } else if (settings.flash_sale_enabled) {
        // Fallback to global settings
        const globalStart = settings.flash_sale_start_date ? new Date(settings.flash_sale_start_date).getTime() : 0;
        const globalEnd = settings.flash_sale_end_date ? new Date(settings.flash_sale_end_date).getTime() : 0;

        if (!settings.flash_sale_start_date && !settings.flash_sale_end_date) {
          isFlashSaleActive = true;
          isInfinite = true;
        } else if (globalEnd > now || (globalStart > now && globalEnd === 0)) {
          isFlashSaleActive = true;
          if (globalStart > now) {
            isIncoming = true;
            targetDateStr = settings.flash_sale_start_date;
          } else {
            targetDateStr = settings.flash_sale_end_date;
          }
        }
      }

      if (!isFlashSaleActive) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true, isIncoming: false, isInfinite: false });
        return;
      }

      if (isInfinite) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: false, isIncoming: false, isInfinite: true });
        return;
      }

      // Fallback: End of today if no target end date is set
      if (!targetDateStr) {
        const midnight = new Date();
        midnight.setHours(23, 59, 59, 999);
        targetDateStr = midnight.toISOString();
      }

      const targetTime = new Date(targetDateStr).getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true, isIncoming: false, isInfinite: false });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, expired: false, isIncoming, isInfinite: false });
    };

    updateTimeLeft();
    const countdownTimer = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(countdownTimer);
  }, [product.id, settings.minViews, settings.maxViews, product.categoryId, product.flashSaleEnabled, product.flashSaleStartDate, product.flashSaleEndDate, product.frequentlyBoughtTogetherIds, settings.flash_sale_enabled, settings.flash_sale_start_date, settings.flash_sale_end_date]);

  // Track ViewContent whenever active variant changes
  useEffect(() => {
    if (!mounted || !selectedVariant) return;
    trackEvent('ViewContent', {
      content_ids: [selectedVariant.id],
      content_name: `${product.name} - ${[selectedVariant.color, selectedVariant.size].filter(Boolean).join(', ')}`,
      content_type: 'product',
      value: selectedVariant.price || product.price,
      currency: settings.currency || 'PKR'
    });
  }, [selectedVariant, mounted, product.name, product.price, settings.currency]);

  const handleAddBundleToCart = () => {
    // Add main product
    addItem(product, selectedVariant, selectedModifiers, 1);
    // Add selected bundle products — use the chosen variant if product has variants
    bundleProducts.forEach(bp => {
      if (selectedBundleIds.includes(bp.id)) {
        let chosenVariant: ProductVariant | undefined = undefined;
        if (bp.hasVariants && bp.variants.length > 0) {
          const selectedVarId = bundleVariantSelections[bp.id];
          chosenVariant = bp.variants.find(v => v.id === selectedVarId && v.active)
            ?? bp.variants.filter(v => v.active)[0];
        }
        addItem(bp, chosenVariant, [], 1);
      }
    });

    // Track AddToCart for bundle
    const totalBundleValue = (selectedVariant?.price ?? product.price) +
      bundleProducts
        .filter(p => selectedBundleIds.includes(p.id))
        .reduce((sum, p) => sum + p.price, 0);
    const bundleIds = [selectedVariant?.id || product.id, ...bundleProducts.filter(p => selectedBundleIds.includes(p.id)).map(p => p.id)];
    trackEvent('AddToCart', {
      content_ids: bundleIds,
      content_name: `${product.name} Bundle`,
      content_type: 'product',
      value: totalBundleValue,
      currency: settings.currency || 'PKR'
    });

    toast.success('Successfully added bundle items to cart!');
  };

  // Price calculations
  const activeVariants = product.variants.filter(v => v.active);
  const activePrices = activeVariants.map(v => v.price).filter((p): p is number => typeof p === 'number' && p > 0);
  const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : product.price;
  const maxPrice = activePrices.length > 0 ? Math.max(...activePrices) : product.price;
  const hasPriceRange = minPrice !== maxPrice;

  const basePrice = selectedVariant?.price ?? product.price;
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
  const unitPrice = basePrice + modifiersTotal;

  // Stock check
  const stockAvailable = product.isService
    ? 999
    : (selectedVariant ? selectedVariant.stock : product.stock);

  // Ratings calculation — always prefer live averageRating (only approved reviews)
  // product.reviewsCount can be stale/0; averageRating is computed live from approved rows
  // socialProofCount adds custom proof wall entries as 5-star ratings
  const displayRating = (averageRating && averageRating.count > 0) ? averageRating.average : (product.rating ?? 5);
  const displayCount = (averageRating ? averageRating.count : (product.reviewsCount ?? 0)) + socialProofCount;

  const handleModifierToggle = (modifier: ProductModifier) => {
    setSelectedModifiers(prev =>
      prev.some(m => m.id === modifier.id)
        ? prev.filter(m => m.id !== modifier.id)
        : [...prev, modifier]
    );
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    if (quantity > stockAvailable) {
      toast.error(`Only ${stockAvailable} items left in stock`);
      return;
    }
    addItem(product, selectedVariant, selectedModifiers, quantity);

    // Track AddToCart event (sending the specific selected variant ID or product ID)
    const activeId = selectedVariant?.id || product.id;
    trackEvent('AddToCart', {
      content_ids: [activeId],
      content_name: product.name,
      content_type: 'product',
      value: unitPrice * quantity,
      currency: settings.currency || 'PKR'
    });

    toast.success(`${product.name} added to cart!`);

    // Trigger fly animation
    const imageUrl = selectedVariant?.imageUrl || product.images.find(img => img.isPrimary)?.url || product.images[0]?.url;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const targetId = isMobile ? 'header-cart-icon-mobile' : 'header-cart-icon-desktop';
    animateFlyTo(e.currentTarget as HTMLElement, targetId, imageUrl);
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let newWishlist;
    if (wishlist.includes(product.id)) {
      newWishlist = wishlist.filter((id: string) => id !== product.id);
      setIsWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      newWishlist = [...wishlist, product.id];
      setIsWishlisted(true);
      toast.success('Added to wishlist');

      // Trigger fly animation for adding to wishlist
      const imageUrl = selectedVariant?.imageUrl || product.images.find(img => img.isPrimary)?.url || product.images[0]?.url;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const targetId = isMobile ? 'mobile-bottom-wishlist-icon' : 'header-wishlist-icon-desktop';
      animateFlyTo(e.currentTarget as HTMLElement, targetId, imageUrl);
    }
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = `https://wa.me/${cleanWhatsAppPhone(settings.whatsappNumber)}?text=${encodeURIComponent(`Hello, I have a question about ${product.name}: ${productUrl}`)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Back button */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors">
        <ChevronLeft className="h-4 w-4" />
        <span>Back to Shop</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 bg-white dark:bg-[#16162a] p-5 md:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-gray-900 dark:text-white transition-colors">
        {/* Gallery */}
        <div className="space-y-3">
          {/* Main image with arrows + hover zoom */}
          <div
            ref={imgContainerRef}
            className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-transparent group"
          >
            {/* Embla Viewport */}
            <div className="overflow-hidden w-full h-full md:cursor-zoom-in touch-pan-y" ref={emblaRef} onClick={() => setLightboxOpen(true)}>
              <div className="flex h-full">
                {images.map((img, i) => (
                  <div
                    key={img.id || i}
                    className="relative flex-[0_0_100%] min-w-0 w-full h-full select-none overflow-hidden"
                    onMouseMove={(e) => {
                      // Do not trigger zoom on touch/mobile viewports
                      if (typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches)) {
                        return;
                      }
                      if ((e.target as HTMLElement).closest('button')) return;
                      if (!imgContainerRef.current) return;
                      const rect = imgContainerRef.current.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setZoomPos({ x, y });
                      setIsZoomed(true);
                    }}
                    onMouseLeave={() => setIsZoomed(false)}
                  >
                    <Image
                      src={img.url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
                      className={`object-cover transition-transform duration-200 ease-out ${isZoomed && i === activeImageIndex ? 'scale-[1.75]' : 'scale-100'
                        }`}
                      style={isZoomed && i === activeImageIndex ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}}
                      priority={i === 0}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Zoom icon hint */}
            <div className="absolute top-3 right-3 bg-white/80 dark:bg-black/50 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </div>

            {/* Prev Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                onMouseEnter={() => setIsZoomed(false)}
                onMouseMove={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 dark:bg-black/60 shadow-md text-gray-800 dark:text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white dark:hover:bg-black transition-all cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                onMouseEnter={() => setIsZoomed(false)}
                onMouseMove={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 dark:bg-black/60 shadow-md text-gray-800 dark:text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white dark:hover:bg-black transition-all cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseMove={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); emblaApi?.scrollTo(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${i === activeImageIndex ? 'bg-white scale-125 shadow' : 'bg-white/50'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border transition-all cursor-pointer ${i === activeImageIndex
                    ? 'border-[#e94560] ring-2 ring-[#e94560]/10'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-400'
                    }`}
                >
                  <Image
                    src={img.url}
                    alt={`${product.name} gallery ${i}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details info */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              {product.category && (
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {product.category.name}
                </span>
              )}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h2>

              {/* Ratings and Reviews count */}
              {mounted && (displayCount > 0 || displayRating > 0) && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => {
                      const starVal = i + 1;
                      if (displayRating >= starVal) {
                        return <span key={i} className="text-base">★</span>;
                      } else if (displayRating >= starVal - 0.5) {
                        return <span key={i} className="text-base">★</span>; // standard solid or half
                      } else {
                        return <span key={i} className="text-gray-200 dark:text-gray-700 text-base">★</span>;
                      }
                    })}
                  </div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {displayCount} reviews
                  </span>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="product-price text-2xl font-extrabold text-[#1a1a2e] dark:text-white">
                  {hasPriceRange ? (
                    `${formatPrice(minPrice, settings.currencySymbol)} – ${formatPrice(maxPrice, settings.currencySymbol)}`
                  ) : (
                    formatPrice(unitPrice, settings.currencySymbol)
                  )}
                </span>
                {!hasPriceRange && (() => {
                  const currentComparePrice = selectedVariant?.comparePrice ?? product.comparePrice;
                  if (currentComparePrice && currentComparePrice > unitPrice) {
                    const pct = Math.round(((currentComparePrice - unitPrice) / currentComparePrice) * 100);
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 line-through font-semibold font-body">
                          {formatPrice(currentComparePrice, settings.currencySymbol)}
                        </span>
                        <span className="rounded-md bg-[#e94560]/10 dark:bg-[#e94560]/20 px-2 py-0.5 text-[10px] font-black text-[#e94560] tracking-wide">
                          -{pct}%
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {hasPriceRange && selectedVariant && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-primary)]/5 dark:bg-white/5 border border-gray-250 dark:border-gray-800 text-sm font-semibold mt-2.5 w-fit">
                  <span className="text-gray-500 dark:text-gray-400">Selected option:</span>
                  <span className="product-price text-base font-black text-[#e94560] dark:text-[#e94560] leading-none">
                    {formatPrice(unitPrice, settings.currencySymbol)}
                  </span>
                  {(() => {
                    const currentComparePrice = selectedVariant.comparePrice;
                    if (currentComparePrice && currentComparePrice > unitPrice) {
                      const pct = Math.round(((currentComparePrice - unitPrice) / currentComparePrice) * 100);
                      return (
                        <span className="inline-flex items-center gap-1.5 ml-1">
                          <span className="text-xs text-gray-400 line-through font-semibold font-body">
                            {formatPrice(currentComparePrice, settings.currencySymbol)}
                          </span>
                          <span className="rounded-md bg-[#e94560]/10 dark:bg-[#e94560]/20 px-1.5 py-0.5 text-[9px] font-black text-[#e94560] tracking-wide leading-none">
                            -{pct}%
                          </span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>

            {/* Countdown timer for sales / urgency */}
            {mounted && !timeLeft.expired && (
              <div className={`rounded-2xl p-4 mt-2 border ${timeLeft.isIncoming
                ? 'bg-amber-50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30'
                : 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30'
                }`}>
                <p className={`text-xs font-bold flex items-center gap-1.5 ${timeLeft.isIncoming ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timeLeft.isIncoming ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${timeLeft.isIncoming ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                  </span>
                  {timeLeft.isIncoming ? 'FLASH SALE — Starts In:' : 'FLASH SALE — Offer Active:'}
                </p>
                {!timeLeft.isInfinite ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`flex flex-col items-center justify-center bg-white dark:bg-gray-800 font-extrabold w-11 py-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 ${timeLeft.isIncoming ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                      <span className="text-xs font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
                      <span className="text-[7px] text-gray-400 font-normal">HRS</span>
                    </div>
                    <span className={`font-extrabold ${timeLeft.isIncoming ? 'text-amber-500' : 'text-rose-500'}`}>:</span>
                    <div className={`flex flex-col items-center justify-center bg-white dark:bg-gray-800 font-extrabold w-11 py-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 ${timeLeft.isIncoming ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                      <span className="text-xs font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
                      <span className="text-[7px] text-gray-400 font-normal">MIN</span>
                    </div>
                    <span className={`font-extrabold ${timeLeft.isIncoming ? 'text-amber-500' : 'text-rose-500'}`}>:</span>
                    <div className={`flex flex-col items-center justify-center bg-white dark:bg-gray-800 font-extrabold w-11 py-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 ${timeLeft.isIncoming ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                      <span className="text-xs font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
                      <span className="text-[7px] text-gray-400 font-normal">SEC</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mt-1">
                    Special discounted price is currently active!
                  </p>
                )}
              </div>
            )}

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {product.shortDescription}
              </p>
            )}

            {/* Live views trust element */}
            {mounted && settings.enableFakeViews && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800/80 rounded-xl px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 w-fit">
                <Eye className="h-4 w-4 text-[#e94560]" />
                <span>
                  <strong className="font-extrabold text-[#e94560]">{viewerCount}</strong> people are viewing this right now
                </span>
              </div>
            )}

            {/* Stock status */}
            {!product.isService && settings.showStock && (
              <div className="text-xs font-semibold">
                {stockAvailable > 0 ? (
                  <span className="text-[#10b981]">In Stock ({stockAvailable} left)</span>
                ) : (
                  <span className="text-red-500">Out of Stock</span>
                )}
              </div>
            )}

            {/* Stock Urgency Banner */}
            {!product.isService && settings.stock_urgency_enabled !== false && stockAvailable > 0 && stockAvailable <= 5 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[#e94560] bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-lg font-bold w-fit animate-pulse border border-rose-100 dark:border-rose-900/30">
                <span>🔥 Hurry! Only {stockAvailable} left in stock!</span>
              </div>
            )}

            {/* Variant Selector */}
            {product.hasVariants && product.variants.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Options</span>
                  {settings.size_guide_enabled !== false && sizeGuide && (
                    <button
                      type="button"
                      onClick={() => setShowSizeGuide(true)}
                      className="text-xs font-bold text-[#e94560] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      📏 Size Guide
                    </button>
                  )}
                </div>
                <VariantSelector
                  variants={product.variants}
                  selectedVariant={selectedVariant}
                  onChangeSelectedVariant={handleVariantChange}
                  enableSwatches={product.enableSwatches}
                  settings={settings}
                />
              </div>
            )}

            {/* Modifiers List */}
            {product.modifiers && product.modifiers.filter(m => m.active).length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Add-ons / Customizations</span>
                <div className="space-y-2">
                  {product.modifiers.filter(m => m.active).map(mod => {
                    const isSelected = selectedModifiers.some(m => m.id === mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => handleModifierToggle(mod)}
                        className={`flex w-full items-center justify-between p-3.5 border rounded-xl transition-all cursor-pointer ${isSelected
                          ? 'border-[#1a1a2e] bg-[#1a1a2e]/5 dark:border-[#e94560] dark:bg-[#e94560]/10'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 bg-white dark:bg-[#16162a]'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${isSelected ? 'bg-[#1a1a2e] border-[#1a1a2e] text-white dark:bg-[#e94560] dark:border-[#e94560]' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent'
                            }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{mod.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          +{formatPrice(mod.price, settings.currencySymbol)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ask a Question & Share Link Row */}
            {mounted && (
              <div className="flex items-center gap-6 border-t border-gray-100 dark:border-gray-800 pt-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-[#e94560] transition-colors cursor-pointer"
                >
                  <HelpCircle className="h-4.5 w-4.5" />
                  <span>Ask a question</span>
                </a>

                <button
                  onClick={() => setIsShareOpen(true)}
                  className="flex items-center gap-1.5 hover:text-[#e94560] transition-colors cursor-pointer"
                >
                  <Share2 className="h-4.5 w-4.5" />
                  <span>Share</span>
                </button>

                {settings.size_guide_enabled !== false && sizeGuide && (
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center gap-1.5 hover:text-[#e94560] transition-colors cursor-pointer"
                  >
                    <Ruler className="h-4.5 w-4.5" />
                    <span>Size Guide</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Quantity</span>
              <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#16162a]">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-bold text-gray-900 dark:text-white w-12 text-center select-none">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer disabled:opacity-50"
                  disabled={quantity >= stockAvailable}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart & Wishlist buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={stockAvailable <= 0}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] active:scale-98 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-3.5 text-sm font-bold transition-all duration-200 shadow-md cursor-pointer"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>{stockAvailable <= 0 ? 'Out of Stock' : 'Add to Cart'}</span>
              </button>

              {mounted && (
                <button
                  onClick={toggleWishlist}
                  className={`p-3.5 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${isWishlisted
                    ? 'border-red-200 bg-red-50 text-red-500 dark:border-red-900/35 dark:bg-red-500/10'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400'
                    }`}
                  aria-label="Toggle Wishlist"
                >
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Trust Badges Panel */}
          {mounted && settings.enableTrustBadges && (
            <div className="border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 rounded-2xl p-5 space-y-4 animate-fade-in transition-colors">

              {/* 2-Column Delivery/Shipping Estimates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                {/* Delivery Estimate */}
                {settings.deliveryEstimateText && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 bg-white dark:bg-white/5 border border-gray-100 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-300">
                      <Package className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed font-semibold">
                      {settings.deliveryEstimateText}
                    </p>
                  </div>
                )}

                {/* Free Shipping */}
                {settings.freeShippingText && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 bg-white dark:bg-white/5 border border-gray-100 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-300">
                      <Truck className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed font-semibold">
                      {settings.freeShippingText}
                    </p>
                  </div>
                )}
              </div>

              {/* Promo Code */}
              {settings.promoCodeText && (
                <div className="flex items-center gap-3 justify-center text-center">
                  <Tag className="h-4 w-4 text-[#e94560]" />
                  <p className="text-xs text-gray-650 dark:text-gray-300 font-bold">
                    {settings.promoCodeText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Safe Checkout Block — uses settings.safeCheckoutMethods as single source of truth */}
          {mounted && settings.enableTrustBadges && settings.safeCheckoutMethods && settings.safeCheckoutMethods.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-800 bg-gray-50/20 dark:bg-white/5 rounded-2xl p-4 text-center space-y-3 transition-colors">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                {settings.safeCheckoutText || 'Guarantee Safe Checkout:'}
              </span>
              <PaymentBadges
                methods={settings.safeCheckoutMethods}
                className="flex flex-wrap items-center justify-center gap-2"
              />
            </div>
          )}

          {/* Frequently Bought Together (Bundle Widget) */}
          {mounted && settings.frequently_bought_together_enabled !== false && bundleProducts.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] rounded-2xl p-5 space-y-4 shadow-sm transition-colors">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Frequently Bought Together</h4>
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
                {/* Current Product Mini-card */}
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-2 rounded-xl w-full sm:w-auto sm:flex-1 min-w-[220px] border border-gray-100 dark:border-gray-800/80">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={images[0]?.url || fallbackPlaceholder}
                      alt={product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-850 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 font-semibold">{formatPrice(unitPrice, settings.currencySymbol)}</p>
                  </div>
                </div>

                {bundleProducts.map((bp) => {
                  const isChecked = selectedBundleIds.includes(bp.id);
                  const bpActiveVariants = bp.hasVariants ? bp.variants.filter(v => v.active) : [];
                  const bpHasVariants = bpActiveVariants.length > 0;
                  const bpSelectedVarId = bundleVariantSelections[bp.id];
                  const bpSelectedVar = bpActiveVariants.find(v => v.id === bpSelectedVarId) ?? bpActiveVariants[0];
                  const bpPrice = bpSelectedVar?.price ?? bp.price;
                  // Unique option attributes for this bundle product
                  const bpColors = Array.from(new Set(bpActiveVariants.map(v => v.color).filter(Boolean))) as string[];
                  const bpSizes = Array.from(new Set(bpActiveVariants.map(v => v.size).filter(Boolean))) as string[];
                  const bpMaterials = Array.from(new Set(bpActiveVariants.map(v => v.material).filter(Boolean))) as string[];
                  const bpCustomOpt = bpActiveVariants[0]?.customOption;
                  const bpCustomVals = Array.from(new Set(bpActiveVariants.map(v => v.customValue).filter(Boolean))) as string[];

                  const selectBpVariant = (color?: string, size?: string, material?: string, customValue?: string) => {
                    const match = bpActiveVariants.find(v =>
                      (!bpColors.length || v.color === (color ?? bpSelectedVar?.color)) &&
                      (!bpSizes.length || v.size === (size ?? bpSelectedVar?.size)) &&
                      (!bpMaterials.length || v.material === (material ?? bpSelectedVar?.material)) &&
                      (!bpCustomVals.length || v.customValue === (customValue ?? bpSelectedVar?.customValue))
                    ) ?? bpActiveVariants.find(v =>
                      (color ? v.color === color : true) ||
                      (size ? v.size === size : true) ||
                      (material ? v.material === material : true) ||
                      (customValue ? v.customValue === customValue : true)
                    );
                    if (match) setBundleVariantSelections(prev => ({ ...prev, [bp.id]: match.id }));
                  };

                  return (
                    <React.Fragment key={bp.id}>
                      <span className="text-gray-400 font-bold text-lg">+</span>
                      <div
                        className={`flex flex-col gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-xl w-full sm:w-auto sm:flex-1 min-w-[220px] border cursor-pointer transition-all ${isChecked ? 'border-amber-500' : 'border-gray-100 dark:border-gray-850'
                          }`}
                      >
                        {/* Product info row — click to toggle */}
                        <div
                          onClick={() => setSelectedBundleIds(prev => prev.includes(bp.id) ? prev.filter(id => id !== bp.id) : [...prev, bp.id])}
                          className="flex items-center gap-3"
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-105 flex-shrink-0">
                            {bp.images?.[0]?.url && (
                              <Image
                                src={bp.images[0].url}
                                alt={bp.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-850 dark:text-white truncate flex items-center gap-1.5">
                              <span className={`w-3.5 h-3.5 flex items-center justify-center rounded border text-[8px] flex-shrink-0 ${isChecked ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 bg-white dark:bg-transparent'
                                }`}>
                                {isChecked && '✓'}
                              </span>
                              {bp.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                              <p className="text-xs text-gray-500 font-semibold">{formatPrice(bpPrice, settings.currencySymbol)}</p>
                              <Link
                                href={`/product/${bp.slug}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-bold text-[#e94560] hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                              >
                                View Details ↗
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* Inline variant selectors — shown only if product has variants */}
                        {bpHasVariants && (
                          <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1.5">
                            {bpColors.length > 0 && (
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Color</p>
                                <div className="flex flex-wrap gap-1">
                                  {bpColors.map(color => {
                                    const matchV = bpActiveVariants.find(v => v.color === color);
                                    const isActive = bpSelectedVar?.color === color;
                                    const bg = matchV?.colorHex;
                                    return bg ? (
                                      <button
                                        key={color}
                                        type="button"
                                        title={color}
                                        onClick={(e) => { e.stopPropagation(); selectBpVariant(color); }}
                                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer overflow-hidden flex-shrink-0 ${isActive ? 'border-amber-500 scale-110 shadow' : 'border-white dark:border-gray-700 hover:scale-105'
                                          }`}
                                        style={{ backgroundColor: bg }}
                                      >
                                        {matchV?.imageUrl && (matchV.showImageSwatch || !bg) && (
                                          <img src={matchV.imageUrl} alt={color} className="w-full h-full object-cover" />
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        key={color}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); selectBpVariant(color); }}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-all ${isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                          }`}
                                      >{color}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {bpSizes.length > 0 && (
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Size</p>
                                <div className="flex flex-wrap gap-1">
                                  {bpSizes.map(size => {
                                    const isActive = bpSelectedVar?.size === size;
                                    return (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); selectBpVariant(undefined, size); }}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-all ${isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                          }`}
                                      >{size}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {bpMaterials.length > 0 && (
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Material</p>
                                <div className="flex flex-wrap gap-1">
                                  {bpMaterials.map(mat => {
                                    const isActive = bpSelectedVar?.material === mat;
                                    return (
                                      <button
                                        key={mat}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); selectBpVariant(undefined, undefined, mat); }}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-all ${isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                          }`}
                                      >{mat}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {bpCustomOpt && bpCustomVals.length > 0 && (
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">{bpCustomOpt}</p>
                                <div className="flex flex-wrap gap-1">
                                  {bpCustomVals.map(val => {
                                    const isActive = bpSelectedVar?.customValue === val;
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); selectBpVariant(undefined, undefined, undefined, val); }}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-all ${isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                          }`}
                                      >{val}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Total bundle price and action button */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-gray-500 font-semibold">Total Price (Bundle):</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">
                    {formatPrice(
                      unitPrice + bundleProducts.reduce((sum, bp) => sum + (selectedBundleIds.includes(bp.id) ? bp.price : 0), 0),
                      settings.currencySymbol
                    )}
                  </p>
                </div>
                <button
                  onClick={handleAddBundleToCart}
                  className="w-full sm:w-auto px-5 py-3 bg-[#e94560] hover:bg-[#d43852] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Add All to Cart
                </button>
              </div>
            </div>
          )}

          {/* Tab Layout for Description, FAQ, and Return Policy */}
          <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-6">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6 overflow-x-auto scrollbar-none pb-2">
              <button
                type="button"
                onClick={() => setActiveDetailTab('description')}
                className={`text-sm font-bold pb-2 transition-all cursor-pointer relative shrink-0 ${activeDetailTab === 'description'
                  ? 'text-[#e94560] border-b-2 border-[#e94560]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                  }`}
              >
                Description
              </button>

              {settings.faqContent && (
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('faq')}
                  className={`text-sm font-bold pb-2 transition-all cursor-pointer relative shrink-0 ${activeDetailTab === 'faq'
                    ? 'text-[#e94560] border-b-2 border-[#e94560]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                    }`}
                >
                  FAQ
                </button>
              )}

              {settings.returnPolicyContent && (
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('returns')}
                  className={`text-sm font-bold pb-2 transition-all cursor-pointer relative shrink-0 ${activeDetailTab === 'returns'
                    ? 'text-[#e94560] border-b-2 border-[#e94560]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                    }`}
                >
                  Return & Exchange
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="py-6 text-sm text-gray-650 dark:text-gray-300 leading-relaxed font-medium animate-fade-in prose dark:prose-invert max-w-none">
              {activeDetailTab === 'description' && product.description && (
                <div>
                  <div className={`relative transition-all duration-300 overflow-hidden ${!isDescExpanded ? 'max-h-48' : 'max-h-none'
                    }`}>
                    {isHtml(product.description) ? (
                      <div dangerouslySetInnerHTML={{ __html: product.description }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{product.description}</div>
                    )}
                    {/* Gradient overlay for fading out when collapsed */}
                    {!isDescExpanded && product.description.length > 300 && (
                      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white dark:from-[#16162a] to-transparent pointer-events-none" />
                    )}
                  </div>
                  {product.description.length > 300 && (
                    <button
                      type="button"
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="mt-3 text-xs font-bold text-[#e94560] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isDescExpanded ? 'Read Less' : 'Read More'}
                    </button>
                  )}
                </div>
              )}

              {activeDetailTab === 'faq' && settings.faqContent && (
                isHtml(settings.faqContent) ? (
                  <div dangerouslySetInnerHTML={{ __html: settings.faqContent }} />
                ) : (
                  <div className="whitespace-pre-wrap">{settings.faqContent}</div>
                )
              )}

              {activeDetailTab === 'returns' && settings.returnPolicyContent && (
                isHtml(settings.returnPolicyContent) ? (
                  <div dangerouslySetInnerHTML={{ __html: settings.returnPolicyContent }} />
                ) : (
                  <div className="whitespace-pre-wrap">{settings.returnPolicyContent}</div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}

      {mounted && isShareOpen && createPortal(
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 animate-fade-in touch-none"
          onClick={() => setIsShareOpen(false)}
        >
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 text-gray-900 dark:text-white transition-all space-y-4 scale-up duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Copy link</h3>
              <button
                onClick={() => setIsShareOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input with Copy button */}
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={productUrl}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 px-4 py-2.5 text-sm font-semibold select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="bg-[#1a1a2e] hover:bg-[#e94560] dark:bg-white/10 dark:hover:bg-white/20 text-white rounded-xl px-4 py-2.5 flex items-center justify-center cursor-pointer transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Social Sharing Icons */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Share on socials</span>
              <div className="flex items-center gap-3">
                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition-colors cursor-pointer"
                  title="Share on Facebook"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                  </svg>
                </a>

                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white transition-colors cursor-pointer"
                  title="Share on X"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                {/* Pinterest */}
                <a
                  href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productUrl)}&description=${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#BD081C]/10 hover:bg-[#BD081C]/20 text-[#BD081C] transition-colors cursor-pointer"
                  title="Share on Pinterest"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.718-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.166-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026z" />
                  </svg>
                </a>

                {/* Instagram */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(productUrl);
                    toast.success('Link copied! Open Instagram to share.');
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E1306C]/10 hover:bg-[#E1306C]/20 text-[#E1306C] transition-colors cursor-pointer"
                  title="Copy link for Instagram"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Lightbox Modal */}
      {mounted && lightboxOpen && createPortal(
        <div
          className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 animate-fade-in touch-none select-none"
          onClick={() => setLightboxOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button at top-right */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shadow-md"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev arrow */}
          {images.length > 1 && lightboxZoomScale === 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i => (i - 1 + images.length) % images.length); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main lightbox image container - fits naturally without square limit */}
          <div
            className="relative w-full max-w-3xl h-[65dvh] md:h-[80dvh] flex items-center justify-center overflow-hidden px-4 md:px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-full h-full relative ${lightboxIsDragging ? 'cursor-grabbing' : lightboxZoomScale > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
              style={{
                transform: `translate(${lightboxZoomPos.x}px, ${lightboxZoomPos.y}px) scale(${lightboxZoomScale})`,
                transformOrigin: 'center center',
                transition: lightboxIsDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              onMouseDown={handleLightboxMouseDown}
              onMouseMove={handleLightboxMouseMove}
              onMouseUp={handleLightboxMouseUp}
              onMouseLeave={handleLightboxMouseUp}
              onClick={(e) => {
                if (lightboxWasDragging.current) {
                  lightboxWasDragging.current = false;
                  return;
                }
                const now = Date.now();
                const DOUBLE_PRESS_DELAY = 300;
                if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
                  if (lightboxZoomScale > 1) {
                    resetLightboxZoom();
                  } else {
                    setLightboxZoomScale(2.5);
                  }
                  lastTap.current = null;
                } else {
                  lastTap.current = now;
                }
              }}
            >
              <Image
                src={images[activeImageIndex]?.url ?? activeImage}
                alt={product.name}
                fill
                sizes="90vw"
                className="object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Next arrow */}
          {images.length > 1 && lightboxZoomScale === 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i => (i + 1) % images.length); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Dot indicators */}
          {images.length > 1 && lightboxZoomScale === 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i); }}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === activeImageIndex ? 'bg-white scale-125' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Sizing Guide Modal */}
      {mounted && showSizeGuide && settings.size_guide_enabled !== false && sizeGuide && createPortal(
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 overscroll-contain animate-fade-in"
          onClick={() => setShowSizeGuide(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl text-gray-900 dark:text-white max-h-[90vh] overflow-y-auto overscroll-contain scale-up duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSizeGuide(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              📏 {sizeGuide.name}
            </h3>

            {sizeGuide.imageUrl && (
              <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/5 mb-6 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sizeGuide.imageUrl}
                  alt={`${sizeGuide.name} visual reference`}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {sizeGuide.chart_data && sizeGuide.chart_data.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0f0f1b]/50">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs text-left border-collapse min-w-[320px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                        {Object.keys(sizeGuide.chart_data[0]).map((colName) => (
                          <th key={colName} className="p-3 font-extrabold uppercase text-gray-500 dark:text-gray-400">
                            {colName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {sizeGuide.chart_data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/20">
                          {Object.keys(sizeGuide.chart_data[0]).map((colName) => (
                            <td key={colName} className="p-3 font-semibold text-gray-700 dark:text-gray-300">
                              {row[colName] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="mt-4 text-[10px] text-gray-400 text-center leading-normal">
              Sizes may vary slightly. For questions or custom sizing, contact support via WhatsApp.
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

