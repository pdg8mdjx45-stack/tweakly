import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function PrivacyScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <Pressable style={styles.backBtn} hitSlop={12} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacybeleid</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>Laatst bijgewerkt: 15 maart 2026</Text>

        <Text style={[styles.text, { color: colors.text }]}>
          Dit privacybeleid beschrijft hoe Tweakly ("wij", "ons" of "onze") uw persoonlijke informatie verzamelt, gebruikt en deelt wanneer u onze mobiele applicatie gebruikt.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>1. Gegevens die we verzamelen</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Wanneer u onze app gebruikt, kunnen wij de volgende gegevens verzamelen:{'\n'}
          {'\n'}• E-mailadres en wachtwoord bij accountregistratie{'\n'}
          • Profielinformatie die u verstrekt (naam, profielfoto){'\n'}
          • Apparaatinformatie (apparaattype, besturingssysteem){'\n'}
          • Gebruiksgegevens (hoe u de app gebruikt)
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>2. Hoe we uw gegevens gebruiken</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We gebruiken uw gegevens om:{'\n'}
          {'\n'}• Uw account te beheren en te beveiligen{'\n'}
          • Onze diensten te leveren en te verbeteren{'\n'}
          • Met u te communiceren over updates en promoties{'\n'}
          • Frauduleuze activiteiten te voorkomen
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>3. Gegevensdeling</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Wij verkopen uw persoonlijke informatie niet. We kunnen uw gegevens delen met:{'\n'}
          {'\n'}• Supabase (onze backend-provider) voor auth en database{'\n'}
          • Externe diensten voor analyse (geanonimiseerd){'\n'}
          • Wettelijke autoriteiten wanneer vereist
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>4. Uw rechten</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          U heeft het recht om:{'\n'}
          {'\n'}• Uw persoonlijke gegevens in te zien{'\n'}
          • Uw gegevens te corrigeren{'\n'}
          • Uw account te verwijderen{'\n'}
          • Bezwaar te maken tegen bepaalde verwerkingen{'\n'}
          {'\n'}Om deze rechten uit te oefenen, neem contact met ons op.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>5. Gegevensbeveiliging</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We nemen redelijke maatregelen om uw persoonlijke informatie te beschermen.Uw wachtwoorden worden encrypted opgeslagen en we gebruiken veilige verbindingen (SSL) voor gegevensoverdracht.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>6. Bewaring van gegevens</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We bewaren uw persoonlijke informatie zolang uw account actief is of zolang nodig is om diensten te verlenen. U kunt op elk moment vragen om uw account en gerelateerde gegevens te verwijderen.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>7. Contact</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Als u vragen heeft over dit privacybeleid, kunt u contact met ons opnemen via:{'\n'}
          {'\n'}E-mail: tweakly.help@hotmail.com{'\n'}
          Website: https://tweakly.netlify.app/privacy.html
        </Text>
      </ScrollView>
    </View>
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
