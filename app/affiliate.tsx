import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { LiquidScreen } from '@/components/liquid-screen';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AffiliateScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const router = useRouter();

  return (
    <LiquidScreen style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <Pressable style={styles.backBtn} hitSlop={12} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Affiliate Disclosure</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>Laatste update: 18 maart 2026</Text>

        <View style={[styles.summaryBox, { backgroundColor: colors.surface ?? 'rgba(255,149,0,0.08)', borderColor: 'rgba(255,149,0,0.25)' }]}>
          <Text style={[styles.summaryTitle, { color: '#FF9500' }]}>Belangrijke mededeling</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            Tweakly bevat affiliate-links naar externe webshops. Wanneer u via zo'n link een product aanschaft, ontvangt Tweakly mogelijk een kleine vergoeding van de betreffende webshop.{'\n'}
            {'\n'}U betaalt nooit meer via een affiliate-link. De commissie wordt betaald door de webshop, niet door u. De rangschikking van producten en winkels is altijd gebaseerd op prijs — niet op de hoogte van een commissie.
          </Text>
        </View>

        <Text style={[styles.heading, { color: colors.text }]}>1. Wat zijn affiliate-links?</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Affiliate-links zijn speciale trackinglinks die bijhouden of een bezoeker via Tweakly een aankoop doet bij een webshop. Als dat het geval is, ontvangt Tweakly een kleine commissie (doorgaans 1–5% van het aankoopbedrag).{'\n'}
          {'\n'}Dit is een gebruikelijke manier voor prijsvergelijkingsdiensten om hun service kosteloos aan te bieden.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>2. Onze affiliate partners</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Tweakly werkt samen met de volgende webshops en affiliate-netwerken:{'\n'}
          {'\n'}• Bol.com — via Bol.com partnerprogramma / Daisycon{'\n'}
          • Coolblue — via Daisycon{'\n'}
          • MediaMarkt — via Daisycon{'\n'}
          • Amazon.nl — via Amazon Associates{'\n'}
          • Alternate — via Daisycon / TradeTracker{'\n'}
          • Megekko — via affiliate netwerk
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>3. Onze principes</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          • Prijs staat altijd centraal: winkels worden gesorteerd van laag naar hoog op basis van prijs, niet op commissie.{'\n'}
          {'\n'}• Geen meerkosten: u betaalt nooit meer via een affiliate-link. De commissie wordt door de webshop betaald.{'\n'}
          {'\n'}• Transparante markering: affiliate-links worden gemarkeerd conform de vereisten van ACM en betrokken affiliate-netwerken.{'\n'}
          {'\n'}• Onafhankelijke aanbevelingen: productreviews en aanbevelingen zijn redactioneel en niet beïnvloed door commissiehoogte.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>4. Wettelijke basis</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Deze disclosure is vereist door:{'\n'}
          {'\n'}• ACM richtlijnen (NL) — Autoriteit Consument & Markt{'\n'}
          • Deelnamevoorwaarden van Daisycon, Amazon Associates en andere netwerken{'\n'}
          • IAB Europe Transparency Framework
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>5. Contact</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Vragen over onze affiliate-relaties?{'\n'}
          {'\n'}Alexander Ballet{'\n'}
          Zolder, België{'\n'}
          E-mail: tweakly.help@hotmail.com
        </Text>
      </ScrollView>
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  placeholder: { width: 32 },
  content: { padding: 20, paddingBottom: 48 },
  date: { fontSize: 13, marginBottom: 20 },
  summaryBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  summaryText: { fontSize: 14, lineHeight: 21 },
  heading: { fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  text: { fontSize: 14, lineHeight: 22 },
});
