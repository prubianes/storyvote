-- Tighten room permissions while keeping client voting/presence updates.

alter table public.rooms enable row level security;

drop policy if exists "public write rooms" on public.rooms;
drop policy if exists "public read rooms" on public.rooms;

create policy "public read rooms"
on public.rooms
for select
using (true);

create policy "public insert rooms"
on public.rooms
for insert
with check (true);

create policy "public update rooms"
on public.rooms
for update
using (true)
with check (true);

revoke all on table public.rooms from anon, authenticated;

grant select (slug, name, story, votes, users, created_at, updated_at)
  on table public.rooms to anon, authenticated;

grant insert (slug, name, story, votes, users, admin_passcode_hash)
  on table public.rooms to anon, authenticated;

grant update (votes, users)
  on table public.rooms to anon, authenticated;
