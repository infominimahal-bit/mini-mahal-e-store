# Google Indexing API Setup Guide

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
# Valid key → should return key text with HTTP 200
curl -s -w '\nHTTP %{http_code}' https://YOUR_DOMAIN/INDEXNOW_API_KEY.txt

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
