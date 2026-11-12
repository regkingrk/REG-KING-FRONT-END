-- REG KING: valuation requests (the "Value my plate" form).
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Only the website's server (service role key) can read or write this table; the public cannot.

create table if not exists public.valuation_requests (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique,
  created_at  timestamptz not null default now(),
  reg         text not null check (char_length(reg) between 2 and 8),
  name        text not null check (char_length(name) between 1 and 80),
  email       text not null check (char_length(email) between 3 and 120),
  phone       text not null check (char_length(phone) between 7 and 20),
  held        text check (held in ('vehicle', 'retention', 'unsure')),
  note        text check (char_length(note) <= 500),
  source      text not null default 'sell-page' check (source in ('sell-page', 'account')),
  status      text not null default 'new' check (status in ('new', 'contacted', 'valued', 'listed', 'closed')),
  valuation   numeric(10, 2),
  staff_note  text
);

create index if not exists valuation_requests_created_idx on public.valuation_requests (created_at desc);
create index if not exists valuation_requests_status_idx on public.valuation_requests (status);

alter table public.valuation_requests enable row level security;
-- No policies on purpose: with row level security on and no policies, only the service role
-- (used by the website's server) can access the table.
