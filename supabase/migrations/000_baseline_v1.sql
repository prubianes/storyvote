-- StoryVote v1 baseline schema
-- Use this file for fresh environments.
-- Existing environments should continue using incremental migrations.

create extension if not exists pgcrypto;

-- ===== Tables =====

create table if not exists public.rooms (
  slug text primary key,
  name text not null,
  story text not null default '',
  admin_passcode_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_slug text not null references public.rooms(slug) on delete cascade,
  story text not null default '',
  status text not null default 'open' check (status in ('open', 'revealed', 'closed')),
  created_at timestamptz not null default now(),
  revealed_at timestamptz,
  closed_at timestamptz
);

create table if not exists public.votes (
  round_id uuid not null references public.rounds(id) on delete cascade,
  voter_key text not null,
  vote_index integer not null check (vote_index between 0 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (round_id, voter_key)
);

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

-- ===== Indexes =====

drop index if exists public.rounds_one_active_per_room_idx;
create unique index if not exists rounds_one_open_or_revealed_per_room_idx
  on public.rounds (room_slug)
  where status in ('open', 'revealed');

create index if not exists participants_room_active_last_seen_idx
  on public.participants (room_slug, is_active, last_seen desc);

-- ===== Triggers =====

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

create or replace function public.touch_vote_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists votes_touch_updated_at on public.votes;
create trigger votes_touch_updated_at
before update on public.votes
for each row execute function public.touch_vote_updated_at();

-- ===== RLS Policies =====

alter table public.rooms enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;
alter table public.participants enable row level security;

drop policy if exists "public read rooms" on public.rooms;
drop policy if exists "public insert rooms" on public.rooms;
drop policy if exists "public update rooms" on public.rooms;
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

drop policy if exists "public read rounds" on public.rounds;
drop policy if exists "public write rounds" on public.rounds;
create policy "public read rounds"
on public.rounds
for select
using (true);
create policy "public write rounds"
on public.rounds
for all
using (true)
with check (true);

drop policy if exists "public read votes" on public.votes;
drop policy if exists "public write votes" on public.votes;
create policy "public read votes"
on public.votes
for select
using (true);
create policy "public write votes"
on public.votes
for all
using (true)
with check (true);

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

-- ===== Table Grants =====

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.rounds from anon, authenticated;
revoke all on table public.votes from anon, authenticated;
revoke all on table public.participants from anon, authenticated;

grant select (slug, name, story, created_at, updated_at)
  on table public.rooms to anon, authenticated;
grant insert (slug, name, story, admin_passcode_hash)
  on table public.rooms to anon, authenticated;
grant update (story)
  on table public.rooms to anon, authenticated;

grant select, insert, update on table public.rounds to anon, authenticated;
grant select, insert, update, delete on table public.votes to anon, authenticated;
grant select, insert, update on table public.participants to anon, authenticated;

-- ===== Functions =====

drop function if exists public.apply_vote_delta(text, integer, integer);

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

create or replace function public.ensure_active_round(p_room_slug text)
returns uuid
language plpgsql
as $$
declare
  v_round_id uuid;
begin
  select id
    into v_round_id
  from public.rounds
  where room_slug = p_room_slug
    and status in ('open', 'revealed')
  order by created_at desc
  limit 1;

  if v_round_id is not null then
    return v_round_id;
  end if;

  insert into public.rounds (room_slug, story, status, revealed_at, closed_at)
  values (
    p_room_slug,
    coalesce((select story from public.rooms where slug = p_room_slug), ''),
    'open',
    null,
    null
  )
  returning id into v_round_id;

  return v_round_id;
end;
$$;

create or replace function public.get_room_state(p_room_slug text)
returns jsonb
language plpgsql
as $$
declare
  v_round_id uuid;
  v_story text;
  v_round_status text;
  v_users text[];
  v_vote_counts integer[];
  v_voted_users text[];
begin
  v_users := public.get_active_participants(p_room_slug, 300);

  select id, story, status
    into v_round_id, v_story, v_round_status
  from public.rounds
  where room_slug = p_room_slug
    and status in ('open', 'revealed')
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
      'round_status', 'closed',
      'story', coalesce(v_story, ''),
      'users', coalesce(v_users, '{}'::text[]),
      'voted_users', '{}'::text[],
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

  select coalesce(array_agg(distinct p.display_name order by p.display_name), '{}'::text[])
    into v_voted_users
  from public.votes v
  join public.participants p
    on p.room_slug = p_room_slug
   and p.voter_key = v.voter_key
  where v.round_id = v_round_id
    and p.is_active = true;

  return jsonb_build_object(
    'round_id', v_round_id,
    'round_active', v_round_status = 'open',
    'round_status', v_round_status,
    'story', coalesce(v_story, ''),
    'users', coalesce(v_users, '{}'::text[]),
    'voted_users', coalesce(v_voted_users, '{}'::text[]),
    'vote_counts', coalesce(v_vote_counts, '{0,0,0,0,0,0,0,0}'::integer[])
  );
end;
$$;

create or replace function public.cast_vote(
  p_room_slug text,
  p_voter_key text,
  p_vote_index integer
)
returns jsonb
language plpgsql
as $$
declare
  v_round_id uuid;
  v_existing_index integer;
  v_selected_index integer;
  v_vote_counts integer[];
begin
  if p_vote_index < 0 or p_vote_index > 7 then
    raise exception 'Invalid vote index: %', p_vote_index;
  end if;

  select id
    into v_round_id
  from public.rounds
  where room_slug = p_room_slug
    and status = 'open'
  order by created_at desc
  limit 1;

  if v_round_id is null then
    raise exception 'No open round for room: %', p_room_slug;
  end if;

  select vote_index
    into v_existing_index
  from public.votes
  where round_id = v_round_id and voter_key = p_voter_key;

  if v_existing_index is not null and v_existing_index = p_vote_index then
    delete from public.votes
    where round_id = v_round_id and voter_key = p_voter_key;
    v_selected_index := null;
  else
    insert into public.votes (round_id, voter_key, vote_index)
    values (v_round_id, p_voter_key, p_vote_index)
    on conflict (round_id, voter_key)
    do update set vote_index = excluded.vote_index;
    v_selected_index := p_vote_index;
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
    'selected_vote_index', v_selected_index,
    'vote_counts', coalesce(v_vote_counts, '{0,0,0,0,0,0,0,0}'::integer[])
  );
end;
$$;

create or replace function public.end_active_round(p_room_slug text)
returns uuid
language plpgsql
as $$
declare
  v_round_id uuid;
begin
  update public.rounds
  set status = 'closed',
      closed_at = now()
  where id = (
    select id
    from public.rounds
    where room_slug = p_room_slug
      and status in ('open', 'revealed')
    order by created_at desc
    limit 1
  )
  returning id into v_round_id;

  return v_round_id;
end;
$$;

create or replace function public.start_new_round(p_room_slug text, p_story text default null)
returns uuid
language plpgsql
as $$
declare
  v_story text;
  v_round_id uuid;
begin
  perform public.end_active_round(p_room_slug);

  v_story := coalesce(p_story, (select story from public.rooms where slug = p_room_slug), '');

  insert into public.rounds (room_slug, story, status, revealed_at, closed_at)
  values (p_room_slug, v_story, 'open', null, null)
  returning id into v_round_id;

  return v_round_id;
end;
$$;

create or replace function public.reveal_active_round(p_room_slug text)
returns uuid
language plpgsql
as $$
declare
  v_round_id uuid;
begin
  update public.rounds
  set status = 'revealed',
      revealed_at = now()
  where id = (
    select id
    from public.rounds
    where room_slug = p_room_slug
      and status = 'open'
    order by created_at desc
    limit 1
  )
  returning id into v_round_id;

  return v_round_id;
end;
$$;

create or replace function public.reopen_revealed_round(p_room_slug text)
returns uuid
language plpgsql
as $$
declare
  v_round_id uuid;
begin
  update public.rounds
  set status = 'open',
      revealed_at = null
  where id = (
    select id
    from public.rounds
    where room_slug = p_room_slug
      and status = 'revealed'
    order by created_at desc
    limit 1
  )
  returning id into v_round_id;

  return v_round_id;
end;
$$;

create or replace function public.reset_active_round_votes(p_room_slug text)
returns integer
language plpgsql
as $$
declare
  v_round_id uuid;
  v_deleted integer;
begin
  select id
    into v_round_id
  from public.rounds
  where room_slug = p_room_slug
    and status = 'open'
  order by created_at desc
  limit 1;

  if v_round_id is null then
    return 0;
  end if;

  delete from public.votes
  where round_id = v_round_id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.get_room_history(p_room_slug text, p_limit integer default 20)
returns jsonb
language sql
as $$
  with rounds_data as (
    select
      r.id,
      r.story,
      r.status,
      r.created_at,
      r.revealed_at,
      r.closed_at,
      (
        select array_agg(coalesce(v.cnt, 0) order by g.idx)
        from generate_series(0, 7) as g(idx)
        left join (
          select vote_index, count(*)::integer as cnt
          from public.votes
          where round_id = r.id
          group by vote_index
        ) v on v.vote_index = g.idx
      ) as vote_counts,
      (
        select count(*)::integer
        from public.votes v2
        where v2.round_id = r.id
      ) as total_votes
    from public.rounds r
    where r.room_slug = p_room_slug
      and r.status = 'closed'
    order by r.created_at desc
    limit greatest(1, coalesce(p_limit, 20))
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'story', story,
        'status', status,
        'created_at', created_at,
        'revealed_at', revealed_at,
        'closed_at', closed_at,
        'vote_counts', coalesce(vote_counts, '{0,0,0,0,0,0,0,0}'::integer[]),
        'total_votes', coalesce(total_votes, 0)
      )
      order by created_at desc
    ),
    '[]'::jsonb
  )
  from rounds_data;
$$;

-- ===== Function Grants =====

grant execute on function public.cleanup_stale_participants(integer) to anon, authenticated;
grant execute on function public.upsert_participant_presence(text, text, text, boolean) to anon, authenticated;
grant execute on function public.get_active_participants(text, integer) to anon, authenticated;
grant execute on function public.ensure_active_round(text) to anon, authenticated;
grant execute on function public.get_room_state(text) to anon, authenticated;
grant execute on function public.cast_vote(text, text, integer) to anon, authenticated;
grant execute on function public.end_active_round(text) to anon, authenticated;
grant execute on function public.start_new_round(text, text) to anon, authenticated;
grant execute on function public.reveal_active_round(text) to anon, authenticated;
grant execute on function public.reopen_revealed_round(text) to anon, authenticated;
grant execute on function public.reset_active_round_votes(text) to anon, authenticated;
grant execute on function public.get_room_history(text, integer) to anon, authenticated;
