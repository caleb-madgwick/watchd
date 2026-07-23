/**
 * Hand-maintained Postgres row types — kept in lockstep with
 * supabase/migrations/*.sql. If you change the schema, change this file.
 * (Once the project is linked you can regenerate with
 * `supabase gen types typescript --linked`, but these names are the contract.)
 */

export type MediaTypeRow = 'movie' | 'tv';
export type WatchStatusRow = 'watchlist' | 'watching' | 'watched' | 'paused' | 'dropped';
export type ListVisibilityRow = 'public' | 'private';
export type ActivityTypeRow =
  | 'logged'
  | 'tv_completed'
  | 'list_created'
  | 'followed'
  | 'reviewed'
  | 'commented'
  | 'liked_list'
  | 'friend_accepted'
  | 'challenge_completed'
  | 'badge_earned';
export type FriendStatusRow = 'pending' | 'accepted';
export type SharedWatchlistRoleRow = 'owner' | 'member';
export type SharedWatchlistInviteStatusRow = 'pending' | 'accepted' | 'declined';
export type CommentTargetRow = 'review' | 'list' | 'diary_entry';
export type LikeTargetRow = 'list' | 'diary_entry' | 'comment';
export type NotificationTypeRow =
  | 'new_follower'
  | 'review_like'
  | 'list_like'
  | 'diary_like'
  | 'comment'
  | 'comment_reply'
  | 'friend_request'
  | 'friend_accepted'
  | 'badge_earned'
  | 'challenge_completed';

export type NotificationPrefs = {
  new_followers?: boolean;
  review_likes?: boolean;
  friend_activity?: boolean;
  comments?: boolean;
};

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  favourite_genres: number[];
  onboarding_completed: boolean;
  notification_prefs: NotificationPrefs;
  follower_count: number;
  following_count: number;
  friend_count: number;
  created_at: string;
  updated_at: string;
}

export type TitleRow = {
  id: string;
  tmdb_id: number;
  media_type: MediaTypeRow;
  title: string;
  original_title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  genre_ids: number[];
  runtime_minutes: number | null;
  original_language: string | null;
  metadata_updated_at: string;
  created_at: string;
}

export type TitlePersonDepartment = 'cast' | 'director' | 'creator' | 'crew';

export type TitlePersonRow = {
  id: string;
  title_id: string;
  person_tmdb_id: number;
  name: string;
  department: TitlePersonDepartment;
  job: string | null;
  ord: number;
  created_at: string;
}

/** One person passed to the set_title_people RPC. */
export type TitlePersonInput = {
  person_tmdb_id: number;
  name: string;
  department: TitlePersonDepartment;
  job?: string | null;
  ord?: number;
}

export type UserTitleStatusRow = {
  id: string;
  user_id: string;
  title_id: string;
  status: WatchStatusRow | null;
  rating: number | null;
  watched_at: string | null;
  is_favourite: boolean;
  favourite_rank: number | null;
  created_at: string;
  updated_at: string;
}

export type DiaryEntryRow = {
  id: string;
  user_id: string;
  title_id: string;
  watched_at: string;
  rating: number | null;
  is_rewatch: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export type TvProgressRow = {
  id: string;
  user_id: string;
  title_id: string;
  season_number: number;
  episode_number: number;
  completed: boolean;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

export type ReviewRow = {
  id: string;
  user_id: string;
  title_id: string;
  rating: number | null;
  body: string;
  contains_spoilers: boolean;
  published: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export type ReviewLikeRow = {
  user_id: string;
  review_id: string;
  created_at: string;
}

export type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type BlockRow = {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendStatusRow;
  created_at: string;
  responded_at: string | null;
}

export type SharedWatchlistRow = {
  id: string;
  name: string;
  created_by: string;
  member_count: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export type SharedWatchlistMemberRow = {
  watchlist_id: string;
  user_id: string;
  role: SharedWatchlistRoleRow;
  joined_at: string;
}

export type SharedWatchlistItemRow = {
  id: string;
  watchlist_id: string;
  title_id: string;
  added_by: string | null;
  note: string | null;
  watched: boolean;
  position: number;
  created_at: string;
}

export type SharedWatchlistInviteRow = {
  id: string;
  watchlist_id: string;
  inviter_id: string;
  invitee_id: string;
  status: SharedWatchlistInviteStatusRow;
  created_at: string;
  responded_at: string | null;
}

export type ListRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  visibility: ListVisibilityRow;
  item_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export type ListItemRow = {
  id: string;
  list_id: string;
  title_id: string;
  position: number;
  note: string | null;
  created_at: string;
}

export type ActivityRow = {
  id: string;
  actor_id: string;
  activity_type: ActivityTypeRow;
  title_id: string | null;
  review_id: string | null;
  list_id: string | null;
  subject_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ReportRow = {
  id: string;
  reporter_id: string;
  review_id: string;
  reason: string;
  details: string | null;
  created_at: string;
}

export type CommentRow = {
  id: string;
  user_id: string;
  target_type: CommentTargetRow;
  target_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export type ContentLikeRow = {
  user_id: string;
  target_type: LikeTargetRow;
  target_id: string;
  created_at: string;
}

export type NotificationTargetType = 'review' | 'list' | 'diary_entry' | 'comment' | 'profile';

export type NotificationRow = {
  id: string;
  recipient_id: string;
  type: NotificationTypeRow;
  actor_id: string | null;
  target_type: NotificationTargetType | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type PushTokenRow = {
  token: string;
  user_id: string;
  platform: 'ios' | 'android' | 'web';
  created_at: string;
  updated_at: string;
}

export type UserChallengeRow = {
  user_id: string;
  year: number;
  goal: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BadgeRow = {
  code: string;
  name: string;
  description: string;
  icon: string;
  sort: number;
}

export type UserBadgeRow = {
  user_id: string;
  badge_code: string;
  awarded_at: string;
  metadata: Record<string, unknown>;
}

export type TitleTagRow = {
  user_id: string;
  title_id: string;
  tag: string;
  created_at: string;
}

export type PersonFollowRow = {
  user_id: string;
  person_tmdb_id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
  created_at: string;
}

/** Shape returned by get_watch_challenge(). goal is null when unset. */
export type WatchChallenge = {
  year: number;
  goal: number | null;
  watched: number;
  completed: boolean;
}

/** One entry from get_user_badges(). */
export type UserBadge = {
  code: string;
  name: string;
  description: string;
  icon: string;
  awarded_at: string;
}

/** Shape returned by the get_activity_feed() RPC (one JSON object per activity). */
export type FeedItem = {
  id: string;
  activity_type: ActivityTypeRow;
  created_at: string;
  metadata: Record<string, unknown>;
  actor: { id: string; username: string; display_name: string | null; avatar_path: string | null };
  title: {
    id: string;
    tmdb_id: number;
    media_type: MediaTypeRow;
    title: string;
    poster_path: string | null;
    release_date: string | null;
  } | null;
  review: {
    id: string;
    rating: number | null;
    body: string;
    contains_spoilers: boolean;
    like_count: number;
  } | null;
  list: { id: string; name: string; visibility: ListVisibilityRow } | null;
  subject_user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_path: string | null;
  } | null;
}

export type CommunitySummary = {
  avg_rating: number | null;
  rating_count: number;
  watched_count: number;
  watchlist_count: number;
  review_count: number;
}

export type LogTitleResult = {
  status_id: string;
  review_id: string | null;
  diary_entry_id: string | null;
  activity_id: string | null;
}

/** Minimal profile snippet embedded in social RPC payloads. */
export type ProfileSnippet = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
}

export type FriendRequestResult = { id: string; status: FriendStatusRow };

export type ToggleLikeResult = { liked: boolean; like_count: number };

/** Shape returned by get_notifications() (one JSON object per notification). */
export type NotificationItem = {
  id: string;
  type: NotificationTypeRow;
  target_type: NotificationTargetType | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor: ProfileSnippet | null;
}

type StatPerson = { tmdb_id: number; name: string; count: number };

/** Shape returned by get_user_stats(). `blocked` is set instead when hidden. */
export type UserStats = {
  blocked?: boolean;
  films_watched: number;
  shows_watched: number;
  rewatches: number;
  hours_watched: number;
  ratings_count: number;
  average_rating: number | null;
  /** Half-star value (as string key) → count, e.g. { "4.5": 12 }. */
  rating_distribution: Record<string, number>;
  top_decades: { decade: number; count: number }[];
  top_genres: { genre_id: number; count: number }[];
  top_directors: StatPerson[];
  top_actors: StatPerson[];
  languages: { language: string; count: number }[];
  busiest_month: { month: string; count: number } | null;
  longest_streak: number;
  available_years: number[];
}

/** Shape returned by get_shared_watchlists() (one entry per membership). */
export type SharedWatchlistSummaryPayload = {
  id: string;
  name: string;
  member_count: number;
  item_count: number;
  role: SharedWatchlistRoleRow;
  updated_at: string;
}

export type SharedWatchlistsResult = {
  watchlists: SharedWatchlistSummaryPayload[];
  pending_invite_count: number;
}

/** Shape returned by get_pending_shared_watchlist_invites(). */
export type SharedWatchlistInvitePayload = {
  id: string;
  watchlist: { id: string; name: string; item_count: number };
  inviter: ProfileSnippet;
  created_at: string;
}

/** Shape returned by get_shared_watchlist() (full detail). */
export type SharedWatchlistDetailPayload = {
  id: string;
  name: string;
  member_count: number;
  item_count: number;
  created_by: string;
  my_role: SharedWatchlistRoleRow;
  members: (ProfileSnippet & { role: SharedWatchlistRoleRow; joined_at: string })[];
  items: {
    id: string;
    note: string | null;
    watched: boolean;
    created_at: string;
    added_by: { id: string; username: string; display_name: string | null } | null;
    title: {
      id: string;
      tmdb_id: number;
      media_type: MediaTypeRow;
      title: string;
      poster_path: string | null;
      release_date: string | null;
    };
  }[];
}

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

type TableShape<Row, Rels extends Relationship[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Rels;
};

/** FK metadata (Postgres default constraint names) so embedded selects type-check. */
type TitleRel<Name extends string> = {
  foreignKeyName: Name;
  columns: ['title_id'];
  isOneToOne: false;
  referencedRelation: 'titles';
  referencedColumns: ['id'];
};
type ProfileRel<Name extends string, Col extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: 'profiles';
  referencedColumns: ['id'];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<ProfileRow>;
      titles: TableShape<TitleRow>;
      user_title_status: TableShape<
        UserTitleStatusRow,
        [
          TitleRel<'user_title_status_title_id_fkey'>,
          ProfileRel<'user_title_status_user_id_fkey', 'user_id'>,
        ]
      >;
      diary_entries: TableShape<
        DiaryEntryRow,
        [TitleRel<'diary_entries_title_id_fkey'>, ProfileRel<'diary_entries_user_id_fkey', 'user_id'>]
      >;
      tv_progress: TableShape<
        TvProgressRow,
        [TitleRel<'tv_progress_title_id_fkey'>, ProfileRel<'tv_progress_user_id_fkey', 'user_id'>]
      >;
      reviews: TableShape<
        ReviewRow,
        [TitleRel<'reviews_title_id_fkey'>, ProfileRel<'reviews_user_id_fkey', 'user_id'>]
      >;
      review_likes: TableShape<
        ReviewLikeRow,
        [
          ProfileRel<'review_likes_user_id_fkey', 'user_id'>,
          {
            foreignKeyName: 'review_likes_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
        ]
      >;
      follows: TableShape<
        FollowRow,
        [
          ProfileRel<'follows_follower_id_fkey', 'follower_id'>,
          ProfileRel<'follows_following_id_fkey', 'following_id'>,
        ]
      >;
      blocks: TableShape<BlockRow>;
      friendships: TableShape<
        FriendshipRow,
        [
          ProfileRel<'friendships_requester_id_fkey', 'requester_id'>,
          ProfileRel<'friendships_addressee_id_fkey', 'addressee_id'>,
        ]
      >;
      shared_watchlists: TableShape<
        SharedWatchlistRow,
        [ProfileRel<'shared_watchlists_created_by_fkey', 'created_by'>]
      >;
      shared_watchlist_members: TableShape<
        SharedWatchlistMemberRow,
        [
          ProfileRel<'shared_watchlist_members_user_id_fkey', 'user_id'>,
          {
            foreignKeyName: 'shared_watchlist_members_watchlist_id_fkey';
            columns: ['watchlist_id'];
            isOneToOne: false;
            referencedRelation: 'shared_watchlists';
            referencedColumns: ['id'];
          },
        ]
      >;
      shared_watchlist_items: TableShape<
        SharedWatchlistItemRow,
        [
          TitleRel<'shared_watchlist_items_title_id_fkey'>,
          ProfileRel<'shared_watchlist_items_added_by_fkey', 'added_by'>,
          {
            foreignKeyName: 'shared_watchlist_items_watchlist_id_fkey';
            columns: ['watchlist_id'];
            isOneToOne: false;
            referencedRelation: 'shared_watchlists';
            referencedColumns: ['id'];
          },
        ]
      >;
      shared_watchlist_invites: TableShape<
        SharedWatchlistInviteRow,
        [
          ProfileRel<'shared_watchlist_invites_inviter_id_fkey', 'inviter_id'>,
          ProfileRel<'shared_watchlist_invites_invitee_id_fkey', 'invitee_id'>,
          {
            foreignKeyName: 'shared_watchlist_invites_watchlist_id_fkey';
            columns: ['watchlist_id'];
            isOneToOne: false;
            referencedRelation: 'shared_watchlists';
            referencedColumns: ['id'];
          },
        ]
      >;
      lists: TableShape<ListRow, [ProfileRel<'lists_user_id_fkey', 'user_id'>]>;
      list_items: TableShape<
        ListItemRow,
        [
          TitleRel<'list_items_title_id_fkey'>,
          {
            foreignKeyName: 'list_items_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
        ]
      >;
      activities: TableShape<
        ActivityRow,
        [
          TitleRel<'activities_title_id_fkey'>,
          ProfileRel<'activities_actor_id_fkey', 'actor_id'>,
          ProfileRel<'activities_subject_user_id_fkey', 'subject_user_id'>,
          {
            foreignKeyName: 'activities_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
        ]
      >;
      reports: TableShape<ReportRow>;
      comments: TableShape<
        CommentRow,
        [
          ProfileRel<'comments_user_id_fkey', 'user_id'>,
          {
            foreignKeyName: 'comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ]
      >;
      content_likes: TableShape<ContentLikeRow, [ProfileRel<'content_likes_user_id_fkey', 'user_id'>]>;
      notifications: TableShape<
        NotificationRow,
        [
          ProfileRel<'notifications_recipient_id_fkey', 'recipient_id'>,
          ProfileRel<'notifications_actor_id_fkey', 'actor_id'>,
        ]
      >;
      push_tokens: TableShape<PushTokenRow, [ProfileRel<'push_tokens_user_id_fkey', 'user_id'>]>;
      title_people: TableShape<TitlePersonRow, [TitleRel<'title_people_title_id_fkey'>]>;
      user_challenges: TableShape<UserChallengeRow, [ProfileRel<'user_challenges_user_id_fkey', 'user_id'>]>;
      badges: TableShape<BadgeRow>;
      user_badges: TableShape<
        UserBadgeRow,
        [
          ProfileRel<'user_badges_user_id_fkey', 'user_id'>,
          {
            foreignKeyName: 'user_badges_badge_code_fkey';
            columns: ['badge_code'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['code'];
          },
        ]
      >;
      title_tags: TableShape<
        TitleTagRow,
        [TitleRel<'title_tags_title_id_fkey'>, ProfileRel<'title_tags_user_id_fkey', 'user_id'>]
      >;
      person_follows: TableShape<PersonFollowRow, [ProfileRel<'person_follows_user_id_fkey', 'user_id'>]>;
    };
    Views: Record<string, never>;
    Functions: {
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      upsert_title_reference: {
        Args: {
          p_tmdb_id: number;
          p_media_type: MediaTypeRow;
          p_title: string;
          p_original_title?: string | null;
          p_poster_path?: string | null;
          p_backdrop_path?: string | null;
          p_release_date?: string | null;
          p_genre_ids?: number[] | null;
          p_runtime_minutes?: number | null;
          p_original_language?: string | null;
        };
        Returns: string;
      };
      set_title_people: {
        Args: { p_title_id: string; p_people: TitlePersonInput[] };
        Returns: undefined;
      };
      get_user_stats: {
        Args: { p_user_id: string; p_year?: number | null };
        Returns: UserStats;
      };
      set_favourite_rank: {
        Args: { p_title_id: string; p_rank: number | null };
        Returns: undefined;
      };
      set_watch_goal: { Args: { p_year: number; p_goal: number }; Returns: undefined };
      get_watch_challenge: {
        Args: { p_user_id: string; p_year: number };
        Returns: WatchChallenge;
      };
      get_user_badges: { Args: { p_user_id: string }; Returns: UserBadge[] };
      duplicate_list: { Args: { p_list_id: string; p_name?: string | null }; Returns: string };
      log_title: {
        Args: {
          p_title_id: string;
          p_status?: WatchStatusRow | null;
          p_rating?: number | null;
          p_watched_at?: string | null;
          p_review_body?: string | null;
          p_contains_spoilers?: boolean;
          p_is_rewatch?: boolean;
          p_create_diary_entry?: boolean;
        };
        Returns: LogTitleResult;
      };
      set_tv_progress: {
        Args: {
          p_title_id: string;
          p_season_number: number;
          p_episode_number: number;
          p_completed: boolean;
        };
        Returns: string;
      };
      toggle_review_like: { Args: { p_review_id: string }; Returns: ToggleLikeResult };
      get_activity_feed: {
        Args: { p_before?: string | null; p_limit?: number };
        Returns: FeedItem[];
      };
      get_notifications: {
        Args: { p_before?: string | null; p_limit?: number };
        Returns: NotificationItem[];
      };
      get_unread_notification_count: { Args: Record<string, never>; Returns: number };
      mark_notifications_read: { Args: { p_ids?: string[] | null }; Returns: undefined };
      register_push_token: { Args: { p_token: string; p_platform: string }; Returns: undefined };
      unregister_push_token: { Args: { p_token: string }; Returns: undefined };
      get_title_community_summary: {
        Args: { p_tmdb_id: number; p_media_type: MediaTypeRow };
        Returns: CommunitySummary;
      };
      delete_account: { Args: Record<string, never>; Returns: undefined };
      are_friends: { Args: { a: string; b: string }; Returns: boolean };
      send_friend_request: { Args: { p_addressee: string }; Returns: FriendRequestResult };
      respond_friend_request: {
        Args: { p_request: string; p_accept: boolean };
        Returns: FriendRequestResult;
      };
      remove_friend: { Args: { p_other: string }; Returns: undefined };
      create_shared_watchlist: { Args: { p_name: string }; Returns: string };
      invite_to_shared_watchlist: {
        Args: { p_list: string; p_invitee: string };
        Returns: string;
      };
      respond_shared_watchlist_invite: {
        Args: { p_invite: string; p_accept: boolean };
        Returns: { watchlist_id: string; status: SharedWatchlistInviteStatusRow };
      };
      add_shared_watchlist_item: {
        Args: { p_list: string; p_title_id: string; p_note?: string | null };
        Returns: string;
      };
      remove_shared_watchlist_item: { Args: { p_item: string }; Returns: undefined };
      set_shared_watchlist_item_watched: {
        Args: { p_item: string; p_watched: boolean };
        Returns: undefined;
      };
      leave_shared_watchlist: { Args: { p_list: string }; Returns: undefined };
      remove_shared_watchlist_member: {
        Args: { p_list: string; p_user: string };
        Returns: undefined;
      };
      get_shared_watchlists: { Args: Record<string, never>; Returns: SharedWatchlistsResult };
      get_pending_shared_watchlist_invites: {
        Args: Record<string, never>;
        Returns: SharedWatchlistInvitePayload[];
      };
      get_shared_watchlist: { Args: { p_list: string }; Returns: SharedWatchlistDetailPayload };
    };
    Enums: {
      media_type: MediaTypeRow;
      watch_status: WatchStatusRow;
      list_visibility: ListVisibilityRow;
      activity_type: ActivityTypeRow;
      friend_status: FriendStatusRow;
      comment_target: CommentTargetRow;
      like_target: LikeTargetRow;
      notification_type: NotificationTypeRow;
    };
    CompositeTypes: Record<string, never>;
  };
}
