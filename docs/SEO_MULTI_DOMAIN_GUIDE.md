# SEO & Multi-Domain Setup Guide

> Yeh guide har **domain** (`.com.pk`, `.com`, localhost) ke liye kaam kare ga.  
> Koi hardcoded domain nahi hai — sab `settings.storeUrl` se dynamically generate hota hai.

---

## 📋 1. Required Accounts & Keys

| # | Service | Kya hai | Link | Free? |
|---|---------|---------|------|-------|
| 1 | **Google Search Console** | Site verify karo, crawl monitor karo | https://search.google.com/search-console | ✅ Free |
| 2 | **Google Indexing API** | Product add/delete pe Google ko instant notify | https://console.cloud.google.com/apis/library/indexing.googleapis.com | ✅ Free (200 URLs/day) |
| 3 | **Google AI Studio** | Gemini API key — Vision + Text AI ke liye | https://aistudio.google.com/apikey | ✅ Free (1500 req/day) |
| 4 | **Groq** | Fast text AI — `llama-4-scout` | https://console.groq.com/keys | ✅ Free (14400 req/day) |
| 5 | **Mistral** | Vision + Text volume AI | https://console.mistral.ai/api-keys/ | ✅ Free (~1B tokens/month) |
| 6 | **OpenRouter** | Fallback AI — 29+ free models | https://openrouter.ai/keys | ✅ Free |
| 7 | **IndexNow** | Bing/Yandex instant indexing | Already set in `.env.local` | ✅ Free |
| 8 | **Cloudflare** | CDN + Cache + DNS | Already set in `.env.local` | ✅ Free tier |
| 9 | **DeepSeek** | Cheapest paid fallback AI | https://platform.deepseek.com/api_keys | 💰 $0.14/1M tokens |
| 10 | **Cerebras** | High throughput free AI | https://cloud.cerebras.ai/platform | ✅ Free |

---

## 🛠️ 2. Step-by-Step Setup

### 2.1 Google Search Console
```
1. Jaao: https://search.google.com/search-console
2. "Add Property" → Domain enter karo (e.g., domain.com.pk)
3. DNS verification → TXT record add karo
4. Verify → Done ✅
```
> 🔁 **Har domain ke liye alag se karna hoga.** `domain.com.pk`, `domain.com`, sub ke liye.

### 2.2 Google Indexing API (Optional — for instant Google crawl)
```
1. Jaao: https://console.cloud.google.com/apis/library/indexing.googleapis.com
2. "Web Search Indexing API" → Enable karo
3. Jaao: https://console.cloud.google.com/iam-admin/serviceaccounts
4. + CREATE SERVICE ACCOUNT → Name: `my-store-indexing` → Create
5. Keys tab → Add Key → Create New Key → JSON → Download
6. JSON file se private_key aur client_email copy karo
7. Jaao: https://search.google.com/search-console
8. Settings → Users → ADD USER → Service account email → Permission: "Owner"
9. .env.local mein daalo:
   GOOGLE_INDEXING_SA_EMAIL=your-sa@project.iam.gserviceaccount.com
   GOOGLE_INDEXING_SA_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```
> **Critical:** JSON key single-line `\n` format mein ho. 
> Double base64 encoding bug tha — fix: `rs256Sign()` raw `Buffer` return kare, base64 nahi.
> Details: `docs/GOOGLE_INDEXING_LEARNINGS.md`

### 2.3 AI Provider Keys (Admin Panel)
```
1. Admin → AI Settings → AI Models tab
2. Har provider ke section mein key paste karo:
   - Google AI Studio: apikey
   - Groq: gsk_your_key
   - Mistral: your_key
   - OpenRouter: sk-or-your-key
3. "Validate Key" button se test karo
4. Save karo
```

### 2.4 IndexNow (Already Set)
`.env.local` mein already hai:
```
INDEXNOW_API_KEY=5a83b276cd8d4850af5c81de4c34a2e8
```
> Kuch nahi karna. Product add/delete pe automatically ping hota hai.

---

## 🌐 3. Multi-Domain System

### Kaise kaam karta hai?
```
Har request pe:
  settings.storeUrl (DB se)  ← Priority 1
  ya host header             ← Priority 2
  ya NEXT_PUBLIC_SITE_URL    ← Priority 3
  ya localhost:3000          ← Fallback

Yeh value use hoti hai:
  ✅ Sitemap — domain.com.pk/sitemap.xml
  ✅ Robots.txt — domain.com.pk/robots.txt
  ✅ Canonical URLs — har page ka <link rel="canonical">
  ✅ JSON-LD Schema — Product, Breadcrumb, AggregateRating
  ✅ OG Tags — Facebook/Twitter preview
  ✅ IndexNow Ping — Bing ko notify
  ✅ Google Indexing — Google ko notify
  ✅ Favicon — dynamic from DB settings
```

### Naya domain lagane ke steps:
```
1. Cloudflare DNS mein domain add karo
2. Vercel mein domain attach karo
3. Admin → General Settings → Store URL update karo
4. Google Search Console mein naya domain verify karo
   (Search Console → Add Property → URL prefix)
```

---

## 🧪 4. Testing System

| Test | Kaise karein | Expected Result |
|------|-------------|-----------------|
| **Sitemap** | Browser mein `domain.com.pk/sitemap.xml` kholo | Products, categories, static pages sab dikhne chahiye |
| **Robots.txt** | `domain.com.pk/robots.txt` kholo | `/admin`, `/api` disallow hain, sitemap link ho |
| **Canonical** | Kisi product page ka page source kholo → `<link rel="canonical"` search karo | URL aapke domain ka ho |
| **JSON-LD** | Page source → `schema.org` search karo | Product, Breadcrumb, AggregateRating sab ho |
| **OG Tags** | https://opengraph.xyz/ pe product page URL daalo | Title, description, image sahi ho |
| **Google Indexing** | Search Console → URL Inspection → koi product URL daalo | "URL is on Google" dikhna chahiye |
| **IndexNow** | Product add/delete karo → Server logs dekho `[IndexNow] Pinging` | "URLs submitted successfully" log aye |
| **AI Auto-Tag** | Media upload karo → dekho toast "Auto AI description added" | Works with Google → Groq → Mistral fallback |
| **Multi-Domain** | Doosre domain se site kholo → page source dekho | Canonical URL usi domain ka ho |

### Testing Tools (Free):
| Tool | Link | Kya check karega |
|------|------|-----------------|
| Google Search Console | https://search.google.com/search-console | Indexing status, errors |
| Google PageSpeed | https://pagespeed.web.dev/ | Speed score |
| OpenGraph Debugger | https://opengraph.xyz/ | OG tags |
| Schema.org Validator | https://validator.schema.org/ | JSON-LD schema |
| XML Sitemap Validator | https://www.xml-sitemaps.com/validate-xml-sitemap.html | Sitemap format |
| Robots.txt Tester | https://support.google.com/webmasters/answer/6062598 | Robots.txt |
| Pingdom Speed Test | https://tools.pingdom.com/ | Load time |

---

## ⚡ 5. Auto-Indexing Flow (Product Add/Delete)

```
Admin Product Add/Delete
  ↓
Supabase DB Trigger (webhook)
  ↓
/api/revalidate endpoint
  ├── Next.js ISR cache purge (instant)
  ├── Cloudflare CDN cache purge (instant)
  ├── IndexNow → Bing/Yandex (within minutes)
  └── Google Indexing API → Google (within hours)
```

> **Note:** Google Indexing API ke liye service account setup karna hoga (step 2.2).  
> Agar nahi kiya to sirf IndexNow (Bing/Yandex) kaam kare ga, Google organic crawl kare ga.

---

## 🔗 6. `.env.local` Required Variables

```
# Already Set ✅
SUPABASE_*          → Supabase connection
CLOUDFLARE_*        → CDN + Cache
REVALIDATE_SECRET   → Webhook auth
INDEXNOW_API_KEY    → Bing indexing
NEXT_PUBLIC_*       → Brand, Meta Pixel

# Optional — Google Indexing ke liye ⬇️
GOOGLE_INDEXING_SA_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_INDEXING_SA_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# AI Keys → Admin panel mein dalo (NOT .env.local)
# Groq, Gemini, Mistral, OpenRouter → Admin → AI Settings
```

---

## ✅ 7. Verification Checklist

- [ ] `domain.com.pk/sitemap.xml` — Products, categories, pages sab hain
- [ ] `domain.com.pk/robots.txt` — Admin disallow, sitemap link
- [ ] Product page ka canonical URL sahi hai
- [ ] JSON-LD schema (Product + Breadcrumb) present hai
- [ ] OG tags correct hain (OpenGraph debugger)
- [ ] Google Search Console mein site verified hai
- [ ] AI keys admin panel mein set hain
- [ ] Auto vision tagging kaam kar raha hai (upload test karo)
- [ ] IndexNow ping ho raha hai (check server logs)
- [ ] Har domain apne aap kaam kar raha hai
