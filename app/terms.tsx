import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { LiquidScreen } from '@/components/liquid-screen';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TermsScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Algemene Voorwaarden</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>Laatst bijgewerkt: 15 maart 2026</Text>

        <Text style={[styles.text, { color: colors.text }]}>
          Door Tweakly te downloaden of te gebruiken, gaat u akkoord met deze algemene voorwaarden. Als u niet akkoord gaat met deze voorwaarden, gebruik de app dan niet.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>1. Over Tweakly</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Tweakly is een prijsvergelijkingsapp waarmee u producten kunt vergelijken, prijzen kunt volgen en aanbiedingen kunt ontdekken bij verschillende webshops.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>2. Gebruik van de app</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          U gaat akkoord om:{'\n'}
          {'\n'}• De app alleen te gebruiken voor legale doeleinden{'\n'}
          • Geen pogingen te ondernemen om de app te hacken of te misbruiken{'\n'}
          • Geen valse of misleidende informatie te verstrekken{'\n'}
          • Geen rechten van derden te schenden
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>3. Account en beveiliging</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          U bent verantwoordelijk voor:{'\n'}
          {'\n'}• Het geheim houden van uw accountgegevens{'\n'}
          • Alle activiteiten die plaatsvinden onder uw account{'\n'}
          • Het onmiddellijk melden van ongeautoriseerd gebruik
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>4. Prijzen en beschikbaarheid</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Prijzen getoond in Tweakly worden automatisch opgehaald van externe webshops. Hoewel we streven naar nauwkeurigheid, kunnen prijzen en beschikbaarheid variëren. Wij zijn niet verantwoordelijk voor eventuele onjuiste prijzen of uitverkochte producten.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>5. Affiliate links</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Tweakly kan affiliate links bevatten. Wanneer u via deze links een aankoop doet, ontvangen wij een commissie. Dit heeft geen invloed op de prijs die u betaalt.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>6. Intellectueel eigendom</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Alle content in Tweakly, inclusief logo's, tekst, afbeeldingen en software, is ons eigendom of van onze licentiegevers en is beschermd door auteursrecht en andere intellectuele eigendomsrechten.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>7. Disclaimer</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          DE APP WORDT GELEVERD "ZOALS IS" ZONDER ENIGE GARANTIES. WIJ GARANDEREN NIET DAT DE APP ERRORFREE OF ONONDERBROKEN ZAL FUNCTIONEREN. UW GEBRUIK VAN DE APP IS OP EIGEN RISICO.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>8. Beperking van aansprakelijkheid</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          WIJ ZIJN NIET AANSPRAKELIJK VOOR INDIRECTE, INCIDENTELE OF GEVOLGSCHADE VOORTVLOEIEND UIT UW GEBRUIK VAN DE APP. DIT INCLUDEDEERT GEMISDE WINST, VERLIES VAN DATA OF ANDERE VERLIEZEN.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>9. Leeftijdsrestrictie</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          U moet minimaal 16 jaar oud zijn om een account aan te maken en de app te gebruiken.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>10. Wijzigingen</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We behouden ons het recht voor om deze voorwaarden op elk moment te wijzigen. Belangrijke wijzigingen zullen via de app worden gecommuniceerd. Door de app te blijven gebruiken na wijzigingen, gaat u akkoord met de nieuwe voorwaarden.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>11. Contact</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Voor vragen over deze voorwaarden:{'\n'}
          {'\n'}E-mail: tweakly.help@hotmail.com{'\n'}
          Website: https://tweakly.netlify.app/voorwaarden.html
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
  content: { padding: 20 },
  date: { fontSize: 13, marginBottom: 24 },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  text: { fontSize: 15, lineHeight: 22 },
});
