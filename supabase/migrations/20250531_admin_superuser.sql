-- Superuser role: only superusers can create/delete lower admins.

alter table admin_users add column if not exists role text not null default 'admin';

alter table admin_users drop constraint if exists admin_users_role_check;
alter table admin_users add constraint admin_users_role_check check (role in ('admin', 'superuser'));

update admin_users set role = 'superuser'
where lower(email) in ('rs.cleaning@collective.com', 'paulopackager@gmail.com');

create or replace function public.is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'superuser'
  );
$$;

grant execute on function public.is_superuser() to authenticated, anon;

drop policy if exists "Superusers delete lower admins" on admin_users;
create policy "Superusers delete lower admins" on admin_users
  for delete to authenticated
  using (public.is_superuser() and role = 'admin');
