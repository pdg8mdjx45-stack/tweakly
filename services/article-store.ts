/**
 * Article Store — module-level cache so articles are accessible
 * by ID on the detail screen without a network round-trip.
 */

import type { Article } from '@/types/rss';

const store = new Map<string, Article>();

/** Store all articles in an array for easy access */
let allArticles: Article[] = [];

export function storeArticle(article: Article): void {
  store.set(article.id, article);
}

export function retrieveArticle(id: string): Article | undefined {
  return store.get(id);
}

export function storeArticles(articles: Article[]): void {
  for (const a of articles) store.set(a.id, a);
  // Also update the allArticles array
  allArticles = Array.from(store.values());
}

export function getAllArticles(): Article[] {
  return allArticles;
}

export function clearArticleStore(): void {
  store.clear();
  allArticles = [];
}
