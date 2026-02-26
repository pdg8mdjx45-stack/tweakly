/**
 * Auth Context
 * Wraps Supabase Auth en exposeert user-state en auth-methodes.
 * Ondersteunt: e-mail/wachtwoord met e-mailverificatie.
 */

import { supabase } from '@/services/supabase';
import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: (email?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithApple: (identityToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Vertaalt Supabase auth-foutcodes naar Nederlandse meldingen. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Onjuist e-mailadres of wachtwoord.';
    case 'email_not_confirmed':
      return 'Bevestig je e-mailadres voordat je inlogt.';
    case 'user_already_exists':
    case 'user_already_registered':
      return 'Er bestaat al een account met dit e-mailadres.';
    case 'weak_password':
      return 'Wachtwoord moet minimaal 6 tekens zijn.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Te veel pogingen. Probeer het later opnieuw.';
    case 'invalid_email':
      return 'Ongeldig e-mailadres.';
    case 'network_failure':
      return 'Geen verbinding. Controleer je internetverbinding.';
    default:
      return 'Er is een fout opgetreden. Probeer het opnieuw.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    // Haal de huidige sessie op bij het starten
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setEmailVerified(session?.user?.email_confirmed_at != null);
      setLoading(false);
    });

    // Luister naar auth-wijzigingen (inloggen, uitloggen, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setEmailVerified(session?.user?.email_confirmed_at != null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'tweakly://verify?type=signup' },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const sendVerificationEmail = async (email?: string) => {
    const target = email ?? user?.email;
    if (!target) return;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: target,
      options: { emailRedirectTo: 'tweakly://verify?type=signup' },
    });
    if (error) throw error;
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session) {
      setUser(session.user);
      setEmailVerified(session.user.email_confirmed_at != null);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'tweakly://verify?type=recovery',
    });
    if (error) throw error;
  };

  const signInWithApple = async (identityToken: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        emailVerified,
        signIn,
        signUp,
        signOut,
        sendVerificationEmail,
        refreshUser,
        resetPassword,
        signInWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
