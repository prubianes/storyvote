create or replace function public.get_room_state(p_room_slug text)
returns jsonb
language plpgsql
as $$
declare
  v_round_id uuid;
  v_story text;
  v_users text[];
  v_vote_counts integer[];
  v_voted_users text[];
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
    'round_active', true,
    'story', coalesce(v_story, ''),
    'users', coalesce(v_users, '{}'::text[]),
    'voted_users', coalesce(v_voted_users, '{}'::text[]),
    'vote_counts', coalesce(v_vote_counts, '{0,0,0,0,0,0,0,0}'::integer[])
  );
end;
$$;
