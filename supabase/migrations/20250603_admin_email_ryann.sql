-- Replace primary super admin email (dashboard + notification recipients).

update public.admin_users
set email = 'ryann@rslegalcollective.com'
where lower(email) = 'rs.cleaning@collective.com';

update public.admin_users
set role = 'superuser'
where lower(email) = 'ryann@rslegalcollective.com';
