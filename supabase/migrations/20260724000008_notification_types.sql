-- Extend notification_type for self-achievement notifications (badge earned,
-- challenge completed). Dedicated file for the same transaction-safety reason
-- as the activity_type additions: a new enum value can't be used in the txn
-- that adds it, so keep these ALTERs alone.

alter type public.notification_type add value if not exists 'badge_earned';
alter type public.notification_type add value if not exists 'challenge_completed';
