import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { LiquidScreen } from '@/components/liquid-screen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function VerificatieScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const router = useRouter();
  const { user, emailVerified, sendVerificationEmail, verifyCode, refreshUser, signOut } = useAuth();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    try {
      await sendVerificationEmail(emailParam ?? undefined);
      setResendDone(true);
      setResendCooldown(30);
    } catch {
      setError('Kon de e-mail niet opnieuw versturen. Probeer het later opnieuw.');
    } finally {
      setResendLoading(false);
    }
  }, [sendVerificationEmail, emailParam, resendCooldown, resendLoading]);

  const handleVerifyCode = useCallback(async () => {
    const email = user?.email ?? emailParam ?? '';

    if (!verificationCode.trim()) {
      setError('Voer de verificatiecode in.');
      return;
    }
    if (!email) {
      setError('Geen e-mailadres gevonden.');
      return;
    }
    setVerifyLoading(true);
    setError('');
    try {
      await verifyCode(email.toLowerCase(), verificationCode.trim());
      setError('');
      await refreshUser();
      router.replace('/(auth)/profiel-instellen');
    } catch (e: any) {
      setError(e?.message ?? 'Ongeldige of verlopen verificatiecode.');
    } finally {
      setVerifyLoading(false);
    }
  }, [verificationCode, user, emailParam, verifyCode, refreshUser, router]);

  const handleCheckVerification = useCallback(async () => {
    setCheckLoading(true);
    setError('');
    try {
      await refreshUser();
      if (!emailVerified) {
        setError('Je e-mail is nog niet geverifieerd. Voer de code uit de e-mail in.');
      }
    } catch {
      setError('Kon de verificatiestatus niet controleren.');
    } finally {
      setCheckLoading(false);
    }
  }, [refreshUser, emailVerified]);

  const email = user?.email ?? emailParam ?? '';

  return (
    <LiquidScreen style={styles.root}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
        <Text style={[styles.backArrow, { color: colors.text }]}>‹</Text>
      </Pressable>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: Palette.primary + '18' }]}>
          <Text style={styles.icon}>✉️</Text>
        </View>

        {/* Tekst */}
        <Text style={[styles.title, { color: colors.text }]}>Verifieer je e-mail</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We hebben een verificatiecode gestuurd naar:
        </Text>
        <Text style={[styles.emailText, { color: colors.text }]}>{email}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Voer de 6-cijferige code in om je account te activeren.
        </Text>

        {/* Code input */}
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="123456"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            returnKeyType="done"
            onSubmitEditing={handleVerifyCode}
          />
        </View>

        {/* Verifieer knop */}
        <Pressable
          onPress={handleVerifyCode}
          disabled={verifyLoading}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: Palette.primary },
            pressed && styles.pressed,
          ]}
        >
          {verifyLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Verifieer met code</Text>
          )}
        </Pressable>

        {/* Fout- of succesmelding */}
        {error ? (
          <View style={[styles.alertBox, { backgroundColor: Palette.danger + '18' }]}>
            <Text style={[styles.alertText, { color: Palette.danger }]}>{error}</Text>
          </View>
        ) : null}
        {resendDone && !error ? (
          <View style={[styles.alertBox, { backgroundColor: Palette.accent + '18' }]}>
            <Text style={[styles.alertText, { color: Palette.accent }]}>
              Verificatiemail opnieuw verzonden!
            </Text>
          </View>
        ) : null}

        {/* Al geverifieerd knop */}
        <Pressable
          onPress={handleCheckVerification}
          disabled={checkLoading}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: Palette.primary },
            pressed && styles.pressed,
          ]}
        >
          {checkLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Ik heb geverifieerd</Text>
          )}
        </Pressable>

        {/* Opnieuw versturen */}
        <Pressable
          onPress={handleResend}
          disabled={resendLoading}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          {resendLoading ? (
            <ActivityIndicator color={Palette.primary} />
          ) : (
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              E-mail opnieuw versturen
            </Text>
          )}
        </Pressable>

        {/* Naar inloggen */}
        <Pressable
          onPress={() => router.replace('/(auth)/inloggen')}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: Palette.primary, marginTop: Spacing.md },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>Naar inloggen</Text>
        </Pressable>

        {/* Uitloggen */}
        <Pressable onPress={signOut} style={styles.linkBtn}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            Uitloggen en ander account gebruiken
          </Text>
        </Pressable>
      </View>
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { position: 'absolute', left: 16, top: 50, zIndex: 10 },
  backArrow: { fontSize: 32, fontWeight: '300' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 36 },

  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emailText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 200,
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
  },

  alertBox: { borderRadius: Radius.sm, padding: Spacing.sm + 2, alignSelf: 'stretch' },
  alertText: { fontSize: 14, textAlign: 'center' },

  primaryBtn: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  secondaryBtn: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '500' },

  linkBtn: { paddingVertical: Spacing.xs },
  linkText: { fontSize: 13, textAlign: 'center' },

  pressed: { opacity: 0.75 },
});
