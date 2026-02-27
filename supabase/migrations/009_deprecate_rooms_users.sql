-- Deprecate legacy rooms.users writes now that participants is the source of truth.

revoke update (users) on table public.rooms from anon, authenticated;

grant select (slug, name, story, votes, created_at, updated_at)
  on table public.rooms to anon, authenticated;
