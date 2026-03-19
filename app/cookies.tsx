import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme-context';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function CookieScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Link href="/" asChild>
          <Pressable style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </Link>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cookiebeleid</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>Laatst bijgewerkt: 15 maart 2026</Text>

        <Text style={[styles.text, { color: colors.text }]}>
          Dit cookiebeleid legt uit wat cookies zijn en hoe Tweakly deze gebruikt.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>1. Wat zijn cookies?</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Cookies zijn kleine tekstbestanden die op uw apparaat worden opgeslagen wanneer u websites of apps gebruiken. Ze helpen om uw voorkeuren te onthouden en de app te verbeteren.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>2. Welke cookies gebruiken we?</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Tweakly gebruikt de volgende soorten cookies:{'\n\n'}
          <Text style={{ fontWeight: '700' }}>Noodzakelijke cookies</Text>{'\n'}
          Deze zijn essentieel voor de werking van de app. Ze helpen bij authenticatie en het beveiligen van uw account.{'\n\n'}
          <Text style={{ fontWeight: '700' }}>Functionele cookies</Text>{'\n'}
          Deze onthouden uw voorkeuren zoals thema-instellingen.{'\n\n'}
          <Text style={{ fontWeight: '700' }}>Analyse cookies</Text>{'\n'}
          Anonieme informatie over hoe u de app gebruikt, zodat we deze kunnen verbeteren.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>3. Cookies uitschakelen</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          U kunt cookies uitschakelen via uw apparaatinstellingen. Houd er rekening mee dat het uitschakelen van sommige cookies de functionaliteit van de app kan beperken.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>4. Consent</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Bij uw eerste gebruik van de app wordt u gevraagd om akkoord te gaan met het gebruik van cookies. U kunt uw voorkeuren op elk moment wijzigen in de app-instellingen.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>5. Contact</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Voor vragen over dit cookiebeleid:{'\n'}
          {'\n'}E-mail: alexander.ballet@hotmail.com{'\n'}
          Website: https://tweakly.netlify.app/cookies.html
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
