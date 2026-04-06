
import { AppTour } from '@/components/tour-overlay';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import { LiquidScreen } from '@/components/liquid-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useThemeContext } from '@/hooks/use-theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { LiquidSwitch } from '@/components/liquid-switch';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
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

import { ConfirmSheet } from '@/components/confirm-sheet';

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

function SectionLabel({ label, colors, index = 0, animationsEnabled = true }: { label: string; colors: (typeof Colors)['light']; index?: number; animationsEnabled?: boolean }) {
  return (
    <Animated.View entering={animationsEnabled ? FadeInDown.delay(index * 60).springify().damping(18).stiffness(110) : undefined}>
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{label}</Text>
    </Animated.View>
  );
}

function Group({ children, colors }: { children: React.ReactNode; colors: (typeof Colors)['light'] }) {
  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
  const insets = useSafeAreaInsets();
  const { resolvedTheme, themeMode, setThemeMode } = useThemeContext();
  const { reduceMotion, setReduceMotion, animationsEnabled } = useReduceMotion();
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

  // ConfirmSheet states
  const [sheetClearBookmarks, setSheetClearBookmarks] = useState(false);
  const [sheetClearAlerts, setSheetClearAlerts] = useState(false);
  const [sheetLogout, setSheetLogout] = useState(false);
  const [sheetDeleteAccount, setSheetDeleteAccount] = useState(false);
  const [sheetDeleteAccountConfirm, setSheetDeleteAccountConfirm] = useState(false);
  const [sheetChangePassword, setSheetChangePassword] = useState(false);
  const [sheetPasswordSent, setSheetPasswordSent] = useState(false);
  const [sheetEmail, setSheetEmail] = useState(false);
  const [sheetAccountError, setSheetAccountError] = useState(false);

  const pushEnabled = profile?.pushEnabled ?? true;

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

  const handleClearBookmarks = useCallback(() => setSheetClearBookmarks(true), []);
  const handleClearAlerts    = useCallback(() => setSheetClearAlerts(true), []);
  const handleDeleteAccount  = useCallback(() => setSheetDeleteAccount(true), []);
  const handleLogout         = useCallback(() => setSheetLogout(true), []);
  const handleChangePassword = useCallback(() => setSheetChangePassword(true), []);

  if (profileLoading || !profile) {
    return (
      <LiquidScreen style={styles.safe}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Instellingen</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Laden...</Text>
        </View>
      </LiquidScreen>
    );
  }

  const initials = getInitials(profile?.displayName || '');
  const categoryCount = [profile?.categoryNieuws, profile?.categoryReviews, profile?.categoryPrijzen].filter(Boolean).length;

  return (
    <LiquidScreen style={styles.safe}>
      {/* Page header */}
      <Animated.View
        style={[styles.header, { paddingTop: insets.top + 16 }]}
        entering={animationsEnabled ? FadeInDown.springify().damping(20).stiffness(130) : undefined}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Instellingen</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── PROFIEL CARD (Apple-style) ── */}
        <Animated.View entering={animationsEnabled ? FadeInDown.delay(30).springify().damping(18).stiffness(110) : undefined}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.profileCard}>
            <Pressable
              onPress={() => setEditModalVisible(true)}
              style={({ pressed }) => [styles.profileCardInner, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.profileAvatarWrap}>
                <View style={[styles.profileAvatar, { backgroundColor: Palette.primary }]}>
                  <Text style={styles.profileAvatarText}>{initials}</Text>
                </View>
                <GlassShimmer isDark={isDark} intensity={0.4} borderRadius={Radius.full} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>{profile?.displayName}</Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
                <Text style={[styles.profileSub, { color: colors.tint }]}>Tweakly account</Text>
              </View>
              <IconSymbol name="chevron.right" size={14} color={colors.border} />
            </Pressable>
          </ClearLiquidGlass>
        </Animated.View>

        {/* ── MELDINGEN ── */}
        <View style={styles.section}>
          <SectionLabel label="MELDINGEN" colors={colors} index={1} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
            <NavRow
              icon="bell.fill"
              iconColor="#FF3B30"
              label="Meldingen"
              sub={pushEnabled ? 'Push ingeschakeld' : 'Push uitgeschakeld'}
              onPress={() => router.push('/instellingen/meldingen' as any)}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── CATEGORIEËN ── */}
        <View style={styles.section}>
          <SectionLabel label="CATEGORIEËN" colors={colors} index={2} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
            <NavRow
              icon="square.grid.2x2.fill"
              iconColor={Palette.primary}
              label="Categorieën"
              sub={`${categoryCount} van 3 actief`}
              onPress={() => router.push('/categorieen?mode=browse' as any)}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── UITERLIJK ── */}
        <View style={styles.section}>
          <SectionLabel label="UITERLIJK" colors={colors} index={3} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
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
          <SectionLabel label="OPGESLAGEN" colors={colors} index={4} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
            <NavRow
              icon="bookmark.fill"
              iconColor={Palette.primary}
              label="Bladwijzers"
              sub="Opgeslagen artikelen bekijken"
              badge={bookmarks.length}
              onPress={() => router.push('/instellingen/bladwijzers' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="bell.badge.fill"
              iconColor="#FF9500"
              label="Prijsalerts beheren"
              sub={alertCount > 0 ? `${alertCount} actieve alert${alertCount !== 1 ? 's' : ''}` : 'Geen actieve alerts'}
              onPress={() => router.push('/instellingen/prijsalerts' as any)}
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
          <SectionLabel label="ONTDEKKEN" colors={colors} index={5} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
            <NavRow
              icon="wand.and.stars"
              iconColor="#FF9500"
              label="Aanbevelingen"
              sub="Persoonlijke productaanbevelingen"
              onPress={() => router.push('/categorieen?mode=select' as any)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="magnifyingglass"
              iconColor="#0A84FF"
              label="Zoeken"
              sub="Doorzoek producten en artikelen"
              onPress={() => router.push('/instellingen/zoeken' as any)}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── ACCOUNT ── */}
        <View style={styles.section}>
          <SectionLabel label="ACCOUNT" colors={colors} index={6} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
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
              onPress={() => setSheetEmail(true)}
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
          <SectionLabel label="HULP" colors={colors} index={7} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
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
              onPress={() => Linking.openURL('mailto:tweakly.help@hotmail.com').catch(() => {})}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── JURIDISCH ── */}
        <View style={styles.section}>
          <SectionLabel label="JURIDISCH" colors={colors} index={8} animationsEnabled={animationsEnabled} />
          <Group colors={colors}>
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

      <ConfirmSheet
        visible={sheetClearBookmarks}
        title="Alle bladwijzers wissen"
        message="Weet je zeker dat je alle opgeslagen artikelen wilt verwijderen?"
        onClose={() => setSheetClearBookmarks(false)}
        actions={[
          { label: 'Verwijder', style: 'destructive', onPress: clearBookmarks },
          { label: 'Annuleer', style: 'cancel' },
        ]}
      />

      <ConfirmSheet
        visible={sheetClearAlerts}
        title="Alle alerts wissen"
        message="Wil je alle prijsalerts verwijderen?"
        onClose={() => setSheetClearAlerts(false)}
        actions={[
          {
            label: 'Verwijder',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem('@price_alerts');
              setAlertCount(0);
            },
          },
          { label: 'Annuleer', style: 'cancel' },
        ]}
      />

      <ConfirmSheet
        visible={sheetLogout}
        title="Uitloggen"
        message="Weet je zeker dat je wilt uitloggen?"
        onClose={() => setSheetLogout(false)}
        actions={[
          { label: 'Uitloggen', style: 'destructive', onPress: () => signOut() },
          { label: 'Annuleer', style: 'cancel' },
        ]}
      />

      <ConfirmSheet
        visible={sheetDeleteAccount}
        title="Account verwijderen"
        message="Weet je zeker dat je je account permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        onClose={() => setSheetDeleteAccount(false)}
        actions={[
          { label: 'Verwijder account', style: 'destructive', onPress: () => setSheetDeleteAccountConfirm(true) },
          { label: 'Annuleer', style: 'cancel' },
        ]}
      />

      <ConfirmSheet
        visible={sheetDeleteAccountConfirm}
        title="Laatste bevestiging"
        message="Al je gegevens worden permanent verwijderd."
        onClose={() => setSheetDeleteAccountConfirm(false)}
        actions={[
          {
            label: 'Ja, verwijder',
            style: 'destructive',
            onPress: async () => {
              setDeletingAccount(true);
              try {
                await supabase.rpc('delete_user');
                await signOut();
              } catch (e) {
                setSheetAccountError(true);
              } finally {
                setDeletingAccount(false);
              }
            },
          },
          { label: 'Annuleer', style: 'cancel' },
        ]}
      />

      <ConfirmSheet
        visible={sheetAccountError}
        title="Fout"
        message="Kon account niet verwijderen. Neem contact op met support."
        onClose={() => setSheetAccountError(false)}
        actions={[{ label: 'OK', style: 'default' }]}
      />

      <ConfirmSheet
        visible={sheetChangePassword}
        title="Wachtwoord wijzigen"
        message="We sturen een e-mail met een link om je wachtwoord te wijzigen."
        onClose={() => setSheetChangePassword(false)}
        actions={[
          {
            label: 'Stuur e-mail',
            style: 'default',
            onPress: async () => {
              if (user?.email) {
                await supabase.auth.resetPasswordForEmail(user.email, {
                  redirectTo: 'https://tweakly.netlify.app/reset-wachtwoord.html',
                });
                setSheetPasswordSent(true);
              }
            },
          },
          { label: 'Annuleer', style: 'cancel' },
        ]}
      />

      <ConfirmSheet
        visible={sheetPasswordSent}
        title="Verstuurd"
        message="Controleer je e-mail voor de resetlink."
        onClose={() => setSheetPasswordSent(false)}
        actions={[{ label: 'OK', style: 'default' }]}
      />

      <ConfirmSheet
        visible={sheetEmail}
        title="E-mailadres"
        message={user?.email ?? ''}
        onClose={() => setSheetEmail(false)}
        actions={[{ label: 'OK', style: 'default' }]}
      />
    </LiquidScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.md,
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
    overflow: 'hidden',
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  profileAvatarWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs + 4,
    paddingBottom: 4,
  },

  // Group container — iOS Settings plain surface
  group: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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
