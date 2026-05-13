# Virtual Field Geology Basecamp — Setup Guide

You have a **Vercel Pro** plan. Everything below uses native Vercel services — no third-party accounts needed beyond Resend and Google AI Studio. Do these steps in order.

> **All code changes are complete.** The app is ready to deploy — just follow the steps below to provision the required services and set environment variables.

---

## 1. Generate `NEXTAUTH_SECRET`

Already done — your `.env.local` has this set. Copy the same value into Vercel's Environment Variables in Step 7.

To generate a new one if needed (PowerShell):
```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

---

## 2. Get a Gemini API Key

Already set in `.env.local`. Add it to Vercel Environment Variables in Step 7.

> **Model used:** `gemini-2.5-pro`. Free tier: 50 requests/day. For 20–30 students × 10 assignments you'll want the paid tier (~$0.0035/1k input tokens). Monitor at [Google AI Studio](https://aistudio.google.com/).

---

## 3. Set Up Resend (Email Delivery)

### 3a. Create an account and API key

1. Sign up at [resend.com](https://resend.com) — free tier: **3,000 emails/month**
2. **API Keys** → **Create API Key** (Sending access)
3. Set `RESEND_API_KEY=re_...` in `.env.local` and Vercel Environment Variables

### 3b. Verify a sending domain

> For early testing: set `RESEND_FROM_EMAIL=onboarding@resend.dev`. You can only send to your own email until you verify a domain.

1. Resend dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g. `yourdomain.edu`)
3. Add the SPF, DKIM, DMARC records to your DNS
4. Wait for verification (~5 minutes)
5. Set `RESEND_FROM_EMAIL=noreply@yourdomain.edu`

### 3c. (Optional) Bounce webhook

1. Resend dashboard → **Webhooks** → **Add Endpoint**
2. URL: `https://your-app.vercel.app/api/webhooks/resend`
3. Events: `email.bounced`, `email.complained`
4. Copy the signing secret → `RESEND_WEBHOOK_SECRET=<secret>`

---

## 4. Provision Vercel Blob (File Storage)

The app already uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.

1. Vercel dashboard → **Storage** → **Create** → **Blob**
2. Name it (e.g. `vf-submissions`) → **Create**
3. The token is auto-added to your project's environment variables — or copy it manually from the store's **Settings → Tokens** tab
4. Set `BLOB_READ_WRITE_TOKEN=<token>` in `.env.local` for local testing (optional)

---

## 5. Set a `CRON_SECRET` and Enable Vercel Cron

### 5a. Generate the secret

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 16; $rng.GetBytes($bytes); [System.BitConverter]::ToString($bytes) -replace '-',''
```

Set `CRON_SECRET=<output>` in `.env.local` and Vercel Environment Variables.

### 5b. Add `vercel.json` to enable the cron job

Create `vercel.json` in the project root:

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

Vercel automatically passes `Authorization: Bearer <CRON_SECRET>` to cron endpoints — no extra config needed. The cleanup route already validates this header.

---

## 6. Set Up Vercel Postgres

The app uses `@vercel/postgres` (Neon-backed, included with Pro). The code migration is already done — you just need to provision the database and initialize the schema.

### 6a. Provision the database

> Vercel's native Postgres store has been replaced by marketplace providers. Use **Neon** — it's the same backend `@vercel/postgres` was built on and injects the same env vars.

1. Vercel dashboard → **Storage** → **Create** → **Neon** (under Marketplace Database Providers)
2. Follow the Neon setup flow; name the database (e.g. `vf-geology`) → **Create**
3. Link the store to your project — Vercel auto-populates `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc. in your project's environment variables

### 6b. Initialize the schema

The app now initializes the schema automatically on first database access, including seeding the demo student.

If you want to initialize it explicitly right after deploy, you can still run the one-time setup endpoint:

```powershell
Invoke-RestMethod -Method Post -Uri "https://your-app.vercel.app/api/setup" `
  -Headers @{ Authorization = "Bearer <CRON_SECRET>" }
```

Expected response: `{"ok":true,"message":"Schema initialized."}`

All statements are idempotent — safe to run again if needed.

---

## 7. Vercel Deployment Checklist

Set all of the following in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | From Step 1 / already in `.env.local` |
| `NEXTAUTH_URL` | Your production URL, e.g. `https://vf-geology.vercel.app` |
| `GEMINI_API_KEY` | Already in `.env.local` |
| `RESEND_API_KEY` | From Step 3a |
| `RESEND_FROM_EMAIL` | e.g. `noreply@yourdomain.edu` |
| `BLOB_READ_WRITE_TOKEN` | Auto-added by Vercel when you create the Blob store |
| `CRON_SECRET` | From Step 5a |
| `STUDENT_PASSWORD` | Password for the demo student account |
| `INSTRUCTOR_PASSWORD` | Password for the instructor account |
| `POSTGRES_URL` (+ related) | Auto-added by Vercel when you create the Postgres store |

After setting variables, push to `main` or trigger a deploy from the dashboard.

---

## 8. Rate Limiting (Optional Upgrade)

The app uses an in-memory rate limiter that's per-serverless-instance. For a small class this is fine. To enforce limits globally with **Vercel KV** (included with Pro):

1. Vercel dashboard → **Storage** → **Create** → **KV**
2. `npm install @vercel/kv`
3. Ask the agent: "Upgrade `lib/rateLimit.ts` to use Vercel KV instead of the in-memory Map."

---

## Summary of New `.env.local` Keys to Fill In

```bash
RESEND_API_KEY=          # Step 3a
RESEND_FROM_EMAIL=       # Step 3b
BLOB_READ_WRITE_TOKEN=   # Step 4 (auto-populated via Vercel dashboard link)
CRON_SECRET=             # Step 5a
RESEND_WEBHOOK_SECRET=   # Step 3c (optional)
# POSTGRES_* vars auto-populated by Vercel after Step 6a
```

