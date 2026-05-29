# Square automated checkout setup

This site creates a **unique Square checkout link for every booking** using the quoted `estimated_total`. You do **not** create prices manually in Square.

## What was built

| Piece | Purpose |
|-------|---------|
| `supabase/functions/create-square-checkout` | Recomputes booking total server-side → creates Square payment link |
| `supabase/functions/confirm-square-payment` | Verifies payment with Square API before marking booking paid |
| `supabase/functions/square-webhook` | Marks booking `payment_status = paid` when Square confirms payment |
| `assets/js/payments.js` | Calls the Edge Function after booking |
| `payment-complete.html` | Thank-you page after Square redirect |

---

## Step 1 — Run SQL migrations (Supabase Dashboard)

In **SQL Editor**, run (if not already applied):

1. `supabase/migrations/20250528_fix_public_inserts.sql`
2. `supabase/migrations/20250529_square_payment_fields.sql`
3. `supabase/migrations/20250533_booking_payment_security.sql` — locks payment fields on booking insert

---

## Step 2 — Install Supabase CLI (one time)

```powershell
npm install -g supabase
```

Login and link the project:

```powershell
supabase login
cd C:\Users\paulo\Documents\Website_Cleaning_Project
supabase link --project-ref hbacogyhftngwoxenttv
```

---

## Step 3 — Set secrets (Sandbox first)

Replace values with what you copied from the client's Square Developer Dashboard.

```powershell
supabase secrets set SQUARE_ACCESS_TOKEN="PASTE_SANDBOX_ACCESS_TOKEN"
supabase secrets set SQUARE_LOCATION_ID="PASTE_SANDBOX_LOCATION_ID"
supabase secrets set SQUARE_ENVIRONMENT="sandbox"
supabase secrets set SITE_URL="https://YOUR-LIVE-SITE-URL"
```

**SITE_URL** = your deployed website URL with **no trailing slash** (e.g. Cloudflare Pages URL).

> Never commit the access token to GitHub or `config.js`.

---

## Step 4 — Deploy Edge Functions

```powershell
supabase functions deploy create-square-checkout
supabase functions deploy confirm-square-payment
supabase functions deploy square-webhook
```

Your checkout endpoint will be:

`https://hbacogyhftngwoxenttv.supabase.co/functions/v1/create-square-checkout`

---

## Step 5 — Configure Square webhook (after deploy)

1. Square Developer Dashboard → your app → **Webhooks**
2. Add subscription URL:

   `https://hbacogyhftngwoxenttv.supabase.co/functions/v1/square-webhook`

3. Subscribe to event: **`payment.updated`**
4. Copy the **Signature key** and run:

```powershell
supabase secrets set SQUARE_WEBHOOK_SIGNATURE_KEY="PASTE_SIGNATURE_KEY"
supabase secrets set SQUARE_WEBHOOK_NOTIFICATION_URL="https://hbacogyhftngwoxenttv.supabase.co/functions/v1/square-webhook"
```

Redeploy the webhook function:

```powershell
supabase functions deploy square-webhook
```

---

## Step 6 — Deploy the website

```powershell
npm run build
```

Deploy `dist/` to Cloudflare Pages (or your host).

Set `siteUrl` in `assets/js/config.js` to match **SITE_URL** (optional, for reference only — the Edge Function uses the secret).

---

## Step 7 — Test (Sandbox)

1. Complete a quote on the site
2. Go to **Book** → choose **Pay online now**
3. Confirm booking → you should redirect to Square Sandbox checkout for the **exact quoted total**
4. Pay with a [Square Sandbox test card](https://developer.squareup.com/docs/devtools/sandbox/payments)
5. Check Supabase **bookings** table → `payment_status` should become `paid` after webhook fires

---

## Go live (Production)

When ready for real payments:

```powershell
supabase secrets set SQUARE_ACCESS_TOKEN="PASTE_PRODUCTION_ACCESS_TOKEN"
supabase secrets set SQUARE_LOCATION_ID="PASTE_PRODUCTION_LOCATION_ID"
supabase secrets set SQUARE_ENVIRONMENT="production"
supabase functions deploy create-square-checkout
supabase functions deploy square-webhook
```

Update the Square webhook subscription to use **Production** mode in the Developer Dashboard.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Square is not configured on the server" | Run `supabase secrets set` for token + location ID, redeploy function |
| "SITE_URL is not configured" | Set `SITE_URL` secret to your live domain |
| Booking saves but no redirect | Edge Function not deployed, or `squareCheckoutEnabled: false` in config |
| Payment works but status stays `pending_payment` | Webhook URL / signature key not configured |
| RLS error on booking insert | Run `20250528_fix_public_inserts.sql` |

---

## Security notes

- **Access token** → Supabase secrets only (server)
- **Anon key** → frontend (already in `config.js`)
- Amount is read from the **saved booking** on the server, not trusted from the browser
