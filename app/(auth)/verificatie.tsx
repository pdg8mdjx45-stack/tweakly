import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function VerificatieScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const { user, emailVerified, sendVerificationEmail, refreshUser, signOut } = useAuth();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResend = useCallback(async () => {
    setResendLoading(true);
    setError('');
    try {
      await sendVerificationEmail(emailParam ?? undefined);
      setResendDone(true);
    } catch {
      setError('Kon de e-mail niet opnieuw versturen. Probeer het later opnieuw.');
    } finally {
      setResendLoading(false);
    }
  }, [sendVerificationEmail]);

  const handleCheckVerification = useCallback(async () => {
    setCheckLoading(true);
    setError('');
    try {
      await refreshUser();
      // refreshUser updates emailVerified in auth context → _layout nav guard navigates to tabs
      // If still not verified, show error
      if (!emailVerified) {
        setError('Je e-mail is nog niet geverifieerd. Klik op de link in de mail.');
      }
    } catch {
      setError('Kon de verificatiestatus niet controleren.');
    } finally {
      setCheckLoading(false);
    }
  }, [refreshUser, user]);

  const email = user?.email ?? emailParam ?? '';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: Palette.primary + '18' }]}>
          <Text style={styles.icon}>✉️</Text>
        </View>

        {/* Tekst */}
        <Text style={[styles.title, { color: colors.text }]}>Verifieer je e-mail</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We hebben een verificatielink gestuurd naar:
        </Text>
        <Text style={[styles.emailText, { color: colors.text }]}>{email}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Klik op de link in de e-mail om je account te activeren. Controleer ook je spammap.
        </Text>

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

        {/* Uitloggen */}
        <Pressable onPress={signOut} style={styles.linkBtn}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            Uitloggen en ander account gebruiken
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 36 },

  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emailText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },

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
