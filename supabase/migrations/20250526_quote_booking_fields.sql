-- Run in Supabase SQL editor to align tables with quote/booking forms

alter table quote_requests add column if not exists frequency text;
alter table quote_requests add column if not exists preferred_contact text;
alter table quote_requests add column if not exists estimated_total numeric(10,2);

alter table bookings add column if not exists property_type text;
alter table bookings add column if not exists bedrooms text;
alter table bookings add column if not exists bathrooms text;
alter table bookings add column if not exists square_feet text;
alter table bookings add column if not exists frequency text;
alter table bookings add column if not exists add_ons text;
alter table bookings add column if not exists estimated_total numeric(10,2);
alter table bookings add column if not exists payment_method text default 'pay_at_service';
alter table bookings add column if not exists payment_status text default 'pending';
alter table bookings add column if not exists quote_id uuid;
