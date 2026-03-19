import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ProfielInstellenScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const router = useRouter();
  const { updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const parsedAge = age.trim() ? parseInt(age.trim(), 10) : null;

    if (!trimmedName) {
      setError('Voer je naam in.');
      return;
    }
    if (parsedAge !== null && (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
      setError('Voer een geldige leeftijd in.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await updateProfile({ displayName: trimmedName, age: parsedAge });
      router.replace('/(tabs)');
    } catch {
      setError('Kon profiel niet opslaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  }, [name, age, updateProfile, router]);

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: Palette.primary + '18' }]}>
          <Text style={styles.icon}>👤</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Stel je profiel in</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Hoe mogen we je noemen? Je kunt dit later altijd aanpassen.
        </Text>

        {/* Naam */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>NAAM</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Jouw naam"
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              autoCapitalize="words"
              maxLength={40}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Leeftijd */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>LEEFTIJD (optioneel)</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={age}
              onChangeText={setAge}
              placeholder="bijv. 25"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={[styles.alertBox, { backgroundColor: Palette.danger + '18' }]}>
            <Text style={[styles.alertText, { color: Palette.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Opslaan */}
        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: Palette.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Opslaan en doorgaan</Text>
          )}
        </Pressable>

        {/* Overslaan */}
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Overslaan</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
    flexGrow: 1,
  },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 36 },

  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },

  fieldWrap: {
    alignSelf: 'stretch',
    gap: Spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
  },
  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
  },

  alertBox: {
    alignSelf: 'stretch',
    borderRadius: Radius.sm,
    padding: Spacing.sm + 2,
  },
  alertText: { fontSize: 14, textAlign: 'center' },

  primaryBtn: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  skipBtn: { paddingVertical: Spacing.sm },
  skipText: { fontSize: 14 },
});
