import { supabase } from '@/lib/supabase/client';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import type { FriendStatusRow } from '@/types/database';

export interface FriendListEntry {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
}

export interface PendingFriendRequest {
  requestId: string;
  createdAt: string;
  from: FriendListEntry;
}

/** My relationship with one other user, from the signed-in user's perspective. */
export type FriendshipState =
  | { status: 'none' }
  | { status: 'friends'; requestId: string }
  // I sent a request they haven't answered.
  | { status: 'outgoing'; requestId: string }
  // They sent me a request I can accept/decline.
  | { status: 'incoming'; requestId: string };

interface RawFriendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendStatusRow;
}

/** Pure mapping of a friendship row → the viewer's perspective. Exported for tests. */
export function deriveFriendshipState(row: RawFriendship | null, userId: string): FriendshipState {
  if (!row) return { status: 'none' };
  if (row.status === 'accepted') return { status: 'friends', requestId: row.id };
  return row.requester_id === userId
    ? { status: 'outgoing', requestId: row.id }
    : { status: 'incoming', requestId: row.id };
}

/** Reads the single friendship row for the (me, target) pair, either direction. */
export async function fetchFriendship(
  userId: string,
  targetUserId: string,
): Promise<FriendshipState> {
  const { data, error } = await supabase!
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${targetUserId}),` +
        `and(requester_id.eq.${targetUserId},addressee_id.eq.${userId})`,
    )
    .maybeSingle<RawFriendship>();
  if (error) throw new Error(error.message);
  return deriveFriendshipState(data, userId);
}

interface ProfileJoin {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
}

function mapProfile(profile: ProfileJoin): FriendListEntry {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name?.trim() || profile.username,
    avatarUrl: avatarPublicUrl(profile.avatar_path),
    bio: profile.bio ?? '',
  };
}

// Aliased embeds of the same table twice defeat supabase-js's type inference,
// so we cast the runtime result (the alias syntax works at runtime).
interface FriendshipJoinRow {
  requester: ProfileJoin | null;
  addressee: ProfileJoin | null;
}
interface PendingJoinRow {
  id: string;
  created_at: string;
  requester: ProfileJoin | null;
}

/** Accepted friends of the signed-in user (RLS keeps friendships private). */
export async function fetchFriends(userId: string): Promise<FriendListEntry[]> {
  const client = supabase!;
  const { data, error } = await client
    .from('friendships')
    .select(
      'requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_path, bio),' +
        'addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_path, bio)',
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('responded_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as FriendshipJoinRow[])
    .map((row) => {
      // The friend is whichever side of the pair isn't me.
      const other = row.requester?.id === userId ? row.addressee : row.requester;
      return other ? mapProfile(other) : null;
    })
    .filter((entry): entry is FriendListEntry => !!entry);
}

/** Incoming pending requests awaiting my response. */
export async function fetchPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]> {
  const { data, error } = await supabase!
    .from('friendships')
    .select(
      'id, created_at, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_path, bio)',
    )
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as PendingJoinRow[])
    .map((row) =>
      row.requester
        ? { requestId: row.id, createdAt: row.created_at, from: mapProfile(row.requester) }
        : null,
    )
    .filter((entry): entry is PendingFriendRequest => !!entry);
}
