'use client';

import React from 'react';
import { ProductVariant, StoreSettings } from '@/lib/types';
import { getSwatchStyle } from '@/lib/utils/swatch';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant?: ProductVariant;
  onChangeSelectedVariant: (variant: ProductVariant) => void;
  enableSwatches?: boolean;
  settings?: StoreSettings | null;
  variationOrder?: string[];
}

const DEFAULT_AXIS_ORDER = ['color', 'size', 'material', 'custom'];

export default function VariantSelector({
  variants,
  selectedVariant,
  onChangeSelectedVariant,
  enableSwatches,
  settings,
  variationOrder
}: VariantSelectorProps) {
  const activeVariants = React.useMemo(() => variants.filter(v => v.active), [variants]);

  const colors = React.useMemo(() => Array.from(new Set(activeVariants.map(v => v.color).filter(Boolean))) as string[], [activeVariants]);
  const sizes = React.useMemo(() => Array.from(new Set(activeVariants.map(v => v.size).filter(Boolean))) as string[], [activeVariants]);
  const materials = React.useMemo(() => Array.from(new Set(activeVariants.map(v => v.material).filter(Boolean))) as string[], [activeVariants]);

  const customOptionName = activeVariants[0]?.customOption;
  const customValues = React.useMemo(() => Array.from(new Set(activeVariants.map(v => v.customValue).filter(Boolean))) as string[], [activeVariants]);

  const [selectedColor, setSelectedColor] = React.useState<string | undefined>(selectedVariant?.color);
  const [selectedSize, setSelectedSize] = React.useState<string | undefined>(selectedVariant?.size);
  const [selectedMaterial, setSelectedMaterial] = React.useState<string | undefined>(selectedVariant?.material);
  const [selectedCustomValue, setSelectedCustomValue] = React.useState<string | undefined>(selectedVariant?.customValue);

  React.useEffect(() => {
    if (selectedVariant) {
      setSelectedColor(selectedVariant.color);
      setSelectedSize(selectedVariant.size);
      setSelectedMaterial(selectedVariant.material);
      setSelectedCustomValue(selectedVariant.customValue);
    }
  }, [selectedVariant]);

  React.useEffect(() => {
    // Only auto-match when ALL required axes have been selected by user
    const colorOk = !colors.length || !!selectedColor;
    const sizeOk = !sizes.length || !!selectedSize;
    const materialOk = !materials.length || !!selectedMaterial;
    const customOk = !customValues.length || !!selectedCustomValue;
    if (!colorOk || !sizeOk || !materialOk || !customOk) return;

    const match = activeVariants.find(v => {
      const colorMatch = !colors.length || v.color === selectedColor;
      const sizeMatch = !sizes.length || v.size === selectedSize;
      const materialMatch = !materials.length || v.material === selectedMaterial;
      const customMatch = !customValues.length || v.customValue === selectedCustomValue;
      return colorMatch && sizeMatch && materialMatch && customMatch;
    });
    if (match && (!selectedVariant || match.id !== selectedVariant.id)) {
      onChangeSelectedVariant(match);
    }
  }, [selectedColor, selectedSize, selectedMaterial, selectedCustomValue, activeVariants, colors.length, sizes.length, materials.length, customValues.length, selectedVariant, onChangeSelectedVariant]);

  const showSwatches = (enableSwatches !== false) && (settings?.enableVariantSwatches ?? true);
  const productSwatchSize = settings?.productSwatchSize ?? settings?.swatchSize ?? 'md';
  const swatchShape = settings?.swatchShape || 'circle';

  const getSwatchClasses = (type: 'color' | 'text', sizeKey: string, text: string) => {
    const heightMap: Record<string, string> = {
      xxs: 'h-5',
      xs: 'h-6',
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
      xl: 'h-14',
      xxl: 'h-16'
    };
    const widthMap: Record<string, string> = {
      xxs: 'w-5',
      xs: 'w-6',
      sm: 'w-8',
      md: 'w-10',
      lg: 'w-12',
      xl: 'w-14',
      xxl: 'w-16'
    };
    const fontMap: Record<string, string> = {
      xxs: 'text-[8px]',
      xs: 'text-[10px]',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
      xxl: 'text-xl'
    };

    const height = heightMap[sizeKey] || heightMap.md;
    const fontClass = fontMap[sizeKey] || fontMap.md;

    if (type === 'color') {
      const width = widthMap[sizeKey] || widthMap.md;
      return `${height} ${width}`;
    } else {
      const minWidthClass =
        sizeKey === 'xxs' ? 'min-w-[20px] px-1' :
        sizeKey === 'xs' ? 'min-w-[26px] px-1.5' :
        sizeKey === 'sm' ? 'min-w-[32px] px-1.5' :
        sizeKey === 'lg' ? 'min-w-[48px] px-2.5' :
        sizeKey === 'xl' ? 'min-w-[56px] px-3' :
        sizeKey === 'xxl' ? 'min-w-[64px] px-3.5' :
        'min-w-[40px] px-2';

      let adjustedFont = fontClass;
      if (text.length > 3) {
        adjustedFont =
          sizeKey === 'xxs' ? 'text-[6.5px]' :
          sizeKey === 'xs' ? 'text-[8px]' :
          sizeKey === 'sm' ? 'text-[9.5px]' :
          sizeKey === 'lg' ? 'text-xs' :
          sizeKey === 'xl' ? 'text-sm' :
          sizeKey === 'xxl' ? 'text-base' :
          'text-[11px]';
      }
      return `${height} ${minWidthClass} ${adjustedFont}`;
    }
  };

  const shapeMap: Record<string, string> = {
    circle: 'rounded-full',
    square: 'rounded-lg'
  };

  const shapeClass = shapeMap[swatchShape] || shapeMap.circle;

  // Helper: pick a color variant by color name click
  const handleColorClick = (color: string) => {
    setSelectedColor(color);
    const match = activeVariants.find(v => {
      return v.color === color &&
        (!sizes.length || v.size === selectedSize) &&
        (!materials.length || v.material === selectedMaterial) &&
        (!customValues.length || v.customValue === selectedCustomValue);
    });
    if (match) {
      onChangeSelectedVariant(match);
    } else {
      const fallback = activeVariants.find(v => v.color === color);
      if (fallback) {
        if (fallback.size) setSelectedSize(fallback.size);
        if (fallback.material) setSelectedMaterial(fallback.material);
        if (fallback.customValue) setSelectedCustomValue(fallback.customValue);
        onChangeSelectedVariant(fallback);
      }
    }
  };

  const order = variationOrder || DEFAULT_AXIS_ORDER;

  const sectionMap: Record<string, { hasValues: boolean; label: string; selectedLabel: string | undefined; render: () => React.ReactNode }> = {
    color: {
      hasValues: colors.length > 0,
      label: 'Color',
      selectedLabel: selectedColor,
      render: () => (
        <div className="flex flex-wrap items-center gap-2.5">
          {colors.map(color => {
            const matchVar = activeVariants.find(v => v.color === color);
            const isSelected = selectedColor === color;

            if (showSwatches && matchVar && (matchVar.colorHex || matchVar.imageUrl)) {
              const bg = matchVar.colorHex || undefined;
              const sSizeClass = getSwatchClasses('color', productSwatchSize, '');
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorClick(color)}
                  title={color}
                  aria-label={color}
                  className={`
                    relative flex items-center justify-center cursor-pointer border transition-all duration-200 swatch-btn
                    ${sSizeClass} ${shapeClass}
                    ${isSelected ? 'scale-110 shadow-md' : 'hover:scale-105'}
                    overflow-hidden
                  `}
                  style={{
                    ...getSwatchStyle(bg),
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                    boxShadow: isSelected ? '0 0 0 2px var(--color-accent)' : 'none',
                  }}
                >
                  {matchVar.imageUrl && (matchVar.showImageSwatch || !matchVar.colorHex) && (
                    <img src={matchVar.imageUrl} alt={color} className="w-full h-full object-cover" />
                  )}
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <svg className="w-4 h-4 text-white drop-shadow" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            }

            return (
              <button
                key={color}
                type="button"
                onClick={() => handleColorClick(color)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--btn-primary-text)' : 'var(--color-text-primary)',
                  borderColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-border)',
                }}
              >
                {color}
              </button>
            );
          })}
        </div>
      ),
    },
    size: {
      hasValues: sizes.length > 0,
      label: 'Size',
      selectedLabel: selectedSize,
      render: () => (
        <div className="flex flex-wrap gap-2 max-w-sm sm:max-w-md">
          {sizes.map(size => {
            const isSelected = selectedSize === size;
            const sSizeClass = getSwatchClasses('text', productSwatchSize, size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(size);
                  const match = activeVariants.find(v =>
                    (!colors.length || v.color === selectedColor) &&
                    v.size === size &&
                    (!materials.length || v.material === selectedMaterial) &&
                    (!customValues.length || v.customValue === selectedCustomValue)
                  );
                  if (match) {
                    onChangeSelectedVariant(match);
                  } else {
                    const fallback = activeVariants.find(v => v.size === size);
                    if (fallback) {
                      if (fallback.color) setSelectedColor(fallback.color);
                      if (fallback.material) setSelectedMaterial(fallback.material);
                      if (fallback.customValue) setSelectedCustomValue(fallback.customValue);
                      onChangeSelectedVariant(fallback);
                    }
                  }
                }}
                className={showSwatches ? `
                  relative flex items-center justify-center font-bold border transition-all duration-200 cursor-pointer overflow-hidden select-none swatch-btn
                  ${sSizeClass} ${shapeClass}
                  ${isSelected ? 'scale-105 shadow-sm font-black' : 'hover:scale-105'}
                ` : `min-w-[52px] py-2.5 px-3 text-center rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer`}
                style={showSwatches ? {
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  color: isSelected ? 'var(--color-text-accent)' : 'var(--color-text-primary)',
                  backgroundColor: isSelected ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--color-surface)',
                  boxShadow: isSelected ? '0 0 0 1.5px var(--color-accent)' : 'none',
                } : {
                  backgroundColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--btn-primary-text)' : 'var(--color-text-primary)',
                  borderColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-border)',
                  boxShadow: isSelected ? '0 0 0 2px var(--btn-primary-bg)' : 'none'
                }}
              >
                <span className="whitespace-nowrap leading-none text-center">{size}</span>
              </button>
            );
          })}
        </div>
      ),
    },
    material: {
      hasValues: materials.length > 0,
      label: 'Material',
      selectedLabel: selectedMaterial,
      render: () => (
        <div className="flex flex-wrap gap-2 max-w-sm sm:max-w-md">
          {materials.map(mat => {
            const isSelected = selectedMaterial === mat;
            const sSizeClass = getSwatchClasses('text', productSwatchSize, mat);
            return (
              <button
                key={mat}
                type="button"
                onClick={() => {
                  setSelectedMaterial(mat);
                  const match = activeVariants.find(v =>
                    (!colors.length || v.color === selectedColor) &&
                    (!sizes.length || v.size === selectedSize) &&
                    v.material === mat &&
                    (!customValues.length || v.customValue === selectedCustomValue)
                  );
                  if (match) {
                    onChangeSelectedVariant(match);
                  } else {
                    const fallback = activeVariants.find(v => v.material === mat);
                    if (fallback) {
                      if (fallback.color) setSelectedColor(fallback.color);
                      if (fallback.size) setSelectedSize(fallback.size);
                      if (fallback.customValue) setSelectedCustomValue(fallback.customValue);
                      onChangeSelectedVariant(fallback);
                    }
                  }
                }}
                className={showSwatches ? `
                  relative flex items-center justify-center font-bold border transition-all duration-200 cursor-pointer overflow-hidden select-none swatch-btn
                  ${sSizeClass} ${shapeClass}
                  ${isSelected ? 'scale-105 shadow-sm font-black' : 'hover:scale-105'}
                ` : `min-w-[52px] py-2.5 px-3 text-center rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer`}
                style={showSwatches ? {
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  color: isSelected ? 'var(--color-text-accent)' : 'var(--color-text-primary)',
                  backgroundColor: isSelected ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--color-surface)',
                  boxShadow: isSelected ? '0 0 0 1.5px var(--color-accent)' : 'none',
                } : {
                  backgroundColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--btn-primary-text)' : 'var(--color-text-primary)',
                  borderColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-border)',
                  boxShadow: isSelected ? '0 0 0 2px var(--btn-primary-bg)' : 'none'
                }}
              >
                <span className="whitespace-nowrap leading-none text-center">{mat}</span>
              </button>
            );
          })}
        </div>
      ),
    },
    custom: {
      hasValues: !!customOptionName && customValues.length > 0,
      label: customOptionName || 'Custom',
      selectedLabel: selectedCustomValue,
      render: () => (
        <div className="flex flex-wrap gap-2 max-w-sm sm:max-w-md">
          {customValues.map(val => {
            const isSelected = selectedCustomValue === val;
            const sSizeClass = getSwatchClasses('text', productSwatchSize, val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setSelectedCustomValue(val);
                  const match = activeVariants.find(v =>
                    (!colors.length || v.color === selectedColor) &&
                    (!sizes.length || v.size === selectedSize) &&
                    (!materials.length || v.material === selectedMaterial) &&
                    v.customValue === val
                  );
                  if (match) {
                    onChangeSelectedVariant(match);
                  } else {
                    const fallback = activeVariants.find(v => v.customValue === val);
                    if (fallback) {
                      if (fallback.color) setSelectedColor(fallback.color);
                      if (fallback.size) setSelectedSize(fallback.size);
                      if (fallback.material) setSelectedMaterial(fallback.material);
                      onChangeSelectedVariant(fallback);
                    }
                  }
                }}
                className={showSwatches ? `
                  relative flex items-center justify-center font-bold border transition-all duration-200 cursor-pointer overflow-hidden select-none swatch-btn
                  ${sSizeClass} ${shapeClass}
                  ${isSelected ? 'scale-105 shadow-sm font-black' : 'hover:scale-105'}
                ` : `min-w-[52px] py-2.5 px-3 text-center rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer`}
                style={showSwatches ? {
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  color: isSelected ? 'var(--color-text-accent)' : 'var(--color-text-primary)',
                  backgroundColor: isSelected ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--color-surface)',
                  boxShadow: isSelected ? '0 0 0 1.5px var(--color-accent)' : 'none',
                } : {
                  backgroundColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--btn-primary-text)' : 'var(--color-text-primary)',
                  borderColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--color-border)',
                  boxShadow: isSelected ? '0 0 0 2px var(--btn-primary-bg)' : 'none'
                }}
              >
                <span className="whitespace-nowrap leading-none text-center">{val}</span>
              </button>
            );
          })}
        </div>
      ),
    },
  };

  return (
    <div className="space-y-5">
      {order.map(axisType => {
        const section = sectionMap[axisType];
        if (!section || !section.hasValues) return null;
        return (
          <div key={axisType}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{section.label}</span>
              {section.selectedLabel && (
                <span className="text-xs font-bold text-[#1a1a2e] dark:text-white">: {section.selectedLabel}</span>
              )}
            </div>
            {section.render()}
          </div>
        );
      })}
    </div>
  );
}
