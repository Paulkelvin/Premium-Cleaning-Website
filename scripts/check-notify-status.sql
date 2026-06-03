-- Quick health check for contact-form email notifications

-- 1) Webhook secret (triggers skip email if missing)
select case
  when secret is not null and length(trim(secret)) > 0 then 'webhook: ready'
  else 'webhook: MISSING — run notification_triggers migration'
end as status
from public.internal_webhook_config where id = 1;

-- 2) Gmail in database (used by latest edge function code after deploy)
select case
  when client_id is not null and client_secret is not null
    and refresh_token is not null and from_email is not null then 'gmail db: ready'
  else 'gmail db: incomplete'
end as status
from public.internal_gmail_config where id = 1;

-- 3) Last notify-lead results (from database trigger via pg_net)
select id, status_code, created, content::text
from net._http_response
order by created desc
limit 3;
