# Admin Auth System — Complete Guide

> Yeh doc explains kaise admin auth system kaam karta hai, kya-kya fixes apply hain, aur naye domain/DB setup pe yeh sab automatically kaise set hona chahiye.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────┐
│                   Supabase Auth                  │
│  (signInWithPassword, updateUser, signOut,      │
│   resetPasswordForEmail, exchangeCodeForSession) │
└──────────┬──────────────────────────┬────────────┘
           │                          │
           ▼                          ▼
┌────────────────────┐    ┌────────────────────────┐
│   proxy.ts (Auth   │    │  /auth/callback/route  │
│   Guard)           │    │  (PKCE code exchange)  │
└────────┬───────────┘    └───────────┬────────────┘
         │                            │
         ▼                            ▼
┌────────────────────┐    ┌────────────────────────┐
│   Admin Pages      │    │  /admin/reset-password │
│   (Protected)      │    │  (Password form UI)    │
└────────────────────┘    └────────────────────────┘
```

## 2. Key Files

| File | Role |
|------|------|
| `proxy.ts` | Auth guard — checks `supabase.auth.getUser()` on every `/admin/*` request. Redirects to `/admin/login` if no session. |
| `app/auth/callback/route.ts` | Server-side PKCE code exchange after password reset email click. Exchanges `?code=` for session via server client, sets cookies, redirects to `/admin/reset-password`. |
| `app/admin/login/page.tsx` | Email/password login form with `signInWithPassword()`. |
| `app/admin/forgot-password/page.tsx` | Sends reset email via `resetPasswordForEmail()` with `redirectTo: /auth/callback?next=/admin/reset-password`. |
| `app/admin/reset-password/page.tsx` | Password reset form that calls `updateUser({ password })` after session is established. Shows 3 states: exchanging → ready/expired → done. |
| `app/admin/settings/profile/page.tsx` | Profile page with current/new/confirm password fields. Calls `/api/admin/change-password` which does `updateUser()` + `signOut({ scope: 'global' })`. |
| `app/api/admin/change-password/route.ts` | API route: verifies current password → `updateUser({ password })` → `signOut({ scope: 'global' })` — logs out ALL devices. |
| `app/admin/error.tsx` | Error boundary — catches render errors, shows "Something went wrong" with Try Again + Dashboard links. |

## 3. Password Reset Flow (Critical Path)

### Working Flow:
```
User clicks "Forgot Password?" on /admin/login
                      │
                      ▼
         /admin/forgot-password (email input)
                      │
                      ▼
   supabase.auth.resetPasswordForEmail(email, {
     redirectTo: "${origin}/auth/callback?next=/admin/reset-password"
   })
                      │
                      ▼
   Supabase sends email with {{ .ConfirmationURL }}
   (link points to supabase.co/auth/v1/verify with redirect_to param)
                      │
                      ▼
   User clicks email link → Supabase verifies token
                      │
                      ▼
   (Server-side) /auth/callback?code=xxx&next=/admin/reset-password
                      │
                      ▼
   supabase.auth.exchangeCodeForSession(code) ← cookies set here
                      │
                      ▼
   (Client) /admin/reset-password (session ready)
                      │
                      ▼
   User enters new password → supabase.auth.updateUser({ password })
                      │
                      ▼
   Success → signOut({ scope: 'local' }) → redirect to /admin/login
```

### Why This Works (vs the broken approach):
- **Server-side exchange**: `/auth/callback` runs on server, so `createServerClient` properly sets auth cookies via `NextResponse`. Client-side `exchangeCodeForSession` in `useEffect` fails because `@supabase/ssr` browser client can't set cookies reliably before the page renders.
- **Dedicated redirect target**: `redirectTo` points to `/auth/callback` (not `/admin/reset-password`) so the code exchange happens before the user sees the form.

## 4. Auth Configuration (Supabase Dashboard / API)

These settings MUST be configured for password reset to work:

### Required Values:
| Setting | Value | Why |
|---------|-------|-----|
| `site_url` | `https://yourdomain.pk` | Base URL for auth redirects |
| `uri_allow_list` | `https://yourdomain.pk/auth/callback,https://yourdomain.pk/admin/reset-password` | Allowed redirect targets (include www variants too) |
| `oauth_server_enabled` | `false` | Disable OAuth server to prevent `/oauth/consent` 404 |
| `security_update_password_require_reauthentication` | `true` | Require re-auth before password update |

### API Command (for automation):
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{REF}/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://yourdomain.pk",
    "uri_allow_list": "https://yourdomain.pk/auth/callback,https://www.yourdomain.pk/auth/callback,https://yourdomain.pk/admin/reset-password,https://www.yourdomain.pk/admin/reset-password",
    "oauth_server_enabled": false,
    "oauth_server_authorization_path": "/oauth/consent",
    "security_update_password_require_reauthentication": true
  }'
```

### Verify:
```bash
curl -s "https://api.supabase.com/v1/projects/{REF}/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('site_url:', d.get('site_url')); print('uri_allow_list:', d.get('uri_allow_list')); print('oauth_server_enabled:', d.get('oauth_server_enabled'))"
```

Expected:
```
site_url: https://yourdomain.pk
uri_allow_list: https://yourdomain.pk/auth/callback,...,https://yourdomain.pk/admin/reset-password,...
oauth_server_enabled: False
```

## 5. Password Change Flow (Session Invalidation)

```
Admin goes to /admin/settings/profile
                      │
                      ▼
   Enters current password + new password + confirm
                      │
                      ▼
   POST /api/admin/change-password
   { currentPassword, newPassword }
                      │
                      ▼
   1. supabase.auth.signInWithPassword(email, currentPassword) ← verify
   2. supabase.auth.updateUser({ password: newPassword })
   3. supabase.auth.signOut({ scope: 'global' }) ← ALL devices logged out
                      │
                      ▼
   Response → Client redirects to /admin/login
```

## 6. Auth Guard (proxy.ts) Logic

```
request → /admin/*
            │
            ▼
   Is path in isPublicAdminPath?
   (/admin/login, /admin/forgot-password, /admin/reset-password)
            │
     ┌──────┴──────┐
     YES           NO
     │             │
     ▼             ▼
  Allow        Check supabase.auth.getUser()
                    │
              ┌─────┴─────┐
              EXISTS      NULL
              │           │
              ▼           ▼
           Allow      Redirect to /admin/login
```

**Important:** `/auth/callback` is NOT matched by the proxy matcher (which is `['/admin/:path*', '/']`), so it runs freely without any auth guard interference.

## 7. New Domain Setup Checklist

When setting up a new domain/DB, ensure all of these:

### Supabase:
- [ ] `site_url` set to `https://yourdomain.pk`
- [ ] `uri_allow_list` includes `/auth/callback` and `/admin/reset-password` (both www and non-www)
- [ ] `oauth_server_enabled` = `false`
- [ ] `security_update_password_require_reauthentication` = `true`

### Codebase (already in repo, verify exists):
- [ ] `proxy.ts` at root — auth guard for `/admin/*`
- [ ] `app/auth/callback/route.ts` — PKCE code exchange
- [ ] `app/admin/login/page.tsx` — login form
- [ ] `app/admin/forgot-password/page.tsx` — forgot password with `redirectTo: /auth/callback?next=/admin/reset-password`
- [ ] `app/admin/reset-password/page.tsx` — reset password form (3 states: exchanging/expired/ready/done)
- [ ] `app/admin/settings/profile/page.tsx` — profile/password change page
- [ ] `app/api/admin/change-password/route.ts` — password change API with global sign out
- [ ] `app/admin/error.tsx` — error boundary

### Verify:
- [ ] Login page loads at `/admin/login`
- [ ] Unauthenticated user redirected from `/admin/dashboard` to `/admin/login`
- [ ] Forgot password sends email with correct redirect
- [ ] Email click lands on `/auth/callback?code=xxx`, redirected to `/admin/reset-password`
- [ ] Password reset works form submits, session established
- [ ] Profile page password change logs out all devices
- [ ] `/oauth/consent` does NOT appear (OAuth Server disabled)

## 8. Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Email link goes to homepage | `redirectTo` not set or `uri_allow_list` missing `/auth/callback` | Update Supabase auth config, check forgot-password `redirectTo` |
| `/oauth/consent` 404 | OAuth Server enabled | Disable via API: `oauth_server_enabled: false` |
| "Invalid or expired link" on reset page | Code exchange failed or session expired | Request new reset link |
| Password change doesn't invalidate other devices | `signOut({ scope: 'global' })` not called | Check `/api/admin/change-password` route |
| Dashboard accessible without login | `proxy.ts` missing or not deployed | Verify `proxy.ts` exists at root with correct matcher |
