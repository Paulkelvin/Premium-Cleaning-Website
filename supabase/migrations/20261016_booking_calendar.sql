-- Booking calendar: one booking per time slot, owner's Google Calendar blocks
-- slots, and website bookings are copied into that calendar.
-- Applied to project hbacogyhftngwoxenttv on 2026-10-16. Safe to re-run.
--
-- Slots (Maryland time): Morning 8am-12pm, Afternoon 12pm-4pm. A booking or
-- event with no time takes the whole day.
-- A booking holds its slot unless it is cancelled, released from the calendar
-- by the owner, or is an unpaid online booking older than 30 minutes.

-- 1. Columns and tables -----------------------------------------------------

alter table public.bookings
  add column if not exists google_event_id text,
  add column if not exists calendar_released_at timestamptz;

-- Busy times read from the owner's Google Calendar (refreshed every 5 minutes).
create table if not exists public.calendar_busy (
  id bigserial primary key,
  google_event_id text,
  booking_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  synced_at timestamptz not null default now()
);
alter table public.calendar_busy enable row level security;
revoke all on public.calendar_busy from anon, authenticated;

-- Google connection (service role only; never readable from the website).
create table if not exists public.internal_google_calendar_config (
  id integer primary key default 1 check (id = 1),
  client_id text,
  client_secret text,
  refresh_token text,
  calendar_id text,
  account_email text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_sync_error text,
  last_sync_summary jsonb
);
alter table public.internal_google_calendar_config enable row level security;
revoke all on public.internal_google_calendar_config from anon, authenticated;
insert into public.internal_google_calendar_config (id) values (1) on conflict (id) do nothing;

-- 2. Slot helpers -------------------------------------------------------------

create or replace function public.booking_slot_range(p_date date, p_slot text)
returns tstzrange
language sql
stable
set search_path = public
as $$
  select case
    when p_slot ilike 'morning%' then
      tstzrange((p_date + time '08:00') at time zone 'America/New_York',
                (p_date + time '12:00') at time zone 'America/New_York')
    when p_slot ilike 'afternoon%' then
      tstzrange((p_date + time '12:00') at time zone 'America/New_York',
                (p_date + time '16:00') at time zone 'America/New_York')
    else
      tstzrange((p_date + time '00:00') at time zone 'America/New_York',
                ((p_date + 1) + time '00:00') at time zone 'America/New_York')
  end;
$$;

create or replace function public.booking_holds_slot(b public.bookings)
returns boolean
language sql
stable
set search_path = public
as $$
  select b.preferred_date is not null
    and coalesce(b.status, '') not in ('cancelled', 'canceled')
    and b.calendar_released_at is null
    and (
      b.payment_method is distinct from 'pay_online'
      or b.payment_status = 'paid'
      or (b.payment_status in ('pending', 'pending_payment')
          and b.created_at > now() - interval '30 minutes')
    );
$$;

create or replace function public.booking_slot_taken(p_date date, p_slot text, p_exclude uuid default null)
returns boolean
language sql
volatile  -- fresh read every call, so a booking saved a moment ago is seen
security definer
set search_path = public
as $$
  select exists (
      select 1 from public.bookings b
      where (p_exclude is null or b.id <> p_exclude)
        and public.booking_holds_slot(b)
        and public.booking_slot_range(b.preferred_date, b.preferred_time)
            && public.booking_slot_range(p_date, p_slot)
    )
    or exists (
      select 1 from public.calendar_busy c
      -- Owner's own events have no booking_id and always count. (A plain
      -- "is distinct from p_exclude" skipped them when p_exclude was null,
      -- so the booking page showed blocked days as free.)
      where (p_exclude is null or c.booking_id is null or c.booking_id <> p_exclude)
        and tstzrange(c.starts_at, c.ends_at) && public.booking_slot_range(p_date, p_slot)
    );
$$;
revoke all on function public.booking_slot_taken(date, text, uuid) from public, anon, authenticated;

-- 3. Never let two website bookings take the same slot ------------------------

create or replace function public.enforce_booking_slot()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_taken boolean;
begin
  if new.preferred_date is null or coalesce(new.source, 'website') <> 'website' then
    return new;
  end if;
  -- Bookings for the same day wait for each other; the check below runs as a
  -- fresh query after the wait, so it sees a booking saved a moment earlier.
  perform pg_advisory_xact_lock(hashtext('booking-day:' || new.preferred_date::text));
  select public.booking_slot_taken(new.preferred_date, new.preferred_time, new.id) into v_taken;
  if v_taken then
    raise exception 'slot_taken' using errcode = 'P0001',
      hint = 'That time was just booked. Please pick another time.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_booking_slot on public.bookings;
create trigger enforce_booking_slot
  before insert on public.bookings
  for each row execute function public.enforce_booking_slot();

-- 4. What the booking page may see: free/taken only, no customer details ------

create or replace function public.get_booking_availability(p_days integer default 14)
returns table (day date, morning boolean, afternoon boolean)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select (now() at time zone 'America/New_York')::date + g as d
    from generate_series(1, least(greatest(coalesce(p_days, 14), 1), 60)) g
  )
  select d,
         not public.booking_slot_taken(d, 'Morning'),
         not public.booking_slot_taken(d, 'Afternoon')
  from days
  order by d;
$$;
revoke all on function public.get_booking_availability(integer) from public;
grant execute on function public.get_booking_availability(integer) to anon, authenticated;

-- Before paying an older unpaid booking (e.g. from the email link), check its
-- time wasn't taken after its 30-minute hold ran out.
create or replace function public.booking_payment_check(p_booking uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then return 'not_found'; end if;
  if b.payment_status = 'paid' then return 'paid'; end if;
  if b.preferred_date is null or public.booking_holds_slot(b) then return 'ok'; end if;
  if public.booking_slot_taken(b.preferred_date, b.preferred_time, b.id) then return 'slot_taken'; end if;
  return 'ok';
end;
$$;
revoke all on function public.booking_payment_check(uuid) from public;
grant execute on function public.booking_payment_check(uuid) to anon, authenticated;

-- 5. Replace the Google busy times in one go (called by the sync function) ----

create or replace function public.replace_calendar_busy(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.calendar_busy where true;
  insert into public.calendar_busy (google_event_id, booking_id, starts_at, ends_at)
  select r.google_event_id,
         nullif(r.booking_id, '')::uuid,
         coalesce(r.starts_at::timestamptz, (r.start_date::date)::timestamp at time zone 'America/New_York'),
         coalesce(r.ends_at::timestamptz, (r.end_date::date)::timestamp at time zone 'America/New_York')
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
    as r(google_event_id text, booking_id text, starts_at text, ends_at text, start_date text, end_date text);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.replace_calendar_busy(jsonb) from public, anon, authenticated;

-- 6. Sync with Google every 5 minutes (does nothing until connected) ----------

create or replace function public.run_calendar_sync()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook_secret text;
begin
  if not exists (
    select 1 from public.internal_google_calendar_config
    where id = 1 and refresh_token is not null and calendar_id is not null
  ) then
    return;
  end if;
  select secret into webhook_secret from public.internal_webhook_config where id = 1;
  if webhook_secret is null or length(trim(webhook_secret)) = 0 then
    return;
  end if;
  perform net.http_post(
    url := 'https://hbacogyhftngwoxenttv.supabase.co/functions/v1/google-calendar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', webhook_secret),
    body := '{"action":"sync"}'::jsonb,
    timeout_milliseconds := 60000
  );
exception
  when others then
    raise warning 'run_calendar_sync failed: %', sqlerrm;
end;
$$;
revoke all on function public.run_calendar_sync() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'calendar-sync') then
    perform cron.unschedule('calendar-sync');
  end if;
  perform cron.schedule('calendar-sync', '*/5 * * * *', 'select public.run_calendar_sync();');
end;
$$;
