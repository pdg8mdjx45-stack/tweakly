/**
 * Profile Hook
 * Manages user profile data with Supabase backend + local cache.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';

const STORAGE_KEY = 'tweakly-profile-v1';

export interface ProfileData {
  id: string;
  username: string;
  avatar_url: string;
  display_name: string;
  push_enabled: boolean;
  email_notif_enabled: boolean;
  category_nieuws: boolean;
  category_reviews: boolean;
  category_prijzen: boolean;
}

const DEFAULT_PROFILE: ProfileData = {
  id: '',
  username: '',
  avatar_url: '',
  display_name: 'Tweakly Gebruiker',
  push_enabled: true,
  email_notif_enabled: false,
  category_nieuws: true,
  category_reviews: true,
  category_prijzen: true,
};

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        loadProfile(data.user.id);
      } else {
        loadLocalProfile();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(DEFAULT_PROFILE);
        setLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadLocalProfile = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch (e) {
      console.error('Failed to load local profile', e);
    } finally {
      setLoaded(true);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load profile', error);
        loadLocalProfile();
        return;
      }

      if (data) {
        setProfile(data);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        const newProfile = { ...DEFAULT_PROFILE, id: userId };
        await createProfile(newProfile);
      }
    } catch (e) {
      console.error('Profile load error', e);
      loadLocalProfile();
    } finally {
      setLoaded(true);
    }
  };

  const createProfile = async (profileData: ProfileData) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create profile', error);
        return;
      }

      setProfile(data);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Create profile error', e);
    }
  };

  const updateProfile = useCallback(async (updates: Partial<ProfileData>) => {
    if (!user) return;

    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));

    setSyncing(true);
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Failed to sync profile', error);
    }
    setSyncing(false);
  }, [user, profile]);

  const resetProfile = useCallback(async () => {
    if (!user) return;
    await updateProfile(DEFAULT_PROFILE);
  }, [user, updateProfile]);

  return { profile, user, updateProfile, resetProfile, loaded, syncing };
}
