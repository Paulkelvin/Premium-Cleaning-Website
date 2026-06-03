-- Lead + booking notification webhooks (calls notify-lead Edge Function via pg_net).
-- After running this migration, complete setup in NOTIFICATIONS_SETUP.md.

create extension if not exists pg_net with schema extensions;

create table if not exists public.internal_webhook_config (
  id int primary key default 1,
  secret text,
  updated_at timestamptz not null default now(),
  constraint internal_webhook_config_singleton check (id = 1)
);

alter table public.internal_webhook_config enable row level security;

revoke all on table public.internal_webhook_config from anon, authenticated;
grant select on table public.internal_webhook_config to service_role;

insert into public.internal_webhook_config (id, secret)
values (1, null)
on conflict (id) do nothing;

create or replace function public.notify_lead_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook_secret text;
  request_id bigint;
begin
  select secret into webhook_secret
  from public.internal_webhook_config
  where id = 1;

  if webhook_secret is null or length(trim(webhook_secret)) = 0 then
    return new;
  end if;

  if tg_table_name = 'bookings' then
    if coalesce(new.source, 'website') in ('admin', 'open_payment') then
      return new;
    end if;
  end if;

  select net.http_post(
    url := 'https://hbacogyhftngwoxenttv.supabase.co/functions/v1/notify-lead',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'table', tg_table_name,
      'record', to_jsonb(new)
    )
  ) into request_id;

  return new;
exception
  when others then
    raise warning 'notify_lead_webhook failed for %: %', tg_table_name, sqlerrm;
    return new;
end;
$$;

drop trigger if exists notify_contact_submission on public.contact_submissions;
create trigger notify_contact_submission
  after insert on public.contact_submissions
  for each row
  execute function public.notify_lead_webhook();

drop trigger if exists notify_quote_request on public.quote_requests;
create trigger notify_quote_request
  after insert on public.quote_requests
  for each row
  execute function public.notify_lead_webhook();

drop trigger if exists notify_booking on public.bookings;
create trigger notify_booking
  after insert on public.bookings
  for each row
  execute function public.notify_lead_webhook();
