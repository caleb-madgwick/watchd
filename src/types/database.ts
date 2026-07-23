/**
 * Hand-maintained Postgres row types — kept in lockstep with
 * supabase/migrations/*.sql. If you change the schema, change this file.
 * (Once the project is linked you can regenerate with
 * `supabase gen types typescript --linked`, but these names are the contract.)
 */

export type MediaTypeRow = 'movie' | 'tv';
export type WatchStatusRow = 'watchlist' | 'watching' | 'watched' | 'paused' | 'dropped';
export type ListVisibilityRow = 'public' | 'private';
export type ActivityTypeRow = 'logged' | 'tv_completed' | 'list_created' | 'followed';

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  favourite_genres: number[];
  onboarding_completed: boolean;
  follower_count: number;
  following_count: number;
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
  metadata_updated_at: string;
  created_at: string;
}

export type UserTitleStatusRow = {
  id: string;
  user_id: string;
  title_id: string;
  status: WatchStatusRow | null;
  rating: number | null;
  watched_at: string | null;
  is_favourite: boolean;
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

export type ListRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  visibility: ListVisibilityRow;
  item_count: number;
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
        };
        Returns: string;
      };
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
      toggle_review_like: { Args: { p_review_id: string }; Returns: boolean };
      get_activity_feed: {
        Args: { p_before?: string | null; p_limit?: number };
        Returns: FeedItem[];
      };
      get_title_community_summary: {
        Args: { p_tmdb_id: number; p_media_type: MediaTypeRow };
        Returns: CommunitySummary;
      };
      delete_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      media_type: MediaTypeRow;
      watch_status: WatchStatusRow;
      list_visibility: ListVisibilityRow;
      activity_type: ActivityTypeRow;
    };
    CompositeTypes: Record<string, never>;
  };
}
