import { headers } from 'next/headers'
import { getDomainConfig } from '@/lib/config/domains'
import { getSettings } from '@/lib/services/settings'

export async function getDomainBrand(): Promise<{ name: string; tagline: string; domain: string; protocol: string }> {
  try {
    const hdrs = await headers()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
    const config = getDomainConfig(host)
    try {
      const settings = await getSettings()
      if (settings?.storeName) {
        config.name = settings.storeName
      }
      if (settings?.tagline) {
        config.tagline = settings.tagline
      }
    } catch (e) {
      // Ignore settings fetch errors here to fallback to config
    }
    return { ...config, domain: host, protocol }
  } catch {
    const config = getDomainConfig('localhost:3000')
    return { ...config, domain: 'localhost:3000', protocol: 'http' }
  }
}

export function cleanBrandName(text: string | null | undefined, currentBrandName: string): string {
  if (!text) return '';
  return text;
}
