-- Remove legacy rooms.votes now that round votes are sourced from public.votes.

drop function if exists public.apply_vote_delta(text, integer, integer);

alter table public.rooms
  drop column if exists votes;

revoke all on table public.rooms from anon, authenticated;

grant select (slug, name, story, created_at, updated_at)
  on table public.rooms to anon, authenticated;

grant insert (slug, name, story, admin_passcode_hash)
  on table public.rooms to anon, authenticated;
