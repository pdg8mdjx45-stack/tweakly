import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export interface PriceHistoryDataPoint {
  date: string;
  price: number;
}

interface PriceHistoryChartProps {
  data: PriceHistoryDataPoint[];
  isDark?: boolean;
  title?: string;
}

const screenWidth = Dimensions.get('window').width;
// Full container width for centered chart
const chartWidth = screenWidth - Spacing.md * 2;

export function PriceHistoryChart({
  data,
  isDark = false,
  title = 'Prijsgeschiedenis',
}: PriceHistoryChartProps) {
  const colors = Colors[isDark ? 'dark' : 'light'];

  // Guard against empty data to prevent Infinity/NaN in SVG paths
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Geen prijsgegevens beschikbaar
        </Text>
      </View>
    );
  }

  // Prepare chart data — filter out invalid prices
  const validData = data.filter((d) => Number.isFinite(d.price) && d.price >= 0);
  if (validData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Geen geldige prijsgegevens beschikbaar
        </Text>
      </View>
    );
  }

  const prices = validData.map((d) => d.price);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const currentPrice = validData[validData.length - 1].price;
  const firstPrice = validData[0].price;
  const priceChange = currentPrice - firstPrice;
  const priceChangePct = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  
  // Round all prices to 1 decimal place
  const roundedMinPrice = Math.round(minPrice * 10) / 10;
  const roundedMaxPrice = Math.round(maxPrice * 10) / 10;
  const roundedAvgPrice = Math.round(avgPrice * 10) / 10;
  const roundedCurrentPrice = Math.round(currentPrice * 10) / 10;
  const roundedPriceChange = Math.round(priceChange * 10) / 10;
  
  // Calculate price range for Y-axis
  const pricePadding = (maxPrice - minPrice) * 0.1;
  const yMin = Math.floor(minPrice - pricePadding);
  const yMax = Math.ceil(maxPrice + pricePadding);

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: Radius.md,
    },
    propsForDots: {
      r: '0', // dots hidden by default; overridden after sampling
      strokeWidth: '0',
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: isDark ? '#38383A' : '#E5E5EA',
      strokeWidth: 1,
    },
    // Add padding to show Y-axis labels outside the chart area
    paddingLeft: 50,
  };

  // Format labels - show fewer when there are many data points
  // Downsample data for dense charts - keep max ~20 points for readability
  const getSampledData = () => {
    if (validData.length <= 20) {
      const sampleLabels = validData.map((d) => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });
      return { data: validData, prices, labels: sampleLabels };
    }
    
    // Calculate sampling factor
    const targetPoints = 20;
    const step = Math.ceil(validData.length / targetPoints);
    
    const sampledData = validData.filter((_, i) => i % step === 0);
    // Always include the last point
    if (sampledData.length === 0 || sampledData[sampledData.length - 1] !== validData[validData.length - 1]) {
      sampledData.push(validData[validData.length - 1]);
    }
    
    const sampleLabels = sampledData.map((d) => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    return {
      data: sampledData,
      prices: sampledData.map(d => d.price),
      labels: sampleLabels,
    };
  };

  const sampledData = getSampledData();
  const sampledCount = sampledData.data.length;

  // Show dots only when few data points
  chartConfig.propsForDots = {
    r: sampledCount <= 7 ? '4' : '0',
    strokeWidth: '0',
  };

  // Show at most 5 x-axis labels to avoid overlap
  const sparseLabels = (() => {
    const allLabels = sampledData.labels;
    if (allLabels.length <= 5) return allLabels;
    const step = Math.ceil(allLabels.length / 5);
    return allLabels.map((label, i) => (i % step === 0 || i === allLabels.length - 1) ? label : '');
  })();

  const chartData = {
    labels: sparseLabels,
    datasets: [
      {
        data: sampledData.prices,
        color: (opacity = 1) => Palette.primary,
        strokeWidth: 2,
      },
    ],
  };

  // Interactive tooltip state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Determine price status
  const isPriceDown = priceChange < 0;
  const isAtLowest = currentPrice <= minPrice * 1.05;

  // Get month names for legend
  const getMonthRange = () => {
    const firstDate = new Date(validData[0].date);
    const lastDate = new Date(validData[validData.length - 1].date);
    const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    return `${months[firstDate.getMonth()]} - ${months[lastDate.getMonth()]}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header with title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {getMonthRange()}
        </Text>
      </View>

      {/* Price statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Laagste</Text>
          <Text style={[styles.statValue, { color: Palette.accent }]}>
            €{roundedMinPrice.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gemiddeld</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            €{roundedAvgPrice.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hoogste</Text>
          <Text style={[styles.statValue, { color: Palette.warning }]}>
            €{roundedMaxPrice.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Text>
        </View>
      </View>

      {/* Current price and change */}
      <View style={styles.currentPriceRow}>
        <View>
          <Text style={[styles.currentPriceLabel, { color: colors.textSecondary }]}>Huidige prijs</Text>
          <Text style={[styles.currentPrice, { color: colors.text }]}>
            €{roundedCurrentPrice.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Text>
        </View>
        <View style={styles.changeContainer}>
          {priceChange !== 0 && (
            <View style={[
              styles.changeBadge, 
              { backgroundColor: isPriceDown ? Palette.accent : Palette.warning }
            ]}>
              <Text style={styles.changeText}>
                {isPriceDown ? '↓' : '↑'} €{Math.abs(roundedPriceChange).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({priceChangePct.toFixed(1)}%)
              </Text>
            </View>
          )}
          {isAtLowest && (
            <View style={[styles.lowestBadge, { backgroundColor: Palette.accent }]}>
              <Text style={styles.lowestText}>Laagste prijs!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Line Chart — tap a dot for details */}
      <Pressable style={styles.chartContainer} onPress={() => setSelectedIndex(null)}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={false}
          yAxisInterval={1}
          segments={4}
          yAxisLabel="€"
          yAxisSuffix=""
          onDataPointClick={({ index }: { index: number }) => {
            setSelectedIndex(prev => prev === index ? null : index);
          }}
        />
        {selectedIndex !== null && validData[selectedIndex] && (
          <View style={[styles.tooltip, { backgroundColor: isDark ? '#333' : '#fff', borderColor: colors.border }]}>
            <Text style={[styles.tooltipDate, { color: colors.textSecondary }]}>
              {(() => {
                const d = new Date(validData[selectedIndex].date);
                const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
                return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
              })()}
            </Text>
            <Text style={[styles.tooltipPrice, { color: colors.text }]}>
              €{validData[selectedIndex].price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {selectedIndex > 0 && (() => {
              const diff = validData[selectedIndex].price - validData[selectedIndex - 1].price;
              if (diff === 0) return null;
              return (
                <Text style={{ fontSize: 11, color: diff < 0 ? Palette.accent : Palette.warning, fontWeight: '600' }}>
                  {diff > 0 ? '+' : ''}€{diff.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              );
            })()}
          </View>
        )}
      </Pressable>

      {/* Price history table */}
      <View style={styles.tableContainer}>
        <Text style={[styles.tableTitle, { color: colors.text }]}>Prijsverloop</Text>
        <View style={[styles.table, { borderColor: colors.border }]}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Datum</Text>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Prijs</Text>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Verschil</Text>
          </View>
          {validData.slice(-5).reverse().map((item, index, arr) => {
            const prevPrice = index < arr.length - 1 ? arr[index + 1].price : item.price;
            const change = item.price - prevPrice;
            const roundedChange = Math.round(change * 10) / 10;
            const isChangeDown = change < 0;
            const date = new Date(item.date);
            const roundedItemPrice = Math.round(item.price * 10) / 10;
            
            return (
              <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableCell, { color: colors.text }]}>
                  {date.getDate()} {['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][date.getMonth()]}
                </Text>
                <Text style={[styles.tableCellPrice, { color: colors.text }]}>
                  €{roundedItemPrice.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </Text>
                {index > 0 && (
                  <Text style={[
                    styles.tableCellChange, 
                    { color: change < 0 ? Palette.accent : change > 0 ? Palette.warning : colors.textSecondary }
                  ]}>
                    {change === 0 ? '-' : `${roundedChange > 0 ? '+' : ''}€${roundedChange.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  currentPriceLabel: {
    fontSize: 11,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  changeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  changeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  changeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  lowestBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  lowestText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  chartContainer: {
    marginVertical: Spacing.sm,
    marginLeft: -50,
  },
  chart: {
    marginVertical: 8,
    borderRadius: Radius.md,
  },
  overlayLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  overlayLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  overlayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  overlayText: {
    fontSize: 10,
    fontWeight: '500',
  },
  tableContainer: {
    marginTop: Spacing.md,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  table: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
  },
  tableCellPrice: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  tableCellChange: {
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '500',
  },
  tooltip: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    gap: 2,
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  tooltipPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
});
