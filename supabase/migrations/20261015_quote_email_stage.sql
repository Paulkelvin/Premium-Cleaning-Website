-- Customers get the quote email ~1 hour after quoting (only if they haven't
-- booked) instead of instantly, then one reminder at ~24 hours.
-- Applied to project hbacogyhftngwoxenttv on 2026-10-15. Safe to re-run.

-- 1. Remember which quotes already got their (delayed) quote email.
alter table public.quote_requests
  add column if not exists quote_email_sent_at timestamptz;

-- Quotes created before the switch were already emailed instantly by
-- notify-lead; never send them the quote email again.
update public.quote_requests
set quote_email_sent_at = created_at
where quote_email_sent_at is null
  and created_at < '2026-10-15 18:12:30+00';

-- 2. Run every 15 minutes so the quote email lands close to the 1-hour mark.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'quote-reminders') then
    perform cron.unschedule('quote-reminders');
  end if;
  perform cron.schedule('quote-reminders', '*/15 * * * *', 'select public.run_quote_reminders();');
end;
$$;

-- 3. Give the email run up to 60s (pg_net defaults to 5s), so a busy run
--    with several emails is never cut off mid-way.
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
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
exception
  when others then
    raise warning 'run_quote_reminders failed: %', sqlerrm;
end;
$$;

revoke all on function public.run_quote_reminders() from public, anon, authenticated;
