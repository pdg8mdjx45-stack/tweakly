/**
 * Bookmarks Screen (Bladwijzers)
 * Displays all bookmarked articles with swipe-to-delete and clear-all.
 */

import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import { LiquidScreen } from '@/components/liquid-screen';
import { ConfirmSheet } from '@/components/confirm-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { type Bookmark, useBookmarks } from '@/hooks/use-bookmarks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRSSDate } from '@/hooks/use-rss-feed';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { retrieveArticle, storeArticle } from '@/services/article-store';
import type { Article, FeedCategory } from '@/types/rss';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORY_COLOR: Record<string, string> = {
  nieuws: Palette.primary,
  reviews: '#F59E0B',
  prijzen: Palette.accent,
};

function BookmarkCard({ bookmark, onRemove, index, animationsEnabled }: { bookmark: Bookmark; onRemove: () => void; index: number; animationsEnabled: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const catColor = CATEGORY_COLOR[bookmark.category] ?? Palette.primary;

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    const cached = retrieveArticle(bookmark.id);
    if (!cached) {
      const rebuilt: Article = {
        id: bookmark.id,
        title: bookmark.title,
        summary: bookmark.summary,
        content: '',
        url: bookmark.url,
        imageUrl: bookmark.imageUrl,
        publishedAt: new Date(bookmark.savedAt),
        category: bookmark.category as FeedCategory,
        source: 'Tweakers',
        author: '',
      };
      storeArticle(rebuilt);
    }
    router.push(`/artikel/${bookmark.id}` as any);
  }, [bookmark, router]);

  const handleOpenBrowser = useCallback(async () => {
    await WebBrowser.openBrowserAsync(bookmark.url);
  }, [bookmark.url]);

  return (
    <Animated.View
      entering={animationsEnabled ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110) : undefined}
      style={pressStyle}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      >
        <ClearLiquidGlass isDark={isDark} borderRadius={Radius.lg} style={styles.card}>
          <GlassShimmer isDark={isDark} borderRadius={Radius.lg} intensity={0.6} />
          {bookmark.imageUrl ? (
            <Image source={{ uri: bookmark.imageUrl }} style={styles.cardImage} contentFit="cover" transition={200} />
          ) : null}
          <View style={styles.cardContent}>
            <View style={styles.cardMeta}>
              <View style={[styles.pill, { backgroundColor: catColor + '20' }]}>
                <Text style={[styles.pillText, { color: catColor }]}>{bookmark.category.toUpperCase()}</Text>
              </View>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {formatRSSDate(bookmark.savedAt)}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{bookmark.title}</Text>
            {bookmark.summary ? (
              <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>{bookmark.summary}</Text>
            ) : null}
            <View style={styles.cardActions}>
              <Pressable onPress={handleOpenBrowser} hitSlop={8} style={styles.actionBtn}>
                <IconSymbol name="safari" size={14} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>Browser</Text>
              </Pressable>
              <Pressable onPress={onRemove} hitSlop={8} style={styles.actionBtn}>
                <IconSymbol name="trash" size={14} color={Palette.danger} />
                <Text style={[styles.actionText, { color: Palette.danger }]}>Verwijder</Text>
              </Pressable>
            </View>
          </View>
        </ClearLiquidGlass>
      </Pressable>
    </Animated.View>
  );
}

function EmptyBookmarks({ colors, isDark }: { colors: (typeof Colors)['light']; isDark: boolean }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIconOuter, {
        backgroundColor: isDark ? 'rgba(26,58,32,0.15)' : 'rgba(26,58,32,0.08)',
        borderWidth: 0.5,
        borderColor: isDark ? 'rgba(26,58,32,0.25)' : 'rgba(26,58,32,0.15)',
      }]}>
        <View style={[styles.emptyIcon, { backgroundColor: Palette.primary + '18' }]}>
          <IconSymbol name="bookmark.fill" size={44} color={Palette.primary} />
        </View>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Geen bladwijzers</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        Tik op het bladwijzer-icoon bij een artikel om het hier op te slaan.
      </Text>
    </View>
  );
}

export default function BladwijzersScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks();
  const { animationsEnabled } = useReduceMotion();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleClearAll = useCallback(() => {
    setConfirmClearOpen(true);
  }, []);

  return (
    <LiquidScreen>
      <Text style={[styles.screenTitle, { color: colors.text, paddingTop: insets.top + Spacing.md }]}>
        Opgeslagen
      </Text>

      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={bookmarks.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyBookmarks colors={colors} isDark={isDark} />}
        renderItem={({ item, index }) => (
          <BookmarkCard
            bookmark={item}
            onRemove={() => removeBookmark(item.id)}
            index={index}
            animationsEnabled={animationsEnabled}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <ConfirmSheet
        visible={confirmClearOpen}
        title="Alle bladwijzers verwijderen"
        message="Weet je zeker dat je alle opgeslagen artikelen wilt verwijderen?"
        onClose={() => setConfirmClearOpen(false)}
        actions={[
          { label: 'Annuleer', style: 'cancel' },
          { label: 'Verwijder alles', style: 'default', onPress: clearBookmarks },
        ]}
      />

    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl + Spacing.lg,
    paddingTop: Spacing.xs + 2,
  },
  emptyContainer: { flex: 1 },
  separator: { height: Spacing.sm },

  // Bookmark card
  card: {
    overflow: 'hidden',
    ...Shadow.md,
  },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: Spacing.md, gap: Spacing.xs },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  date: { fontSize: 12 },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  summary: { fontSize: 13, lineHeight: 18 },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconOuter: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 260 },
});
