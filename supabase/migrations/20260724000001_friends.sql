-- Watchd friends: symmetric friend relationship with send/accept/decline
-- requests, layered on top of the existing (asymmetric) follow graph.
-- Follows stay public/discovery-oriented; friends are the curated inner circle
-- that gates shared watchlists.
--
-- Security model matches the rest of the schema: RLS deny-by-default, all writes
-- via SECURITY DEFINER RPCs (clients get no insert/update/delete policies), and
-- the friend_count counter is trigger-maintained + protected with column grants.

-- ── Enum ─────────────────────────────────────────────────────────────────────

create type public.friend_status as enum ('pending', 'accepted');

-- ── friendships ──────────────────────────────────────────────────────────────
-- One row per relationship. `requester_id` asked, `addressee_id` was asked.
-- A pair is unique regardless of direction (see friendships_pair_idx), so the
-- reciprocal request is handled by send_friend_request (auto-accept), never a
-- duplicate row.

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friend_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- Direction-agnostic uniqueness: at most one relationship per pair of users.
create unique index friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);
-- Inbox lookups: pending requests awaiting my response.
create index friendships_addressee_pending_idx on public.friendships (addressee_id)
  where status = 'pending';
create index friendships_requester_idx on public.friendships (requester_id);

-- ── profiles.friend_count ────────────────────────────────────────────────────
-- Denormalised counter, trigger-maintained; column grant below blocks tampering.

alter table public.profiles
  add column friend_count integer not null default 0 check (friend_count >= 0);

-- profiles UPDATE is column-granted; re-issue the full allow-list so friend_count
-- is NOT client-writable. Keep every previously-granted column (notification_prefs
-- was added in 20260723000004) or this revoke would silently drop it.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, bio, avatar_path, favourite_genres, onboarding_completed, notification_prefs)
  on public.profiles to authenticated;

-- ── are_friends helper ───────────────────────────────────────────────────────
-- SECURITY DEFINER so RLS policies and RPCs can consult friendships regardless
-- of the caller. Mirrors is_blocked_either.

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a is not null and b is not null and exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b)
        or (requester_id = b and addressee_id = a))
  );
$$;

-- ── friend_count maintenance ─────────────────────────────────────────────────
-- Counts only move when a row enters or leaves the 'accepted' state.

create or replace function public.handle_friendship_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'accepted' then
      update public.profiles set friend_count = friend_count + 1
        where id in (new.requester_id, new.addressee_id);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status <> 'accepted' and new.status = 'accepted' then
      update public.profiles set friend_count = friend_count + 1
        where id in (new.requester_id, new.addressee_id);
    elsif old.status = 'accepted' and new.status <> 'accepted' then
      update public.profiles set friend_count = greatest(0, friend_count - 1)
        where id in (new.requester_id, new.addressee_id);
    end if;
    return new;
  else -- DELETE
    if old.status = 'accepted' then
      update public.profiles set friend_count = greatest(0, friend_count - 1)
        where id in (old.requester_id, old.addressee_id);
    end if;
    return old;
  end if;
end;
$$;

create trigger friendships_after_change
  after insert or update or delete on public.friendships
  for each row execute function public.handle_friendship_change();

-- ── RPCs: the only write path into friendships ──────────────────────────────

-- Send (or auto-accept a reciprocal) friend request.
create or replace function public.send_friend_request(p_addressee uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_existing public.friendships%rowtype;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  if p_addressee is null or p_addressee = v_user then
    raise exception 'You cannot friend yourself.';
  end if;
  if not exists (select 1 from public.profiles where id = p_addressee) then
    raise exception 'User not found.';
  end if;
  if public.is_blocked_either(v_user, p_addressee) then
    raise exception 'You cannot friend this user.';
  end if;

  -- Any existing relationship for this pair, in either direction.
  select * into v_existing from public.friendships
  where (requester_id = v_user and addressee_id = p_addressee)
     or (requester_id = p_addressee and addressee_id = v_user)
  limit 1;

  if v_existing.id is not null then
    if v_existing.status = 'accepted' then
      return jsonb_build_object('id', v_existing.id, 'status', 'accepted');
    end if;
    -- Pending. If they already asked me, accept it; if I already asked, no-op.
    if v_existing.addressee_id = v_user then
      update public.friendships
        set status = 'accepted', responded_at = now()
        where id = v_existing.id;
      return jsonb_build_object('id', v_existing.id, 'status', 'accepted');
    end if;
    return jsonb_build_object('id', v_existing.id, 'status', 'pending');
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (v_user, p_addressee, 'pending')
  returning id into v_existing.id;
  return jsonb_build_object('id', v_existing.id, 'status', 'pending');
end;
$$;

-- Accept or decline a pending request (addressee only).
create or replace function public.respond_friend_request(p_request uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_row public.friendships%rowtype;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_row from public.friendships where id = p_request;
  if v_row.id is null then
    raise exception 'Request not found.';
  end if;
  if v_row.addressee_id <> v_user then
    raise exception 'You cannot respond to this request.';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'This request is no longer pending.';
  end if;

  if coalesce(p_accept, false) then
    update public.friendships set status = 'accepted', responded_at = now()
      where id = p_request;
    return jsonb_build_object('id', p_request, 'status', 'accepted');
  else
    delete from public.friendships where id = p_request;
    return jsonb_build_object('id', p_request, 'status', 'declined');
  end if;
end;
$$;

-- Remove a friend, or cancel an outgoing pending request (either party).
create or replace function public.remove_friend(p_other uuid)
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
  delete from public.friendships
  where (requester_id = v_user and addressee_id = p_other)
     or (requester_id = p_other and addressee_id = v_user);
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Friendships are private to the two parties. No client write policies: all
-- mutations flow through the SECURITY DEFINER RPCs above.

alter table public.friendships enable row level security;

create policy "friendships visible to both parties"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

revoke all on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;

revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;

revoke all on function public.handle_friendship_change() from public, anon, authenticated;
