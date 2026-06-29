import React from 'react';
import { getSettings } from '@/lib/services/settings';
import { headers } from 'next/headers';
import { getDomainName } from '@/lib/config/domains';
import { Metadata } from 'next';

export const revalidate = 60; // Cache for 1 minute

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettings();
    const siteUrl = settings?.storeUrl?.replace(/\/+$/, '') || process.env.NEXT_PUBLIC_SITE_URL || '';
    let host: string;
    try {
      const hdrs = await headers();
      host = hdrs.get('host') || siteUrl || 'localhost:3000';
    } catch {
      host = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000';
    }
    const brandName = getDomainName(host);
    return {
      title: `Return & Exchange Policy | ${brandName}`,
      description: 'Read our return and exchange policy. We offer easy exchanges and returns to ensure you have the best experience.',
    };
  } catch {
    return {
      title: 'Return & Exchange Policy',
      description: 'Read our return and exchange policy.',
    };
  }
}


export default async function ReturnsPage() {
  const settings = await getSettings();
  const content = settings.returnPolicyContent || '<h3>Return & Exchange Policy</h3><p>We are currently updating our Return Policy. Please check back later or contact us directly on WhatsApp!</p>';

  // Check if string contains HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  return (
    <div className="min-h-[60vh] bg-gray-50 dark:bg-[#0f0f1b] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#16162a] rounded-3xl border border-gray-150 dark:border-gray-800 p-8 sm:p-10 shadow-sm">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
          Return & Exchange Policy
        </h1>
        <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <div className="whitespace-pre-wrap">{content}</div>
          )}
        </div>
      </div>
    </div>
  );
}
