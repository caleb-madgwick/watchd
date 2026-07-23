-- Notification preferences: stored per-profile now so choices survive until
-- delivery (push/email) ships. Keys: new_followers, review_likes, friend_activity.

alter table public.profiles
  add column notification_prefs jsonb not null
  default '{"new_followers": true, "review_likes": true, "friend_activity": true}'::jsonb;

alter table public.profiles
  add constraint profiles_notification_prefs_size check (pg_column_size(notification_prefs) < 512);

-- profiles UPDATE is column-granted (counters stay locked); allow the new column.
grant update (notification_prefs) on public.profiles to authenticated;
