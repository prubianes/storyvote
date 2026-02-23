create extension if not exists pgcrypto;

create table if not exists public.rooms (
  slug text primary key,
  name text not null,
  story text not null default '',
  votes integer[] not null default '{0,0,0,0,0,0,0,0}',
  users text[] not null default '{}',
  admin_passcode_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

alter table public.rooms enable row level security;

create policy "public read rooms"
on public.rooms
for select
using (true);

create policy "public write rooms"
on public.rooms
for all
using (true)
with check (true);
