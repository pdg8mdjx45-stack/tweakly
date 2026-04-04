import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme-context';
import { supabase } from '@/services/supabase';
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

export default function VerifyScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const router = useRouter();
  const { code, type } = useLocalSearchParams<{ code?: string; type?: string }>();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'recovery'>('loading');
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setMessage('Ontbrekende verificatiecode. De link is mogelijk verlopen of ongeldig.');
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus('error');
        setMessage('De verificatielink is ongeldig of verlopen. Vraag een nieuwe aan.');
        return;
      }

      if (type === 'recovery') {
        setStatus('recovery');
        setMessage('Kies een nieuw wachtwoord voor je account.');
      } else {
        setStatus('success');
        setMessage('Je e-mailadres is succesvol geverifieerd! Je kunt nu inloggen.');
      }
    });
  }, [code, type]);

  const handleSavePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      setMessage('Wachtwoord moet minimaal 6 tekens zijn.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      setMessage('Kon het wachtwoord niet opslaan. Probeer het opnieuw.');
    } else {
      setStatus('success');
      setMessage('Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen.');
    }
  }, [newPassword]);

  const iconColor =
    status === 'success' ? Palette.accent + '18' :
    status === 'error' ? Palette.danger + '18' :
    Palette.primary + '18';

  return (
    <LiquidScreen style={styles.root}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
        <Text style={[styles.backArrow, { color: colors.text }]}>‹</Text>
      </Pressable>
      <View style={styles.content}>
        {/* Status icon */}
        <View style={[styles.iconWrap, { backgroundColor: iconColor }]}>
          {status === 'loading' ? (
            <ActivityIndicator size="large" color={Palette.primary} />
          ) : (
            <Text style={styles.icon}>
              {status === 'success' ? '✓' : status === 'recovery' ? '🔑' : '✕'}
            </Text>
          )}
        </View>

        {/* Titel */}
        <Text style={[styles.title, { color: colors.text }]}>
          {status === 'recovery' ? 'Wachtwoord resetten' :
           status === 'success' ? 'Gelukt!' :
           status === 'error' ? 'Oeps!' :
           'Verifiëren...'}
        </Text>

        {/* Bericht */}
        <Text style={[styles.body, { color: colors.textSecondary }]}>{message}</Text>

        {/* Wachtwoord-reset formulier */}
        {status === 'recovery' && (
          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, styles.inputFlex, { color: colors.text }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nieuw wachtwoord (min. 6 tekens)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSavePassword}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Text style={[styles.eyeText, { color: colors.textSecondary }]}>
                  {showPassword ? 'Verberg' : 'Toon'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleSavePassword}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: Palette.primary },
                pressed && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Wachtwoord opslaan</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Succes-acties */}
        {status === 'success' && (
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.replace('/(auth)/inloggen')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: Palette.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Naar inloggen</Text>
            </Pressable>
          </View>
        )}

        {/* Fout-acties */}
        {status === 'error' && (
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.replace('/(auth)/inloggen')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: Palette.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Naar inloggen</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(auth)/registreren')}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                Nieuw account aanmaken
              </Text>
            </Pressable>
          </View>
        )}

        {status === 'loading' && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Even geduld terwijl we je verzoek verwerken...
          </Text>
        )}
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
  icon: { fontSize: 36, fontWeight: '700' },

  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  form: { width: '100%', gap: Spacing.md, marginTop: Spacing.sm },
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

  actions: { width: '100%', gap: Spacing.sm, marginTop: Spacing.md },

  primaryBtn: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
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

  hint: { fontSize: 13, textAlign: 'center', marginTop: Spacing.md },
  pressed: { opacity: 0.75 },
});
