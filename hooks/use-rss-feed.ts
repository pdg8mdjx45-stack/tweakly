/**
 * Article Feed Hook
 * Loads real RSS articles with cache + graceful fallback behavior.
 */

import { useCallback, useEffect, useState } from 'react';

import { getFeedInfo, getFeedUrl } from '@/constants/rss-feeds';
import { storeArticles } from '@/services/article-store';
import { generateItemId, parseRSS } from '@/services/rss-parser';
import type { Article, FeedCategory, ParsedRSSItem } from '@/types/rss';

/** Cache duration: 10 minutes */
const CACHE_DURATION = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;
const ALL_CATEGORIES: FeedCategory[] = ['nieuws', 'reviews'];

interface CacheEntry {
  data: Article[];
  timestamp: number;
}

interface RSSFeedState {
  articles: Article[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Category-specific cache */
const feedCache = new Map<FeedCategory, CacheEntry>();

/** Global cache for all feeds combined */
let allFeedsCache: CacheEntry | null = null;

function sortByDateDesc(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

function parseDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function mapParsedItemToArticle(item: ParsedRSSItem, category: FeedCategory, source: string): Article {
  const title = item.title.trim();
  const summary = item.description.trim();
  const url = item.link.trim();
  const publishedAt = parseDate(item.pubDate);

  return {
    id: `${category}-${generateItemId(item)}`,
    title,
    summary,
    content: item.content || item.description,
    url,
    imageUrl: item.imageUrl,
    publishedAt,
    category,
    source,
    author: item.author || '',
  };
}

function dedupeArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const deduped: Article[] = [];

  for (const article of articles) {
    const key = article.url || article.id;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(article);
  }

  return deduped;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFeedXML(feedUrl: string): Promise<string> {
  const attempts = [
    feedUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
  ];

  for (const attemptUrl of attempts) {
    try {
      const res = await fetchWithTimeout(attemptUrl);
      if (!res.ok) continue;

      const xml = await res.text();
      if (xml.includes('<rss') || xml.includes('<feed')) {
        return xml;
      }
    } catch {
      // Try next endpoint.
    }
  }

  throw new Error(`Kon feed niet ophalen: ${feedUrl}`);
}

async function loadCategoryArticles(category: FeedCategory): Promise<Article[]> {
  const feed = getFeedInfo(category);
  const xml = await fetchFeedXML(getFeedUrl(category));
  const parsed = parseRSS(xml);

  const mapped = parsed
    .map((item) => mapParsedItemToArticle(item, category, feed.name))
    .filter((item) => item.title.length > 0 && item.url.length > 0);

  return sortByDateDesc(mapped);
}

async function loadAllArticles(): Promise<Article[]> {
  const byCategory = await Promise.all(ALL_CATEGORIES.map((category) => loadCategoryArticles(category)));
  return sortByDateDesc(dedupeArticles(byCategory.flat()));
}

/** Fetch a single category feed with caching */
export function useRSSFeed(category: FeedCategory): RSSFeedState {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchFeed = useCallback(async () => {
    const cached = feedCache.get(category);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setArticles(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mapped = await loadCategoryArticles(category);
      storeArticles(mapped);
      feedCache.set(category, { data: mapped, timestamp: Date.now() });
      setArticles(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon nieuws niet laden');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed, refreshKey]);

  const refresh = useCallback(() => {
    feedCache.delete(category);
    allFeedsCache = null;
    setRefreshKey((k) => k + 1);
  }, [category]);

  return { articles, loading, error, refresh };
}

/** Fetch all categories combined and sorted by date with caching */
export function useAllFeeds(): RSSFeedState {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      if (allFeedsCache && Date.now() - allFeedsCache.timestamp < CACHE_DURATION) {
        setArticles(allFeedsCache.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const all = await loadAllArticles();
        storeArticles(all);

        if (!cancelled) {
          allFeedsCache = { data: all, timestamp: Date.now() };
          setArticles(all);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Onbekende fout');
          setArticles([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = useCallback(() => {
    feedCache.clear();
    allFeedsCache = null;
    setRefreshKey((k) => k + 1);
  }, []);

  return { articles, loading, error, refresh };
}

/** Format a date string for display ("3u geleden", "2d geleden", etc.) */
export function formatRSSDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return 'nu';
  if (mins < 60) return `${mins}m geleden`;
  if (hours < 24) return `${hours}u geleden`;
  if (days < 7) return `${days}d geleden`;
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}
