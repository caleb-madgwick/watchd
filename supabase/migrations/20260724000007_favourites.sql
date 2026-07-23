-- Phase 1 finisher: ordered Top-4 favourites (the signature Letterboxd profile
-- element). Layers a rank on top of the existing is_favourite boolean rather
-- than replacing it — an unranked favourite still shows in the general list.

alter table public.user_title_status
  add column favourite_rank smallint check (favourite_rank is null or favourite_rank between 1 and 4);

-- At most one title per user per slot.
create unique index user_title_status_fav_rank_idx
  on public.user_title_status (user_id, favourite_rank)
  where favourite_rank is not null;

-- Assign (or clear, when p_rank is null) a title's favourite slot. Frees the
-- slot's current occupant first so the unique index never trips, and ensures
-- the title is marked a favourite. All in one transaction.
create or replace function public.set_favourite_rank(p_title_id uuid, p_rank smallint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  if p_rank is not null and p_rank not between 1 and 4 then
    raise exception 'Favourite rank must be between 1 and 4.';
  end if;

  if p_rank is null then
    update public.user_title_status set favourite_rank = null
    where user_id = v_user and title_id = p_title_id;
    return;
  end if;

  -- Vacate the slot if another title holds it.
  update public.user_title_status set favourite_rank = null
  where user_id = v_user and favourite_rank = p_rank and title_id <> p_title_id;

  insert into public.user_title_status as uts (user_id, title_id, is_favourite, favourite_rank)
  values (v_user, p_title_id, true, p_rank)
  on conflict (user_id, title_id) do update set is_favourite = true, favourite_rank = p_rank;
end;
$$;

revoke all on function public.set_favourite_rank(uuid, smallint) from public, anon;
grant execute on function public.set_favourite_rank(uuid, smallint) to authenticated;
