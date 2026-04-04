import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassPageHeader } from '@/components/glass-page-header';
import { LiquidScreen } from '@/components/liquid-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MOCK_PRODUCTS } from '@/constants/mock-data';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import {
  getAlerts,
  getCheckPriceUrl,
  removeAlert,
  subscribeAlerts,
  type PriceAlert,
} from '@/services/alerts-store';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const productMap = Object.fromEntries(MOCK_PRODUCTS.map(p => [p.id, p]));

function AnimatedProgressBar({ progressPct, isDark }: { progressPct: number; isDark: boolean }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(progressPct, { damping: 20, stiffness: 80 });
  }, [progressPct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as `${number}%`,
  }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]}>
      <Animated.View
        style={[
          styles.progressFill,
          barStyle,
          { backgroundColor: progressPct >= 70 ? Palette.accent : Palette.primary },
        ]}
      />
    </View>
  );
}

function AlertRow({
  alert,
  isLast,
  colors,
  isDark,
  onRemove,
  index,
  animationsEnabled,
}: {
  alert: PriceAlert;
  isLast: boolean;
  colors: (typeof Colors)['light'];
  isDark: boolean;
  onRemove: (id: string) => void;
  index: number;
  animationsEnabled: boolean;
}) {
  const product = productMap[alert.productId];
  const amountNeeded = alert.currentPrice - alert.targetPrice;
  const dropPct = alert.currentPrice > 0 ? Math.round((amountNeeded / alert.currentPrice) * 100) : 0;
  const ref = alert.originalPrice ?? alert.currentPrice * 1.2;
  const progress = ref <= alert.targetPrice ? 1 : Math.max(0, Math.min(1, (ref - alert.currentPrice) / (ref - alert.targetPrice)));
  const progressPct = Math.round(progress * 100);
  const alertImageUrl = useProductImage(alert.productName, product?.imageUrl ?? '');

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Fragment>
      <Animated.View
        entering={animationsEnabled ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110) : undefined}
        style={pressStyle}
      >
        <View style={styles.row}>
          {/* Product image */}
          <Link href={`/product/${alert.productId}`} asChild>
            <Pressable>
              {product?.imageUrl ? (
                <Image
                  source={{ uri: alertImageUrl }}
                  style={styles.rowImg}
                  contentFit="contain"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.rowImg,
                    styles.rowImgFallback,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                  ]}
                >
                  <IconSymbol name="tag.fill" size={20} color={colors.textSecondary} />
                </View>
              )}
            </Pressable>
          </Link>

          {/* Content */}
          <View style={styles.rowBody}>
            <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
              {alert.productName}
            </Text>

            <Text style={[styles.rowStatus, { color: colors.textSecondary }]} numberOfLines={1}>
              Doelprijs: €{alert.targetPrice} · nog {dropPct}% te gaan
            </Text>

            <AnimatedProgressBar progressPct={progressPct} isDark={isDark} />

            <View style={styles.rowActions}>
              <Pressable
                style={[styles.checkButton, { backgroundColor: Palette.primary }]}
                onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
                onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                onPress={() => WebBrowser.openBrowserAsync(
                  getCheckPriceUrl(alert.productName),
                  { toolbarColor: Palette.primary },
                )}
              >
                <Text style={styles.checkButtonText}>Prijs bekijken</Text>
              </Pressable>
              <Pressable
                style={[styles.removeButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}
                onPress={() => onRemove(alert.id)}
              >
                <Text style={[styles.removeButtonText, { color: colors.textSecondary }]}>Verwijder</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>

      {!isLast && (
        <View
          style={[
            styles.sep,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', marginLeft: Spacing.md + 52 + Spacing.sm },
          ]}
        />
      )}
    </Fragment>
  );
}

export default function MeldingenScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { animationsEnabled } = useReduceMotion();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadAlerts = useCallback(() => {
    getAlerts().then(a => {
      setAlerts(a);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    loadAlerts();
    return subscribeAlerts(loadAlerts);
  }, [loadAlerts]);

  const handleRemove = useCallback((id: string) => {
    removeAlert(id);
  }, []);

  if (loaded && alerts.length === 0) {
    return (
      <LiquidScreen>
        <GlassPageHeader title="Prijsalerts" subtitle="" />
        <View style={styles.emptyFull}>
          <IconSymbol name="bell.badge.fill" size={56} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
          <Text style={[styles.emptyFullTitle, { color: colors.text }]}>
            Nog geen prijsalerts
          </Text>
          <Text style={[styles.emptyFullMsg, { color: colors.textSecondary }]}>
            Stel een prijsalert in op een productpagina om de prijs te volgen.
          </Text>
          <Text style={[styles.emptyFullHint, { color: colors.textSecondary }]}>
            Open een product en tik op het bel-icoon om een doelprijs in te stellen.
          </Text>
        </View>
      </LiquidScreen>
    );
  }

  return (
    <LiquidScreen>
      <GlassPageHeader
        title="Prijsalerts"
        subtitle={loaded ? `${alerts.length} actieve alert${alerts.length !== 1 ? 's' : ''}` : ''}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info banner */}
        <Animated.View entering={animationsEnabled ? FadeInDown.delay(0).springify().damping(18).stiffness(110) : undefined}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.sm} style={styles.infoBanner}>
            <IconSymbol name="info.circle.fill" size={16} color={isDark ? Palette.accent : Palette.primary} />
            <Text style={[styles.infoBannerText, { color: isDark ? 'rgba(255,255,255,0.75)' : Palette.primary }]}>
              Tik op "Prijs bekijken" om de huidige prijs te controleren via Google Shopping.
            </Text>
          </ClearLiquidGlass>
        </Animated.View>

        {/* Alert rows */}
        <ClearLiquidGlass isDark={isDark} borderRadius={Radius.lg} style={styles.group}>
          {alerts.map((alert, i, arr) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              isLast={i === arr.length - 1}
              colors={colors}
              isDark={isDark}
              onRemove={handleRemove}
              index={i + 1}
              animationsEnabled={animationsEnabled}
            />
          ))}
        </ClearLiquidGlass>
      </ScrollView>
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl + Spacing.lg,
    gap: Spacing.md,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    overflow: 'hidden',
  },
  infoBannerText: {
    fontSize: 13,
    flex: 1,
  },

  group: {
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  rowImg: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },
  rowImgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowStatus: {
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 6,
  },
  checkButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },

  sep: {
    height: StyleSheet.hairlineWidth,
  },

  emptyFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyFullTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyFullMsg: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyFullHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
