/**
 * RSS Feed Types for Tweakers.net integration
 */

export interface RSSItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl?: string;
  author?: string;
  category?: string;
  guid?: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
  lastBuildDate?: string;
}

export interface ParsedRSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl: string | null;
  content: string;
  categories: string[];
  author: string;
}

export type FeedCategory = 'nieuws' | 'reviews';

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  imageUrl: string | null;
  publishedAt: Date;
  category: FeedCategory;
  source: string;
  author: string;
}

export interface PricewatchItem {
  id: string;
  productName: string;
  price: number;
  lowestPrice: number;
  highestPrice: number;
  shop: string;
  url: string;
  imageUrl: string;
  lastUpdated: Date;
}
