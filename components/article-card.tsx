/**
 * Article Card Component — Revolut-inspired transaction-row style
 */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useArticleBookmark } from '@/hooks/use-bookmarks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { formatRSSDate } from '@/hooks/use-rss-feed';
import { storeArticle } from '@/services/article-store';
import type { Article } from '@/types/rss';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'compact' | 'featured';
  index?: number;
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

export const ArticleCard = memo(function ArticleCard({ article, variant = 'default', index = 0 }: ArticleCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { animationsEnabled } = useReduceMotion();
  const scale = useSharedValue(1);

  const { bookmarked, toggleBookmark } = useArticleBookmark({
    id: article?.id ?? '',
    title: article?.title ?? '',
    summary: article?.summary,
    imageUrl: article?.imageUrl,
    url: article?.url ?? '',
    category: article?.category ?? '',
  });

  const handlePress = useCallback(() => {
    if (!article) return;
    storeArticle(article);
    router.push(`/artikel/${article.id}` as any);
  }, [article, router]);

  const handleBookmark = useCallback((e: any) => {
    e.stopPropagation?.();
    toggleBookmark();
  }, [toggleBookmark]);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!article || !article.id) {
    return null;
  }

  const handlePressIn = () => {
    if (animationsEnabled) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (animationsEnabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const dateStr = article.publishedAt instanceof Date 
    ? formatRSSDate(article.publishedAt.toISOString()) 
    : formatRSSDate(new Date().toISOString());
  const category = article.category || 'nieuws';
  const catColor = getCategoryColor(category);
  const catBg = getCategoryBg(category, isDark);
  const catLetter = category.charAt(0).toUpperCase();
  const title = article.title || '';

  const enteringAnimation = animationsEnabled 
    ? FadeInDown.delay(index * 30).springify().damping(15).stiffness(100)
    : undefined;

  // ── DEFAULT — iOS 26 liquid glass row ─────────────────────────────────────
  if (variant === 'default') {
    return (
      <Animated.View entering={enteringAnimation}>
      <Animated.View style={animatedPressStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.border },
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
            {title}
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
      </Animated.View>
      </Animated.View>
    );
  }

  // ── COMPACT — minimal row ──────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <Animated.View entering={enteringAnimation}>
      <Animated.View style={animatedPressStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.compactRow,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.rowPressed,
        ]}
      >
        <View style={[styles.catDot, { backgroundColor: catBg }]}>
          <Text style={[styles.catDotLetter, { color: catColor }]}>{catLetter}</Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
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
      </Animated.View>
      </Animated.View>
    );
  }

  // ── FEATURED — hero card with overlay ─────────────────────────────────────
  return (
    <Animated.View entering={enteringAnimation}>
    <Animated.View style={animatedPressStyle}>
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
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
      {/* Specular top edge — liquid glass highlight */}
      <View style={styles.featuredSpecular} pointerEvents="none" />

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
          <Text style={styles.featuredTitle} numberOfLines={3}>{title}</Text>
        </View>
        <Text style={styles.featuredDate} numberOfLines={1}>{dateStr} · {article.source}</Text>
      </View>
      </Pressable>
      </Animated.View>
      </Animated.View>
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
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadow.md,
  },
  rowBlur: {
    borderRadius: Radius.lg,
  },
  catCircle: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
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
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadow.md,
  },
  catDot: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
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
  featuredSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    zIndex: 10,
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
