/**
 * Auth Context
 * Wraps Supabase Auth en exposeert user-state en auth-methodes.
 * Ondersteunt: e-mail/wachtwoord met e-mailverificatie.
 * Automatisch profile management.
 */

import { supabase } from '@/services/supabase';
import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';


interface ProfileData {
  id: string;
  username: string;
  avatar_url: string;
  displayName: string;
  age: number | null;
  pushEnabled: boolean;
  emailNotifEnabled: boolean;
  categoryNieuws: boolean;
  categoryReviews: boolean;
  categoryPrijzen: boolean;
  notifPrijzen: boolean;
  notifNieuws: boolean;
  notifReviews: boolean;
}

const DEFAULT_PROFILE: ProfileData = {
  id: '',
  username: '',
  avatar_url: '',
  displayName: 'Tweakly Gebruiker',
  age: null,
  pushEnabled: true,
  emailNotifEnabled: false,
  categoryNieuws: true,
  categoryReviews: true,
  categoryPrijzen: true,
  notifPrijzen: true,
  notifNieuws: true,
  notifReviews: true,
};

const mapDbToProfile = (dbData: Record<string, unknown>): ProfileData => ({
  id: dbData.id as string,
  username: dbData.username as string || '',
  avatar_url: dbData.avatar_url as string || '',
  displayName: dbData.display_name as string || 'Tweakly Gebruiker',
  age: dbData.age as number | null ?? null,
  pushEnabled: dbData.push_enabled as boolean ?? true,
  emailNotifEnabled: dbData.email_notif_enabled as boolean ?? false,
  categoryNieuws: dbData.category_nieuws as boolean ?? true,
  categoryReviews: dbData.category_reviews as boolean ?? true,
  categoryPrijzen: dbData.category_prijzen as boolean ?? true,
  notifPrijzen: dbData.notif_prijzen as boolean ?? true,
  notifNieuws: dbData.notif_nieuws as boolean ?? true,
  notifReviews: dbData.notif_reviews as boolean ?? true,
});

const mapProfileToDb = (profile: Partial<ProfileData>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (profile.id !== undefined) db.id = profile.id;
  if (profile.displayName !== undefined) db.display_name = profile.displayName;
  if (profile.age !== undefined) db.age = profile.age;
  if (profile.pushEnabled !== undefined) db.push_enabled = profile.pushEnabled;
  if (profile.emailNotifEnabled !== undefined) db.email_notif_enabled = profile.emailNotifEnabled;
  if (profile.categoryNieuws !== undefined) db.category_nieuws = profile.categoryNieuws;
  if (profile.categoryReviews !== undefined) db.category_reviews = profile.categoryReviews;
  if (profile.categoryPrijzen !== undefined) db.category_prijzen = profile.categoryPrijzen;
  if (profile.notifPrijzen !== undefined) db.notif_prijzen = profile.notifPrijzen;
  if (profile.notifNieuws !== undefined) db.notif_nieuws = profile.notifNieuws;
  if (profile.notifReviews !== undefined) db.notif_reviews = profile.notifReviews;
  return db;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  profile: ProfileData | null;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: (email?: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithApple: (identityToken: string) => Promise<void>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<void>;
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const loadProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load profile', error);
        setProfile(null);
        return;
      }

      if (data) {
        setProfile(mapDbToProfile(data));
      } else {
        const newProfile = { ...DEFAULT_PROFILE, id: userId };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert(mapProfileToDb(newProfile), { onConflict: 'id', ignoreDuplicates: false })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create profile', createError);
          setProfile(null);
        } else if (created) {
          setProfile(mapDbToProfile(created));
        }
      }
    } catch (e) {
      console.error('Profile load error', e);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.refreshSession().then(async ({ data: { session }, error: refreshError }) => {
      if (refreshError || !session) {
        setUser(null);
        setEmailVerified(false);
        setProfile(null);
        setValidated(true);
        setLoading(false);
        return;
      }
      
      const { data: { user }, error } = await supabase.auth.getUser();
      setValidated(true);
      
      if (error || !user) {
        setUser(null);
        setEmailVerified(false);
        setProfile(null);
      } else {
        setUser(user);
        setEmailVerified(user.email_confirmed_at != null);
        loadProfile(user.id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!validated) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error || !user) {
          setUser(null);
          setEmailVerified(false);
          setProfile(null);
        } else {
          setUser(user);
          setEmailVerified(user.email_confirmed_at != null);
          loadProfile(user.id);
        }
      });
    });

    return () => subscription.unsubscribe();
  }, [validated]);

  const updateProfile = async (updates: Partial<ProfileData>) => {
    if (!user || !profile) return;

    const updateData = { ...updates, id: user.id };
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert(mapProfileToDb(updateData))
      .select()
      .single();

    if (error) {
      console.error('Failed to update profile', error);
      throw error;
    }

    if (data) {
      setProfile(mapDbToProfile(data));
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {},
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const sendVerificationEmail = async (email?: string) => {
    const target = (email ?? user?.email)?.toLowerCase();
    if (!target) return;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: target,
    });
    if (error) throw error;
  };

  const verifyCode = async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase(),
      token: code,
      type: 'signup',
    });
    if (error) throw error;
    await refreshUser();
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session) {
      setUser(session.user);
      setEmailVerified(session.user.email_confirmed_at != null);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
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
        profile,
        profileLoading,
        signIn,
        signUp,
        signOut,
        sendVerificationEmail,
        verifyCode,
        refreshUser,
        resetPassword,
        signInWithApple,
        updateProfile,
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
