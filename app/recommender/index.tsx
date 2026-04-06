/**
 * Product Recommender Screen
 * Multi-step wizard waarbij de gebruiker voorkeuren invult per categorie,
 * waarna de app automatisch de beste producten aanbeveelt.
 */

import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import type { Product } from '@/constants/mock-data';
import {
  CATEGORY_CONFIGS,
  getRecommendations,
  type CategoryId,
  type RecommenderPreferences,
} from '@/services/product-recommender';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RecommenderScreen() {
  const params = useLocalSearchParams<{ category: string }>();
  const categoryId = params.category as CategoryId;
  
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  
  const config = CATEGORY_CONFIGS[categoryId];
  
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<RecommenderPreferences>({});
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  if (!config) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.text }}>Category not found</Text>
        </View>
      </>
    );
  }
  
  const questions = config.questions;
  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;
  
  const handleSelect = (value: string) => {
    setPreferences((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };
  
  const handleNext = async () => {
    if (!preferences[currentQuestion.id]) {
      return;
    }
    
    if (isLastStep) {
      setLoading(true);
      try {
        const results = await getRecommendations(categoryId, preferences);
        setRecommendations(results);
        setShowResults(true);
      } catch (e) {
        console.error('Error getting recommendations:', e);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };
  
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };
  
  const handleRestart = () => {
    setStep(0);
    setPreferences({});
    setRecommendations([]);
    setShowResults(false);
  };
  
  if (showResults) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.header,
              { backgroundColor: colors.background, paddingTop: insets.top + Spacing.sm },
            ]}
          >
            <Pressable onPress={handleBack} hitSlop={12}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {config.emoji} Aanbevelingen
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
          >
            {recommendations.length > 0 ? (
              <>
                <Text style={[styles.resultsSubtitle, { color: colors.textSecondary }]}>
                  Op basis van jouw voorkeuren bevelen wij aan:
                </Text>
                
                {recommendations.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    rank={index}
                    colors={colors}
                  />
                ))}
                
                <Pressable
                  onPress={handleRestart}
                  style={[styles.restartBtn, { borderColor: colors.border }]}
                >
                  <IconSymbol name="arrow.counterclockwise" size={16} color={colors.textSecondary} />
                  <Text style={[styles.restartBtnText, { color: colors.textSecondary }]}>
                    Opnieuw
                  </Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.noResults}>
                <IconSymbol name="magnifyingglass" size={48} color={colors.border} />
                <Text style={[styles.noResultsText, { color: colors.text }]}>
                  Geen producten gevonden
                </Text>
                <Text style={[styles.noResultsSubtext, { color: colors.textSecondary }]}>
                  Probeer andere voorkeuren
                </Text>
                <Pressable
                  onPress={handleRestart}
                  style={[styles.tryAgainBtn, { backgroundColor: Palette.primary }]}
                >
                  <Text style={styles.tryAgainBtnText}>Probeer opnieuw</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </>
    );
  }
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.background, paddingTop: insets.top + Spacing.sm },
          ]}
        >
          <Pressable onPress={handleBack} hitSlop={12}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {config.emoji} {config.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            {questions.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      i < step ? Palette.primary : i === step ? Palette.primary : colors.border,
                    opacity: i === step ? 1 : i < step ? 0.6 : 0.3,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
            Stap {step + 1} van {questions.length}
          </Text>
        </View>
        
        {/* Question */}
        <ScrollView
          contentContainerStyle={styles.questionContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.questionText, { color: colors.text }]}>
            {currentQuestion.question}
          </Text>
          
          <View style={styles.optionsGrid}>
            {currentQuestion.options.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                emoji={option.emoji}
                selected={preferences[currentQuestion.id] === option.value}
                onPress={() => handleSelect(option.value)}
                colors={colors}
              />
            ))}
          </View>
        </ScrollView>
        
        {/* Bottom button */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <Pressable
            onPress={handleNext}
            disabled={!preferences[currentQuestion.id] || loading}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: preferences[currentQuestion.id] ? Palette.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isLastStep ? 'Aanbevelingen bekijken' : 'Volgende'}
                </Text>
                <IconSymbol name="arrow.right" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
}

function OptionButton({
  label,
  emoji,
  selected,
  onPress,
  colors,
}: {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionBtn,
        {
          backgroundColor: selected ? Palette.primary : colors.surface,
          borderColor: selected ? Palette.primary : colors.border,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {emoji && <Text style={styles.optionEmoji}>{emoji}</Text>}
      <Text
        style={[
          styles.optionLabel,
          { color: selected ? '#fff' : colors.text },
        ]}
      >
        {label}
      </Text>
      {selected && (
        <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
      )}
    </Pressable>
  );
}

function ProductCard({
  product,
  rank,
  colors,
}: {
  product: Product;
  rank: number;
  colors: (typeof Colors)['light'];
}) {
  const imageUrl = useProductImage(product.name, product.imageUrl);
  const [failed, setFailed] = useState(false);
  
  const getRankColor = () => {
    if (rank === 0) return '#FFD700';
    if (rank === 1) return '#C0C0C0';
    if (rank === 2) return '#CD7F32';
    return colors.textSecondary;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        { backgroundColor: colors.surface },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.rankBadge}>
        <Text style={[styles.rankText, { color: getRankColor() }]}>#{rank + 1}</Text>
      </View>
      
      <View style={styles.productImageWrap}>
        {product.imageUrl && !failed ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            contentFit="contain"
            transition={200}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.productImage, styles.productImageFallback, { backgroundColor: colors.border }]}>
            <IconSymbol name="tag" size={24} color={colors.textSecondary} />
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.productMeta}>
          <View style={[styles.ratingBadge, { backgroundColor: Palette.accent + '20' }]}>
            <IconSymbol name="star.fill" size={10} color={Palette.accent} />
            <Text style={[styles.ratingText, { color: Palette.accent }]}>
              {product.rating?.toFixed(1) || 'N/A'}
            </Text>
          </View>
        </View>
        <Text style={[styles.productPrice, { color: Palette.primary }]}>
          €{product.currentPrice.toFixed(2)}
        </Text>
      </View>
      
      <IconSymbol name="chevron.right" size={18} color={colors.border} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  progressContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  stepText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  questionContent: {
    padding: Spacing.md,
    paddingBottom: 120,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0.1,
  },
  optionsGrid: {
    gap: Spacing.sm,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  optionEmoji: {
    fontSize: 26,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: Radius.full,
    gap: Spacing.sm,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  
  // Results
  resultsContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  resultsSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  rankBadge: {
    width: 28,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '800',
  },
  productImageWrap: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  restartBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  noResults: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
  },
  noResultsSubtext: {
    fontSize: 14,
  },
  tryAgainBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  tryAgainBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
