import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/hooks/use-auth';
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

export default function InloggenScreen() {
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
    <View style={styles.root}>
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
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Image
              source={require('@/assets/images/logo-display.png')}
              style={styles.logoImg}
              resizeMode="contain"
              tintColor={Palette.primary}
            />
            <Text style={styles.title}>Welkom terug</Text>
            <Text style={styles.subtitle}>Log in op je account</Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-MAILADRES</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="jouw@email.nl"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            {/* Wachtwoord */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WACHTWOORD</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Wachtwoord"
                  placeholderTextColor="#8E8E93"
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
                  <Text style={styles.eyeText}>
                    {showPassword ? 'Verberg' : 'Toon'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Foutmelding */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Inloggen knop */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
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
              <Text style={styles.linkText}>Wachtwoord vergeten?</Text>
            </Pressable>
          </View>

          {/* Registreren */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Nog geen account?</Text>
            <Pressable
              onPress={() => router.replace('/(auth)/registreren')}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>Account aanmaken</Text>
            </Pressable>

            {/* Legal links */}
            <View style={styles.legalLinks}>
              <Text style={styles.legalText}>
                Door in te loggen ga je akkoord met onze{' '}
                <Link href="/terms" asChild>
                  <Text style={styles.legalLink}>Algemene Voorwaarden</Text>
                </Link>{' '}
                en{' '}
                <Link href="/privacy" asChild>
                  <Text style={styles.legalLink}>Privacybeleid</Text>
                </Link>
                .
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 80,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },

  header: { alignItems: 'center', gap: Spacing.sm },
  backBtn: { position: 'absolute', left: 0, top: 30, zIndex: 10 },
  backArrow: { fontSize: 32, fontWeight: '300', color: '#1C1C1E' },
  logoImg: { width: 80, height: 80 },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#8E8E93' },

  // ── Form card ────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  // ── Input fields ─────────────────────────────────────────────────────────
  fieldGroup: { gap: Spacing.xs },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, paddingHorizontal: 4, color: '#8E8E93' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  inputFlex: { flex: 1, backgroundColor: 'transparent' },
  eyeBtn: { paddingHorizontal: Spacing.md },
  eyeText: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },

  errorText: { fontSize: 14, textAlign: 'center', color: '#FF3B30' },

  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.xs,
    backgroundColor: Palette.primaryVivid,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  linkBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  linkText: { fontSize: 14, fontWeight: '500', color: Palette.primaryVivid },

  pressed: { opacity: 0.75 },

  footer: { gap: Spacing.md, alignItems: 'center' },
  footerText: { fontSize: 14, color: '#8E8E93' },
  secondaryBtn: {
    width: '100%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Palette.primary,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: Palette.primary },

  legalLinks: { marginTop: Spacing.md },
  legalText: { fontSize: 11, textAlign: 'center', lineHeight: 16, color: '#8E8E93' },
  legalLink: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline', color: Palette.primary },
});
