import { avatarPublicUrl } from '@/lib/supabase/storage';
import type { NotificationPrefs, ProfileRow } from '@/types/database';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarPath: string | null;
  avatarUrl?: string;
  favouriteGenres: number[];
  onboardingCompleted: boolean;
  notificationPrefs: NotificationPrefs;
  followerCount: number;
  followingCount: number;
  friendCount: number;
  createdAt: string;
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name?.trim() || row.username,
    bio: row.bio ?? '',
    avatarPath: row.avatar_path,
    avatarUrl: avatarPublicUrl(row.avatar_path),
    favouriteGenres: row.favourite_genres ?? [],
    onboardingCompleted: row.onboarding_completed,
    notificationPrefs: row.notification_prefs ?? {},
    followerCount: row.follower_count,
    followingCount: row.following_count,
    friendCount: row.friend_count,
    createdAt: row.created_at,
  };
}
