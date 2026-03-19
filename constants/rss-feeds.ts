/**
 * Tweakers.net RSS Feed URLs
 * Uses FeedBurner proxies (direct tweakers.net/feeds/ returns 403)
 */

import type { FeedCategory } from '@/types/rss';

/** Main RSS feed sources — Tweakers direct feeds */
export const NEWS_FEEDS = {
  nieuws: {
    id: 'nieuws',
    name: 'Tweakers Nieuws',
    url: 'https://tweakers.net/feeds/nieuws.xml',
    icon: 'newspaper',
  },
  reviews: {
    id: 'reviews',
    name: 'Tweakers Reviews',
    url: 'https://tweakers.net/feeds/reviews.xml',
    icon: 'star',
  },
} as const;

/** All available feed categories */
export const CATEGORIES: { id: FeedCategory; name: string; icon: string }[] = [
  { id: 'nieuws', name: 'Nieuws', icon: 'newspaper' },
  { id: 'reviews', name: 'Reviews', icon: 'star' },
];

/** Get feed URL by category */
export function getFeedUrl(category: FeedCategory): string {
  return NEWS_FEEDS[category]?.url ?? NEWS_FEEDS.nieuws.url;
}

/** Get feed info by category */
export function getFeedInfo(category: FeedCategory) {
  return NEWS_FEEDS[category] ?? NEWS_FEEDS.nieuws;
}

/** Get all feed URLs */
export function getAllFeedUrls(): string[] {
  return Object.values(NEWS_FEEDS).map(feed => feed.url);
}
