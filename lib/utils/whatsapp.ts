import { CartItem, StoreSettings } from '@/lib/types';

export const formatPrice = (amount: number | undefined | null, symbol = 'Rs.'): string =>
  `${symbol} ${(amount ?? 0).toLocaleString('en-PK')}`;

export const generateWhatsAppMessage = (
  items: CartItem[],
  settings: StoreSettings
): string => {
  const lines = items.map(item => {
    const variantParts = [];
    if (item.selectedVariant?.color) variantParts.push(item.selectedVariant.color);
    if (item.selectedVariant?.size) variantParts.push(item.selectedVariant.size);
    if (item.selectedVariant?.material) variantParts.push(item.selectedVariant.material);
    if (item.selectedVariant?.customValue) variantParts.push(item.selectedVariant.customValue);

    const variantStr = variantParts.length ? ` (${variantParts.join(', ')})` : '';
    const modifierStr = item.selectedModifiers.length
      ? ` + ${item.selectedModifiers.map(m => m.name).join(', ')}`
      : '';

    const discountStr = item.discountAmount && item.discountAmount > 0 
      ? ` (Discount: -${formatPrice(item.discountAmount, settings.currencySymbol)})` 
      : '';

    return `• ${item.product.name}${variantStr}${modifierStr} x${item.quantity}${discountStr} = ${formatPrice(item.total, settings.currencySymbol)}`;
  });

  const total = items.reduce((sum, i) => sum + i.total, 0);

  return [
    `*${settings.storeName}*`,
    ``,
    settings.whatsappGreeting,
    ``,
    ...lines,
    ``,
    `*Total: ${formatPrice(total, settings.currencySymbol)}*`,
    ``,
    settings.whatsappFooter
  ].join('\n');
};

export const cleanWhatsAppPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // 1. Remove all non-digits
  let clean = phone.replace(/\D/g, '');
  
  // 2. Strip leading 00 if present
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }
  
  // 3. Handle Pakistani phone number standard formatting
  // Local: starts with 0 and has 11 digits (e.g. 03284114551 -> 923284114551)
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '92' + clean.slice(1);
  }
  // Local missing zero: starts with 3 and has 10 digits (e.g. 3284114551 -> 923284114551)
  else if (clean.startsWith('3') && clean.length === 10) {
    clean = '92' + clean;
  }
  // Common typo: replacing '03' with '92' (e.g. 92284114551 -> 923284114551)
  else if (clean.startsWith('922') && clean.length === 11) {
    clean = '9232' + clean.slice(3);
  }
  // Common typo: combining +92 and 03 (e.g. 9203284114551 -> 923284114551)
  else if (clean.startsWith('920') && clean.length === 13) {
    clean = '92' + clean.slice(3);
  }
  
  return clean;
};

export const buildWhatsAppURL = (phone: string, message: string): string => {
  const cleanPhone = cleanWhatsAppPhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

