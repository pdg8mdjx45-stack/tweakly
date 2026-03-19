/**
 * Bookmarks Screen (Bladwijzers)
 * Displays all bookmarked articles with swipe-to-delete and clear-all.
 */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { type Bookmark, useBookmarks } from '@/hooks/use-bookmarks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRSSDate } from '@/hooks/use-rss-feed';
import { retrieveArticle, storeArticle } from '@/services/article-store';
import type { Article, FeedCategory } from '@/types/rss';

const CATEGORY_COLOR: Record<string, string> = {
  nieuws: Palette.primary,
  reviews: '#F59E0B',
  prijzen: Palette.accent,
};

function BookmarkCard({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const catColor = CATEGORY_COLOR[bookmark.category] ?? Palette.primary;

  const handlePress = useCallback(() => {
    // Reconstruct a minimal Article and store it so the detail screen can retrieve it
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
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface }, pressed && styles.pressed]}
    >
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
    </Pressable>
  );
}

function EmptyBookmarks({ colors }: { colors: (typeof Colors)['light'] }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <IconSymbol name="bookmark" size={48} color={colors.tabIconDefault} />
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
  const router = useRouter();
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks();

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Alle bladwijzers verwijderen',
      'Weet je zeker dat je alle opgeslagen artikelen wilt verwijderen?',
      [
        { text: 'Annuleer', style: 'cancel' },
        { text: 'Verwijder', style: 'destructive', onPress: clearBookmarks },
      ],
    );
  }, [clearBookmarks]);

  const handleMoreOptions = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuleer', 'Alle bladwijzers verwijderen', 'Profiel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleClearAll();
          } else if (buttonIndex === 2) {
            router.push('/(tabs)/profiel' as any);
          }
        },
      );
    } else {
      Alert.alert(
        'Opties',
        undefined,
        [
          { text: 'Alle bladwijzers verwijderen', style: 'destructive', onPress: handleClearAll },
          { text: 'Profiel', onPress: () => router.push('/(tabs)/profiel' as any) },
          { text: 'Annuleer', style: 'cancel' },
        ],
      );
    }
  }, [handleClearAll, router]);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <BackButton color={colors.tint} />
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bladwijzers</Text>
          {bookmarks.length > 0 && (
            <Pressable onPress={handleMoreOptions} hitSlop={12}>
              <IconSymbol name="ellipsis" size={24} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Count badge */}
      {bookmarks.length > 0 && (
        <View style={styles.countRow}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {bookmarks.length} opgeslagen {bookmarks.length === 1 ? 'artikel' : 'artikelen'}
          </Text>
        </View>
      )}

      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={bookmarks.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyBookmarks colors={colors} />}
        renderItem={({ item }) => (
          <BookmarkCard
            bookmark={item}
            onRemove={() => removeBookmark(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.35 },
  clearAll: { fontSize: 15, fontWeight: '500', paddingBottom: 4 },

  countRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  countText: { fontSize: 13 },

  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.xs,
  },
  emptyContainer: { flex: 1 },
  separator: { height: Spacing.sm },

  // Bookmark card
  card: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: { opacity: 0.8 },
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
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13 },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  emptyMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
