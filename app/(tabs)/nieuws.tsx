/**
 * News Screen (Nieuws)
 * Displays latest articles in a combined timeline
 */

import { ArticleCard } from '@/components/article-card';
import { EmptyState } from '@/components/empty-state';
import { FeedLoading } from '@/components/feed-loading';
import { GlassPageHeader } from '@/components/glass-page-header';
import { LiquidScreen } from '@/components/liquid-screen';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useRSSFeed } from '@/hooks/use-rss-feed';
import type { Article } from '@/types/rss';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlatList, StyleSheet, View } from 'react-native';

export default function NieuwsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { animationsEnabled } = useReduceMotion();

  const { articles, loading, error } = useRSSFeed('nieuws');

  const renderArticle = ({ item, index }: { item: Article; index: number }) => {
    if (!item || !item.id || !item.title) return null;
    return (
      <Animated.View
        entering={animationsEnabled
          ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110)
          : undefined}
        style={styles.articleRow}
      >
        <ArticleCard article={item} variant="default" />
      </Animated.View>
    );
  };

  return (
    <LiquidScreen>
      <GlassPageHeader title="Nieuws" subtitle="Het laatste technieuws" />

      {error ? (
        <EmptyState
          title="Kon nieuws niet laden"
          message="Controleer je internetverbinding en probeer opnieuw."
          icon="wifi.slash"
        />
      ) : loading && articles.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={(item) => item?.id || Math.random().toString()}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<FeedLoading height={150} />}
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item?.id || Math.random().toString()}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
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
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl + Spacing.lg,
    paddingTop: Spacing.xs + 2,
  },
  articleRow: {
    marginBottom: Spacing.sm,
  },
  separator: {
    height: 0.33,
    marginHorizontal: Spacing.md,
    marginLeft: Spacing.md + 46 + 12,
    opacity: 0.6,
  },
});
