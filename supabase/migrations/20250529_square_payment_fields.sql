-- Optional Square tracking fields on bookings (used by Edge Functions).

alter table bookings add column if not exists square_checkout_url text;
alter table bookings add column if not exists square_order_id text;
alter table bookings add column if not exists square_payment_id text;
