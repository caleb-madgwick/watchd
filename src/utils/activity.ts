import type { FeedItem } from '@/types/database';

/**
 * Human verb phrase for a feed entry. `logged` activities combine watched,
 * rated and reviewed into a single sentence (the anti-triple-post rule).
 */
export function activityVerb(item: Pick<FeedItem, 'activity_type' | 'metadata'>): string {
  switch (item.activity_type) {
    case 'logged': {
      const parts: string[] = ['watched'];
      if (item.metadata.rating) parts.push('rated');
      if (item.metadata.has_review) parts.push('reviewed');
      const joined =
        parts.length > 1
          ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
          : parts[0];
      return item.metadata.is_rewatch ? `re${joined}` : joined;
    }
    case 'tv_completed':
      return 'finished';
    case 'list_created':
      return 'created a list';
    case 'followed':
      return 'followed';
    default:
      return 'updated';
  }
}
