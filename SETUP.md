# Virtual Field Geology Basecamp — Setup Guide

Steps you need to complete outside the coding session. Work through them in order before deploying to production.

---

## 1. Generate `NEXTAUTH_SECRET`

Run the following command and paste the output into `.env.local` as `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Or use any password manager's "generate secret" feature (32+ characters, random).

---

## 2. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key and set `GEMINI_API_KEY=<your key>` in `.env.local`

> **Model used:** `gemini-2.5-pro`. The free tier (Gemini API free of charge) supports up to 50 requests/day. For a class of 20–30 students with 10 assignments each, you may need the paid tier (~$0.0035/1k input tokens). Monitor usage at [Google AI Studio](https://aistudio.google.com/).

---

## 3. Set Up Resend (Email Delivery)

The app uses [Resend](https://resend.com) for sending verification and password-reset emails.

### 3a. Create an account

1. Sign up at [resend.com](https://resend.com) — free tier: **3,000 emails/month, 100/day**
2. Go to **API Keys** → **Create API Key** (give it "Sending access")
3. Set `RESEND_API_KEY=re_...` in `.env.local`

### 3b. Verify a sending domain

> Skip this step in early development — use `onboarding@resend.dev` as `RESEND_FROM_EMAIL` to test. You can only send to your own email while unverified.

1. In the Resend dashboard, go to **Domains** → **Add Domain**
2. Enter your domain (e.g. `geology.youruniversity.edu`)
3. Add the DNS records Resend shows you (SPF, DKIM, DMARC)
4. Wait for verification (usually a few minutes)
5. Set `RESEND_FROM_EMAIL=noreply@geology.youruniversity.edu` in `.env.local`

### 3c. (Optional) Set up a Resend webhook for bounce handling

The app has a `/api/webhooks/resend` endpoint that marks bounced-email accounts in the database, preventing future sends to invalid addresses.

1. In the Resend dashboard, go to **Webhooks** → **Add Endpoint**
2. Enter your production URL: `https://your-app.vercel.app/api/webhooks/resend`
3. Select events: `email.bounced`, `email.complained`
4. Copy the signing secret and set `RESEND_WEBHOOK_SECRET=<secret>` in `.env.local` (for reference — signature verification is currently a TODO; see note in `app/api/webhooks/resend/route.ts`)

> **Production hardening:** For strict webhook security, install `svix` and verify the `svix-signature` header before processing events. The current implementation accepts all POST requests to that endpoint.

---

## 4. Provision Vercel Blob (File Storage)

In development the app stores uploaded PDFs in the local `uploads/` directory. In production on Vercel, that directory is ephemeral — you need Vercel Blob.

1. Push your code to Vercel and open the project dashboard
2. Go to **Storage** → **Create Database** → **Blob**
3. Name it (e.g. `vf-submissions`) and click **Create**
4. Go to the Blob store settings → **Tokens** → copy the `BLOB_READ_WRITE_TOKEN`
5. Add the token to your Vercel project's **Environment Variables** (Production + Preview)
6. Also set it locally in `.env.local` if you want to test Blob uploads in dev (optional)

> **Access model:** Blobs are stored as `public` with opaque UUID-based paths. The URLs are not listed anywhere and are effectively secret. For stricter access control, change `access: 'public'` to `access: 'private'` in `lib/storage.ts` and implement signed-URL generation via `@vercel/blob`'s `head()` + `downloadUrl`.

---

## 5. Set a `CRON_SECRET`

The app has a cleanup cron endpoint at `/api/cron/cleanup` that deletes:
- Expired password-reset tokens (>1 hour old)
- Unverified user accounts (>7 days old)

Protect it with a secret:

1. Generate a random string:
   ```bash
   openssl rand -hex 16
   ```
2. Set `CRON_SECRET=<that string>` in `.env.local` and in Vercel Environment Variables

### 5a. Configure Vercel Cron (optional but recommended)

Add this to `vercel.json` in the project root to run the cleanup daily:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Then add a `vercel.json` → `headers` entry or handle auth in the route (already done — the route checks `Authorization: Bearer <CRON_SECRET>`).

Vercel Cron sends a `Authorization: Bearer <CRON_SECRET>` header automatically when you set `CRON_SECRET` in environment variables.

> **Free tier note:** Vercel Cron is available on the Hobby plan (1 cron job). If you need multiple jobs, upgrade to Pro.

---

## 6. Production Database

The app uses SQLite (better-sqlite3) which works perfectly in local development and on single-instance deployments. **SQLite does not persist on Vercel's serverless infrastructure** — each deployment gets a fresh ephemeral filesystem.

### Option A: Turso (recommended — SQLite-compatible, free tier)

[Turso](https://turso.tech) is a hosted libSQL (SQLite fork) service with a generous free tier.

1. Install the Turso CLI: `npm install -g @turso/cli`
2. `turso auth login`
3. `turso db create vf-geology`
4. `turso db tokens create vf-geology` → copy the token
5. `turso db show vf-geology --url` → copy the URL
6. Set in Vercel environment variables:
   - `TURSO_DATABASE_URL=libsql://vf-geology-<your-handle>.turso.io`
   - `TURSO_AUTH_TOKEN=<token>`
7. Install `@libsql/client`: `npm install @libsql/client`
8. Update `lib/db.ts` to use `@libsql/client` when `TURSO_DATABASE_URL` is set (requires async DB initialization — a significant refactor of the sync SQLite pattern)

### Option B: Vercel Postgres (already stubbed in .env.local)

`POSTGRES_URL` and friends are already in `.env.local`. To use Vercel Postgres:
1. Provision from the Vercel dashboard → Storage → Postgres
2. Install `@vercel/postgres`: `npm install @vercel/postgres`
3. Rewrite `lib/db.ts` to use the Postgres client (requires migrating from better-sqlite3's synchronous API to async)

### Simplest path for a short course

If the course runs for 3 weeks and has <50 students, deploy to a **single Vercel Function** region with a **persistent volume** (Vercel doesn't offer this on Hobby). Instead, consider deploying to [Railway](https://railway.app), [Render](https://render.com), or a VPS where SQLite persists on disk. These platforms support Node.js + persistent storage with minimal configuration.

---

## 7. Vercel Deployment Checklist

Before deploying, set all of the following in **Vercel → Project → Settings → Environment Variables** (set to Production + Preview + Development as appropriate):

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | Generated in step 1 |
| `NEXTAUTH_URL` | Your production URL, e.g. `https://vf-geology.vercel.app` |
| `GEMINI_API_KEY` | From step 2 |
| `RESEND_API_KEY` | From step 3a |
| `RESEND_FROM_EMAIL` | e.g. `noreply@youruni.edu` |
| `BLOB_READ_WRITE_TOKEN` | From step 4 |
| `CRON_SECRET` | From step 5 |
| `STUDENT_PASSWORD` | Password for the demo student account |
| `INSTRUCTOR_PASSWORD` | Password for the instructor account |

After setting variables, trigger a new deployment from the Vercel dashboard.

---

## 8. Rate Limiting — Production Note

The app uses an **in-memory rate limiter** (`lib/rateLimit.ts`) for the registration and password-reset endpoints. On Vercel serverless, each function instance has its own memory — limits are per-instance, not global.

For a small class this is acceptable (abusive IPs would need to hit the same instance repeatedly). For stricter enforcement:
1. Install Vercel KV: `npm install @vercel/kv`
2. Replace the `Map`-based store in `lib/rateLimit.ts` with `kv.get`/`kv.set` calls
3. Provision a Vercel KV store in the dashboard

---

## Summary of New `.env.local` Keys Added This Session

```
BLOB_READ_WRITE_TOKEN=          # Vercel Blob token (step 4)
CRON_SECRET=                    # Random secret for /api/cron/cleanup (step 5)
RESEND_WEBHOOK_SECRET=          # From Resend webhook settings (step 3c, optional)
```
