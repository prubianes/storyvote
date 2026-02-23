create or replace function public.apply_vote_delta(
  p_room_slug text,
  p_vote_index integer,
  p_delta integer
)
returns integer[]
language plpgsql
as $$
declare
  v_votes integer[];
begin
  if p_vote_index < 0 or p_vote_index > 7 then
    raise exception 'Invalid vote index: %', p_vote_index;
  end if;

  update public.rooms
  set votes[p_vote_index + 1] = greatest(0, coalesce(votes[p_vote_index + 1], 0) + p_delta)
  where slug = p_room_slug
  returning votes into v_votes;

  if v_votes is null then
    raise exception 'Room not found: %', p_room_slug;
  end if;

  return v_votes;
end;
$$;

grant execute on function public.apply_vote_delta(text, integer, integer) to anon, authenticated;
