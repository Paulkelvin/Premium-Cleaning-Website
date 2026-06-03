# Email notifications setup

Automatic emails for new contact inquiries, quote requests, bookings, and paid Square payments.

## What gets sent

| Event | Admin email | Customer email |
|-------|-------------|----------------|
| Contact form | Yes — full inquiry details | Yes — confirmation |
| Quote request | Yes — estimate summary | Yes — confirmation |
| Website booking | Yes — schedule + payment info | Yes — confirmation |
| Square payment marked paid | Yes — payment alert | Yes — payment receipt |
| Pay now (open amount on contact/home) | Yes — after Square marks paid | Yes — payment receipt |

Admin-created offline invoices are unchanged (manual **Send email** in the dashboard).

Open-amount payments save a `bookings` row with `source = open_payment` (no “new booking” lead email). Payment emails are sent when Square reports paid (webhook or `confirm-square-payment` on the thank-you page).

While the admin dashboard is open, it also polls every 45 seconds and shows a toast when new records arrive.

---

## Prerequisites

Complete Gmail setup first (same secrets as offline invoices):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GMAIL_FROM_EMAIL`

See `OFFLINE_INVOICES_SETUP.md` Steps 3–5 if you have not done this yet.

### Important: SQL table vs Edge Function secrets

Running this in **SQL Editor** only checks the **database** copy:

```sql
select client_id, client_secret, refresh_token, from_email
from public.internal_gmail_config where id = 1;
```

That is **not** enough by itself. The live `notify-lead` function must either:

1. **Deploy current repo code** (`.\scripts\deploy-notify-functions.ps1`) so it reads `internal_gmail_config`, **or**
2. Add the **same four values** as **Edge Function secrets** in the dashboard:

   **Project → Edge Functions → Secrets** (names must match exactly: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GMAIL_FROM_EMAIL`).

If emails are skipped, check `net._http_response` — a body of `"reason":"gmail_not_configured"` means the function still cannot see Gmail credentials.

Admin recipients come from the `admin_users` table (`ryann@rslegalcollective.com`, `paulopackager@gmail.com`, etc.). Remove invalid addresses from that table — bad recipients cause Gmail bounce messages in the sender inbox.

---

## Step 1 — Run the database migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/hbacogyhftngwoxenttv) → **SQL Editor**.
2. Run the full file: `supabase/migrations/20250603_notification_triggers.sql`

This creates DB triggers that call the `notify-lead` Edge Function after each insert.

---

## Step 2 — Webhook secret (auto-configured)

The webhook secret is **not something you invent manually** — it is a long random password that links your database triggers to the `notify-lead` Edge Function.

If setup was done via Supabase MCP/SQL, this is already stored in `internal_webhook_config` and you can skip this step.

To verify:

```sql
select case when secret is not null then 'ready' else 'missing' end as webhook_status
from public.internal_webhook_config
where id = 1;
```

Optional: also set the same value as a Supabase secret (only if you prefer env-based config):

```powershell
supabase secrets set NOTIFY_WEBHOOK_SECRET="your-secret-here" --project-ref hbacogyhftngwoxenttv
```

You do **not** need to remember or copy the secret unless you are debugging auth errors.

---

## Step 3 — Deploy Edge Functions

Ask Cursor (with Supabase MCP enabled) to deploy:

- `notify-lead`
- `square-webhook`
- `confirm-square-payment`

Or after `npx supabase login`:

```powershell
.\scripts\deploy-notify-functions.ps1
```

---

## Step 4 — Test

1. Submit a test contact message on the live site.
2. Check admin inboxes and the customer email you used.
3. Check **Supabase → Edge Functions → notify-lead → Logs** if nothing arrives.

Triggers are fire-and-forget: if Gmail is not configured, form submissions still save — only emails are skipped.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| SQL shows Gmail values, still no email | DB table alone is not used by old deployed code — run `deploy-notify-functions.ps1` **or** copy values into **Edge Function secrets** |
| `notify-lead` logs only show booted/shutdown | Normal for cold starts; confirm real calls via SQL: `select content::text from net._http_response order by created desc limit 1` |
| Forms work, no emails | Finish Gmail secrets; verify `internal_webhook_config.secret` is set |
| `401 Unauthorized` in notify-lead logs | Secret mismatch between SQL update and `NOTIFY_WEBHOOK_SECRET` |
| Admin gets email, customer does not | Check customer email on the submission; Gmail may land in spam |
| Duplicate payment emails | Should not happen — emails only send when status changes to `paid` |
| No toast on dashboard | Stay logged in; wait up to 45s or click **Refresh** |

---

## Security notes

- The webhook secret prevents random callers from triggering emails.
- `internal_webhook_config` has RLS enabled and is not readable by public API keys.
- Customer/admin content is escaped before being placed in HTML emails.
