export const domainMap: Record<string, { name: string; tagline: string }> = {
  "totvogue.pk":     { name: "TotVogue.pk",     tagline: "#1 Kids Clothing Brand In Pakistan" },
  "www.totvogue.pk": { name: "TotVogue.pk",     tagline: "#1 Kids Clothing Brand In Pakistan" },
  "zaynahs.pk":      { name: "Zaynahs E-Store", tagline: "Premium Kids Fashion in Pakistan" },
  "www.zaynahs.pk":  { name: "Zaynahs E-Store", tagline: "Premium Kids Fashion in Pakistan" },
  "localhost:3000":  { name: "TotVogue.pk",     tagline: "#1 Kids Clothing Brand In Pakistan" },
}

export function getDomainConfig(hostOrUrl: string): { name: string; tagline: string } {
  let host = hostOrUrl

  try {
    if (host.startsWith('http')) {
      host = new URL(host).hostname
    }
  } catch {}

  // Normalize: lowercase, strip port (except localhost:3000)
  host = host.toLowerCase()
  if (host !== 'localhost:3000') {
    host = host.replace(/:\d+$/, '')
  }

  // Direct match
  if (domainMap[host]) {
    return domainMap[host]
  }

  // Try without www.
  const withoutWww = host.replace(/^www\./, '')
  if (domainMap[withoutWww]) {
    return domainMap[withoutWww]
  }

  // Fallback to first entry
  return Object.values(domainMap)[0]
}

// Legacy — kept for backward compatibility in non-metadata contexts
export function getDomainName(hostOrUrl: string): string {
  return getDomainConfig(hostOrUrl).name
}
