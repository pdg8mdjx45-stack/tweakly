import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
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
        {/* Header */}
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
          <Text style={styles.title}>Account aanmaken</Text>
          <Text style={styles.subtitle}>Maak een nieuw account aan</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
                placeholder="Minimaal 6 tekens"
                placeholderTextColor="#8E8E93"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? 'Verberg' : 'Toon'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Wachtwoord bevestigen */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>WACHTWOORD BEVESTIGEN</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Herhaal je wachtwoord"
                placeholderTextColor="#8E8E93"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Pressable onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showConfirmPassword ? 'Verberg' : 'Toon'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Foutmelding */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Registreer knop */}
          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Account aanmaken</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            Na registratie ontvang je een verificatiemail. Klik op de link om je account te
            activeren.
          </Text>
        </View>

        {/* Inloggen */}
        <View style={styles.footer}>
          <View style={styles.dividerLine} />
          <Text style={styles.footerText}>Al een account?</Text>
          <Pressable
            onPress={() => router.replace('/(auth)/inloggen')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>Inloggen</Text>
          </Pressable>
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

  form: { gap: Spacing.md },
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

  pressed: { opacity: 0.75 },

  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, color: '#8E8E93' },

  footer: { gap: Spacing.md, alignItems: 'center' },
  dividerLine: { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.08)' },
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
});
