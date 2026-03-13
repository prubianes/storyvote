alter table public.rounds
  add column if not exists revealed_at timestamptz;

update public.rounds
set status = 'open'
where status = 'active';

drop index if exists public.rounds_one_active_per_room_idx;
create unique index if not exists rounds_one_open_or_revealed_per_room_idx
  on public.rounds (room_slug)
  where status in ('open', 'revealed');

alter table public.rounds
  drop constraint if exists rounds_status_check;

alter table public.rounds
  add constraint rounds_status_check
  check (status in ('open', 'revealed', 'closed'));

alter table public.rounds
  alter column status set default 'open';

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

grant execute on function public.reveal_active_round(text) to anon, authenticated;
grant execute on function public.reopen_revealed_round(text) to anon, authenticated;
