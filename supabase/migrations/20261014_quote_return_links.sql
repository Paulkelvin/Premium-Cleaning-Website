-- Return links + one-time quote reminder.
-- Run once in Supabase Dashboard → SQL Editor, AFTER deploying the
-- resume-quote and quote-reminders Edge Functions (see RETURN_LINKS_SETUP.md).
-- Safe to re-run.

-- 1. Remember which quotes already got their reminder.
alter table public.quote_requests
  add column if not exists reminder_sent_at timestamptz;

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
