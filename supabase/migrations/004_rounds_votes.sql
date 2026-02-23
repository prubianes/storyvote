create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_slug text not null references public.rooms(slug) on delete cascade,
  story text not null default '',
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists rounds_one_active_per_room_idx
  on public.rounds (room_slug)
  where status = 'active';

create table if not exists public.votes (
  round_id uuid not null references public.rounds(id) on delete cascade,
  voter_key text not null,
  vote_index integer not null check (vote_index between 0 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (round_id, voter_key)
);

create or replace function public.touch_vote_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists votes_touch_updated_at on public.votes;
create trigger votes_touch_updated_at
before update on public.votes
for each row execute function public.touch_vote_updated_at();

alter table public.rounds enable row level security;
alter table public.votes enable row level security;

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

revoke all on table public.rounds from anon, authenticated;
revoke all on table public.votes from anon, authenticated;

grant select, insert, update on table public.rounds to anon, authenticated;
grant select, insert, update, delete on table public.votes to anon, authenticated;

create or replace function public.ensure_active_round(p_room_slug text)
returns uuid
language plpgsql
as $$
declare
  v_round_id uuid;
begin
  select id into v_round_id
  from public.rounds
  where room_slug = p_room_slug and status = 'active'
  limit 1;

  if v_round_id is not null then
    return v_round_id;
  end if;

  insert into public.rounds (room_slug, story, status)
  values (
    p_room_slug,
    coalesce((select story from public.rooms where slug = p_room_slug), ''),
    'active'
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
  v_users text[];
  v_vote_counts integer[];
begin
  v_round_id := public.ensure_active_round(p_room_slug);

  select r.story, rm.users
    into v_story, v_users
  from public.rounds r
  join public.rooms rm on rm.slug = r.room_slug
  where r.id = v_round_id;

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
    'story', coalesce(v_story, ''),
    'users', coalesce(v_users, '{}'::text[]),
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

  v_round_id := public.ensure_active_round(p_room_slug);

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

grant execute on function public.ensure_active_round(text) to anon, authenticated;
grant execute on function public.get_room_state(text) to anon, authenticated;
grant execute on function public.cast_vote(text, text, integer) to anon, authenticated;
