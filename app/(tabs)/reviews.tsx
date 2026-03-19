/**
 * Reviews Screen
 * Displays product reviews
 */

import { ArticleCard } from '@/components/article-card';
import { EmptyState } from '@/components/empty-state';
import { FeedLoading } from '@/components/feed-loading';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRSSFeed } from '@/hooks/use-rss-feed';
import type { Article, FeedCategory } from '@/types/rss';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

export default function ReviewsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory | 'all'>('reviews');

  const { articles, loading, error, refresh } = useRSSFeed('reviews');

  const filteredArticles = selectedCategory === 'all'
    ? articles
    : articles.filter(a => a.category === selectedCategory);

  const renderArticle = ({ item }: { item: Article }) => (
    <View style={styles.articleRow}>
      <ArticleCard article={item} variant="default" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Large-title header */}
      <View style={[styles.pageHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Reviews</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Recente productreviews en tests
        </Text>
      </View>

      {error ? (
        <EmptyState
          title="Kon reviews niet laden"
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
          data={filteredArticles}
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
                title="Geen reviews gevonden"
                message="Er zijn geen reviews beschikbaar."
                icon="star"
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
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.xs,
  },
  articleRow: {
    marginBottom: Spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 46 + 12,
  },
});
