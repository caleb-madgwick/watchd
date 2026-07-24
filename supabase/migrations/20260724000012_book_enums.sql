-- Phase 5 (Books) enum additions. Dedicated file: Postgres forbids using a newly
-- added enum value in the same transaction that adds it, so these ALTERs must be
-- committed before the books migration (20260724000013) references them.

alter type public.media_type add value if not exists 'book';
alter type public.activity_type add value if not exists 'book_completed';
