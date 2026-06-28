# Google Indexing API Setup Guide

> **Agent Note:** Yeh guide complete hai. Naye domain ke liye sirf "Naya Domain Setup" section follow karo. Tests section mein saare curl commands hain jo maine verify kiye hain.

> Ye setup Google ko automatically notify karta hai jab bhi koi product/page add ya update ho — faster indexing milti hai Google Search mein.

---

## Step 1 — Web Search Indexing API Enable Karo

1. Jao: https://console.cloud.google.com/apis/library
2. Search karo: `Web Search Indexing API`
3. Click karo → **Enable** dabao

---

## Step 2 — Service Account Banao

1. Jao: https://console.cloud.google.com/iam-admin/serviceaccounts
2. **+ CREATE SERVICE ACCOUNT** click karo
3. Name: koi bhi (e.g. `my-store-indexing`)
4. **Create and continue** dabao
5. Role search karo: `Owner` → select karo
6. **Continue** → **Done**

---

## Step 3 — JSON Key Download Karo

1. Same page pe apna service account click karo
2. **Keys** tab click karo
3. **Add Key** → **Create new key**
4. **JSON** select karo → **Create**
5. File download ho jaye gi: `gen-lang-client-XXXX.json`

---

## Step 4 — Search Console mein Owner Banao

1. Jao: https://search.google.com/search-console
2. Apni site select karo (jo bhi domain ho) → **Settings** → **Users and permissions**
3. **ADD USER** click karo
4. Email paste karo (JSON file se):
   `YOUR_SA_NAME@YOUR_PROJECT.iam.gserviceaccount.com`
5. Permission: **Owner** → **Add**

---

## Step 5 — ENV Variables Add Karo

`.env.local` mein ye daalo (JSON file se copy karo):

```env
GOOGLE_INDEXING_SA_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_INDEXING_SA_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

---

## Step 6 — Verify Setup (Test)

Setup complete hone ke baad, browser mein ye kholo:

```
https://YOUR_DOMAIN/api/seo/test
```

`googleIndexing` ka status `ok` aana chahiye.

Ya manually test karo:

```bash
curl -X POST https://YOUR_DOMAIN/api/indexing \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_DOMAIN/", "type": "URL_UPDATED"}'
```

Response:
```json
{ "success": true, "url": "https://YOUR_DOMAIN/", "type": "URL_UPDATED" }
```

Batch test:
```bash
curl -X POST https://YOUR_DOMAIN/api/indexing/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://YOUR_DOMAIN/", "https://YOUR_DOMAIN/shop"]}'
```

---

## Flow Summary

```
Product Save/Update
       |
       v
/api/indexing POST
       |
       v
JWT → OAuth Token
       |
       v
Google Indexing API
       |
       v
Google crawls URL
within minutes/hours
```

---

# IndexNow Setup Guide

> IndexNow ek protocol hai jo Bing, Yandex aur ab Google ko turant bata deta hai ke URLs change ho gaye hain. Free hai, unlimited URL submissions.

---

## Step 1 — Key Generate Karo

Koi bhi random 32+ character alphanumeric string banao:

```bash
openssl rand -hex 16
```

Output:
```
5a83b276cd8d4850af5c81de4c34a2e8
```

---

## Step 2 — Key File Host Karo

`public/{KEY}.txt` file banao:

```bash
echo "5a83b276cd8d4850af5c81de4c34a2e8" > public/5a83b276cd8d4850af5c81de4c34a2e8.txt
```

**Important:** Vercel `public/` folder se static files serve karta hai. Kisi rewrite/route ki zaroorat nahi.

Verify locally:
```bash
curl http://localhost:3000/5a83b276cd8d4850af5c81de4c34a2e8.txt
# → 5a83b276cd8d4850af5c81de4c34a2e8
```

---

## Step 3 — ENV Variable Set Karo

`.env.local` mein daalo:
```env
INDEXNOW_API_KEY=5a83b276cd8d4850af5c81de4c34a2e8
```

Vercel production ke liye bhi env var set karo.

---

## Step 4 — IndexNow API Ping

Manual test:
```bash
curl -X POST https://YOUR_DOMAIN/api/indexnow \
  -H 'Content-Type: application/json' \
  -d '{"urls": ["https://YOUR_DOMAIN/", "https://YOUR_DOMAIN/shop"]}'
```

---

## Step 5 — Verify

Check key file:
```bash
curl -s -w '\nHTTP %{http_code}' https://YOUR_DOMAIN/INDEXNOW_API_KEY.txt
# → HTTP 200, key text
```

Wrong key → HTTP 404:
```bash
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://YOUR_DOMAIN/wrong-key.txt
```

SEO health check:
```bash
curl -s https://YOUR_DOMAIN/api/seo/test | python3 -c "
import sys,json; d=json.load(sys.stdin)
for k,v in d['results'].items():
    print(f'  {k}: {v.get(\"status\",\"?\")}')"
```

`indexNow` status `ok` aana chahiye.

---

## Flow

```
Product Save/Update
       |
       v
/api/revalidate (webhook)
       |
       v
notifyGoogleIndexing() + indexNow ping
       |
       ├──→ Google Indexing API (200/day)
       └──→ IndexNow API (unlimited) → Bing, Yandex
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Key file 404 | Check `public/{KEY}.txt` file exist karti hai; API route bhi check karo: `curl /api/indexnow/key?key=KEY` |
| `indexNowTest: failed` | Key file verify nahi ho rahi — `curl https://domain.com/KEY.txt` test karo |
| Key file 200 but test fails | Cloudflare cache purge karo, 10s wait karo, phir retry |
| Multi-domain | INDEXNOW_API_KEY ko JSON format mein daalo: `{"domain1":"key1","domain2":"key2"}` |
| Key compromised | Naya key generate karo, old `public/{key}.txt` file delete/update karo, env update karo |

---

## Available API Endpoints

| Endpoint | Method | Body | Use |
|----------|--------|------|-----|
| `/api/indexing` | POST | `{ url, type }` | Single URL notify |
| `/api/indexing/batch` | POST | `{ urls[], type? }` | Max 200 URLs |
| `/api/seo/test` | GET | - | SEO health check |

---

## indexing_log Table (Supabase)

Har Google Indexing API call automatically log hoti hai:

| Column | Example |
|--------|---------|
| `url` | `https://YOUR_DOMAIN/product/kids-tshirt` |
| `type` | `URL_UPDATED` |
| `status` | `submitted` / `failed` |
| `created_at` | `2026-06-28T12:00:00Z` |

Logs dekhne: Supabase Dashboard → Table Editor → `indexing_log`

---

## Result

| Bina Setup | Iske Baad |
|-----------|-----------|
| 2 days — 2 weeks indexing | Minutes — hours indexing |
| Google apne time pe crawle | Google turant notify hota |
| New products late dikhte | New products jaldi search mein |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `googleIndexing` status `not configured` | `.env.local` mein `GOOGLE_INDEXING_SA_EMAIL` aur `GOOGLE_INDEXING_SA_KEY` check karo |
| `403 Forbidden` | Search Console mein service account email ko **Owner** permission nahi di |
| `429 Rate Limit` | Google Indexing API free limit 200 URLs/day, kal tak wait karo |
| JWT error | Private key format sahi hai? Double quotes + literal `\n` hona chahiye |

---

## 🧠 Learnings (Isses & Fixes)

### 1. Double Base64 Encoding Bug
**Symptom:** `"invalid_grant" / "Invalid JWT Signature"`

**Cause:** `base64UrlEncode()` JWT signature ko do baar base64 encode kar raha tha:
```
rs256Sign() → base64 string → base64UrlEncode() → Buffer.from(str).toString('base64') → DOUBLE ENCODE
```

**Fix:** `rs256Sign()` ab raw `Buffer` return kare, base64 nahi. `base64UrlEncode(string | Buffer)` accept kare.

### 2. Private Key Format (.env vs Vercel)
**Cause:** `.env.local` mein actual newlines, Vercel JSON API mein `\n` literal chars.

**Fix:** Code mein normalize karo: `privateKey.replace(/\\n/g, '\n')`

### 3. Vercel Upload Corruption
**Cause:** Bash one-liner ne sirf key ki 2nd line capture ki, poora key nahi.

**Fix:** Python se extract karo: `re.search(r'KEY="([\s\S]+?)"', content)`

### 4. Vercel API Race Condition
**Cause:** DELETE ke immediately baad POST → "ENV_CONFLICT"

**Fix:** DELETE + wait 2s + POST, ya PATCH ka use karo.

### 5. Cloudflare Cache Stale
**Cause:** CF 4h cache → purana response aata raha.

**Fix:** Deploy ke baad CF cache purge karo.

### 6. GitHub Push Secret Block
**Cause:** Service account JSON file commit ho gayi.

**Fix:** `git reset --soft`, file `/tmp/` move, `.gitignore`, `push --force`

---

## 🧪 All Tests (Terminal + Manual)

### 1. Full SEO Health Check

```bash
curl -s https://YOUR_DOMAIN/api/seo/test | python3 -m json.tool
```

### 2. XML Sitemap Tests

```bash
# Fetch and parse sitemap
curl -s https://YOUR_DOMAIN/sitemap.xml | python3 -c "
import sys, xml.etree.ElementTree as ET
tree = ET.parse(sys.stdin)
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = tree.findall('.//s:url', ns)
print(f'Total URLs in sitemap: {len(urls)}')
for u in urls[:20]:
    loc = u.find('s:loc', ns).text
    pri = u.find('s:priority', ns)
    print(f'  {loc} (priority: {pri.text if pri is not None else \"N/A\"})')
if len(urls) > 20:
    print(f'  ... and {len(urls)-20} more')
"
```

```bash
# Quick sitemap count only
curl -s https://YOUR_DOMAIN/sitemap.xml | python3 -c "
import sys, xml.etree.ElementTree as ET
print(f'URL count: {len(ET.parse(sys.stdin).findall(\".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc\"))}')"
```

```bash
# Sitemap HTTP headers
curl -sI https://YOUR_DOMAIN/sitemap.xml | head -15
```

### 3. Robots.txt Test

```bash
curl -s https://YOUR_DOMAIN/robots.txt
```

### 4. IndexNow Key File Test

```bash
# Valid key → static file (priority)
curl -s -w '\nHTTP %{http_code}' https://YOUR_DOMAIN/INDEXNOW_API_KEY.txt

# Valid key → API route (fallback via rewrite)
curl -s -w '\nHTTP %{http_code}' https://YOUR_DOMAIN/api/indexnow/key?key=INDEXNOW_API_KEY

# Invalid key → should return HTTP 404
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://YOUR_DOMAIN/wrong-key.txt
```

### 5. IndexNow Ping Test

```bash
curl -s -X POST https://YOUR_DOMAIN/api/indexnow \
  -H 'Content-Type: application/json' \
  -d '{"urls": ["https://YOUR_DOMAIN/", "https://YOUR_DOMAIN/shop"]}'
```

### 6. Google Indexing — Single URL Submit

```bash
curl -s -X POST https://YOUR_DOMAIN/api/indexing \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://YOUR_DOMAIN/", "type": "URL_UPDATED"}'
```

### 7. Google Indexing — Batch Submit (max 200)

```bash
curl -s -X POST https://YOUR_DOMAIN/api/indexing/batch \
  -H 'Content-Type: application/json' \
  -d '{"urls": ["https://YOUR_DOMAIN/", "https://YOUR_DOMAIN/shop"]}'
```

### 8. Check Logs (Supabase)

```sql
SELECT * FROM indexing_log ORDER BY created_at DESC LIMIT 10;
```

### 9. Auto-Indexing Test

```
1. Admin mein product edit/save karo
2. Webhook trigger → notifyGoogleIndexing()
3. indexing_log mein entry aayi?
4. Search Console → URL Inspection → product URL
```

### 10. All-in-One Quick Status

```bash
curl -s https://YOUR_DOMAIN/api/seo/test | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d['results']
for k,v in r.items():
    s=v.get('status','?')
    icon = '✅' if s=='ok' else '⚠️' if s=='skipped' else '❌'
    extra = f' ({v.get(\"storeUrl\",\"\")})' if 'storeUrl' in v else ''
    print(f'{icon} {k}: {s}{extra}')
print(f'\nSummary: {d[\"summary\"]}')"
```

### Console Links

| Service | Link |
|---------|------|
| Enable Indexing API | https://console.cloud.google.com/apis/library/indexing.googleapis.com |
| Service Accounts | https://console.cloud.google.com/iam-admin/serviceaccounts |
| Search Console | https://search.google.com/search-console |
| Vercel Env Vars | https://vercel.com/PROJECT/settings/environment-variables |
| Cloudflare Dashboard | https://dash.cloudflare.com/ |
| Supabase Table Editor | https://supabase.com/dashboard/project/PROJECT_REF/editor |

---

# Multi-Domain Guide (TotVogue / Zaynahs)

## IndexNow Key: 2 Approaches

### Approach 1: Single Domain (Current — TotVogue.pk)
- `INDEXNOW_API_KEY=5a83b276cd8d4850af5c81de4c34a2e8` (env var)
- `public/5a83b276cd8d4850af5c81de4c34a2e8.txt` (static file)
- Key verify hoti hai: static file se (priority) ya API route se (fallback)

### Approach 2: Multi-Domain (Naye Domain ke liye)
`INDEXNOW_API_KEY` env var mein JSON object daalo:
```env
INDEXNOW_API_KEY={"www.totvogue.pk":"5a83b276cd8d4850af5c81de4c34a2e8","www.zaynahs.pk":"NEW_KEY_FOR_ZAYNAHS"}
```

Har domain ka apna key use hoga. Single string bhi kaam karega (backward compatible).

---

## Naya Domain Add Karne Ka Complete Checklist

| # | Cheez | Kya Karna Hai |
|---|-------|--------------|
| 1 | **IndexNow key** | `openssl rand -hex 16` se naya key banao |
| 2 | **Key file** | `public/{NEW_KEY}.txt` banao, andar key text likho |
| 3 | **Env var** | `INDEXNOW_API_KEY` update karo (JSON format ya new key) |
| 4 | **Google SA email** | Search Console mein service account email ko Owner banao |
| 5 | **Google Indexing** | Same SA key kaam karega (Google API project-level hai) |
| 6 | **Cloudflare zone** | Naya domain add karo CF mein, Zone ID update karo |
| 7 | **Vercel alias** | `npx vercel alias set DEPLOY_UID new-domain.com` |
| 8 | **Supabase settings** | DB mein `store_url`, `store_name`, `logo/favicon` set karo |
| 9 | **Vercel env vars** | Agar separate Vercel project hai to env vars set karo |
| 10 | **Test** | `/api/seo/test` run karo, sab `ok` confirm karo |

---

## Architecture Overview

```
One Codebase → One Vercel Project → Multiple Domains (via Cloudflare)
         ↓
   Cloudflare Proxy (orange cloud)
         ↓
   Vercel Edge → Next.js App Router
         ↓
   Domain detection via:
     - Client: window.location.origin
     - Server: getSiteUrl(settings) from DB settings.storeUrl
```

## Key File Resolution (Priority Order)

Jab IndexNow bot `https://domain.com/{KEY}.txt` request kare:

1. **Static file**: `public/{KEY}.txt` exist karta hai → serve kare
2. **API route**: `next.config.ts` rewrite → `/api/indexnow/key?key=KEY` → validate → serve
3. **404**: Agar key match nahi karta

Dono approaches kaam karte hain. Pehle static file check hoti hai, phir API route.

---

## Vercel Project Per Domain (Recommended for Full Isolation)

| Feature | Single Project (Shared) | Separate Projects |
|---------|------------------------|-------------------|
| **Code** | Same codebase | Same codebase (fork/branch) |
| **Env vars** | Shared (JSON format) | Independent per project |
| **IndexNow key** | JSON in single env var | Separate env var per project |
| **Key file** | Multiple in `public/` | Single per project |
| **Deploy** | One deploy updates all | Per-domain deploys |
| **Complexity** | Low | Medium |

**Recommendation:** Single project + JSON env var + multiple `public/{key}.txt` files for multi-domain. Bas naye domain ka key add karo aur deploy karo.

---

## Vercel Env Vars Set Karne Ka Script

```bash
V_TOKEN="your_vercel_token"
PROJECT_ID="prj_xxxxxxxxxxxx"

set_env() {
  curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $V_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"$1\",
      \"value\": \"$2\",
      \"type\": \"encrypted\",
      \"target\": [\"production\", \"preview\", \"development\"]
    }"
}

set_env "INDEXNOW_API_KEY" '{"www.totvogue.pk":"KEY1","www.newdomain.pk":"KEY2"}'
set_env "NEXT_PUBLIC_SITE_URL" "https://www.totvogue.pk"
```

---

## Vercel Alias Set Karo (Har Naye Domain Ke Liye)

```bash
# Latest deploy UID lo
LATEST_UID=$(curl -s -H "Authorization: Bearer $V_TOKEN" \
  "https://api.vercel.com/v6/deployments?limit=1" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['deployments'][0]['uid'])")

# Domain alias set karo
npx vercel alias set $LATEST_UID www.newdomain.com --token "$V_TOKEN"
```

---

# Naya Domain Setup — Step by Step

Yeh exact steps hain jo maine TotVogue.pk ke liye kiye. Naye domain ke liye bhi same sequence follow karo.

## Phase 1: Keys & Credentials

### 1. IndexNow Key Banao
```bash
openssl rand -hex 16
# Output: a3f82c91bd4e6071dc38f50a92b17e43
```

### 2. Google Service Account Key
- Pehle wala SA key reuse kar sakte ho (same Google Cloud project)
- Agar naya chahiye: https://console.cloud.google.com/iam-admin/serviceaccounts → Create → JSON download

## Phase 2: Code Changes

### 3. Key File Banao
```bash
echo "a3f82c91bd4e6071dc38f50a92b17e43" > public/a3f82c91bd4e6071dc38f50a92b17e43.txt
git add public/a3f82c91bd4e6071dc38f50a92b17e43.txt
git commit -m "feat: add IndexNow key for new-domain.com"
git push
```

### 4. Multi-Domain Key (Agar ek hi deployment mein do domain)
`INDEXNOW_API_KEY` env var ko JSON karo:
```json
{
  "www.totvogue.pk": "5a83b276cd8d4850af5c81de4c34a2e8",
  "www.newdomain.pk": "a3f82c91bd4e6071dc38f50a92b17e43"
}
```

Single-line format:
```
INDEXNOW_API_KEY={"www.totvogue.pk":"5a83b276cd8d4850af5c81de4c34a2e8","www.newdomain.pk":"a3f82c91bd4e6071dc38f50a92b17e43"}
```

### 5. Search Console Mein Owner Add Karo
1. Jaao: https://search.google.com/search-console
2. New domain add karo → property verify karo
3. Settings → Users → Add user
4. Email: `zaynahs-estore@gen-lang-client-0610294147.iam.gserviceaccount.com`
5. Permission: **Owner**

## Phase 3: Vercel Deploy

### 6. Vercel Env Vars Update
```bash
V_TOKEN="vcp_..."
PROJECT_ID="prj_EUI9K4GBEl5jDnHj5LxfWVPZuFU2"

# Pehle delete karo purani value
ENV_ID=$(curl -s -H "Authorization: Bearer $V_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); [print(e.get('id','')) for e in d.get('envs',[]) if e['key']=='INDEXNOW_API_KEY']")
curl -s -X DELETE -H "Authorization: Bearer $V_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID"
sleep 2

# Naya value set karo
curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $V_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "INDEXNOW_API_KEY",
    "value": "{\"www.totvogue.pk\":\"5a83b276cd8d4850af5c81de4c34a2e8\",\"www.newdomain.pk\":\"NEW_KEY\"}",
    "type": "encrypted",
    "target": ["production", "preview", "development"]
  }'
```

### 7. Deploy Trigger
```bash
git commit --allow-empty -m "ci: deploy with new domain keys"
git push
```

### 8. Wait + Alias Set
```bash
# Wait for READY
for i in 1 2 3 4 5 6 7 8; do
  STATE=$(curl -s -H "Authorization: Bearer $V_TOKEN" \
    "https://api.vercel.com/v6/deployments?limit=1" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['deployments'][0].get('state','?'))")
  echo "$(date +%H:%M:%S) $STATE"
  if [ "$STATE" = "READY" ]; then break; fi
  sleep 30
done

# Alias set
LATEST_UID=$(curl -s -H "Authorization: Bearer $V_TOKEN" \
  "https://api.vercel.com/v6/deployments?limit=1" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['deployments'][0]['uid'])")
npx vercel alias set $LATEST_UID www.newdomain.com --token "$V_TOKEN"
```

## Phase 4: Test

### 9. Cloudflare Purge
```bash
ZONE="e4aceeacdc4f6a1677e92823df1651fd" # Naye domain ka zone ID
CFTOKEN="cfut_..."
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
  -H "Authorization: Bearer $CFTOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
sleep 10
```

### 10. Complete Test Suite
```bash
# 1. SEO Health
curl -s https://www.newdomain.com/api/seo/test | python3 -m json.tool

# 2. Key File (static)
curl -s -w '\nHTTP %{http_code}' https://www.newdomain.com/KEY.txt

# 3. Key File (API route)
curl -s -w '\nHTTP %{http_code}' https://www.newdomain.com/api/indexnow/key?key=KEY

# 4. Invalid key
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://www.newdomain.com/wrong-key.txt

# 5. IndexNow Ping
curl -s -w '\nHTTP %{http_code}' -X POST https://www.newdomain.com/api/indexnow \
  -H 'Content-Type: application/json' \
  -d '{"urls":["https://www.newdomain.com/","https://www.newdomain.com/shop"]}'

# 6. Google Indexing
curl -s -X POST https://www.newdomain.com/api/indexing \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.newdomain.com/","type":"URL_UPDATED"}'

# 7. Quick Status
curl -s https://www.newdomain.com/api/seo/test | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k,v in d['results'].items():
    s=v.get('status','?')
    icon='✅' if s=='ok' else '⚠️' if s=='skipped' else '❌'
    print(f'{icon} {k}: {s}')
print(f'All Passed: {d.get(\"allPassed\",\"?\")}')
"
```

### Expected Output (Sab Correct)
```
✅  settings: ok
✅  products: ok
✅  categories: ok
✅  indexNow: ok
✅  googleIndexing: ok
✅  cloudflare: ok
✅  indexNowTest: ok
✅  googleIndexingTest: ok
All Passed: True
```

---

# Debugging Guide — Issues Jo Mainne Face Kiye

| Issue | Cause | Fix |
|-------|-------|-----|
| `indexNowTest: failed` | INDEXNOW_API_KEY env var Vercel par set nahi ya wrong value | Delete + re-set env var, deploy again |
| Key file 404 | `public/{KEY}.txt` exist nahi karta | File banao, commit karo, deploy karo |
| API route returns 404 | env var value `yahan_indexnow_api_key_paste_karo` (placeholder) | Correct value set karo, deploy karo |
| `vercel.json` rewrite not working | Vercel Next.js 16 issue | File-based approach use karo (`public/` folder) |
| `next.config.ts` rewrite not working on Vercel | Same issue | Static file `public/{KEY}.txt` is the reliable fallback |
| Google Indexing `not configured` | Vercel env vars set nahi | GOOGLE_INDEXING_SA_EMAIL + GOOGLE_INDEXING_SA_KEY set karo |
| Env var set but deploy shows old value | Deploy env var change ke PEHLE build hua | Dobara deploy karo (empty commit) |
| Vercel alias `not ready` | Deployment abhi build ho raha | Wait for READY state, phir alias set karo |

---

# Agent / Developer Quick Reference

## Multi-Domain Checklist (Copy-Paste)

```markdown
## New Domain: [domain.com]

### Keys
- [ ] IndexNow key: `openssl rand -hex 16` → `NEW_KEY`
- [ ] Google SA email: `zaynahs-estore@gen-lang-client-0610294147.iam.gserviceaccount.com`
- [ ] Search Console: Add SA email as Owner

### Code
- [ ] `public/NEW_KEY.txt` file banayi (key text inside)
- [ ] `INDEXNOW_API_KEY` env var update kiya (JSON format)
- [ ] Commit + push kiya

### Vercel
- [ ] Deploy ready hai
- [ ] Alias set: `npx vercel alias set DEPLOY_UID www.domain.com`
- [ ] Domain DNS → Cloudflare → Vercel (orange cloud)

### Supabase DB
- [ ] `store_settings` mein `store_url` = `https://www.domain.com`
- [ ] `store_name`, `logo_url`, `favicon_url` set hai

### Test
- [ ] `curl /api/seo/test` → All 8 passed
- [ ] `curl /api/indexnow/key?key=KEY` → HTTP 200
- [ ] `curl /api/indexnow` → {"success":true}
- [ ] `curl /api/indexing` → {"success":true}
```

## Files That Need Changes For New Domain

| File | Change |
|------|--------|
| `public/{NEW_KEY}.txt` | **Create** — key text |
| Vercel env: `INDEXNOW_API_KEY` | **Update** — add new domain's key to JSON |
| Vercel env: `NEXT_PUBLIC_SITE_URL` | **Update** — new domain URL |
| Vercel alias | **Set** — domain → latest deploy |
| Cloudflare DNS | **Add** — domain proxied to Vercel |
| Supabase `store_settings` | **Update** — store_url, store_name, logo, favicon |
| Search Console | **Add** — domain + service account as Owner |

## No Changes Needed (Already Multi-Domain)

- `lib/googleIndexing.ts` — same SA key works for all domains
- `lib/indexNow.ts` — auto-detects host, picks correct key from JSON
- `app/api/indexnow/key/route.ts` — reads from env var
- `next.config.ts` — rewrites already configured
- `vercel.json` — no changes needed

---

> **Ek line mein:** "Naye domain ke liye sirf: key banao → file banao → env var update karo → deploy karo → alias set karo → test karo." 🔑
