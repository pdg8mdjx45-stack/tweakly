/**
 * Article Detail Screen
 * Shows full article metadata and summary; lets the user read the full
 * article in the system browser via expo-web-browser.
 */

import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useArticleBookmark } from '@/hooks/use-bookmarks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRSSDate } from '@/hooks/use-rss-feed';
import { retrieveArticle } from '@/services/article-store';

const CATEGORY_COLOR: Record<string, string> = {
  nieuws: Palette.primary,
  reviews: '#F59E0B',
  prijzen: Palette.accent,
};

export default function ArtikelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const article = retrieveArticle(id ?? '');

  const { bookmarked, toggleBookmark } = useArticleBookmark(
    article ?? {
      id: id ?? '',
      title: '',
      summary: '',
      imageUrl: null,
      url: '',
      category: 'nieuws',
    },
  );

  const openInBrowser = useCallback(async () => {
    if (article?.url) {
      await WebBrowser.openBrowserAsync(article.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
        toolbarColor: Palette.primary,
      });
    }
  }, [article?.url]);

  const handleShare = useCallback(async () => {
    if (article) {
      await Share.share({ title: article.title, url: article.url });
    }
  }, [article]);

  if (!article) {
    return (
      <View style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <IconSymbol name="exclamationmark.triangle" size={48} color={colors.textSecondary} />
        <Text style={[styles.notFoundText, { color: colors.text }]}>Artikel niet gevonden</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.tint }]}>
          <Text style={styles.backBtnText}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  const catColor = CATEGORY_COLOR[article.category] ?? Palette.primary;
  const dateStr = formatRSSDate(article.publishedAt.toISOString());

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── Header bar ─────────────────────────────────────────── */}
      <View style={[styles.headerBar, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <IconSymbol name="chevron.left" size={20} color={colors.tint} />
          <Text style={[styles.headerBtnText, { color: colors.tint }]}>Terug</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShare} hitSlop={12} style={styles.iconBtn}>
            <IconSymbol name="square.and.arrow.up" size={20} color={colors.icon} />
          </Pressable>
          <Pressable onPress={toggleBookmark} hitSlop={12} style={styles.iconBtn}>
            <IconSymbol
              name={bookmarked ? 'bookmark.fill' : 'bookmark'}
              size={20}
              color={bookmarked ? colors.tint : colors.icon}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ─────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero image */}
        {article.imageUrl ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
        ) : null}

        <View style={styles.body}>
          {/* Category + date row */}
          <View style={styles.metaRow}>
            <View style={[styles.categoryPill, { backgroundColor: catColor + '20' }]}>
              <Text style={[styles.categoryPillText, { color: catColor }]}>
                {article.category.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {dateStr}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{article.title}</Text>

          {/* Author & source */}
          <Text style={[styles.source, { color: colors.textSecondary }]}>
            {article.author ? `${article.author} · ` : ''}{article.source}
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Summary / teaser */}
          {article.summary ? (
            <Text style={[styles.summary, { color: colors.text }]}>{article.summary}</Text>
          ) : null}

          {/* "Read full article" CTA */}
          <Pressable
            onPress={openInBrowser}
            style={({ pressed }) => [
              styles.readBtn,
              { backgroundColor: colors.tint },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.readBtnText}>Lees volledig artikel</Text>
            <IconSymbol name="arrow.up.right" size={16} color="#fff" />
          </Pressable>

          {/* Secondary action */}
          <Pressable
            onPress={openInBrowser}
            style={({ pressed }) => [
              styles.openBrowserBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="safari" size={16} color={colors.textSecondary} />
            <Text style={[styles.openBrowserText, { color: colors.textSecondary }]}>
              Openen in browser
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerBtnText: { fontSize: 17 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBtn: { padding: 4 },

  // Scroll
  scroll: { paddingBottom: Spacing.xxl },

  // Hero
  heroImage: { width: '100%', height: 260 },

  // Body
  body: { padding: Spacing.md, gap: Spacing.md },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  categoryPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  dateText: { fontSize: 13 },

  title: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  source: { fontSize: 13, fontWeight: '500' },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },

  summary: { fontSize: 16, lineHeight: 26 },

  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  readBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  openBrowserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  openBrowserText: { fontSize: 14 },

  // Not found
  notFoundText: { fontSize: 18, fontWeight: '600' },
  backBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
