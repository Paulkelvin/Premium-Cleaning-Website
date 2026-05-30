# Offline invoices & Gmail setup

Use this guide when you are ready to send invoice emails from the admin dashboard. The **Invoices** UI works without Gmail; **Send email** only works after Google and Supabase secrets are configured.

---

## Connect Supabase MCP in Cursor (recommended)

This project includes `.cursor/mcp.json` scoped to project `hbacogyhftngwoxenttv`.

1. **Cursor** → **Settings** → **Tools & MCP** → enable **Supabase** (or refresh MCP servers).
2. Sign in when prompted (browser OAuth), or use [Dashboard → Connect → MCP](https://supabase.com/dashboard/project/hbacogyhftngwoxenttv?showConnect=true&tab=mcp) for a one-click Cursor install link.
3. Ask the agent to run migration + deploy via MCP (`apply_migration`, `deploy_edge_function`).

**CLI alternative** (no MCP): create a [personal access token](https://supabase.com/dashboard/account/tokens), then:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "your-token"
.\scripts\deploy-invoice-functions.ps1
```

---

## What you get

1. **Admin → Invoices** — create a booking with a locked price (`source: admin`).
2. **Save** — stores the record in Supabase `bookings`.
3. **Create link** — Square checkout URL (minimum **$0.50** while testing).
4. **Send email** — HTML invoice via **Gmail API** (after setup below).

Manual steps you will do yourself:

- Own a **domain** (recommended) for a professional From address, e.g. `billing@yourdomain.com`.
- **Google Cloud** project + Gmail API + OAuth refresh token.
- **Supabase** SQL migration + function deploy + secrets.

You do **not** need to share passwords with this repo. Keep tokens only in Supabase secrets.

---

## Step 1 — Database migration (Supabase)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run the full file: `supabase/migrations/20250536_offline_invoices.sql`

This adds `source`, `pricing_locked`, `admin_notes`, `invoice_sent_at` and updates the booking payment trigger for admin invoices.

---

## Step 2 — Deploy Edge Functions

From the project folder (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed and project linked):

```bash
supabase functions deploy admin-create-invoice
supabase functions deploy admin-invoice-checkout
supabase functions deploy send-payment-invoice
```

Also redeploy checkout if you pulled recent pricing changes:

```bash
supabase functions deploy create-square-checkout
```

For each function in the dashboard: **Edge Functions** → function → **Verify JWT** = **OFF** (same as your other booking functions). `supabase/config.toml` already sets `verify_jwt = false` for these.

---

## Step 3 — Google Cloud & Gmail API

### 3a. Project and API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. `rs-cleaning-invoices`).
3. **APIs & Services → Library** → enable **Gmail API**.

### 3b. OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** (or **Internal** if you use Google Workspace for the whole org).
3. Add app name, support email, and scopes: `https://www.googleapis.com/auth/gmail.send`.
4. Add **test users** while in Testing mode (your Gmail / Workspace account).

### 3c. OAuth client (Desktop or Web)

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Desktop app** (simplest for a one-time refresh token) or **Web application** if you prefer.
3. Note **Client ID** and **Client secret**.

### 3d. Refresh token (one-time)

You need a **refresh token** for the mailbox that will send invoices.

**Option A — OAuth Playground (quick for testing)**

1. Open [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Gear icon → check **Use your own OAuth credentials** → paste Client ID and secret.
3. Select scope: `https://www.googleapis.com/auth/gmail.send` (or full Gmail scope for testing).
4. **Authorize** with the Google account that should send mail.
5. **Exchange authorization code for tokens** → copy the **Refresh token**.

**Option B — Workspace service account**  
Not used by this project; we use user Gmail with a refresh token.

Store the refresh token securely. You will paste it into Supabase only.

---

## Step 4 — Domain & sender address (recommended)

| Approach | From address | Notes |
|----------|--------------|--------|
| **Google Workspace** | `billing@yourdomain.com` | Best for production. Verify domain in Workspace; use that user for OAuth. |
| **Personal Gmail** | `you@gmail.com` | Works for testing; “From” display name is still “RS Cleaning Collective”. |
| **No domain yet** | Defer **Send email** | You can still **Save** and **Create link**, then copy the Square URL to the customer manually. |

Gmail API sends as the authorized Google account. `GMAIL_FROM_EMAIL` must match that account (or an alias configured in Gmail).

---

## Step 5 — Supabase secrets

**Project Settings → Edge Functions → Secrets** (or CLI):

```bash
supabase secrets set GOOGLE_CLIENT_ID="your-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret"
supabase secrets set GOOGLE_REFRESH_TOKEN="your-refresh-token"
supabase secrets set GMAIL_FROM_EMAIL="billing@yourdomain.com"
```

Existing Square secrets (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SITE_URL`, etc.) are unchanged.

After saving secrets, redeploy `send-payment-invoice` (or wait for the next deploy) so the runtime picks them up.

---

## Step 6 — Test in admin

1. Log in to `admin-dashboard.html`.
2. Open **Invoices**.
3. Fill customer + service + **Amount to charge** (e.g. `0.50` for a test).
4. **Save invoice** → **Save & create link** → confirm Square opens or copy link.
5. When Gmail is configured: **Send email** → customer should receive the HTML invoice.

If send fails, the UI shows the error (e.g. “Gmail is not configured yet” or Gmail API quota / consent).

---

## npm scripts (optional)

From `package.json`:

```bash
npm run supabase:deploy-invoices
```

Deploys all three invoice-related functions.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `Gmail is not configured yet` | Add all four secrets in Step 5. |
| `Could not refresh Google access token` | Regenerate refresh token; check client ID/secret. |
| `Gmail API rejected the message` | Enable Gmail API; confirm test user on consent screen; check `GMAIL_FROM_EMAIL`. |
| `Admin access required` | Log in with an email in `admin_users` (or `adminEmails` fallback). |
| `Service area is required` | Pick a service area in the form (drives travel fee). |
| Payment link fails | Check Square secrets and `SITE_URL` matches live site. |

---

## Security notes

- Never commit `.env`, refresh tokens, or client secrets to git.
- Refresh tokens grant send access to that mailbox; rotate if leaked.
- For production, move OAuth app from **Testing** to **Published** and use Workspace with SPF/DKIM on your domain.
