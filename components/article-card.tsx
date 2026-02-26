/**
 * Article Card Component — Revolut-inspired transaction-row style
 */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useArticleBookmark } from '@/hooks/use-bookmarks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRSSDate } from '@/hooks/use-rss-feed';
import { storeArticle } from '@/services/article-store';
import type { Article } from '@/types/rss';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'compact' | 'featured';
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'nieuws': return Palette.blue;
    case 'reviews': return Palette.warning;
    case 'prijzen': return Palette.accent;
    default: return Palette.blue;
  }
}

function getCategoryBg(category: string, isDark: boolean): string {
  switch (category) {
    case 'nieuws': return isDark ? 'rgba(10,132,255,0.18)' : 'rgba(10,132,255,0.1)';
    case 'reviews': return isDark ? 'rgba(255,184,0,0.18)' : 'rgba(255,184,0,0.1)';
    case 'prijzen': return isDark ? 'rgba(0,208,156,0.18)' : 'rgba(0,208,156,0.1)';
    default: return isDark ? 'rgba(10,132,255,0.18)' : 'rgba(10,132,255,0.1)';
  }
}

export const ArticleCard = memo(function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { bookmarked, toggleBookmark } = useArticleBookmark({
    id: article.id,
    title: article.title,
    summary: article.summary,
    imageUrl: article.imageUrl,
    url: article.url,
    category: article.category,
  });

  const handlePress = useCallback(() => {
    storeArticle(article);
    router.push(`/artikel/${article.id}` as any);
  }, [article, router]);

  const handleBookmark = useCallback((e: any) => {
    e.stopPropagation?.();
    toggleBookmark();
  }, [toggleBookmark]);

  const dateStr = formatRSSDate(article.publishedAt.toISOString());
  const catColor = getCategoryColor(article.category);
  const catBg = getCategoryBg(article.category, isDark);
  const catLetter = article.category.charAt(0).toUpperCase();

  // ── DEFAULT — Revolut transaction-row ─────────────────────────────────────
  if (variant === 'default') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface },
          pressed && styles.rowPressed,
        ]}
      >
        {/* Category circle */}
        <View style={[styles.catCircle, { backgroundColor: catBg }]}>
          <Text style={[styles.catLetter, { color: catColor }]}>{catLetter}</Text>
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
            {article.title}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {article.author ? `${article.author} · ` : ''}{article.category} · {dateStr}
          </Text>
        </View>

        {/* Thumbnail (only when available) */}
        {article.imageUrl ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.rowThumb}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        {/* Bookmark */}
        <Pressable onPress={handleBookmark} hitSlop={12} style={styles.bookmarkBtn}>
          <IconSymbol
            name={bookmarked ? 'bookmark.fill' : 'bookmark'}
            size={15}
            color={bookmarked ? Palette.blue : colors.icon}
          />
        </Pressable>
      </Pressable>
    );
  }

  // ── COMPACT — minimal row ──────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactRow,
          { backgroundColor: colors.surface },
          pressed && styles.rowPressed,
        ]}
      >
        <View style={[styles.catDot, { backgroundColor: catBg }]}>
          <Text style={[styles.catDotLetter, { color: catColor }]}>{catLetter}</Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
            {article.title}
          </Text>
          <Text style={[styles.compactMeta, { color: colors.textSecondary }]}>
            {article.author ? `${article.author} · ` : ''}{dateStr}
          </Text>
        </View>
        {article.imageUrl ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.compactThumb}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <Pressable onPress={handleBookmark} hitSlop={12}>
          <IconSymbol
            name={bookmarked ? 'bookmark.fill' : 'bookmark'}
            size={14}
            color={bookmarked ? Palette.blue : colors.icon}
          />
        </Pressable>
      </Pressable>
    );
  }

  // ── FEATURED — hero card with overlay ─────────────────────────────────────
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.featured,
        { backgroundColor: isDark ? Palette.dark3 : Palette.grey5 },
        pressed && styles.rowPressed,
      ]}
    >
      {article.imageUrl ? (
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.featuredImage}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      {/* Dark gradient overlay */}
      <View style={styles.featuredOverlay} />

      <View style={styles.featuredContent}>
        <View style={styles.featuredTop}>
          <View style={[styles.featuredBadge, { backgroundColor: catColor }]}>
            <Text style={styles.featuredBadgeText}>{article.category.toUpperCase()}</Text>
          </View>
          <Pressable onPress={handleBookmark} hitSlop={12}>
            <IconSymbol
              name={bookmarked ? 'bookmark.fill' : 'bookmark'}
              size={20}
              color={bookmarked ? Palette.blue : 'rgba(255,255,255,0.75)'}
            />
          </Pressable>
        </View>
        <View style={styles.featuredTitleContainer}>
          <Text style={styles.featuredTitle} numberOfLines={3}>{article.title}</Text>
        </View>
        <Text style={styles.featuredDate} numberOfLines={1}>{dateStr} · {article.source}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  rowPressed: { opacity: 0.7 },

  // ── Default row ──────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  catCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catLetter: {
    fontSize: 18,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  rowMeta: {
    fontSize: 12,
  },
  rowThumb: {
    width: 58,
    height: 58,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },
  bookmarkBtn: {
    padding: 2,
  },

  // ── Compact row ──────────────────────────────────────────────────────────
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  catDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catDotLetter: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactContent: {
    flex: 1,
    gap: 3,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  compactMeta: {
    fontSize: 11,
  },
  compactThumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },

  // ── Featured ─────────────────────────────────────────────────────────────
  featured: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    height: 220,
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  featuredBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featuredTitleContainer: {
    maxHeight: 76,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: '#FFFFFF',
  },
  featuredDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
});
