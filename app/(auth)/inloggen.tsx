import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
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
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: Palette.primary }]}>tweakly</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Log in op je account
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>E-MAILADRES</Text>
            <Pressable
              style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
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
            <Pressable
              style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
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
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Text style={[styles.eyeText, { color: colors.textSecondary }]}>
                  {showPassword ? 'Verberg' : 'Toon'}
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

        {/* Registreren */}
        <View style={styles.footer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
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
              <Text
                style={[styles.legalLink, { color: Palette.primary }]}
                onPress={() => WebBrowser.openBrowserAsync('https://tweakly.nl/voorwaarden')}
              >
                Algemene Voorwaarden
              </Text>{' '}
              en{' '}
              <Text
                style={[styles.legalLink, { color: Palette.primary }]}
                onPress={() => WebBrowser.openBrowserAsync('https://tweakly.nl/privacy')}
              >
                Privacybeleid
              </Text>
              .
            </Text>
          </View>
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
  logo: { fontSize: 40, fontWeight: '800', letterSpacing: -0.5 },
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

  linkBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  linkText: { fontSize: 14, fontWeight: '500' },

  pressed: { opacity: 0.75 },

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

  legalLinks: { marginTop: Spacing.md },
  legalText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  legalLink: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
});
