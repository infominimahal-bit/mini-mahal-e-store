import crypto from 'crypto';
import { cookies } from 'next/headers';

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CUSTOMER_AUTH_SECRET || 'fallback-change-in-env';
const COOKIE_NAME = 'customer_session';

export interface CustomerSession {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  expiresAt: number;
}

/**
 * Hash a password using PBKDF2 with a random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored PBKDF2 hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch {
    return false;
  }
}

/**
 * Sign a session token using HMAC-SHA256
 */
export function signSession(session: Omit<CustomerSession, 'expiresAt'>): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload: CustomerSession = { ...session, expiresAt };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed session token
 */
export function verifySession(token: string): CustomerSession | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;
    
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');
    if (expectedSig !== signature) return null;
    
    const payload: CustomerSession = JSON.parse(
      Buffer.from(payloadStr, 'base64').toString('utf8')
    );
    
    if (payload.expiresAt < Date.now()) return null; // Expired
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Set the customer session cookie (Server Action / Route Handler only)
 */
export async function setCustomerSessionCookie(sessionData: Omit<CustomerSession, 'expiresAt'>) {
  const token = signSession(sessionData);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/'
  });
}

/**
 * Retrieve the active customer session
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie?.value) return null;
    return verifySession(cookie.value);
  } catch {
    return null;
  }
}

/**
 * Clear the customer session cookie (Server Action / Route Handler only)
 */
export async function clearCustomerSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
