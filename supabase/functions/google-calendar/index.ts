// Google Calendar link for bookings.
//
//  - Admin "Connect Google Calendar" (POST {action:"connect"}) returns Google's
//    sign-in page; Google sends the owner back here (GET ?code=&state=), we keep
//    the refresh token and create a calendar called "RS Cleaning Bookings".
//  - Sync (every 5 minutes from pg_cron, or "Sync now" in the admin):
//      * events in that calendar become busy times the booking page can't book
//        (all-day = whole day; timed events block the slots they overlap;
//        events marked "Free" are ignored),
//      * new confirmed website bookings are added to the calendar,
//      * a booking event the owner deletes releases that booking's slot.
//
// Only the calendar this app creates is touched (scope calendar.app.created);
// the owner's other calendars are never read.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { isGmailConfigured, sendGmailEmail } from "../_shared/gmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/google-calendar`;
const ADMIN_URL = "https://www.rscleaningcollective.com/admin-dashboard";
const TIME_ZONE = "America/New_York";
const CALENDAR_NAME = "RS Cleaning Bookings";
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.app.created"];
const SYNC_DAYS_AHEAD = 70;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Config = {
  client_id: string | null;
  client_secret: string | null;
  refresh_token: string | null;
  calendar_id: string | null;
  account_email: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  last_sync_summary: Record<string, unknown> | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirect(params: Record<string, string>) {
  const url = new URL(ADMIN_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

function db() {
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}

async function loadConfig(client: ReturnType<typeof db>): Promise<Config> {
  const { data } = await client.from("internal_google_calendar_config").select("*").eq("id", 1).maybeSingle();
  return (data || {}) as Config;
}

async function saveConfig(client: ReturnType<typeof db>, patch: Partial<Config>) {
  await client.from("internal_google_calendar_config").upsert({ id: 1, ...patch });
}

function clientCredentials(config: Config) {
  const id = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")?.trim() || config.client_id || "";
  const secret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")?.trim() || config.client_secret || "";
  return { id, secret };
}

async function webhookSecret(client: ReturnType<typeof db>) {
  const env = Deno.env.get("NOTIFY_WEBHOOK_SECRET")?.trim();
  if (env) return env;
  const { data } = await client.from("internal_webhook_config").select("secret").eq("id", 1).maybeSingle();
  return String(data?.secret || "").trim();
}

// ---------- signed OAuth state (stops forged callbacks) ----------
const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text))));
}

async function makeState(secret: string) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + 15 * 60 * 1000, n: crypto.randomUUID() })));
  return `${payload}.${await hmac(secret, payload)}`;
}

async function checkState(secret: string, state: string) {
  const [payload, sig] = String(state || "").split(".");
  if (!payload || !sig || sig !== (await hmac(secret, payload))) return false;
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

// ---------- Google API ----------
async function accessToken(config: Config) {
  const { id, secret } = clientCredentials(config);
  if (!id || !secret || !config.refresh_token) throw new Error("Google Calendar is not connected");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: config.refresh_token, grant_type: "refresh_token" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(body.error === "invalid_grant"
      ? "Google access was removed or expired. Please reconnect Google Calendar."
      : (body.error_description || body.error || "Could not get Google access"));
  }
  return String(body.access_token);
}

async function gcal(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 204) return {};
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Google Calendar error (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body;
}

async function ensureCalendar(token: string, config: Config) {
  if (config.calendar_id) {
    try {
      await gcal(token, `/calendars/${encodeURIComponent(config.calendar_id)}`);
      return config.calendar_id;
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err;
    }
  }
  const created = await gcal(token, "/calendars", {
    method: "POST",
    body: JSON.stringify({
      summary: CALENDAR_NAME,
      timeZone: TIME_ZONE,
      description: "Website bookings appear here automatically. Add an event to block that time on the website; delete it to open the time again.",
    }),
  });
  return String(created.id);
}

// ---------- Maryland-time helpers ----------
function marylandToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

// "2026-10-20" + "08:00" in Maryland -> ISO with the right offset (EDT/EST).
function marylandDateTime(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" }).formatToParts(guess);
  const offset = (parts.find((p) => p.type === "timeZoneName")?.value || "GMT-5").replace("GMT", "");
  const [h, m = "0"] = offset.split(":");
  const sign = h.startsWith("-") ? "-" : "+";
  const hh = String(Math.abs(parseInt(h, 10))).padStart(2, "0");
  return `${date}T${time}:00${sign}${hh}:${String(parseInt(m, 10)).padStart(2, "0")}`;
}

function slotTimes(preferredTime: string | null) {
  const t = String(preferredTime || "").toLowerCase();
  if (t.startsWith("morning")) return ["08:00", "12:00"];
  if (t.startsWith("afternoon")) return ["12:00", "16:00"];
  return null;
}

function nextDay(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const money = (v: unknown) => (Number.isFinite(Number(v)) ? `$${Number(v).toFixed(2)}` : "");

function bookingEvent(b: Record<string, unknown>) {
  const date = String(b.preferred_date);
  const times = slotTimes(b.preferred_time as string);
  const paid = b.payment_method === "pay_online" ? "Paid online" : "Pay at appointment";
  const description = [
    `Customer: ${b.full_name || "-"}`,
    `Phone: ${b.phone || "-"}`,
    `Email: ${b.email || "-"}`,
    `Service: ${b.service_type || "-"}${b.frequency ? ` (${b.frequency})` : ""}`,
    b.add_ons ? `Add-ons: ${b.add_ons}` : "",
    `Estimate: ${money(b.estimated_total)}`,
    `Payment: ${paid}`,
    b.message ? `Notes: ${b.message}` : "",
    "",
    "Booked on the website. Deleting this event opens the time again for other customers.",
  ].filter((line) => line !== "").join("\n");
  return {
    summary: `${b.service_type || "Cleaning"} — ${b.full_name || "Customer"}`,
    location: String(b.address || ""),
    description,
    start: times ? { dateTime: marylandDateTime(date, times[0]), timeZone: TIME_ZONE } : { date },
    end: times ? { dateTime: marylandDateTime(date, times[1]), timeZone: TIME_ZONE } : { date: nextDay(date) },
    colorId: "9",
    extendedProperties: { private: { rs_booking_id: String(b.id) } },
  };
}

// Tell the admins once when syncing starts failing (e.g. Google access removed),
// so bookings don't quietly stop reaching the calendar.
async function alertSyncFailure(client: ReturnType<typeof db>, message: string) {
  try {
    if (!(await isGmailConfigured())) return;
    const { data } = await client.from("admin_users").select("email");
    const to = [...new Set((data || []).map((r) => String(r.email || "").trim().toLowerCase()).filter((e) => e.includes("@")))];
    const safe = message.replace(/[<>&]/g, "");
    for (const email of to) {
      await sendGmailEmail({
        to: email,
        subject: "Google Calendar sync stopped — RS Cleaning Collective",
        html: `<p>The website couldn't sync bookings with Google Calendar.</p><p><strong>Reason:</strong> ${safe}</p><p>Bookings still can't be double-booked, but new bookings won't appear in the calendar and time blocked in the calendar may be out of date.</p><p>To fix it: <a href="${ADMIN_URL}">Admin dashboard</a> → Settings → Google Calendar → <strong>Reconnect</strong>.</p>`,
      }).catch(() => {});
    }
  } catch { /* best effort */ }
}

const SLOT_SELECT = "id, full_name, email, phone, service_type, frequency, add_ons, estimated_total, payment_method, payment_status, preferred_date, preferred_time, address, message, status, google_event_id, calendar_released_at";

async function listEvents(token: string, calendarId: string) {
  const timeMin = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const timeMax = new Date(Date.now() + SYNC_DAYS_AHEAD * 24 * 3600 * 1000).toISOString();
  const events: Record<string, any>[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", showDeleted: "true", maxResults: "2500" });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await gcal(token, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
    events.push(...(page.items || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return events;
}

// ---------- sync ----------
async function sync(client: ReturnType<typeof db>) {
  const config = await loadConfig(client);
  if (!config.refresh_token || !config.calendar_id) return { skipped: "not_connected" };
  const summary = { busy: 0, added: 0, released: 0, restored: 0, removed: 0, errors: 0 };
  try {
    const token = await accessToken(config);

    // 1. Read the calendar. If the owner deleted the whole calendar, make a
    //    new one and put the bookings back in it.
    let calendarIdRaw = config.calendar_id;
    let events: Record<string, any>[];
    try {
      events = await listEvents(token, calendarIdRaw);
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err;
      calendarIdRaw = await ensureCalendar(token, { ...config, calendar_id: null });
      await saveConfig(client, { calendar_id: calendarIdRaw });
      await client.from("bookings").update({ google_event_id: null }).not("google_event_id", "is", null);
      events = [];
    }
    const calendarId = encodeURIComponent(calendarIdRaw);

    // Bookings referenced by events, to spot cancelled/deleted ones.
    const linkedIds = [...new Set(events.map((ev) => ev.extendedProperties?.private?.rs_booking_id).filter(Boolean))];
    const linked = new Map<string, Record<string, any>>();
    if (linkedIds.length) {
      const { data } = await client.from("bookings").select("id, status, calendar_released_at, google_event_id").in("id", linkedIds);
      (data || []).forEach((b) => linked.set(String(b.id), b));
    }

    const busy = [];
    const releasedIds: string[] = [];
    for (const ev of events) {
      const bookingId = ev.extendedProperties?.private?.rs_booking_id || "";
      if (ev.status === "cancelled") {
        if (bookingId) releasedIds.push(bookingId);
        continue;
      }
      if (bookingId) {
        const booking = linked.get(bookingId);
        const cancelled = !booking || ["cancelled", "canceled"].includes(String(booking.status || ""));
        if (cancelled) {
          // Booking was cancelled or deleted in the admin: take its event out
          // of the calendar so the time isn't left blocked.
          try {
            await gcal(token, `/calendars/${calendarId}/events/${encodeURIComponent(ev.id)}`, { method: "DELETE" });
            summary.removed += 1;
          } catch (err) {
            if (![404, 410].includes(Number((err as { status?: number }).status))) summary.errors += 1;
          }
          continue;
        }
        if (booking.calendar_released_at && booking.google_event_id === ev.id) {
          // The owner restored an event she had deleted: the booking holds its time again.
          await client.from("bookings").update({ calendar_released_at: null }).eq("id", bookingId);
          summary.restored += 1;
        }
      }
      if (ev.transparency === "transparent") continue; // marked "Free"
      if (ev.start?.dateTime && ev.end?.dateTime) {
        busy.push({ google_event_id: ev.id, booking_id: bookingId, starts_at: ev.start.dateTime, ends_at: ev.end.dateTime });
      } else if (ev.start?.date && ev.end?.date) {
        busy.push({ google_event_id: ev.id, booking_id: bookingId, start_date: ev.start.date, end_date: ev.end.date });
      }
    }
    const { data: busyCount, error: busyErr } = await client.rpc("replace_calendar_busy", { p_rows: busy });
    if (busyErr) throw new Error(busyErr.message);
    summary.busy = Number(busyCount) || 0;

    // 2. The owner deleted a booking's event: open that time again.
    for (const id of releasedIds) {
      const { data } = await client.from("bookings")
        .update({ calendar_released_at: new Date().toISOString() })
        .eq("id", id).not("google_event_id", "is", null).is("calendar_released_at", null)
        .select("id");
      summary.released += data?.length || 0;
    }

    // 3. Add confirmed website bookings that aren't in the calendar yet
    //    (pay at appointment, or paid online; unpaid online bookings wait).
    const { data: pending } = await client.from("bookings")
      .select(SLOT_SELECT)
      .is("google_event_id", null).is("calendar_released_at", null)
      .gte("preferred_date", marylandToday())
      .or("payment_method.neq.pay_online,payment_status.eq.paid")
      .not("status", "in", "(cancelled,canceled)")
      .order("preferred_date", { ascending: true })
      .limit(40);
    for (const b of pending || []) {
      try {
        const event = bookingEvent(b);
        // Rare: an online booking paid after its 30-minute hold ran out, when
        // someone else had taken the time. Make it impossible to miss.
        const { data: clash } = await client.rpc("booking_slot_taken", {
          p_date: b.preferred_date, p_slot: b.preferred_time || "", p_exclude: b.id,
        });
        if (clash === true) {
          event.summary = `⚠️ DOUBLE-BOOKED — ${event.summary}`;
          event.colorId = "11";
          event.description = `This time overlaps another booking or a blocked time. Please contact one of the customers to reschedule.\n\n${event.description}`;
        }
        const created = await gcal(token, `/calendars/${calendarId}/events`, { method: "POST", body: JSON.stringify(event) });
        await client.from("bookings").update({ google_event_id: String(created.id) }).eq("id", b.id).is("google_event_id", null);
        summary.added += 1;
      } catch (err) {
        summary.errors += 1;
        console.warn("google-calendar: could not add booking", b.id, err instanceof Error ? err.message : err);
      }
    }

    await saveConfig(client, { last_sync_at: new Date().toISOString(), last_sync_error: null, last_sync_summary: summary });
    return { ok: true, ...summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await saveConfig(client, { last_sync_at: new Date().toISOString(), last_sync_error: message, last_sync_summary: summary });
    if (!config.last_sync_error) await alertSyncFailure(client, message);
    throw err;
  }
}

function statusBody(config: Config) {
  const { id, secret } = clientCredentials(config);
  return {
    ok: true,
    client_configured: Boolean(id && secret),
    connected: Boolean(config.refresh_token && config.calendar_id),
    account_email: config.account_email,
    calendar_name: CALENDAR_NAME,
    connected_at: config.connected_at,
    last_sync_at: config.last_sync_at,
    last_sync_error: config.last_sync_error,
    last_sync_summary: config.last_sync_summary,
    redirect_uri: FUNCTION_URL,
  };
}

// ---------- OAuth callback (Google redirects the owner here) ----------
async function handleCallback(url: URL) {
  const client = db();
  if (url.searchParams.get("error")) return redirect({ calendar: "cancelled" });
  const code = url.searchParams.get("code") || "";
  const secret = await webhookSecret(client);
  if (!code || !secret || !(await checkState(secret, url.searchParams.get("state") || ""))) {
    return redirect({ calendar: "error", reason: "link_expired" });
  }
  const config = await loadConfig(client);
  const { id, secret: clientSecret } = clientCredentials(config);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: id, client_secret: clientSecret, redirect_uri: FUNCTION_URL, grant_type: "authorization_code" }),
  });
  const tokens = await res.json().catch(() => ({}));
  if (!res.ok || !tokens.access_token) return redirect({ calendar: "error", reason: "google_refused" });
  const granted = String(tokens.scope || "");
  if (!granted.includes("calendar.app.created")) return redirect({ calendar: "error", reason: "permission_not_granted" });

  let email = "";
  try {
    const payload = JSON.parse(atob(String(tokens.id_token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    email = String(payload.email || "");
  } catch { /* email is only for display */ }

  const refreshToken = tokens.refresh_token || config.refresh_token;
  if (!refreshToken) return redirect({ calendar: "error", reason: "no_refresh_token" });

  // A different Google account gets its own new calendar.
  const sameAccount = email && config.account_email && email.toLowerCase() === config.account_email.toLowerCase();
  const calendarId = await ensureCalendar(tokens.access_token, { ...config, calendar_id: sameAccount ? config.calendar_id : null });
  await saveConfig(client, {
    refresh_token: refreshToken,
    calendar_id: calendarId,
    account_email: email || config.account_email,
    connected_at: new Date().toISOString(),
    last_sync_error: null,
  });
  if (!sameAccount) {
    // Bookings were never added to this account's calendar.
    await client.from("bookings").update({ google_event_id: null }).not("google_event_id", "is", null);
  }
  try { await sync(client); } catch { /* shown in the admin status */ }
  return redirect({ calendar: "connected" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      if (url.searchParams.has("code") || url.searchParams.has("error")) return await handleCallback(url);
      return json({ error: "Not found" }, 404);
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const client = db();

    // Scheduled sync uses the shared webhook secret instead of an admin login.
    if (action === "sync" && req.headers.get("x-notify-secret")) {
      const secret = await webhookSecret(client);
      if (!secret || req.headers.get("x-notify-secret")?.trim() !== secret) return json({ error: "Unauthorized" }, 401);
      return json({ ok: true, ...(await sync(client).catch((err) => ({ error: err.message }))) });
    }

    try {
      await requireAdmin(req);
    } catch {
      return json({ error: "Unauthorized" }, 401);
    }

    const config = await loadConfig(client);
    if (action === "status") return json(statusBody(config));

    if (action === "connect") {
      const { id } = clientCredentials(config);
      if (!id) return json({ error: "Google sign-in isn't set up yet (missing client ID)." }, 400);
      const secret = await webhookSecret(client);
      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      auth.search = new URLSearchParams({
        client_id: id,
        redirect_uri: FUNCTION_URL,
        response_type: "code",
        scope: SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "false",
        state: await makeState(secret),
      }).toString();
      return json({ ok: true, url: auth.toString() });
    }

    if (action === "sync") {
      try {
        const result = await sync(client);
        return json({ ...statusBody(await loadConfig(client)), result });
      } catch (err) {
        return json({ ...statusBody(await loadConfig(client)), error: err instanceof Error ? err.message : "Sync failed" }, 502);
      }
    }

    if (action === "disconnect") {
      await saveConfig(client, { refresh_token: null, connected_at: null, last_sync_error: null });
      await client.rpc("replace_calendar_busy", { p_rows: [] });
      return json(statusBody(await loadConfig(client)));
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("google-calendar:", err instanceof Error ? err.message : err);
    return json({ error: err instanceof Error ? err.message : "Something went wrong" }, 500);
  }
});
