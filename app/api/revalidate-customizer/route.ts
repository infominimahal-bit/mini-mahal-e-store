import { NextResponse } from 'next/server';
import { revalidateSettings, revalidateHomepage, revalidateBanner } from '@/lib/revalidate';

export async function POST() {
  try {
    console.log('[Revalidate Customizer] Manual cache purge triggered from Customizer');
    
    // Call the same revalidation functions that the webhook calls
    await revalidateHomepage();
    await revalidateBanner();
    await revalidateSettings();
    
    return NextResponse.json({ success: true, message: 'Cloudflare and Next.js cache purged successfully' });
  } catch (error: any) {
    console.error('[Revalidate Customizer] Error purging cache:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
