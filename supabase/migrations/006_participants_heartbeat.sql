create table if not exists public.participants (
  room_slug text not null references public.rooms(slug) on delete cascade,
  voter_key text not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  is_active boolean not null default true,
  left_at timestamptz,
  primary key (room_slug, voter_key)
);

create index if not exists participants_room_active_last_seen_idx
  on public.participants (room_slug, is_active, last_seen desc);

alter table public.participants enable row level security;

drop policy if exists "public read participants" on public.participants;
drop policy if exists "public write participants" on public.participants;
create policy "public read participants"
on public.participants
for select
using (true);
create policy "public write participants"
on public.participants
for all
using (true)
with check (true);

revoke all on table public.participants from anon, authenticated;
grant select, insert, update on table public.participants to anon, authenticated;

create or replace function public.cleanup_stale_participants(p_stale_seconds integer default 300)
returns integer
language plpgsql
as $$
declare
  v_updated integer;
begin
  update public.participants
  set is_active = false,
      left_at = now()
  where is_active = true
    and last_seen < now() - make_interval(secs => greatest(30, coalesce(p_stale_seconds, 300)));

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.upsert_participant_presence(
  p_room_slug text,
  p_voter_key text,
  p_display_name text,
  p_is_active boolean default true
)
returns void
language plpgsql
as $$
begin
  insert into public.participants (room_slug, voter_key, display_name, is_active, last_seen, left_at)
  values (
    p_room_slug,
    p_voter_key,
    p_display_name,
    coalesce(p_is_active, true),
    now(),
    case when coalesce(p_is_active, true) then null else now() end
  )
  on conflict (room_slug, voter_key)
  do update set
    display_name = excluded.display_name,
    is_active = excluded.is_active,
    last_seen = now(),
    left_at = case when excluded.is_active then null else now() end;
end;
$$;

create or replace function public.get_active_participants(
  p_room_slug text,
  p_stale_seconds integer default 300
)
returns text[]
language plpgsql
as $$
declare
  v_users text[];
begin
  perform public.cleanup_stale_participants(p_stale_seconds);

  select coalesce(array_agg(display_name order by last_seen desc), '{}'::text[])
    into v_users
  from public.participants
  where room_slug = p_room_slug
    and is_active = true;

  return v_users;
end;
$$;

create or replace function public.get_room_state(p_room_slug text)
returns jsonb
language plpgsql
as $$
declare
  v_round_id uuid;
  v_story text;
  v_users text[];
  v_vote_counts integer[];
begin
  v_users := public.get_active_participants(p_room_slug, 300);

  select id, story
    into v_round_id, v_story
  from public.rounds
  where room_slug = p_room_slug and status = 'active'
  order by created_at desc
  limit 1;

  if v_round_id is null then
    select story
      into v_story
    from public.rooms
    where slug = p_room_slug;

    return jsonb_build_object(
      'round_id', null,
      'round_active', false,
      'story', coalesce(v_story, ''),
      'users', coalesce(v_users, '{}'::text[]),
      'vote_counts', '{0,0,0,0,0,0,0,0}'::integer[]
    );
  end if;

  select array_agg(coalesce(v.cnt, 0) order by g.idx)
    into v_vote_counts
  from generate_series(0, 7) as g(idx)
  left join (
    select vote_index, count(*)::integer as cnt
    from public.votes
    where round_id = v_round_id
    group by vote_index
  ) v on v.vote_index = g.idx;

  return jsonb_build_object(
    'round_id', v_round_id,
    'round_active', true,
    'story', coalesce(v_story, ''),
    'users', coalesce(v_users, '{}'::text[]),
    'vote_counts', coalesce(v_vote_counts, '{0,0,0,0,0,0,0,0}'::integer[])
  );
end;
$$;

grant execute on function public.cleanup_stale_participants(integer) to anon, authenticated;
grant execute on function public.upsert_participant_presence(text, text, text, boolean) to anon, authenticated;
grant execute on function public.get_active_participants(text, integer) to anon, authenticated;
