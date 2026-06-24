# 🚀 Cloudflare Cache Rules & Supabase Webhooks — Setup Guide

> **Master System Blueprint**: This guide details the complete configuration of the caching, Edge CDN, and database-level webhook triggers in Zaynahs E-Store. Read this before modifying any caching or revalidation code.

---

## 📌 Section 1: Complete Cache TTL & System Map

| Cache Layer / Path | Cache Provider | TTL (Time-To-Live) | Reason & Behavior |
| :--- | :--- | :--- | :--- |
| `app/(store)/page.tsx` | Vercel ISR | **86,400s (24 Hours)** | Storefront home page is pre-generated at build time. We use a 24h TTL because Supabase webhooks instantly purge this on any settings/product updates. |
| `app/(store)/product/[slug]/page.tsx` | Vercel ISR | **86,400s (24 Hours)** | Product details are pre-rendered statically via `generateStaticParams()`. Refreshes instantly on product updates via DB trigger webhooks. |
| `lib/services/*.ts` | Next.js Server | **86,400s (24 Hours)** | Server Action queries are wrapped with `unstable_cache` to minimize DB queries. Tagged with granular tags (`products`, `settings`, `categories`) for instant invalidation. |
| Cloudflare: `/_next/static/*` | Cloudflare CDN | **31,536,000s (1 Year)** | Hashed assets (compiled CSS/JS) generated at build time. Their names change when files are modified, making 1-year caching completely safe. |
| Cloudflare: `supabase.co` | Cloudflare CDN | **2,592,000s (1 Month)** | Storage bucket public image URLs. Caching these at the CDN edge dramatically reduces Supabase egress bandwidth costs. |
| Cloudflare: `/cart`, `/checkout`, `/admin`, `/api`, `/account` | Cloudflare CDN | **0s (Bypass Cache)** | Transactions, checkout flows, admin portals, and API endpoints must never be cached to prevent serving stale or private customer data. ⚠️ Free plan caches 200 HTML responses despite bypass rules — impact minimal (cart data client-side). |
| Cloudflare: `/*` (HTML pages) | Cloudflare CDN | **86,400s (24 Hours)** | HTML pages are cached at Cloudflare Edge for 24h. Vercel ISR ensures fresh data after admin changes via webhook purge. |

---

## 🔑 Required `.env.local` Variables

Ensure these variables are set in your local and deployment environments:
```env
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres"
REVALIDATE_SECRET="zaynahs_secret_cache_revalidate_2026"
CLOUDFLARE_ZONE_ID="your_zone_id"
CLOUDFLARE_API_TOKEN="your_api_token"
NEXT_PUBLIC_SITE_URL="https://www.totvogue.pk"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
GOOGLE_SITE_VERIFICATION="your_value"
```

---

## ⚡ Section 2: Supabase Database Webhooks

We use database triggers to call `supabase_functions.http_request()` on every `INSERT`, `UPDATE`, or `DELETE` on:
`products`, `categories`, `reviews`, `homepage_sections`, and `store_settings`.

### SQL Migration File
[supabase/migrations/20260616183200_setup_database_webhooks.sql](file:///Users/shoaib/Desktop/Zaynahs%20e-store/supabase/migrations/20260616183200_setup_database_webhooks.sql)

### Trigger Execution Logic
The triggers use the `pg_net` PostgreSQL extension to asynchronously send POST requests to our revalidation API:
```
Database Modification
   ↓
http_request() trigger function
   ↓
Asynchronous net.http_post() via pg_net
   ↓
Next.js POST /api/revalidate
   ↓
Cache cleared (revalidateTag + Cloudflare edge purge)
```

---

## ☁️ Section 3: Cloudflare Caching Rules

We automate rule deployment, CNAME proxying (orange clouding), and google-site-verification DNS records using a deployer script:

### Deployer Script
[scripts/deploy-cloudflare-rules.js](file:///Users/shoaib/Desktop/Zaynahs%20e-store/scripts/deploy-cloudflare-rules.js)

### Cache Rules Configuration
The script configures **4 cache rules** under the `http_request_cache_settings` ruleset:

1. **`no-cache-dynamic`**: Bypasses caching for `/cart`, `/checkout`, `/account`, `/api`, and `/admin`. Uses `browser_ttl: 0` to also prevent browser cache. ⚠️ On Free plan, 200 HTML responses may still get cached — impact is minimal since cart/checkout data loads client-side.
2. **`static-assets`**: Overrides origin headers to cache `/_next/static/*` files at the Edge for 1 year.
3. **`html-pages`**: Caches all HTML pages (`/*`) at Cloudflare Edge for **24 hours**. Combined with Vercel ISR + webhook purge system — admin change triggers full cache clear within seconds.
4. **`supabase-images`**: Caches all URLs containing `supabase.co` for 1 month at the edge.

> **Note:** Page Rules (older system) are also active for additional bypass enforcement on `cart*`, `checkout*`, and `my-account*` paths with `cache_level: bypass`.

---

## 🚨 Section 4: Critical Caching Coding Standards

### Rule 1: Never Call `headers()` or `cookies()` in Store Page Server Components
Calling `headers()` or `cookies()` in any storefront Server Component (including `generateMetadata()`) dynamically forces the page into dynamic rendering. This appends `cache-control: private, no-store` headers, destroying Vercel's ISR cache.
* **Exceptions**: Allowed only in `robots.ts`, `sitemap.ts`, `/admin/**`, and `/api/**`.
* **Server-Client Split**: `getSiteUrl()` (uses `headers()`) is in `lib/site-url-server.ts` — only import from server components. `getClientSiteUrl()` and `cleanLocalhostUrls()` are in `lib/site-url.ts` — safe for client components.
* **Shop Page Fix**: Always use `settings?.storeUrl?.replace(...)` directly in `generateMetadata` instead of `getSiteUrl()` to avoid `headers()` calls that break caching.
* **Verification Command**:
  ```bash
  grep -rn "headers()\|cookies()" app/ --include="*.tsx" --include="*.ts" | grep -v "robots\|sitemap\|admin\|api"
  # Must return EMPTY
  ```

### Rule 2: Next.js 16 Strict `revalidateTag` Argument Casting
Next.js 16 expects 2 arguments for `revalidateTag` at compile time but runs with 1.
* **Correct Syntax**: Always wrap revalidation calls with `(revalidateTag as any)`:
  ```typescript
  (revalidateTag as any)('products');
  ```
* **Verification Command**:
  ```bash
  grep -rn "revalidateTag(" lib/ --include="*.ts" | grep "expire" && echo "⚠️ FIX NEEDED" || echo "✅ CLEAN"
  ```

### Rule 3: Loop Guard Protection on API Webhooks
When configuring triggers, prevent infinite loops where your webhook updates fields on the same table it listens to. Enforce loop guards:
```typescript
const META_ONLY_COLUMNS = new Set(['meta_sync_status', 'meta_sync_error', 'meta_last_synced_at', 'updated_at']);
const changedColumns = Object.keys(record).filter((k) => record[k] !== old_record[k]);
const isMetaOnly = changedColumns.every((col) => META_ONLY_COLUMNS.has(col));
if (isMetaOnly) return NextResponse.json({ revalidated: false, reason: 'meta_sync_only' });
```

---

## ✅ Section 5: New Fork Setup Checklist

Follow these steps in exact order when deploying a new store domain:

```bash
# 1. Fill out your .env.local variables with the active domain keys

# 2. Run the SQL schema script in the Supabase SQL editor:
#    (Execute supabase/schema/SUPER_MASTER_SCHEMA.sql)

# 3. Deploy Supabase revalidation trigger webhooks:
psql "$(grep -E "^DIRECT_URL=" .env.local | cut -d'="' -f2 | cut -d'"' -f1)" \
  -f supabase/migrations/20260616183200_setup_database_webhooks.sql

# 4. Deploy Cloudflare cache rules, proxy CNAMEs, and DNS TXT verification records:
node --env-file=.env.local scripts/deploy-cloudflare-rules.js

# 5. Run verification tests to check for caching leaks
grep -rn "headers()\|cookies()" app/ --include="*.tsx" --include="*.ts" | grep -v "robots\|sitemap\|admin\|api"

# 6. Deploy to Vercel
git push vercel main

# 7. Purge Cloudflare Edge Cache once after deployment:
node --env-file=.env.local -e "
const z=process.env.CLOUDFLARE_ZONE_ID, t=process.env.CLOUDFLARE_API_TOKEN;
fetch('https://api.cloudflare.com/client/v4/zones/'+z+'/purge_cache',{
  method:'POST',headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
  body:JSON.stringify({purge_everything:true})
}).then(r=>r.json()).then(d=>console.log(d.success?'✅ CF Purged':'❌',d.errors));
"

# 8. Test webhook manually from terminal:
curl -X POST https://yourdomain.pk/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: your_revalidate_secret" \
  -d '{"type":"UPDATE","table":"products","record":{"id":"test","slug":"test-slug"}}'
# Expected response: {"revalidated":true,"table":"products","type":"UPDATE"}
```
