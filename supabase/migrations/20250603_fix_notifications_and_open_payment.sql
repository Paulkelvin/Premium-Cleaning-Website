-- Remove invalid admin recipient (causes Gmail bounce to sender inbox).
delete from public.admin_users
where lower(email) = 'test@test.com';

-- Skip lead emails for open-amount payments (payment emails sent on Square paid webhook).
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
