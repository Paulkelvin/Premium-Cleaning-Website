-- Return links + one-time quote reminder.
-- Applied to project hbacogyhftngwoxenttv on 2026-10-14 (as migrations
-- quote_reminder_sent_at + quote_reminders_schedule). Safe to re-run.

-- 1. Remember which quotes already got their reminder.
alter table public.quote_requests
  add column if not exists reminder_sent_at timestamptz;

-- Quotes created before reminders went live were consented under the old
-- wording; never send them a reminder. (Run once at go-live: 2026-10-14.)
update public.quote_requests
set reminder_sent_at = now()
where reminder_sent_at is null
  and created_at < '2026-10-14 15:20:00+00';

-- 2. Function the scheduler calls; reuses the notify-lead webhook secret.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.run_quote_reminders()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook_secret text;
begin
  select secret into webhook_secret
  from public.internal_webhook_config
  where id = 1;

  if webhook_secret is null or length(trim(webhook_secret)) = 0 then
    return;
  end if;

  perform net.http_post(
    url := 'https://hbacogyhftngwoxenttv.supabase.co/functions/v1/quote-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', webhook_secret
    ),
    body := '{}'::jsonb
  );
exception
  when others then
    raise warning 'run_quote_reminders failed: %', sqlerrm;
end;
$$;

revoke all on function public.run_quote_reminders() from public, anon, authenticated;

-- 3. Run every hour at minute 17.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'quote-reminders') then
    perform cron.unschedule('quote-reminders');
  end if;
  perform cron.schedule('quote-reminders', '17 * * * *', 'select public.run_quote_reminders();');
end;
$$;
