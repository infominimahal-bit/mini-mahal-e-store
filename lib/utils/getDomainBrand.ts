import { headers } from 'next/headers'
import { getDomainConfig } from '@/lib/config/domains'

export async function getDomainBrand(): Promise<{ name: string; tagline: string; domain: string; protocol: string }> {
  try {
    const hdrs = await headers()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
    const config = getDomainConfig(host)
    return { ...config, domain: host, protocol }
  } catch {
    const config = getDomainConfig('localhost:3000')
    return { ...config, domain: 'localhost:3000', protocol: 'http' }
  }
}
