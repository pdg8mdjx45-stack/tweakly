import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addAlert } from '@/services/alerts-store';
import { getAllProducts, type Product } from '@/services/product-db';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function PrijsAlertModal() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllProducts()
      .then(products => {
        if (cancelled) return;
        const first = products[0] ?? null;
        setSelectedProduct(first);
        if (first) setTargetPrice(String(Math.floor(first.currentPrice * 0.9)));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSave() {
    if (!selectedProduct || !isValidPrice) return;
    addAlert({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      targetPrice: enteredPrice,
      currentPrice: selectedProduct.currentPrice,
      originalPrice: selectedProduct.originalPrice,
    }).then(() => router.dismiss());
  }

  const currentLowest = selectedProduct?.lowestPrice ?? 0;
  const enteredPrice = parseFloat(targetPrice.replace(',', '.'));
  const isValidPrice = !!selectedProduct && !isNaN(enteredPrice) && enteredPrice > 0;
  const isBelowLowest = isValidPrice && enteredPrice < currentLowest;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.dismiss()} hitSlop={12}>
          <Text style={[styles.cancel, { color: colors.tint }]}>Annuleren</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Prijsalert</Text>
        <Pressable onPress={handleSave} disabled={!isValidPrice} hitSlop={12}>
          <Text style={[styles.save, { color: isValidPrice ? colors.tint : colors.border }]}>
            Opslaan
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      ) : !selectedProduct ? (
        <View style={styles.loadingBox}>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Geen productgegevens beschikbaar.
          </Text>
        </View>
      ) : (
      <View style={styles.content}>
        <View style={styles.group}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRODUCT</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.productName, { color: colors.text }]}>{selectedProduct.name}</Text>
            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Huidige prijs</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>
                €{selectedProduct.currentPrice.toLocaleString('nl-NL')}
              </Text>
            </View>
            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Laagste ooit</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>
                €{selectedProduct.lowestPrice.toLocaleString('nl-NL')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DOELPRIJS</Text>
          <View style={[styles.inputCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.euro, { color: colors.textSecondary }]}>€</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.border}
            />
          </View>
          {isBelowLowest && (
            <Text style={[styles.hint, { color: Palette.warning }]}>
              Dit is lager dan de laagste bekende prijs (€{currentLowest})
            </Text>
          )}
          {isValidPrice && !isBelowLowest && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              De alert wordt opgeslagen. Controleer regelmatig via "Prijsalerts" of de prijs is gedaald.
            </Text>
          )}
        </View>

        <View style={styles.group}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HOE WERKT HET?</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.methodRow}>
              <View style={[styles.methodDot, { backgroundColor: Palette.primary }]} />
              <Text style={[styles.methodText, { color: colors.text }]}>Alert wordt lokaal opgeslagen</Text>
            </View>
            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.methodRow}>
              <View style={[styles.methodDot, { backgroundColor: Palette.primary }]} />
              <Text style={[styles.methodText, { color: colors.text }]}>Tik op "Prijs bekijken" bij Prijsalerts</Text>
            </View>
            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.methodRow}>
              <View style={[styles.methodDot, { backgroundColor: Palette.primary }]} />
              <Text style={[styles.methodText, { color: colors.text }]}>Bekijk actuele prijs via Google Shopping</Text>
            </View>
          </View>
        </View>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancel: {
    fontSize: 17,
    fontWeight: '400',
  },
  save: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  group: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  infoCard: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  priceLabel: {
    fontSize: 16,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    padding: Spacing.md,
    paddingBottom: 13,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  euro: {
    fontSize: 32,
    fontWeight: '300',
  },
  input: {
    flex: 1,
    fontSize: 40,
    fontWeight: '300',
    paddingVertical: 0,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: Spacing.xs,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  methodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  methodText: {
    fontSize: 16,
    flex: 1,
  },
});
