import React, { Suspense } from 'react';
import Navbar from '@/components/common/Navbar';
import CartBar from '@/components/store/CartBar';
import Footer from '@/components/common/Footer';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import FloatingContacts from '@/components/common/FloatingContacts';
import PremiumFeaturesProvider from '@/components/store/PremiumFeaturesProvider';
import { getSettings } from '@/lib/services/settings';
import { getDomainBrand } from '@/lib/utils/getDomainBrand';

export default async function StoreLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  let brandName = settings.storeName;
  try {
    const brand = await getDomainBrand();
    brandName = brand.name;
  } catch {}

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0f0f1b] text-gray-900 dark:text-gray-100 pb-36 md:pb-0 transition-colors duration-200">
      <Suspense fallback={<div className="h-16 bg-white dark:bg-[#0f0f1b] border-b border-gray-200 dark:border-gray-800" />}>
        <Navbar settings={settings} storeName={brandName} />
      </Suspense>
      <main className="flex-grow min-h-[80vh] bg-gray-50 dark:bg-[#0f0f1b] transition-colors duration-200">

        {children}
      </main>
      <Footer settings={settings} brandName={brandName} />
      <CartBar currencySymbol={settings.currencySymbol} />
      <MobileBottomNav />
      <FloatingContacts settings={settings} />
      <PremiumFeaturesProvider settings={settings} />
    </div>
  );
}
