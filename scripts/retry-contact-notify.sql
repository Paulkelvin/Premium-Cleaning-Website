-- Re-send notification emails for one contact submission (after Gmail is fixed).
-- Replace the id below with your submission id from admin dashboard or:
-- select id, full_name, email, created_at from contact_submissions order by created_at desc limit 5;

select net.http_post(
  url := 'https://hbacogyhftngwoxenttv.supabase.co/functions/v1/notify-lead',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-notify-secret', (select secret from public.internal_webhook_config where id = 1)
  ),
  body := jsonb_build_object(
    'table', 'contact_submissions',
    'record', (select to_jsonb(t) from public.contact_submissions t where id = 'ca72ae9c-49bf-4d8a-9003-ad66994f8a74')
  )
) as request_id;

-- Wait a few seconds, then run:
-- select id, status_code, created, content::text from net._http_response order by created desc limit 1;
-- Success looks like: "sent_to":["..."]  NOT "gmail_not_configured"
