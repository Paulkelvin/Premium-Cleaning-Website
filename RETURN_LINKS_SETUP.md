# Return links & quote reminder — setup

Lets customers pick up where they left off:

| Feature | Where | Needs Supabase step? |
|---|---|---|
| Saved quote survives closing the tab (14 days, same device) + "Welcome back" prompt on /quote | Website | No — live as soon as the site deploys |
| **Complete your payment** button in the booking email (pay-online bookings) → `/pay-booking` → Square | Email + website | Yes (step 2) |
| **Continue to booking** button in the quote email → `/book?quote=…` reloads the quote on any device (30 days) | Email + website | Yes (step 2) |
| Quote email ~1 hour after a quote that wasn't booked, then one reminder at ~24 hours | Email | Yes (steps 2–3) |

**Status: fully live since 14 Oct 2026.** `resume-quote`, `quote-reminders` and `notify-lead` are deployed to project `hbacogyhftngwoxenttv`, and the `quote-reminders` cron job runs every 15 minutes.

**Since 15 Oct 2026:** the quote page button is **Book this cleaning** and goes straight to `/book`. Customers are no longer emailed the moment they quote, so someone who books gets only the booking email. Admins still get every "New quote request" alert immediately. See `supabase/migrations/20261015_quote_email_stage.sql`.

## Phone number in emails

Customer emails use `CONTACT_PHONE` in `supabase/functions/_shared/notification-templates.ts`: **240-823-4466**, the same number as the website (since 15 Oct 2026). To change it, edit that one line and redeploy `notify-lead` and `quote-reminders`.

## Redeploying later (if templates change)

```powershell
npx supabase@latest login
.\scripts\deploy-return-links.ps1
```

The SQL in `supabase/migrations/20261014_quote_return_links.sql` is already applied; re-running it is safe.

## How the reminder decides who to email

Customers get at most two emails per quote, and only while it is unbooked:
1. **Quote email** about 1 hour after quoting.
2. **One reminder** about 24 hours after quoting, at least 12 hours after the quote email.

Each email is sent only if the quote:
- is no older than 72 hours (older quotes are never mass-emailed),
- has the consent box ticked and a valid email,
- hasn't had that email already,
- is the customer's latest quote,
- has no booking linked to it, and nobody has booked with the same email since.

Quote form consent now reads: *"I agree to be contacted about my quote, including one follow-up email if I don't book."*

## Check it's working

- **Cron job:** Dashboard → Integrations/Database → **Cron** → `quote-reminders` should be listed.
- **Last runs:** SQL Editor → `select * from cron.job_run_details order by start_time desc limit 5;`
- **Function logs:** Edge Functions → `quote-reminders` → Logs (each run reports `checked`, `sent`, `skipped`).

## Turn the reminder off

```sql
select cron.unschedule('quote-reminders');
```

## Security notes

- Links use the quote/booking ID, a random 122-bit UUID only sent to that customer (same model as the existing Square return link).
- Quote links expire after 30 days and stop working once the quote is booked; they only return the quote details needed to book.
- The pay link can only open Square checkout for that booking; it never shows or changes customer details.
