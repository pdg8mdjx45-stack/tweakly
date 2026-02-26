import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function WachtwoordVergetenScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const { resetPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = useCallback(async () => {
    if (!email.trim()) {
      setError('Vul je e-mailadres in.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      setError(authErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }, [email, resetPassword]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Terug knop */}
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={[styles.backText, { color: Palette.primary }]}>← Terug</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Wachtwoord vergeten</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Vul je e-mailadres in en we sturen je een resetlink.
          </Text>
        </View>

        {sent ? (
          /* Succes staat */
          <View style={styles.successBlock}>
            <View style={[styles.successIconWrap, { backgroundColor: Palette.accent + '18' }]}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>E-mail verzonden!</Text>
            <Text style={[styles.successBody, { color: colors.textSecondary }]}>
              Controleer je inbox (en spammap) voor de resetlink.
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/inloggen')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: Palette.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Terug naar inloggen</Text>
            </Pressable>
          </View>
        ) : (
          /* Formulier */
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>E-MAILADRES</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="jouw@email.nl"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: Palette.danger + '18' }]}>
                <Text style={[styles.errorText, { color: Palette.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleReset}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: Palette.primary },
                pressed && styles.pressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Resetlink versturen</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },

  backBtn: { alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '500' },

  header: { gap: Spacing.sm },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 22 },

  form: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, paddingHorizontal: 4 },
  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: { paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 16 },

  errorBox: { borderRadius: Radius.sm, padding: Spacing.sm + 2 },
  errorText: { fontSize: 14, textAlign: 'center' },

  primaryBtn: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.75 },

  successBlock: { alignItems: 'center', gap: Spacing.md },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: { fontSize: 32, color: Palette.accent },
  successTitle: { fontSize: 22, fontWeight: '700' },
  successBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
