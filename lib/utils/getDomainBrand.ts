import { headers } from 'next/headers'
import { getDomainConfig } from '@/lib/config/domains'

export async function getDomainBrand(): Promise<{ name: string; tagline: string }> {
  try {
    const hdrs = await headers()
    const host = hdrs.get('host') || 'localhost:3000'
    return getDomainConfig(host)
  } catch {
    return getDomainConfig('localhost:3000')
  }
}
