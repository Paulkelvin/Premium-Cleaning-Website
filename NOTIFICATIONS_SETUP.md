# Email notifications setup

Automatic emails for new contact inquiries, quote requests, bookings, and paid Square payments.

## What gets sent

| Event | Admin email | Customer email |
|-------|-------------|----------------|
| Contact form | Yes — full inquiry details | Yes — confirmation |
| Quote request | Yes — estimate summary | Yes — confirmation |
| Website booking | Yes — schedule + payment info | Yes — confirmation |
| Square payment marked paid | Yes — payment alert | Yes — payment receipt |

Admin-created offline invoices are unchanged (manual **Send email** in the dashboard).

While the admin dashboard is open, it also polls every 45 seconds and shows a toast when new records arrive.

---

## Prerequisites

Complete Gmail setup first (same secrets as offline invoices):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GMAIL_FROM_EMAIL`

See `OFFLINE_INVOICES_SETUP.md` Steps 3–5 if you have not done this yet.

Admin recipients come from the `admin_users` table (`rs.cleaning@collective.com`, `paulopackager@gmail.com`, etc.).

---

## Step 1 — Run the database migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/hbacogyhftngwoxenttv) → **SQL Editor**.
2. Run the full file: `supabase/migrations/20250603_notification_triggers.sql`

This creates DB triggers that call the `notify-lead` Edge Function after each insert.

---

## Step 2 — Set the webhook secret

Generate a long random string (32+ characters). Use the **same value** in both places below.

**A. Supabase SQL Editor**

```sql
update public.internal_webhook_config
set secret = 'paste-your-long-random-secret-here',
    updated_at = now()
where id = 1;
```

**B. Supabase Edge Function secret (optional but recommended)**

```powershell
supabase secrets set NOTIFY_WEBHOOK_SECRET="paste-your-long-random-secret-here" --project-ref hbacogyhftngwoxenttv
```

If `NOTIFY_WEBHOOK_SECRET` is set, it overrides the database value for the Edge Function.

---

## Step 3 — Deploy Edge Functions

```powershell
.\scripts\deploy-notify-functions.ps1
```

Or deploy manually:

```powershell
npx supabase@latest functions deploy notify-lead --project-ref hbacogyhftngwoxenttv
npx supabase@latest functions deploy square-webhook --project-ref hbacogyhftngwoxenttv
npx supabase@latest functions deploy confirm-square-payment --project-ref hbacogyhftngwoxenttv
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
