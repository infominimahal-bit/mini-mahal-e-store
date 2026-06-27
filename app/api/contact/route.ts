import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'Name, email, and message are required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address.' }, { status: 400 });
    }

    const { onContactForm } = await import('@/lib/email/triggers');
    await onContactForm({ name, email, subject: subject || 'Contact Form Message', message });

    return NextResponse.json({ success: true, message: 'Your message has been sent. We will get back to you shortly.' });
  } catch (error: any) {
    console.error('[API Contact] Failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send message.' }, { status: 500 });
  }
}
