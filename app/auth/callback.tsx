import { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme-context';
import { supabase } from '@/services/supabase';

export default function AuthCallbackScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          setError(error.message);
          return;
        }

        if (data.session) {
          router.replace('/(tabs)');
        } else {
          setError('Geen sessie gevonden');
        }
      } catch (e) {
        console.error('Callback error:', e);
        setError('Er is iets misgegaan');
      } finally {
        setLoading(false);
      }
    }

    handleCallback();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>Bezig met inloggen...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: '#ff3b30' }]}>{error}</Text>
        <Link href="/(auth)/inloggen" asChild>
          <Text style={[styles.link, { color: Colors.light.primary }]}>Terug naar inloggen</Text>
        </Link>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
  },
  error: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
