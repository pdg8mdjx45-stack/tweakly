import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
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

export default function TelefoonScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const { signInWithPhone, verifyPhoneCode } = useAuth();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Formatteer telefoonnummer met landcode
  const formatPhoneNumber = (input: string) => {
    // Verwijder alle niet-cijfers
    const cleaned = input.replace(/\D/g, '');
    // Voeg +31 toe als het Nederlands nummer is (10 cijfers)
    if (cleaned.length === 10) {
      return `+31${cleaned.slice(1)}`;
    }
    return cleaned;
  };

  const handleSendCode = useCallback(async () => {
    if (!phoneNumber.trim()) {
      setError('Vul je telefoonnummer in.');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber.trim());
    
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPhone(formattedPhone);
      setVerificationId(result.verificationId);
      setStep('code');
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      setError(authErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, signInWithPhone]);

  const handleVerifyCode = useCallback(async () => {
    if (!verificationCode.trim()) {
      setError('Vul de verificatiecode in.');
      return;
    }
    if (!verificationId) {
      setError('Verificatie-ID ontbreekt. Begin opnieuw.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verifyPhoneCode(verificationId, verificationCode.trim());
      // onAuthStateChanged in _layout.tsx handelt de redirect af
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      setError(authErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }, [verificationCode, verificationId, verifyPhoneCode]);

  const handleResendCode = useCallback(async () => {
    setVerificationCode('');
    setStep('phone');
  }, []);

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
          <Image source={require('@/assets/images/icon.png')} style={styles.logoImg} resizeMode="contain" />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'phone' ? 'Inloggen met telefoonnummer' : 'Voer verificatiecode in'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              {/* Telefoonnummer */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>TELEFOONNUMMER</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="+31 6 12345678"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                We sturen een verificatiecode naar je telefoon.
              </Text>
            </>
          ) : (
            <>
              {/* Verificatiecode */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>VERIFICATIECODE</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="123456"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                  />
                </View>
              </View>

              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                De code is 6 cijfers. Controleer je SMS.
              </Text>

              <Pressable onPress={handleResendCode} style={styles.linkBtn}>
                <Text style={[styles.linkText, { color: Palette.primary }]}>
                  Code opnieuw sturen
                </Text>
              </Pressable>
            </>
          )}

          {/* Foutmelding */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: Palette.danger + '18' }]}>
              <Text style={[styles.errorText, { color: Palette.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Verzend/Verifieer knop */}
          <Pressable
            onPress={step === 'phone' ? handleSendCode : handleVerifyCode}
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
              <Text style={styles.primaryBtnText}>
                {step === 'phone' ? 'Code sturen' : 'Verifiëren'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Terug naar inloggen */}
        <View style={styles.footer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Of log in met
          </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/inloggen')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: Palette.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: Palette.primary }]}>
              E-mail en wachtwoord
            </Text>
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

  hint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

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
