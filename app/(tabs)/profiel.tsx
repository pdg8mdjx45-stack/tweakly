
import { AppTour } from '@/components/tour-overlay';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useThemeContext } from '@/hooks/use-theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { LiquidSwitch } from '@/components/liquid-switch';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getAlerts, subscribeAlerts } from '@/services/alerts-store';
import { supabase } from '@/services/supabase';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ label, colors }: { label: string; colors: (typeof Colors)['light'] }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
  );
}

function Group({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <View style={[styles.group, isDark ? styles.groupDark : styles.groupLight]}>
      <View style={[styles.groupSpecular, isDark ? styles.groupSpecularDark : styles.groupSpecularLight]} />
      {children}
    </View>
  );
}

function Divider({ colors }: { colors: (typeof Colors)['light'] }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function ToggleRow({
  icon,
  iconColor,
  label,
  description,
  value,
  onChange,
  colors,
  isDark,
  disabled,
  badge,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: (typeof Colors)['light'];
  isDark: boolean;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <View style={[styles.toggleRow, disabled && { opacity: 0.5 }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor ?? Palette.primary }]}>
        <IconSymbol name={icon as any} size={16} color="#fff" />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: Palette.accent }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <LiquidSwitch value={value} onChange={disabled ? () => {} : onChange} isDark={isDark} />
    </View>
  );
}

function NavRow({
  icon,
  iconColor,
  label,
  sub,
  onPress,
  danger,
  colors,
  badge,
  rightText,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  colors: (typeof Colors)['light'];
  badge?: number;
  rightText?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, pressed && { backgroundColor: colors.background }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor ?? Palette.primary }]}>
        <IconSymbol name={icon as any} size={16} color="#fff" />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: danger ? Palette.danger : colors.text }]}>{label}</Text>
        {sub && <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{sub}</Text>}
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badgeRed}>
          <Text style={styles.badgeRedText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      {rightText && (
        <Text style={[styles.rightText, { color: colors.textSecondary }]}>{rightText}</Text>
      )}
      <IconSymbol name="chevron.right" size={14} color={colors.border} />
    </Pressable>
  );
}

// ─── Theme Picker ─────────────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark' | 'system';

function ThemeRow({
  themeMode,
  setThemeMode,
  colors,
  isDark,
}: {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  colors: (typeof Colors)['light'];
  isDark: boolean;
}) {
  const options: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: 'Licht', icon: 'sun.max.fill' },
    { key: 'dark', label: 'Donker', icon: 'moon.fill' },
    { key: 'system', label: 'Systeem', icon: 'circle.lefthalf.filled' },
  ];

  return (
    <>
      {options.map((opt, idx) => (
        <View key={opt.key}>
          {idx > 0 && <Divider colors={colors} />}
          <Pressable
            onPress={() => setThemeMode(opt.key)}
            style={({ pressed }) => [styles.navRow, pressed && { backgroundColor: colors.background }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: opt.key === 'dark' ? '#5856D6' : opt.key === 'light' ? '#FF9500' : Palette.primary }]}>
              <IconSymbol name={opt.icon as any} size={16} color="#fff" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{opt.label}</Text>
            {themeMode === opt.key && (
              <IconSymbol name="checkmark" size={16} color={Palette.primary} />
            )}
          </Pressable>
        </View>
      ))}
    </>
  );
}

// ─── Edit Profile Modal ──────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  name,
  email,
  onSave,
  onClose,
  colors,
  isDark,
}: {
  visible: boolean;
  name: string;
  email: string;
  onSave: (name: string) => void;
  onClose: () => void;
  colors: (typeof Colors)['light'];
  isDark: boolean;
}) {
  const [draftName, setDraftName] = useState(name);

  const handleOpen = useCallback(() => {
    setDraftName(name);
  }, [name]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.modalCancel, { color: Palette.blue }]}>Annuleer</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Profiel bewerken</Text>
          <Pressable
            onPress={() => {
              if (draftName.trim()) onSave(draftName.trim());
            }}
            hitSlop={12}
          >
            <Text style={[styles.modalSave, { color: Palette.blue }]}>Opslaan</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.modalAvatarWrap}>
            <View style={[styles.modalAvatar, { backgroundColor: Palette.primary }]}>
              <Text style={styles.modalAvatarText}>{getInitials(draftName || 'T')}</Text>
            </View>
            <Text style={[styles.modalAvatarHint, { color: colors.textSecondary }]}>
              Initialen worden automatisch gegenereerd
            </Text>
          </View>

          <View style={styles.section}>
            <SectionLabel label="NAAM" colors={colors} />
            <View style={[styles.group, isDark ? styles.groupDark : styles.groupLight]}>
              <View style={[styles.groupSpecular, isDark ? styles.groupSpecularDark : styles.groupSpecularLight]} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Jouw naam"
                placeholderTextColor={colors.textSecondary}
                autoCorrect={false}
                maxLength={40}
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel label="E-MAILADRES" colors={colors} />
            <View style={[styles.group, isDark ? styles.groupDark : styles.groupLight]}>
              <View style={[styles.groupSpecular, isDark ? styles.groupSpecularDark : styles.groupSpecularLight]} />
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={[styles.inputDisabledText, { color: colors.textSecondary }]}>{email}</Text>
                <Text style={[styles.inputDisabledNote, { color: colors.textSecondary }]}>
                  E-mail kan niet worden gewijzigd
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfielScreen() {
  const { resolvedTheme, themeMode, setThemeMode } = useThemeContext();
  const { reduceMotion, setReduceMotion } = useReduceMotion();
  const colors = Colors[resolvedTheme];
  const { user, signOut, profile, profileLoading, updateProfile } = useAuth();
  const { bookmarks, clearBookmarks } = useBookmarks();
  const router = useRouter();
  const isDark = resolvedTheme === 'dark';

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [tourVisible, setTourVisible] = useState(false);
  const [introHidden, setIntroHidden] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Local toggle states backed by profile (optimistic UI)
  const [pushEnabled, setPushEnabled] = useState(profile?.pushEnabled ?? true);
  const [emailNotif, setEmailNotif] = useState(profile?.emailNotifEnabled ?? false);
  const [notifPrijzen, setNotifPrijzen] = useState(profile?.notifPrijzen ?? true);
  const [notifNieuws, setNotifNieuws] = useState(profile?.notifNieuws ?? true);
  const [notifReviews, setNotifReviews] = useState(profile?.notifReviews ?? true);
  const [catNieuws, setCatNieuws] = useState(profile?.categoryNieuws ?? true);
  const [catReviews, setCatReviews] = useState(profile?.categoryReviews ?? true);
  const [catPrijzen, setCatPrijzen] = useState(profile?.categoryPrijzen ?? true);

  // Sync local state when profile loads
  useEffect(() => {
    if (!profile) return;
    setPushEnabled(profile.pushEnabled);
    setEmailNotif(profile.emailNotifEnabled);
    setNotifPrijzen(profile.notifPrijzen);
    setNotifNieuws(profile.notifNieuws);
    setNotifReviews(profile.notifReviews);
    setCatNieuws(profile.categoryNieuws);
    setCatReviews(profile.categoryReviews);
    setCatPrijzen(profile.categoryPrijzen);
  }, [profile]);

  const save = useCallback((patch: Parameters<typeof updateProfile>[0]) => {
    updateProfile(patch);
  }, [updateProfile]);

  useEffect(() => {
    getAlerts().then(a => setAlertCount(a.length));
    return subscribeAlerts(() => {
      getAlerts().then(a => setAlertCount(a.length));
    });
  }, []);

  useEffect(() => {
    const checkFirstVisit = async () => {
      try {
        const [tourDone, introDone] = await Promise.all([
          AsyncStorage.getItem('@tour_done'),
          AsyncStorage.getItem('@intro_done'),
        ]);
        if (!tourDone) setTourVisible(true);
        if (introDone) setIntroHidden(true);
      } catch (e) {
        setTourVisible(true);
      }
    };
    checkFirstVisit();
  }, []);

  const handleTourDismiss = useCallback(async () => {
    await AsyncStorage.setItem('@tour_done', '1');
    setTourVisible(false);
  }, []);

  const handleSaveProfile = useCallback(
    (name: string) => {
      updateProfile({ displayName: name });
      setEditModalVisible(false);
    },
    [updateProfile],
  );

  const handleClearBookmarks = useCallback(() => {
    Alert.alert(
      'Alle bladwijzers wissen',
      'Weet je zeker dat je alle opgeslagen artikelen wilt verwijderen?',
      [
        { text: 'Annuleer', style: 'cancel' },
        { text: 'Verwijder', style: 'destructive', onPress: clearBookmarks },
      ],
    );
  }, [clearBookmarks]);

  const handleClearAlerts = useCallback(() => {
    Alert.alert(
      'Alle alerts wissen',
      'Wil je alle prijsalerts verwijderen?',
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: 'Verwijder',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@price_alerts');
            setAlertCount(0);
          },
        },
      ],
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Account verwijderen',
      'Weet je zeker dat je je account permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: 'Verwijder account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Laatste bevestiging',
              'Al je gegevens worden permanent verwijderd.',
              [
                { text: 'Annuleer', style: 'cancel' },
                {
                  text: 'Ja, verwijder',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      await supabase.rpc('delete_user');
                      await signOut();
                    } catch (e) {
                      Alert.alert('Fout', 'Kon account niet verwijderen. Neem contact op met support.');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [signOut]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Uitloggen',
      'Weet je zeker dat je wilt uitloggen?',
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: 'Uitloggen',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
    );
  }, [signOut]);

  const handleChangePassword = useCallback(() => {
    Alert.alert(
      'Wachtwoord wijzigen',
      'We sturen een e-mail met een link om je wachtwoord te wijzigen.',
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: 'Stuur e-mail',
          onPress: async () => {
            if (user?.email) {
              await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: 'https://tweakly.netlify.app/reset-wachtwoord.html',
              });
              Alert.alert('Verstuurd', 'Controleer je e-mail voor de resetlink.');
            }
          },
        },
      ],
    );
  }, [user]);

  if (profileLoading || !profile) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Instellingen</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Laden...</Text>
        </View>
      </View>
    );
  }

  const initials = getInitials(profile?.displayName || '');
  const notifTypesCount = [notifPrijzen, notifNieuws, notifReviews].filter(Boolean).length;
  const categoryCount = [catNieuws, catReviews, catPrijzen].filter(Boolean).length;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Page header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Instellingen</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── PROFIEL CARD (Apple-style) ── */}
        <Pressable
          onPress={() => setEditModalVisible(true)}
          style={({ pressed }) => [
            styles.profileCard,
            isDark ? styles.groupDark : styles.groupLight,
            pressed && { opacity: 0.88 },
          ]}
        >
          <View style={[styles.groupSpecular, isDark ? styles.groupSpecularDark : styles.groupSpecularLight]} />
          <View style={[styles.profileAvatar, { backgroundColor: Palette.primary }]}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{profile?.displayName}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
            <Text style={[styles.profileSub, { color: colors.tint }]}>Tweakly account</Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color={colors.border} />
        </Pressable>

        {/* ── MELDINGEN ── */}
        <View style={styles.section}>
          <SectionLabel label="MELDINGEN" colors={colors} />
          <Group isDark={isDark}>
            <ToggleRow
              icon="bell.fill"
              iconColor="#FF3B30"
              label="Push-meldingen"
              description="Ontvang meldingen op je apparaat"
              value={pushEnabled}
              onChange={(v) => { setPushEnabled(v); save({ pushEnabled: v }); }}
              colors={colors}
              isDark={isDark}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="envelope.fill"
              iconColor="#0A84FF"
              label="E-mailmeldingen"
              description="Ontvang updates via e-mail"
              value={emailNotif}
              onChange={(v) => { setEmailNotif(v); save({ emailNotifEnabled: v }); }}
              colors={colors}
              isDark={isDark}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="tag.fill"
              iconColor="#FF9500"
              label="Prijsalerts"
              description="Melding bij prijsdaling"
              value={notifPrijzen}
              onChange={(v) => { setNotifPrijzen(v); save({ notifPrijzen: v }); }}
              colors={colors}
              isDark={isDark}
              badge={alertCount > 0 ? String(alertCount) : undefined}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="newspaper.fill"
              iconColor={Palette.primary}
              label="Nieuws-meldingen"
              value={notifNieuws}
              onChange={(v) => { setNotifNieuws(v); save({ notifNieuws: v }); }}
              colors={colors}
              isDark={isDark}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="star.fill"
              iconColor="#FFB800"
              label="Review-meldingen"
              value={notifReviews}
              onChange={(v) => { setNotifReviews(v); save({ notifReviews: v }); }}
              colors={colors}
              isDark={isDark}
            />
          </Group>
        </View>

        {/* ── CATEGORIEËN ── */}
        <View style={styles.section}>
          <SectionLabel label="CATEGORIEËN" colors={colors} />
          <Group isDark={isDark}>
            <ToggleRow
              icon="newspaper"
              iconColor={Palette.primary}
              label="Nieuws"
              description="Tech-nieuws en persberichten"
              value={catNieuws}
              onChange={(v) => { setCatNieuws(v); save({ categoryNieuws: v }); }}
              colors={colors}
              isDark={isDark}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="star.circle.fill"
              iconColor="#FFB800"
              label="Reviews"
              description="Productreviews en tests"
              value={catReviews}
              onChange={(v) => { setCatReviews(v); save({ categoryReviews: v }); }}
              colors={colors}
              isDark={isDark}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="eurosign.circle.fill"
              iconColor={Palette.accent}
              label="Prijzen"
              description="Prijsvergelijking en deals"
              value={catPrijzen}
              onChange={(v) => { setCatPrijzen(v); save({ categoryPrijzen: v }); }}
              colors={colors}
              isDark={isDark}
            />
          </Group>
        </View>

        {/* ── UITERLIJK ── */}
        <View style={styles.section}>
          <SectionLabel label="UITERLIJK" colors={colors} />
          <Group isDark={isDark}>
            <ThemeRow
              themeMode={themeMode as ThemeMode}
              setThemeMode={setThemeMode as (m: ThemeMode) => void}
              colors={colors}
              isDark={isDark}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="sparkles"
              iconColor="#5856D6"
              label="Animaties"
              description="Visuele overgangen en effecten"
              value={!reduceMotion}
              onChange={(v) => setReduceMotion(!v)}
              colors={colors}
              isDark={isDark}
            />
          </Group>
        </View>

        {/* ── OPGESLAGEN CONTENT ── */}
        <View style={styles.section}>
          <SectionLabel label="OPGESLAGEN" colors={colors} />
          <Group isDark={isDark}>
            <NavRow
              icon="bookmark.fill"
              iconColor={Palette.primary}
              label="Bladwijzers"
              sub="Opgeslagen artikelen bekijken"
              badge={bookmarks.length}
              onPress={() => router.push('/(tabs)/bladwijzers' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="bell.badge.fill"
              iconColor="#FF9500"
              label="Prijsalerts beheren"
              sub={alertCount > 0 ? `${alertCount} actieve alert${alertCount !== 1 ? 's' : ''}` : 'Geen actieve alerts'}
              onPress={() => router.push('/(tabs)/meldingen' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="trash"
              iconColor="#FF3B30"
              label="Bladwijzers wissen"
              sub={bookmarks.length > 0 ? `${bookmarks.length} opgeslagen` : 'Geen bladwijzers'}
              onPress={handleClearBookmarks}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="bell.slash.fill"
              iconColor="#FF3B30"
              label="Alle alerts wissen"
              sub={alertCount > 0 ? `${alertCount} alerts verwijderen` : 'Geen alerts'}
              onPress={handleClearAlerts}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── ONTDEKKEN ── */}
        <View style={styles.section}>
          <SectionLabel label="ONTDEKKEN" colors={colors} />
          <Group isDark={isDark}>
            <NavRow
              icon="square.grid.2x2.fill"
              iconColor={Palette.primary}
              label="Categorieën instellen"
              sub={`${categoryCount} van 3 actief`}
              onPress={() => router.push('/(tabs)/instellingen-categorieen' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="wand.and.stars"
              iconColor="#FF9500"
              label="Aanbevelingen"
              sub="Persoonlijke productaanbevelingen"
              onPress={() => router.push('/recommender' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="magnifyingglass"
              iconColor="#0A84FF"
              label="Zoeken"
              sub="Doorzoek producten en artikelen"
              onPress={() => router.push('/(tabs)/zoeken' as any)}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── ACCOUNT ── */}
        <View style={styles.section}>
          <SectionLabel label="ACCOUNT" colors={colors} />
          <Group isDark={isDark}>
            <NavRow
              icon="key.fill"
              iconColor="#FF9500"
              label="Wachtwoord wijzigen"
              sub="Reset via e-mail"
              onPress={handleChangePassword}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="envelope.fill"
              iconColor="#0A84FF"
              label="E-mailadres"
              rightText={user?.email?.split('@')[0]}
              onPress={() => {}}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="rectangle.portrait.and.arrow.right"
              iconColor="#FF3B30"
              label="Uitloggen"
              danger
              onPress={handleLogout}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="trash.fill"
              iconColor="#FF3B30"
              label="Account verwijderen"
              sub="Permanent — kan niet ongedaan worden"
              danger
              onPress={handleDeleteAccount}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── HULP & ONDERSTEUNING ── */}
        <View style={styles.section}>
          <SectionLabel label="HULP" colors={colors} />
          <Group isDark={isDark}>
            <NavRow
              icon="questionmark.circle.fill"
              iconColor="#5856D6"
              label="App-tour bekijken"
              sub="Uitleg over alle functies"
              onPress={() => setTourVisible(true)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="arrow.counterclockwise"
              iconColor={Palette.primary}
              label="Onboarding opnieuw"
              sub="Beginnersgids opnieuw bekijken"
              onPress={async () => {
                await AsyncStorage.removeItem('@onboarding_done');
                router.replace('/(auth)/onboarding' as any);
              }}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="star.fill"
              iconColor="#FFB800"
              label="Beoordeel Tweakly"
              sub="Laat een review achter in de App Store"
              onPress={() => {
                const url = Platform.OS === 'ios'
                  ? 'itms-apps://itunes.apple.com/app/id0000000000?action=write-review'
                  : 'market://details?id=com.tweakly.app';
                Linking.openURL(url).catch(() => {});
              }}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="envelope.badge.fill"
              iconColor="#0A84FF"
              label="Contact & support"
              sub="Stuur ons een bericht"
              onPress={() => Linking.openURL('mailto:support@tweakly.app').catch(() => {})}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── JURIDISCH ── */}
        <View style={styles.section}>
          <SectionLabel label="JURIDISCH" colors={colors} />
          <Group isDark={isDark}>
            <NavRow
              icon="hand.raised.fill"
              iconColor="#5856D6"
              label="Privacybeleid"
              onPress={() => router.push('/privacy' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="doc.text.fill"
              iconColor={Palette.primary}
              label="Gebruiksvoorwaarden"
              onPress={() => router.push('/terms' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="shield.fill"
              iconColor="#FF9500"
              label="Cookiebeleid"
              onPress={() => router.push('/cookies' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="link"
              iconColor="#34C759"
              label="Affiliate-informatie"
              onPress={() => router.push('/affiliate' as any)}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── About ── */}
        <View style={[styles.aboutSection, { borderTopColor: colors.border }]}>
          <Image source={require('@/assets/images/logo-display.png')} style={styles.aboutLogoImg} resizeMode="contain" />
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>Tweakly · Versie 1.0.0</Text>
          <Text style={[styles.aboutCopy, { color: colors.textSecondary }]}>
            © 2026 Tweakly. Alle rechten voorbehouden.
          </Text>
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        visible={editModalVisible}
        name={profile?.displayName}
        email={user?.email ?? ''}
        onSave={handleSaveProfile}
        onClose={() => setEditModalVisible(false)}
        colors={colors}
        isDark={isDark}
      />

      {/* ── App Tour Overlay ── */}
      {tourVisible && (
        <AppTour
          onDismiss={handleTourDismiss}
          onNavigate={(route: string) => router.push(route as any)}
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },

  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  // Apple-style profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 0.5,
    position: 'relative',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 13,
  },
  profileSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Sections
  section: { gap: Spacing.xs },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.2,
    paddingHorizontal: Spacing.xs + 4,
    paddingBottom: 4,
  },

  // Group container — iOS liquid glass
  group: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 0.5,
    position: 'relative',
  },
  groupLight: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderColor: 'rgba(255,255,255,0.90)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  groupDark: {
    backgroundColor: 'rgba(38,38,48,0.72)',
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  groupSpecular: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 0.5,
    zIndex: 1,
  },
  groupSpecularLight: { backgroundColor: 'rgba(255,255,255,1.0)' },
  groupSpecularDark: { backgroundColor: 'rgba(255,255,255,0.18)' },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 32 + Spacing.sm,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },

  // Nav row
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },

  // Shared row pieces
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 16, fontWeight: '400' },
  rowDesc: { fontSize: 12 },

  // Badge (green)
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Badge red (notification bubble)
  badgeRed: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginRight: 4,
  },
  badgeRedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  rightText: {
    fontSize: 15,
    marginRight: 2,
  },

  // About
  aboutSection: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  aboutLogoImg: { width: 48, height: 48 },
  aboutVersion: { fontSize: 13 },
  aboutCopy: { fontSize: 11, marginTop: 2 },

  // Edit Profile Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalCancel: { fontSize: 17 },
  modalSave: { fontSize: 17, fontWeight: '600' },
  modalContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modalAvatarWrap: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  modalAvatarHint: { fontSize: 12 },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontSize: 16,
  },
  inputDisabled: {
    gap: 2,
  },
  inputDisabledText: {
    fontSize: 16,
  },
  inputDisabledNote: {
    fontSize: 12,
  },
});
