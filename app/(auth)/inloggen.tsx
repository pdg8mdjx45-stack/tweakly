import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { LiquidScreen } from '@/components/liquid-screen';

function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  return (
    <View style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

function GlassInput({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  return (
    <View style={[styles.glassInput, { backgroundColor: colors.fill, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export default function InloggenScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@onboarding_done').then((val) => {
      if (val !== '1') router.replace('/(auth)/onboarding');
    });
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password) {
      setError('Vul je e-mailadres en wachtwoord in.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      setError(authErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn]);

  return (
    <LiquidScreen style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Text style={[styles.backArrow, { color: colors.text }]}>‹</Text>
            </Pressable>
            <Image
              source={require('@/assets/images/logo-display.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Log in op je account
            </Text>
          </View>

          {/* Form card */}
          <GlassCard>
            <View style={styles.formInner}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>E-MAILADRES</Text>
                <GlassInput>
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
                </GlassInput>
              </View>

              {/* Wachtwoord */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>WACHTWOORD</Text>
                <GlassInput>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.inputFlex, { color: colors.text }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Wachtwoord"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      style={styles.eyeBtn}
                    >
                      <Text style={[styles.eyeText, { color: colors.textSecondary }]}>
                        {showPassword ? 'Verberg' : 'Toon'}
                      </Text>
                    </Pressable>
                  </View>
                </GlassInput>
              </View>

              {/* Foutmelding */}
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: Palette.danger + '18' }]}>
                  <Text style={[styles.errorText, { color: Palette.danger }]}>{error}</Text>
                </View>
              ) : null}

              {/* Inloggen knop */}
              <Pressable
                onPress={handleLogin}
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
                  <Text style={styles.primaryBtnText}>Inloggen</Text>
                )}
              </Pressable>

              {/* Wachtwoord vergeten */}
              <Pressable
                onPress={() => router.push('/(auth)/wachtwoord-vergeten')}
                style={styles.linkBtn}
              >
                <Text style={[styles.linkText, { color: Palette.primary }]}>
                  Wachtwoord vergeten?
                </Text>
              </Pressable>
            </View>
          </GlassCard>

          {/* Registreren */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Nog geen account?
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/registreren')}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: Palette.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: Palette.primary }]}>
                Account aanmaken
              </Text>
            </Pressable>

            {/* Legal links */}
            <View style={styles.legalLinks}>
              <Text style={[styles.legalText, { color: colors.textSecondary }]}>
                Door in te loggen ga je akkoord met onze{' '}
                <Link href="/terms" asChild>
                  <Text style={[styles.legalLink, { color: Palette.primary }]}>
                    Algemene Voorwaarden
                  </Text>
                </Link>{' '}
                en{' '}
                <Link href="/privacy" asChild>
                  <Text style={[styles.legalLink, { color: Palette.primary }]}>
                    Privacybeleid
                  </Text>
                </Link>
                .
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LiquidScreen>
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

  // ── Form card ────────────────────────────────────────────────────────────
  glassCard: {
    borderRadius: Radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  formInner: {
    gap: Spacing.md,
  },

  // ── Input fields ─────────────────────────────────────────────────────────
  glassInput: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  fieldGroup: { gap: Spacing.xs },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, paddingHorizontal: 4 },

  inputRow: { flexDirection: 'row', alignItems: 'center' },
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

  linkBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  linkText: { fontSize: 14, fontWeight: '500' },

  pressed: { opacity: 0.75 },

  footer: { gap: Spacing.md, alignItems: 'center' },
  footerText: { fontSize: 14 },
  secondaryBtn: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },

  legalLinks: { marginTop: Spacing.md },
  legalText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  legalLink: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
});
