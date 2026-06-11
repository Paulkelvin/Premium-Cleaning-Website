-- Allow quote updates after initial estimate save (same row id from client).
grant update on public.quote_requests to anon;

drop policy if exists "Allow public quote updates" on public.quote_requests;
create policy "Allow public quote updates" on public.quote_requests
  for update
  to anon
  using (true)
  with check (true);
