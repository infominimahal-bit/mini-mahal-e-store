# Complete Production Cache & Webhook System
# Supabase + Cloudflare + Vercel + Browser
# Shopify Style - Multi Layer Cache Architecture

---

## QUICK START - Karne Ka Order
```
Step 1 → ENV variables add karo (.env.local + Vercel)
Step 2 → Cloudflare 4 rules + Zone ID + API Token
Step 3 → Agent ko prompt do → Code ban jaye
Step 4 → Vercel pe deploy ho jaye
Step 5 → Supabase 3 webhooks banao
Done! ✅
```

---

## BEFORE vs AFTER

### Vercel Bandwidth
```
Before:
Har user → Vercel se HTML fetch
1000 users = 1000 requests = bandwidth use ❌

After:
1000 users → Cloudflare cache se serve
Vercel = sirf 1 request!
Bandwidth: 90% bachti hai ✅
```

### Supabase Bandwidth
```
Before:
Har user → Supabase se image download
1000 users = 1000 image requests ❌

After:
1000 users → Cloudflare/Browser cache se
Supabase = sirf 1st user ka request
Bandwidth: 95% bachti hai ✅
```

### Speed
```
Before:
User → Vercel → Supabase → Response
Time: 800ms - 1500ms ❌

After:
User → Cloudflare cache → Done!
Time: 50ms - 100ms ✅
= 10x faster! 🚀
```

---

## SHOPIFY vs TERA PROJECT

```
Feature           Shopify     Tera Project
-----------       -------     ------------
CDN Cache         ✅           ✅ Cloudflare
Server Cache      ✅           ✅ Vercel ISR
Browser Cache     ✅           ✅ 1 year assets
Auto Invalidate   ✅           ✅ Webhook
Image Optimize    ✅           ✅ Next.js Image
Cache Busting     ✅           ✅ Timestamp/Hash
Speed             ~100ms       ~50-100ms ✅
Cost              $$$          Free tier ✅

= Free project = Shopify level performance! 🔥
```

---

## OVERVIEW - Poora System

```
Admin Change Kare
        ↓
Supabase DB Update
        ↓
Supabase Webhook Fire
        ↓
/api/revalidate hit ho
        ↓
┌─────────────────────────────┐
│  Vercel Cache Clear         │ ✅
│  Cloudflare Cache Clear     │ ✅
└─────────────────────────────┘
        ↓
Next User → Fresh Data ✅
Images/CSS/JS → Browser Cached ✅
Cart/Checkout → Hamesha Fresh ✅
```

---

# PART 1 — CLOUDFLARE SETUP

---

## 1A — Manual Karna Hai (Tera Kaam)

### Step 1: Cache Rules Banao
```
cloudflare.com → tera domain →
Caching → Cache Rules → Create Rule

RULE 1 - No Cache (Cart/Checkout):
Name: no-cache-pages
Match: 
  Path contains /cart
  OR Path contains /checkout
  OR Path contains /account
  OR Path contains /api
Action: Bypass Cache ✅

RULE 2 - Static Assets:
Name: static-assets
Match: Path contains /_next/static/
Action: Cache Everything
Edge TTL: 1 year ✅

RULE 3 - Images:
Name: supabase-images  
Match: Hostname contains supabase.co
Action: Cache Everything
Edge TTL: 30 days ✅

RULE 4 - HTML Pages:
Name: html-pages
Match: /* (wildcard - baaki sab)
Action: Cache Everything
Edge TTL: 24 hours ✅
(Webhook purge clear karta hai admin change pe → fresh data 1-2 sec me)
```

### Step 2: Speed Settings
```
Cloudflare → Speed → Optimization:
✅ Auto Minify → JS, CSS, HTML on karo
✅ Brotli Compression → On karo
```

### Step 3: Zone ID Copy Karo
```
cloudflare.com → tera domain →
Right side panel → scroll down →
"Zone ID" → Copy karo → .env.local mein rakho
```

### Step 4: API Token Banao
```
Cloudflare → Top right corner →
My Profile → API Tokens →
Create Token →
"Create Custom Token" select karo →
Permissions (add ALL of these):
  - Zone -> Cache Rules -> Edit
  - Zone -> Zone Settings -> Edit
  - Zone -> Zone -> Edit
  - Zone -> Cache Purge -> Purge
  - Zone -> DNS -> Edit
  - Zone -> Analytics -> Read
Zone Resources: All zones (multi-domain ke liye) →
Create Token →
Token copy karo → .env.local mein rakho

⚠️ Token ek baar dikhta hai - turant copy karo!
```

---

## 1B — Agent Kar Le Ga (Code Mein)

```
Agent automatically karega:
✅ /api/revalidate mein Cloudflare purge API call
✅ Admin change hone pe specific URL purge
✅ ENV variables use karega code mein
✅ Webhook ke saath Cloudflare bhi clear hoga

Tera kaam nahi:
❌ Code likhna
❌ API call karna
❌ Cloudflare logic banana
```

---

## 1C — ENV Variables (Tera Kaam - Ek Baar)

```bash
# .env.local mein add karo:
CLOUDFLARE_ZONE_ID=yahan_zone_id_paste_karo
CLOUDFLARE_API_TOKEN=yahan_token_paste_karo
NEXT_PUBLIC_SITE_URL=https://teri-site.vercel.app

# Vercel Dashboard mein bhi same teen add karo:
# Project → Settings → Environment Variables
```

---

# PART 2 — SUPABASE WEBHOOK SETUP

---

## 2A — Manual Karna Hai (Tera Kaam)

### Kab Karna Hai:
```
✅ Agent ne /app/api/revalidate/route.ts bana diya
✅ Site Vercel pe deploy ho gayi
✅ REVALIDATE_SECRET ENV mein set hai
Tab yeh karo!
```

### Products Table Webhook:
```
supabase.com → tera project →
Database → Webhooks → Create New Hook

Name:    revalidate-products
Schema:  public
Table:   products
Events:  ✅ INSERT  ✅ UPDATE  ✅ DELETE

Type:    HTTP Request
Method:  POST
URL:     https://TERI-SITE.vercel.app/api/revalidate

HTTP Headers:
  Key:   x-revalidate-secret
  Value: [tera REVALIDATE_SECRET ki exact value]

→ Save ✅
```

### Banners Table Webhook:
```
Name:    revalidate-banners
Schema:  public
Table:   banners
Events:  ✅ INSERT  ✅ UPDATE  ✅ DELETE

Type:    HTTP Request
Method:  POST
URL:     https://TERI-SITE.vercel.app/api/revalidate

HTTP Headers:
  Key:   x-revalidate-secret
  Value: [tera REVALIDATE_SECRET ki exact value]

→ Save ✅
```

### Categories Table Webhook:
```
Name:    revalidate-categories
Schema:  public
Table:   categories
Events:  ✅ INSERT  ✅ UPDATE  ✅ DELETE

Type:    HTTP Request
Method:  POST
URL:     https://TERI-SITE.vercel.app/api/revalidate

HTTP Headers:
  Key:   x-revalidate-secret
  Value: [tera REVALIDATE_SECRET ki exact value]

→ Save ✅
```

### ⚠️ IMPORTANT RULE - Nai Table = Naya Webhook:
```
Jab bhi agent nai table banaye:
Supabase → Database → Webhooks → Create

Fill karo:
- Table: nai table ka naam
- URL: same
- Header: same secret
- Events: INSERT + UPDATE + DELETE

Yeh rule kabhi mat bhulo!
```

---

## 2B — Agent Kar Le Ga (Code Mein)

```
Agent automatically karega:
✅ /app/api/revalidate/route.ts banana
✅ Har table ke liye revalidateTag logic
✅ Secret key verification
✅ Cloudflare purge call
✅ Error handling
✅ Response codes (200/401/500)

Tera kaam nahi:
❌ Code likhna
❌ API logic banana
```

---

## 2C — ENV Variables (Tera Kaam - Ek Baar)

```bash
# .env.local mein add karo:
REVALIDATE_SECRET=koi_bhi_random_strong_string

# Vercel Dashboard mein bhi same:
# Project → Settings → Environment Variables
# REVALIDATE_SECRET = same value

# Dono jagah same hona ZAROORI hai!
```

---

# PART 3 — VERCEL CACHE SETUP

---

## 3A — Manual Karna Hai (Tera Kaam)

### ENV Variables Add Karo:
```
Vercel Dashboard → Project →
Settings → Environment Variables →
Yeh sab add karo:

REVALIDATE_SECRET=xxx
CLOUDFLARE_ZONE_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
NEXT_PUBLIC_SITE_URL=https://teri-site.vercel.app

+ Teri existing Supabase ENV variables bhi honi chahiye:
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 3B — Agent Kar Le Ga (Code Mein)

```
Agent automatically karega:
✅ next.config.ts update - image formats, cache TTL
✅ Har page pe revalidate constant
✅ Fetch requests pe cache tags
✅ Cache-Control headers
✅ /lib/revalidate.ts helper functions
✅ /lib/uploadImage.ts utility
✅ Admin upload code replace

Page wise revalidate jo agent lagayega:
- Homepage:        export const revalidate = 600
- Category pages:  export const revalidate = 300  
- Product pages:   export const revalidate = 60
- Cart:            export const revalidate = 0
- Checkout:        export const revalidate = 0
- Account:         export const revalidate = 0
```

---

# PART 4 — BROWSER CACHE

---

## 4A — Manual Karna Hai (Tera Kaam)

```
Kuch nahi karna! 
Next.js + Agent sab handle karega ✅
```

---

## 4B — Agent Kar Le Ga (Code Mein)

```
Agent next.config.ts mein lagayega:

HTML Pages:
  Cache-Control: public, s-maxage=86400, stale-while-revalidate=60
  CDN-Cache-Control: public, s-maxage=86400, stale-while-revalidate=60
  Cloudflare: 24h Edge cache (webhook purge pe clear)
  Browser: stale-while-revalidate=60 — 1 min stale allow

Cart/Checkout:
  Cache-Control: no-store, no-cache
  Browser: kabhi save nahi karega

Static Assets (CSS/JS):
  Cache-Control: public, max-age=31536000, immutable
  Browser: 1 saal cache karega
  
Images:
  Cache-Control: public, max-age=31536000
  Browser: 1 saal cache karega
  
Cache Busting automatic:
  Next.js: main-abc123.css (har build pe naya hash)
  Images: banner-1718123456.jpg (upload pe timestamp)
  File change = URL change = Browser auto fresh ✅
```

---

# PART 5 — IMAGE UPLOAD SYSTEM

---

## 5A — Manual Karna Hai (Tera Kaam)

```
Supabase Dashboard →
Storage → Buckets → tera bucket →
Settings → Cache Control:
  public, max-age=31536000

Bas! Baaki agent karega ✅
```

---

## 5B — Agent Kar Le Ga (Code Mein)

```
/lib/uploadImage.ts agent banayega:
✅ Filename exist check karega
✅ Timestamp add karega: banner-1718123456.jpg
✅ Supabase storage mein upload
✅ Public URL return karega
✅ Format validation (jpg,jpeg,png,webp,avif)
✅ Error handling

Sab admin upload pages pe:
✅ Products image upload
✅ Banners image upload  
✅ Category image upload
Sab same function use karenge!
```

---

# PART 6 — COMPLETE FLOW (Admin Change Se Browser Tak)

---

## Scenario 1: Admin Product Price Change Kare

```
1. Admin save kare
        ↓
2. Supabase DB update
        ↓
3. Supabase Webhook fire (products table)
        ↓
4. POST → /api/revalidate
   Body: {table: "products", record: {slug: "shirt"}}
        ↓
5. Secret key check ✅
        ↓
6. revalidateTag("product-shirt") → Vercel clear ✅
        ↓
7. Cloudflare API → purge /product/shirt ✅
        ↓
8. Next visitor:
   Browser → Cloudflare (miss) → Vercel (miss) 
   → Supabase fetch → Fresh price ✅
        ↓
9. Cloudflare + Vercel cache ho gaya
10. Baaki sab visitors → Instant fresh data ✅
```

## Scenario 2: Admin Banner Change Kare

```
1. Admin nai image upload kare
        ↓
2. uploadImage() → banner-1718123456.jpg (naya naam)
        ↓
3. Supabase storage mein save
        ↓
4. DB mein naya URL save
        ↓
5. Webhook fire (banners table)
        ↓
6. revalidateTag("homepage") → Vercel clear ✅
7. Cloudflare → homepage purge ✅
        ↓
8. Next visitor → Fresh banner ✅
   Browser mein naya URL = auto fresh image ✅
```

## Scenario 3: Normal User Visit (No Change)

```
User teri site pe aaye
        ↓
Cloudflare → Cache hit → Ultra fast serve ✅
(Vercel + Supabase tak jaata hi nahi!)
        ↓
CSS/JS → Browser cache se → Instant ✅
Images → Cloudflare/Browser cache se → Fast ✅
        ↓
= Zero server load
= Ultra fast experience ✅
```

---

# PART 7 — COMPLETE CHECKLIST

---

## Tera Manual Kaam (Ek Baar Sirf)

```
CLOUDFLARE:
□ Cache Rule 1: /cart /checkout /api → Bypass
□ Cache Rule 2: /_next/static/ → 1 year
□ Cache Rule 3: supabase.co → 30 days
□ Cache Rule 4: /* → 1 minute
□ Speed → Auto Minify ON
□ Zone ID copy karo
□ API Token banao (Cache Purge permission)

SUPABASE:
□ products table webhook banao
□ banners table webhook banao
□ categories table webhook banao
□ Storage bucket Cache-Control set karo
□ Nai table bane = Naya webhook rule!

ENV VARIABLES (.env.local + Vercel dono mein):
□ REVALIDATE_SECRET=xxx
□ CLOUDFLARE_ZONE_ID=xxx
□ CLOUDFLARE_API_TOKEN=xxx
□ NEXT_PUBLIC_SITE_URL=xxx
□ NEXT_PUBLIC_SUPABASE_URL=xxx (already hai)
□ NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx (already hai)
□ SUPABASE_SERVICE_ROLE_KEY=xxx (already hai)
```

## Agent Ka Kaam (Prompt Do - Woh Karega)

```
CODE:
□ next.config.ts update
□ Cache-Control headers
□ Page revalidate constants
□ Fetch cache tags
□ /lib/uploadImage.ts
□ /lib/revalidate.ts
□ /app/api/revalidate/route.ts
□ Admin upload code replace
□ Cloudflare purge logic
```

---

# PART 8 — COMPLETE SUMMARY TABLE

```
Layer        | Kya Cache Hota     | Kab Clear Hota        | Kaun Karta
-------------|--------------------|-----------------------|------------
Browser      | CSS/JS/Images      | URL change pe auto    | Next.js auto
Cloudflare   | HTML/Images        | Webhook + API purge   | Agent code + CF API
Vercel       | HTML pages (ISR)   | revalidateTag         | Agent code
Supabase     | Storage images     | Nahi hota (URL change)| uploadImage()

No Cache:
Cart         | Kabhi nahi      | N/A                 | no-store header
Checkout     | Kabhi nahi      | N/A                 | no-store header
Account      | Kabhi nahi      | N/A                 | no-store header
API routes   | Kabhi nahi      | N/A                 | no-store header
```

---

# PART 9 — WEBHOOK LAGAO YA NAI - COMPLETE GUIDE

## ✅ In Tables Pe Webhook LAGAO (Public Cache Hoti Hain)
```
products        → frontend pe dikhta hai → WEBHOOK ✅
banners         → homepage pe dikhta hai → WEBHOOK ✅
categories      → category pages pe      → WEBHOOK ✅
collections     → public listing page    → WEBHOOK ✅
blogs/posts     → public blog page       → WEBHOOK ✅
announcements   → public page pe         → WEBHOOK ✅
settings        → site wide settings     → WEBHOOK ✅
faqs            → public faq page        → WEBHOOK ✅
reviews         → product page pe        → WEBHOOK ✅
```

## ❌ In Tables Pe Webhook MAT LAGAO (Private Data)
```
orders          → customer private data  → NO WEBHOOK ❌
users/profiles  → private accounts       → NO WEBHOOK ❌
payments        → sensitive data         → NO WEBHOOK ❌
cart            → real-time chahiye      → NO WEBHOOK ❌
sessions        → private                → NO WEBHOOK ❌
addresses       → private                → NO WEBHOOK ❌
invoices        → private                → NO WEBHOOK ❌
notifications   → per user private       → NO WEBHOOK ❌
audit_logs      → internal only          → NO WEBHOOK ❌
```

## Simple Rule - Webhook Lagaun Ya Nahi?
```
Question: Kya yeh table ka data
          public pages pe cache hota hai?

YES → Webhook lagao ✅
NO  → Webhook mat lagao ❌

Example:
products → Homepage/product page pe dikhta hai? YES → Webhook
orders   → Customer ka private order? NO → No Webhook
```

## Nai Table Banao To Check Karo:
```
1. Kya yeh data public frontend pe dikhega?
2. Kya yeh data cache hoga?

Dono YES → Webhook banao
Koi bhi NO → Webhook nahi
```

---

# PART 10 — REVALIDATE SECRET - Complete Guide

## Kya Hai REVALIDATE_SECRET?
```
Ek password hai jo sirf tujhe aur 
Supabase ko pata hoga

Supabase webhook → teri site pe request bhejta hai
Teri site → password check karti hai
Match hua → Cache clear ✅
Match nahi → Request reject 401 ❌
```

## Kaise Banate Hain?
```
Koi bhi random string likho - bas strong ho:

Acha:
myshop_secret_x7k2p9_2024 ✅

Bura:
123456 ❌
password ❌
secret ❌

Ya online generate karo:
https://generate-secret.vercel.app/32
```

## Kahan Kahan Set Karna Hai?
```
3 jagah - teeno same value:

1. .env.local (local development):
   REVALIDATE_SECRET=myshop_secret_x7k2p9

2. Vercel Dashboard (production):
   Project → Settings → Environment Variables
   REVALIDATE_SECRET=myshop_secret_x7k2p9

3. Supabase Webhook Header (manually):
   Key:   x-revalidate-secret
   Value: myshop_secret_x7k2p9

TEENO JAGAH EXACTLY SAME HONA CHAHIYE!
```

---

# PART 11 — SAHI DEPLOY ORDER

## Galat Order Se Kya Hoga?
```
Agar webhook pehle banao aur code baad mein:
Supabase → Request bhejega → 404 Error ❌
Webhook fail hoga

Sahi order follow karo!
```

## Sahi Order:
```
Step 1 → ENV variables set karo
         .env.local + Vercel dono mein
         
Step 2 → Agent se code banwao
         /api/revalidate route banega
         
Step 3 → Vercel pe deploy karo
         Code live ho jaye pehle
         
Step 4 → Test karo URL kaam kar rahi hai?
         https://teri-site.vercel.app/api/revalidate
         POST request pe 401 aana chahiye
         (secret nahi diya to 401 = sahi kaam kar raha hai!)
         
Step 5 → Cloudflare cache rules lagao
         
Step 6 → Supabase webhooks banao
         Ab sahi kaam karega! ✅
```

---

# PART 12 — TESTING & TROUBLESHOOTING

## Webhook Test Kaise Karein?
```
Option 1 - Supabase se:
Supabase → Database → Webhooks →
tera webhook → "Send test webhook" button
→ Response dekhо

Option 2 - Admin se:
Admin panel mein koi product update karo
→ Supabase logs check karo
→ Vercel logs check karo
```

## Logs Kahan Dekhein?
```
Supabase Logs:
supabase.com → project →
Database → Webhooks → tera webhook → Logs
✅ 200 = Success
❌ 401 = Secret galat
❌ 404 = URL galat / code deploy nahi
❌ 500 = Code mein bug

Vercel Logs:
vercel.com → project →
Functions → /api/revalidate → Logs
Real time logs dikhenge
```

## Common Errors Fix:
```
ERROR: 401 Unauthorized
FIX: REVALIDATE_SECRET check karo
     .env.local = Vercel = Supabase header
     Teeno same honi chahiye!

ERROR: 404 Not Found  
FIX: Code deploy hua? Check karo
     /app/api/revalidate/route.ts exist karta hai?
     Vercel pe latest deploy hai?

ERROR: 500 Internal Server Error
FIX: Vercel logs mein exact error dekho
     CLOUDFLARE_ZONE_ID set hai?
     CLOUDFLARE_API_TOKEN set hai?

ERROR: Webhook fire nahi ho raha
FIX: Supabase → Webhooks → enabled hai?
     Table name sahi hai?
     Events checked hain INSERT/UPDATE/DELETE?
```

## Quick Test - Sab Sahi Hai Check Karo:
```
Browser mein yeh URL kholo:
https://teri-site.vercel.app/api/revalidate

GET request pe: 405 Method Not Allowed ✅
(Matlab route exist karta hai, sirf POST accept karta hai)

Agar 404 aaye: Code deploy nahi hua ❌
```

---

# GOLDEN RULES - Hamesha Yaad Rakho

```
1. Nai table = Naya Supabase webhook ⚠️
2. Cart/Checkout = KABHI cache nahi
3. HTML = no-store (browser mein save nahi)
4. Static assets = 1 saal immutable
5. Image upload = Hamesha timestamp add karo
6. Admin change = Vercel + Cloudflare dono clear
7. ENV variables = .env.local + Vercel dono mein same
8. API Token = Ek baar dikhta hai, turant copy karo!
```

---

## Is System Ka Naam:
```
"Multi Layer Tiered Cache Architecture"
+
"Cache Busting"
+  
"Stale While Revalidate (SWR)"
+
"Webhook Based Cache Invalidation"

= Same system jo Shopify, Vercel, Netflix use karte hain ✅
```

---

# PART 13 — VIDEO CACHING (Banners/Products mein Video Links)

## Video Kaise Handle Karein

```
✅ Recommended: YouTube/Vimeo embed
   - Unka khud CDN hai, zero bandwidth cost
   - Cache ki tension nahi

⚠️ Agar Supabase/self-hosted video file:
   - Bada size hota hai (MBs)
   - Cloudflare Cache Rule add karo:
     Match: *.mp4 OR *.webm OR *.mov
     Action: Cache Everything
     Edge TTL: 30 days
```

## Webhook + Video - Kya Hoga?

```
✅ Webhook KAAM KAREGA video pe bhi
   (banners/products table ka column hai = webhook fire hoga)

Flow same hai:
Admin video URL change kare
→ Webhook fire (banners/products table)
→ revalidateTag → Vercel cache clear
→ Cloudflare purge (agar URL same hai)
```

## Browser Mein New Video Aayegi?

```
⚠️ DEPENDS on URL:

Case 1 - YouTube/Vimeo link change:
✅ Naya URL = Naya video ID
✅ Browser fresh embed load karega
✅ Koi cache issue nahi

Case 2 - Same filename, video file replace:
❌ Same URL = Browser/Cloudflare PURANI video
   dikha sakta hai cache se
✅ FIX: Hamesha naya filename do
   (uploadImage() jaisa - timestamp add karo)
   video-1718123456.mp4

Case 3 - Naya filename har baar (recommended):
✅ Naya URL = Naya cache entry
✅ Browser turant fresh video lega
✅ Purani cache automatically unused ho jati hai
```

## Golden Rule - Video
```
HAMESHA naya filename do video upload pe
(timestamp add karo jaise images mein)
= Cache busting automatic
= Browser hamesha fresh video dikhayega
= Webhook + revalidate already kaam karega
```
