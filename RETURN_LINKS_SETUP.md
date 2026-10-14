# Return links & quote reminder — setup

Lets customers pick up where they left off:

| Feature | Where | Needs Supabase step? |
|---|---|---|
| Saved quote survives closing the tab (14 days, same device) + "Welcome back" prompt on /quote | Website | No — live as soon as the site deploys |
| **Complete your payment** button in the booking email (pay-online bookings) → `/pay-booking` → Square | Email + website | Yes (step 2) |
| **Continue to booking** button in the quote email → `/book?quote=…` reloads the quote on any device (30 days) | Email + website | Yes (step 2) |
| One reminder email ~24 hours after a quote that wasn't booked | Email | Yes (steps 2–3) |

Until steps 2–3 are done, the website works exactly as before; old emails simply don't have the buttons.

---

## 1. Before you deploy — check two settings

1. **Phone number in emails.** The deployed emails will say **240-823-4466** (the number used across the website). The emails currently being sent come from an older version that says 202-262-6379. If 202-262-6379 is correct, change it in `supabase/functions/_shared/notification-templates.ts` first.
2. **SITE_URL secret.** Supabase Dashboard → **Edge Functions → Secrets** → `SITE_URL` must be `https://www.rscleaningcollective.com` (no trailing slash). The email buttons use it.

## 2. Deploy the three Edge Functions

On a computer with this project and Node installed:

```powershell
npx supabase@latest login
.\scripts\deploy-return-links.ps1
```

This deploys only `notify-lead` (emails with the new buttons), `resume-quote` (loads a saved quote from the email link) and `quote-reminders` (sends the one reminder). Other functions are not touched.

## 3. Turn on the hourly reminder

Supabase Dashboard → **SQL Editor** → paste and run the whole file:

`supabase/migrations/20261014_quote_return_links.sql`

It adds a `reminder_sent_at` column and schedules `quote-reminders` every hour (minute 17). Safe to run more than once.

## How the reminder decides who to email

A quote gets **one** reminder only if it:
- was created 24–72 hours ago (older quotes are never mass-emailed),
- has the consent box ticked and a valid email,
- hasn't been reminded already,
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
