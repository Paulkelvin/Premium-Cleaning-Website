# Google Calendar for bookings — setup

## How it works

- Website bookings are added to a Google calendar called **RS Cleaning Bookings** (created automatically when you connect).
- Any event the owner adds to that calendar blocks that time on the booking page:
  - all-day event → whole day unavailable
  - timed event → blocks the slot(s) it overlaps (Morning 8am–12pm, Afternoon 12pm–4pm, Maryland time)
  - events set to **Free** are ignored
- Deleting an event opens that time again (deleting a customer's booking event releases their slot).
- One booking per slot. Unpaid online bookings hold their slot for 30 minutes.
- The website and calendar sync every 5 minutes (or **Sync now** in the admin).
- Two customers can never book the same slot: the database checks every booking as it is saved.
- Only the calendar this app creates is used (permission `calendar.app.created`); other calendars are never read.

Code: `supabase/functions/google-calendar`, `supabase/migrations/20261016_booking_calendar.sql`, `assets/js/admin-calendar.js`, booking page date picker in `assets/js/quote-assistant.js`.

## One-time setup

Use the same Google Cloud project that sends the website's emails.

1. **Turn on the Calendar API.** [Google Cloud Console](https://console.cloud.google.com/) → *APIs & Services → Library* → search **Google Calendar API** → **Enable**.
2. **Keep sign-in permanent.** *Google Auth Platform → Audience* (or *OAuth consent screen*): publishing status must be **In production**. In *Testing*, Google ends the connection after 7 days.
   Optional: *Data Access → Add scopes* → `.../auth/calendar.app.created`.
3. **Create the sign-in client.** *APIs & Services → Credentials → Create credentials → OAuth client ID*
   - Application type: **Web application**
   - Name: `RS Website Calendar`
   - Authorized redirect URI: `https://hbacogyhftngwoxenttv.supabase.co/functions/v1/google-calendar`
   - Create, then copy the **Client ID** and **Client secret**.
4. **Store them in Supabase.** [Dashboard → Edge Functions → Secrets](https://supabase.com/dashboard/project/hbacogyhftngwoxenttv/functions/secrets):
   - `GOOGLE_CALENDAR_CLIENT_ID`
   - `GOOGLE_CALENDAR_CLIENT_SECRET`
5. **Connect.** Admin dashboard → **Settings → Google Calendar → Connect Google Calendar** → sign in with the business Google account → **Allow**.
   If Google shows "Google hasn't verified this app", choose *Advanced → Go to … (unsafe)*. That is normal for a business's own app.

After connecting, the card shows "Connected" and the **RS Cleaning Bookings** calendar appears in Google Calendar.

## Troubleshooting

- **"Not set up yet"** in the admin card: step 4 is missing.
- **redirect_uri_mismatch** on Google's page: the redirect URI in step 3 doesn't exactly match.
- **Last sync failed / access expired**: click **Reconnect**. If it keeps happening weekly, check step 2.
- **Turn it off**: admin card → **Disconnect** (bookings still can't double-book).
