import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

import type { NotificationItem, NotificationTargetType } from '@/types/database';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface NotificationPresentation {
  icon: IoniconName;
  /** Verb phrase rendered after the actor's name, e.g. "liked your review". */
  verb: string;
  /** Where tapping the notification should navigate, or null if not linkable. */
  href: Href | null;
}

function targetNoun(target: NotificationTargetType | null): string {
  switch (target) {
    case 'review':
      return 'review';
    case 'list':
      return 'list';
    case 'diary_entry':
      return 'diary entry';
    default:
      return 'post';
  }
}

/** Link to the commented/liked content by its target type. */
function contentHref(
  target: NotificationTargetType | null,
  targetId: string | null,
  viewerUsername: string | null,
): Href | null {
  if (target === 'review' && targetId) return { pathname: '/review/[id]', params: { id: targetId } };
  if (target === 'list' && targetId) return { pathname: '/list/[id]', params: { id: targetId } };
  if (target === 'diary_entry' && viewerUsername) {
    return { pathname: '/user/[username]/diary', params: { username: viewerUsername } };
  }
  return null;
}

/**
 * Turn a notification into an icon, a verb phrase and a navigation target.
 * `viewerUsername` is the signed-in user (needed to route to their own diary).
 */
export function presentNotification(
  item: NotificationItem,
  viewerUsername: string | null,
): NotificationPresentation {
  const actorHref: Href | null = item.actor
    ? { pathname: '/user/[username]', params: { username: item.actor.username } }
    : null;

  switch (item.type) {
    case 'new_follower':
      return { icon: 'person-add', verb: 'started following you', href: actorHref };
    case 'friend_request':
      return { icon: 'people', verb: 'sent you a friend request', href: '/friends' };
    case 'friend_accepted':
      return { icon: 'checkmark-circle', verb: 'accepted your friend request', href: actorHref };
    case 'review_like':
      return {
        icon: 'heart',
        verb: 'liked your review',
        href: contentHref('review', item.target_id, viewerUsername),
      };
    case 'list_like':
      return {
        icon: 'heart',
        verb: 'liked your list',
        href: contentHref('list', item.target_id, viewerUsername),
      };
    case 'diary_like':
      return {
        icon: 'heart',
        verb: 'liked your diary entry',
        href: contentHref('diary_entry', item.target_id, viewerUsername),
      };
    case 'comment':
      return {
        icon: 'chatbubble',
        verb: `commented on your ${targetNoun(item.target_type)}`,
        href: contentHref(item.target_type, item.target_id, viewerUsername),
      };
    case 'comment_reply':
      return {
        icon: 'chatbubble-ellipses',
        verb: 'replied to your comment',
        href: contentHref(item.target_type, item.target_id, viewerUsername),
      };
    case 'badge_earned':
      return { icon: 'ribbon', verb: 'earned a new badge', href: actorHref };
    case 'challenge_completed':
      return { icon: 'flag', verb: 'completed a watch challenge', href: '/challenge' };
    default:
      return { icon: 'notifications', verb: 'sent you a notification', href: null };
  }
}
