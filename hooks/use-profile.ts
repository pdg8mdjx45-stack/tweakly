/**
 * Profile Hook
 * Manages user profile data and settings with AsyncStorage persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tweakly-profile-v1';

export interface ProfileData {
  displayName: string;
  email: string;
  pushEnabled: boolean;
  emailNotifEnabled: boolean;
  categoryNieuws: boolean;
  categoryReviews: boolean;
  categoryPrijzen: boolean;
}

const DEFAULT_PROFILE: ProfileData = {
  displayName: 'Tweakly Gebruiker',
  email: 'gebruiker@email.nl',
  pushEnabled: true,
  emailNotifEnabled: false,
  categoryNieuws: true,
  categoryReviews: true,
  categoryPrijzen: true,
};

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ProfileData>;
          setProfile({ ...DEFAULT_PROFILE, ...parsed });
        }
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(console.error);
  }, [profile, loaded]);

  const updateProfile = useCallback((updates: Partial<ProfileData>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
  }, []);

  return { profile, updateProfile, resetProfile, loaded };
}
