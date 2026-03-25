/**
 * News Screen (Nieuws)
 * Displays latest articles in a combined timeline
 */

import { ArticleCard } from '@/components/article-card';
import { EmptyState } from '@/components/empty-state';
import { FeedLoading } from '@/components/feed-loading';
import { Colors, Spacing, TAB_BAR_SCROLL_INSET } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRSSFeed } from '@/hooks/use-rss-feed';
import type { Article } from '@/types/rss';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

export default function NieuwsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Use useRSSFeed to get only news (nieuws), excluding reviews
  const { articles, loading, error, refresh } = useRSSFeed('nieuws');

  const renderArticle = ({ item }: { item: Article }) => (
    <View style={styles.articleRow}>
      <ArticleCard article={item} variant="default" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Large-title header */}
      <View style={[styles.pageHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Nieuws</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Het laatste technieuws
        </Text>
      </View>

      {error ? (
        <EmptyState
          title="Kon nieuws niet laden"
          message="Controleer je internetverbinding en probeer opnieuw."
          icon="wifi.slash"
        />
      ) : loading && articles.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<FeedLoading height={150} />}
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.tint}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="Geen nieuws gevonden"
                message="Er zijn geen nieuwsartikelen beschikbaar."
                icon="newspaper"
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    paddingTop: Spacing.xl + Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 3,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  pageSubtitle: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: TAB_BAR_SCROLL_INSET,
    paddingTop: Spacing.xs,
  },
  articleRow: {
    marginBottom: Spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
    marginLeft: Spacing.md + 46 + 12, // align after category circle
  },
});
