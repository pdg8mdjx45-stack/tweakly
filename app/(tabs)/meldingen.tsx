import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { BackButton } from '@/components/back-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MOCK_PRODUCTS } from '@/constants/mock-data';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import {
  getAlerts,
  getCheckPriceUrl,
  removeAlert,
  subscribeAlerts,
  type PriceAlert,
} from '@/services/alerts-store';

const productMap = Object.fromEntries(MOCK_PRODUCTS.map(p => [p.id, p]));

function AlertRow({
  alert,
  isLast,
  colors,
  isDark,
  onRemove,
}: {
  alert: PriceAlert;
  isLast: boolean;
  colors: (typeof Colors)['light'];
  isDark: boolean;
  onRemove: (id: string) => void;
}) {
  const product = productMap[alert.productId];
  const amountNeeded = alert.currentPrice - alert.targetPrice;
  const dropPct = alert.currentPrice > 0 ? Math.round((amountNeeded / alert.currentPrice) * 100) : 0;
  const ref = alert.originalPrice ?? alert.currentPrice * 1.2;
  const progress = ref <= alert.targetPrice ? 1 : Math.max(0, Math.min(1, (ref - alert.currentPrice) / (ref - alert.targetPrice)));
  const progressPct = Math.round(progress * 100);
  const alertImageUrl = useProductImage(alert.productName, product?.imageUrl ?? '');

  return (
    <Fragment>
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
                  { backgroundColor: isDark ? Palette.dark3 : Palette.grey5 },
                ]}
              >
                <IconSymbol name="tag.fill" size={20} color={colors.textSecondary} />
              </View>
            )}
          </Pressable>
        </Link>

        {/* Content */}
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
              {alert.productName}
            </Text>
          </View>

          <View style={styles.rowMid}>
            <Text style={[styles.rowStatus, { color: colors.textSecondary }]} numberOfLines={1}>
              Doelprijs: €{alert.targetPrice} · nog {dropPct}% te gaan
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: progressPct >= 70 ? Palette.accent : colors.tint,
                  width: `${progressPct}%` as `${number}%`,
                },
              ]}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.rowActions}>
            <Pressable
              style={[styles.checkButton, { backgroundColor: colors.tint }]}
              onPress={() => WebBrowser.openBrowserAsync(
                getCheckPriceUrl(alert.productName),
                { toolbarColor: Palette.primary },
              )}>
              <Text style={styles.checkButtonText}>Prijs bekijken</Text>
            </Pressable>
            <Pressable
              style={[styles.removeButton, { borderColor: colors.border }]}
              onPress={() => onRemove(alert.id)}>
              <Text style={[styles.removeButtonText, { color: colors.textSecondary }]}>Verwijder</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {!isLast && (
        <View
          style={[
            styles.sep,
            { backgroundColor: colors.border, marginLeft: Spacing.md + 52 + Spacing.sm },
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
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <BackButton color={colors.tint} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Prijsalerts</Text>
          </View>
        </View>
        <View style={styles.emptyFull}>
          <IconSymbol name="bell.badge.fill" size={56} color={colors.border} />
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
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <BackButton color={colors.tint} />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Prijsalerts</Text>
          <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoBanner, { backgroundColor: isDark ? Palette.dark3 : '#E3F2FD' }]}>
          <IconSymbol name="info.circle" size={16} color={isDark ? Palette.grey2 : '#1565C0'} />
          <Text style={[styles.infoBannerText, { color: isDark ? Palette.grey2 : '#1565C0' }]}>
            Tik op "Prijs bekijken" om de huidige prijs te controleren via Google Shopping.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={[styles.group, { backgroundColor: colors.surface }]}>
            {alerts.map((alert, i, arr) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                isLast={i === arr.length - 1}
                colors={colors}
                isDark={isDark}
                onRemove={handleRemove}
              />
            ))}
          </View>
        </View>
      </ScrollView>
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
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  headerCount: {
    fontSize: 14,
    marginBottom: 6,
  },

  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
  },
  infoBannerText: {
    fontSize: 13,
    flex: 1,
  },

  section: {
    gap: Spacing.xs,
  },

  group: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowStatus: {
    flex: 1,
    fontSize: 12,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 6,
  },
  checkButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
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
