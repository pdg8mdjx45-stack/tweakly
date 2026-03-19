import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function RegistrerenScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = useCallback(async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setError('Vul alle velden in.');
      return;
    }
    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      router.replace({ pathname: '/(auth)/verificatie', params: { email: email.trim() } });
    } catch (e: any) {
      const code = e?.code ?? '';
      const message = e?.message ?? 'Er is een fout opgetreden';
      console.log('Signup error:', e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, signUp]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.text }]}>‹</Text>
          </Pressable>
          <Image source={require('@/assets/images/icon.png')} style={styles.logoImg} resizeMode="contain" />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Maak een nieuw account aan
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>E-MAILADRES</Text>
            <Pressable style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                returnKeyType="next"
              />
            </Pressable>
          </View>

          {/* Wachtwoord */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>WACHTWOORD</Text>
            <Pressable style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, styles.inputFlex, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimaal 6 tekens"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Text style={[styles.eyeText, { color: colors.textSecondary }]}>
                  {showPassword ? 'Verberg' : 'Toon'}
                </Text>
              </Pressable>
            </Pressable>
          </View>

          {/* Wachtwoord bevestigen */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>WACHTWOORD BEVESTIGEN</Text>
            <Pressable style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, styles.inputFlex, { color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Herhaal je wachtwoord"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Pressable onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Text style={[styles.eyeText, { color: colors.textSecondary }]}>
                  {showConfirmPassword ? 'Verberg' : 'Toon'}
                </Text>
              </Pressable>
            </Pressable>
          </View>

          {/* Foutmelding */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: Palette.danger + '18' }]}>
              <Text style={[styles.errorText, { color: Palette.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Registreer knop */}
          <Pressable
            onPress={handleRegister}
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
              <Text style={styles.primaryBtnText}>Account aanmaken</Text>
            )}
          </Pressable>

          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            Na registratie ontvang je een verificatiemail. Klik op de link om je account te
            activeren.
          </Text>
        </View>

        {/* Inloggen */}
        <View style={styles.footer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Al een account?
          </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/inloggen')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: Palette.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: Palette.primary }]}>Inloggen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 80,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },

  header: { alignItems: 'center', gap: Spacing.sm },
  backBtn: { position: 'absolute', left: 0, top: 30, zIndex: 10 },
  backArrow: { fontSize: 32, fontWeight: '300' },
  logoImg: { width: 80, height: 80 },
  subtitle: { fontSize: 16 },

  form: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, paddingHorizontal: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: { paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 16 },
  inputFlex: { flex: 1 },
  eyeBtn: { paddingHorizontal: Spacing.md },
  eyeText: { fontSize: 13, fontWeight: '500' },

  errorBox: { borderRadius: Radius.sm, padding: Spacing.sm + 2 },
  errorText: { fontSize: 14, textAlign: 'center' },

  primaryBtn: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  googleBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  googleIcon: {
    fontSize: 20,
  },
  googleBtnText: { fontSize: 16, fontWeight: '500' },

  pressed: { opacity: 0.75 },

  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  footer: { gap: Spacing.md, alignItems: 'center' },
  dividerLine: { width: '100%', height: StyleSheet.hairlineWidth },
  footerText: { fontSize: 14 },
  secondaryBtn: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
});
