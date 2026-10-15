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
