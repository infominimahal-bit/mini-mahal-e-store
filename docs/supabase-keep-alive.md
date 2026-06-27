# Supabase Keep Alive — GitHub Actions Setup

Supabase free tier projects pause after **7 days of inactivity**. This workflow pings the DB automatically every few days.

---

## 1. Get Supabase Credentials (for THIS project)

Supabase project ka `Project Ref` = **`ziucrfpebpxijqhwmqre`**

**Values already in `.env.local`:**

| Secret Name | Exact Value |
|---|---|
| `SUPABASE_URL` | `https://ziucrfpebpxijqhwmqre.supabase.co` |
| `SUPABASE_KEY` | `.env.local` mein `SUPABASE_SERVICE_ROLE_KEY` ki value |

> Dono values `.env.local` file mein maujood hain — wahan se copy karo.

---

## 2. Add GitHub Secrets (EXACT steps)

GitHub repo kholo: **https://github.com/totvoguepk-bot/zaynahsestore-tv**

1. **Settings** tab par jao (top right)
2. Left sidebar mein **Secrets and variables → Actions** select karo
3. **New repository secret** button par click karo
4. Pehla secret:
   - **Name:** `SUPABASE_URL`
   - **Value:** `https://ziucrfpebpxijqhwmqre.supabase.co`
   - **Add secret** click karo
5. Doosra secret:
   - **Name:** `SUPABASE_KEY`
   - **Value:** `.env.local` se `SUPABASE_SERVICE_ROLE_KEY` copy kar ke paste karo (wo long `eyJhbGci...` wali string)
   - **Add secret** click karo

> **WARNING:** `SUPABASE_KEY` ki value **service_role** key dalni hai, anon key nahi. Service role bypasses RLS.
>
> ⚠️ **Yeh step manual hai — agent nahi kar sakta.** GitHub UI mein ja kar khud dalna hoga.

---

## 3. Workflow File (ye main commit kar dunga)

File already create kar di hai: `.github/workflows/keep_alive.yml`

**Table used in workflow:** `categories` — kyunke ye hamesha exist karta hai aur lightweight hai.

Agar khud banana ho to ye content hai:

```yaml
name: Keep Supabase Alive

on:
  schedule:
    - cron: '0 9 * * 1,4'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm install @supabase/supabase-js ws --force
      - name: Ping Supabase
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: |
          node -e "
          const { createClient } = require('@supabase/supabase-js');
          const ws = require('ws');
          const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
            realtime: { transport: ws }
          });
          (async () => {
            const { data, error } = await supabase.from('categories').select('id').limit(1);
            if (error) { console.error('Error:', error); process.exit(1); }
            console.log('Pinged successfully:', data);
          })();
          "
```

> **Recommended table:** `categories` — sabse safe aur lightweight ping ke liye.

---

## 4. Test It

1. GitHub repo → **Actions** tab
2. Left sidebar mein **Keep Supabase Alive** workflow
3. **Run workflow** → **Run workflow** button
4. Green checkmark aana chahiye

---

## Multiple Supabase Projects

Agar multiple projects hain to:

```yaml
- name: Ping Project 2
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL_2 }}
    SUPABASE_KEY: ${{ secrets.SUPABASE_KEY_2 }}
  run: | ...same node code...
```

---

## Notes

- Runs twice a week — well within 7-day pause window
- Completely free within GitHub Actions free tier
- `service_role` key bypasses RLS — never expose it client-side
- Workflow file ko commit aur push karna bhoolna mat
