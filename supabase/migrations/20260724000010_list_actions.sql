-- Phase 3: duplicate_list — copy any list you can see into a new private list of
-- your own (Letterboxd Pro feature, free here). Per-row list_items triggers keep
-- item_count correct; the copy is private so no list_created activity fires.

create or replace function public.duplicate_list(p_list_id uuid, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_src public.lists%rowtype;
  v_new uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  select * into v_src from public.lists where id = p_list_id;
  if v_src.id is null then
    raise exception 'List not found.';
  end if;
  if v_src.visibility <> 'public' and v_src.user_id <> v_user then
    raise exception 'You cannot copy this list.';
  end if;

  insert into public.lists (user_id, name, description, visibility)
  values (
    v_user,
    coalesce(nullif(trim(p_name), ''), left(v_src.name || ' (copy)', 100)),
    v_src.description,
    'private'
  )
  returning id into v_new;

  insert into public.list_items (list_id, title_id, position, note)
  select v_new, li.title_id, li.position, li.note
  from public.list_items li
  where li.list_id = p_list_id
  order by li.position;

  return v_new;
end;
$$;

revoke all on function public.duplicate_list(uuid, text) from public, anon;
grant execute on function public.duplicate_list(uuid, text) to authenticated;
