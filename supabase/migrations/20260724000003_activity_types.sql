-- Extend the activity_type enum with the feed events later phases emit.
--
-- Enum values are added in a DEDICATED migration on purpose: Postgres forbids
-- using a newly-added enum value in the same transaction that adds it, and the
-- migration runner wraps each file in its own transaction. Keeping these ADD
-- VALUE statements alone (no data using them here) guarantees they are committed
-- before any later migration or runtime code references them.
--
-- Additive only; existing values ('logged', 'tv_completed', 'list_created',
-- 'followed') are unchanged. Clients must treat unknown activity types as inert
-- (render nothing) so older app builds tolerate new values.

alter type public.activity_type add value if not exists 'reviewed';
alter type public.activity_type add value if not exists 'commented';
alter type public.activity_type add value if not exists 'liked_list';
alter type public.activity_type add value if not exists 'friend_accepted';
alter type public.activity_type add value if not exists 'challenge_completed';
alter type public.activity_type add value if not exists 'badge_earned';
