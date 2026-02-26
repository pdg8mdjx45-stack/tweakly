# Tweakly - Tweakers.net React Native App Implementation Plan

## 1. Project Overview

**Goal:** Build a native mobile app (React Native/Expo) that provides a modern Tweakers.net experience with:
- RSS feed integration for News, Reviews, and Pricewatch
- Card-based article layout with images, titles, dates
- Dark mode, category filters, bookmarking
- Tab navigation for News, Reviews, Pricewatch

## 2. Current State Analysis

**Existing Components:**
- [x] Expo Router navigation setup
- [x] Dark/Light theme system with `useThemeContext`
- [x] Theme constants (Tweakers brand colors)
- [x] Mock data structure (products, alerts, categories)
- [x] Product card component
- [x] Price history chart
- [x] Tweakers scraper script

**Implemented Components:**
- [x] RSS feed fetching hooks with retry logic
- [x] News/Reviews/Pricewatch tab screens
- [x] Article card components
- [x] Bookmark storage/context
- [x] Category filter components

## 3. Implementation Plan

### Phase 1: RSS Feed System (Hooks & Types) - COMPLETE
- [x] `types/rss.ts` - Define RSS feed types
- [x] `hooks/use-rss-feed.ts` - Fetch and parse RSS feeds (with retry logic & mock fallback)
- [x] `services/rss-parser.ts` - RSS XML parser utility

### Phase 2: Data & Storage - COMPLETE
- [x] `constants/rss-feeds.ts` - Tweakers RSS feed URLs
- [x] `hooks/use-bookmarks.ts` - Bookmark state management
- [x] `hooks/use-articles.ts` - Combined article fetching

### Phase 3: UI Components - COMPLETE
- [x] `components/article-card.tsx` - Article card with image, title, date
- [x] `components/category-filter.tsx` - Horizontal category filter
- [x] `components/filter-chip.tsx` - Reusable filter chip
- [x] `components/empty-state.tsx` - Empty state component

### Phase 4: Tab Screens - COMPLETE
- [x] `app/(tabs)/nieuws.tsx` - News feed screen
- [x] `app/(tabs)/reviews.tsx` - Reviews feed screen
- [x] `app/(tabs)/prijzen.tsx` - Pricewatch screen

### Phase 5: Navigation Updates - COMPLETE
- [x] Update `app/(tabs)/_layout.tsx` - New tab structure

### Phase 6: Bookmarking & Polish - COMPLETE
- [x] Update `app/product/[id].tsx` - Add bookmark button
- [x] Update `app/(tabs)/profiel.tsx` - Show bookmarks

## 4. Tweakers RSS Feed URLs

```
News: https://feeds.tweakers.net/Tweakers/nieuws
Reviews: https://feeds.tweakers.net/Tweakers/reviews
Pricewatch: https://feeds.tweakers.net/Tweakers/pricewatch
```

## 5. File Structure

### Implemented Files:
- `types/rss.ts`
- `hooks/use-rss-feed.ts`
- `hooks/use-bookmarks.ts`
- `hooks/use-articles.ts`
- `constants/rss-feeds.ts`
- `components/article-card.tsx`
- `components/category-filter.tsx`
- `components/filter-chip.tsx`
- `components/empty-state.tsx`
- `app/(tabs)/nieuws.tsx`
- `app/(tabs)/reviews.tsx`
- `app/(tabs)/prijzen.tsx`

### Modified Files:
- `app/(tabs)/_layout.tsx` - Update tabs
- `app/(tabs)/index.tsx` - Update home
- `app/product/[id].tsx` - Add bookmark
- `constants/mock-data.ts` - Add article types
- `constants/theme.ts` - Tweakers brand colors
