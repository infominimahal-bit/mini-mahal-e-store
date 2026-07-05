import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/services/settings';
import { sendEmail } from '@/lib/email/sendEmail';

export async function POST(request: NextRequest) {
  try {
    const settings = await getSettings();
    const adminEmail = settings.admin_notification_email || settings.smtp_email;

    if (!adminEmail) {
      return NextResponse.json({ success: false, error: 'Admin notification email is not configured.' }, { status: 400 });
    }

    const brandName = settings.storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Your Store';
    const result = await sendEmail({
      to: adminEmail,
      subject: `Test Email from ${brandName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2 style="color: #1a1a2e;">SMTP Configuration Verified!</h2>
          <p>If you received this message, your SMTP settings for <strong>${brandName}</strong> are working correctly!</p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">This is a test notification from the Admin Panel.</p>
        </div>
      `
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to dispatch test mail' });
    }

    return NextResponse.json({ success: true, message: `Test email dispatched successfully to ${adminEmail}` });
  } catch (error: any) {
    console.error('[API test-email] POST failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
