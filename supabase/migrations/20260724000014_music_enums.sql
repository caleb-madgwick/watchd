-- Phase 6 (Music) enum additions. Dedicated file: Postgres forbids using a newly
-- added enum value in the same transaction that adds it, so these ALTERs must be
-- committed before the music migration (20260724000015) references them.
--
-- No activity_type value is added — music reuses the existing 'logged' activity
-- with metadata.media_type, so album logs/ratings/reviews flow through the feed
-- exactly like movies.

alter type public.media_type add value if not exists 'artist';
alter type public.media_type add value if not exists 'album';
alter type public.media_type add value if not exists 'song';
