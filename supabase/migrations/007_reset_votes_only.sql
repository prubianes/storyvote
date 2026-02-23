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
  where room_slug = p_room_slug and status = 'active'
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

grant execute on function public.reset_active_round_votes(text) to anon, authenticated;
