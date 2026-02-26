import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useProfile } from '@/hooks/use-profile';
import { useThemeContext } from '@/hooks/use-theme-context';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

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

function Group({ children, colors }: { children: React.ReactNode; colors: (typeof Colors)['light'] }) {
  return (
    <View style={[styles.group, { backgroundColor: colors.surface }]}>{children}</View>
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
}: {
  icon: string;
  iconColor?: string;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor ?? Palette.primary }]}>
        <IconSymbol name={icon as any} size={16} color="#fff" />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E5E5EA', true: Palette.primary + '80' }}
        thumbColor={value ? Palette.primary : '#f4f3f4'}
      />
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
}: {
  icon: string;
  iconColor?: string;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  colors: (typeof Colors)['light'];
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
      <IconSymbol name="chevron.right" size={14} color={colors.border} />
    </Pressable>
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
}: {
  visible: boolean;
  name: string;
  email: string;
  onSave: (name: string, email: string) => void;
  onClose: () => void;
  colors: (typeof Colors)['light'];
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);

  const handleOpen = useCallback(() => {
    setDraftName(name);
    setDraftEmail(email);
  }, [name, email]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.modalCancel, { color: Palette.blue }]}>Annuleer</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Profiel bewerken</Text>
          <Pressable
            onPress={() => {
              if (draftName.trim()) onSave(draftName.trim(), draftEmail.trim());
            }}
            hitSlop={12}
          >
            <Text style={[styles.modalSave, { color: Palette.blue }]}>Opslaan</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          {/* Avatar preview */}
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
            <View style={[styles.group, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
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
            <View style={[styles.group, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={draftEmail}
                onChangeText={setDraftEmail}
                placeholder="jouw@email.nl"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={80}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfielScreen() {
  const { resolvedTheme, setThemeMode } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { bookmarks, clearBookmarks } = useBookmarks();
  const router = useRouter();

  const [editModalVisible, setEditModalVisible] = useState(false);

  const handleDarkModeToggle = useCallback(
    (value: boolean) => {
      setThemeMode(value ? 'dark' : 'light');
    },
    [setThemeMode],
  );

  const handleSaveProfile = useCallback(
    (name: string, email: string) => {
      updateProfile({ displayName: name, email });
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

  const initials = getInitials(profile.displayName);
  const isDark = resolvedTheme === 'dark';

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Page header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Profiel</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Onboarding / Intro ── */}
        <View style={styles.section}>
          <View style={[styles.introCard, { backgroundColor: isDark ? Palette.dark3 : '#F0F4FF' }]}>
            <View style={styles.introHeader}>
              <Text style={[styles.introEmoji]}>👋</Text>
              <Text style={[styles.introTitle, { color: colors.text }]}>Welkom bij Tweakly!</Text>
            </View>
            <Text style={[styles.introDesc, { color: colors.textSecondary }]}>
              Jouw persoonlijke gids voor tech nieuws, productreviews en de beste prijzen.
            </Text>
            <View style={styles.introFeatures}>
              <View style={styles.introFeature}>
                <IconSymbol name="newspaper" size={14} color={Palette.primary} />
                <Text style={[styles.introFeatureText, { color: colors.text }]}>Nieuws</Text>
              </View>
              <View style={styles.introFeature}>
                <IconSymbol name="star.fill" size={14} color="#F59E0B" />
                <Text style={[styles.introFeatureText, { color: colors.text }]}>Reviews</Text>
              </View>
              <View style={styles.introFeature}>
                <IconSymbol name="tag.fill" size={14} color="#10B981" />
                <Text style={[styles.introFeatureText, { color: colors.text }]}>Prijzen</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/prijzen' as any)}
              style={({ pressed }) => [
                styles.introButton,
                { backgroundColor: Palette.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.introButtonText}>Ontdek nu →</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Quick Tips ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <SectionLabel label="TIPS VOOR BEGINNERS" colors={colors} />
          </View>
          <Group colors={colors}>
            {/* Tip 1 */}
            <View style={styles.tipRow}>
              <View style={[styles.iconWrap, { backgroundColor: Palette.primary }]}>
                <IconSymbol name="bookmark.fill" size={14} color="#fff" />
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: colors.text }]}>Sla artikelen op</Text>
                <Text style={[styles.tipDesc, { color: colors.textSecondary }]}>Bewaar interessante artikelen om later te lezen</Text>
              </View>
            </View>
            <Divider colors={colors} />
            {/* Tip 2 */}
            <View style={styles.tipRow}>
              <View style={[styles.iconWrap, { backgroundColor: Palette.accent }]}>
                <IconSymbol name="bell.fill" size={14} color="#fff" />
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: colors.text }]}>Krijg meldingen</Text>
                <Text style={[styles.tipDesc, { color: colors.textSecondary }]}>Blijf op de hoogte van het laatste nieuws</Text>
              </View>
            </View>
            <Divider colors={colors} />
            {/* Tip 3 */}
            <View style={styles.tipRow}>
              <View style={[styles.iconWrap, { backgroundColor: '#10B981' }]}>
                <IconSymbol name="chart.line.uptrend.xyaxis" size={14} color="#fff" />
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: colors.text }]}>Vergelijk prijzen</Text>
                <Text style={[styles.tipDesc, { color: colors.textSecondary }]}>Vind de beste deals en prijsdalingen</Text>
              </View>
            </View>
          </Group>
        </View>

        {/* ── Account card ── */}
        <Pressable
          onPress={() => setEditModalVisible(true)}
          style={({ pressed }) => [
            styles.accountCard,
            { backgroundColor: Palette.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.accountAvatarWrap}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>{initials}</Text>
            </View>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{profile.displayName}</Text>
            <Text style={styles.accountEmail}>{user?.email ?? profile.email}</Text>
          </View>
          <View style={styles.editBadge}>
            <IconSymbol name="pencil" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.editBadgeText}>Bewerk</Text>
          </View>
        </Pressable>

        {/* ── Stats row ── */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{bookmarks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bladwijzers</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {[profile.categoryNieuws, profile.categoryReviews, profile.categoryPrijzen].filter(Boolean).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Categorieën</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: profile.pushEnabled ? Palette.primary : colors.textSecondary }]}>
              {profile.pushEnabled ? 'AAN' : 'UIT'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Meldingen</Text>
          </View>
        </View>

        {/* ── Opgeslagen artikelen ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <SectionLabel label="OPGESLAGEN ARTIKELEN" colors={colors} />
            {bookmarks.length > 0 && (
              <Pressable onPress={() => router.push('/(tabs)/bladwijzers' as any)} hitSlop={8}>
                <Text style={[styles.sectionLink, { color: colors.tint }]}>
                  Bekijk alle ({bookmarks.length})
                </Text>
              </Pressable>
            )}
          </View>

          {bookmarks.length === 0 ? (
            <Group colors={colors}>
              <View style={styles.emptyRow}>
                <IconSymbol name="bookmark" size={20} color={colors.tabIconDefault} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nog geen bladwijzers opgeslagen
                </Text>
              </View>
            </Group>
          ) : (
            <Group colors={colors}>
              {bookmarks.slice(0, 3).map((bm, idx, arr) => (
                <View key={bm.id}>
                  <Pressable
                    onPress={() => router.push(`/artikel/${bm.id}` as any)}
                    style={({ pressed }) => [
                      styles.bookmarkRow,
                      pressed && { backgroundColor: colors.background },
                    ]}
                  >
                    <View style={[styles.bookmarkDot, { backgroundColor: Palette.primary }]} />
                    <View style={styles.bookmarkInfo}>
                      <Text style={[styles.bookmarkTitle, { color: colors.text }]} numberOfLines={1}>
                        {bm.title}
                      </Text>
                      <Text style={[styles.bookmarkCat, { color: colors.textSecondary }]}>
                        {bm.category} · {new Date(bm.savedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={13} color={colors.border} />
                  </Pressable>
                  {idx < Math.min(bookmarks.length, 3) - 1 && <Divider colors={colors} />}
                </View>
              ))}
            </Group>
          )}
        </View>

        {/* ── Meldingen ── */}
        <View style={styles.section}>
          <SectionLabel label="MELDINGEN" colors={colors} />
          <Group colors={colors}>
            <ToggleRow
              icon="bell.fill"
              label="Push-notificaties"
              description="Ontvang meldingen op je telefoon"
              value={profile.pushEnabled}
              onChange={(v) => updateProfile({ pushEnabled: v })}
              colors={colors}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="envelope"
              iconColor={Palette.blue}
              label="E-mailmeldingen"
              description="Ontvang meldingen per e-mail"
              value={profile.emailNotifEnabled}
              onChange={(v) => updateProfile({ emailNotifEnabled: v })}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── Categorieën ── */}
        <View style={styles.section}>
          <SectionLabel label="CATEGORIEËN" colors={colors} />
          <Group colors={colors}>
            <ToggleRow
              icon="newspaper"
              label="Nieuws"
              description="Laatste tech- en IT-nieuws"
              value={profile.categoryNieuws}
              onChange={(v) => updateProfile({ categoryNieuws: v })}
              colors={colors}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="star.fill"
              iconColor="#F59E0B"
              label="Reviews"
              description="Productreviews en tests"
              value={profile.categoryReviews}
              onChange={(v) => updateProfile({ categoryReviews: v })}
              colors={colors}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="tag.fill"
              iconColor="#10B981"
              label="Prijswatch"
              description="Prijsdalingen en aanbiedingen"
              value={profile.categoryPrijzen}
              onChange={(v) => updateProfile({ categoryPrijzen: v })}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── App ── */}
        <View style={styles.section}>
          <SectionLabel label="APP" colors={colors} />
          <Group colors={colors}>
            <ToggleRow
              icon="moon"
              iconColor={isDark ? '#5856D6' : Palette.dark5}
              label="Donkere modus"
              value={isDark}
              onChange={handleDarkModeToggle}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── Account acties ── */}
        <View style={styles.section}>
          <SectionLabel label="ACCOUNT" colors={colors} />
          <Group colors={colors}>
            <NavRow
              icon="person.crop.circle"
              label="Profiel bewerken"
              sub={user?.email ?? profile.email}
              onPress={() => setEditModalVisible(true)}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="trash"
              iconColor={Palette.danger}
              label="Account verwijderen"
              sub="Verwijder je account en alle data"
              onPress={handleClearBookmarks}
              colors={colors}
            />
            <Divider colors={colors} />
            <NavRow
              icon="rectangle.portrait.and.arrow.right"
              iconColor={Palette.danger}
              label="Uitloggen"
              danger
              onPress={handleLogout}
              colors={colors}
            />
          </Group>
        </View>

        {/* ── About ── */}
        <View style={[styles.aboutSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.aboutAppName, { color: colors.tint }]}>tweakly</Text>
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>Versie 1.0.0</Text>
          <View style={styles.aboutLinks}>
            <Text style={[styles.aboutLink, { color: colors.tint }]}>Privacy</Text>
            <Text style={[styles.aboutDivider, { color: colors.border }]}>·</Text>
            <Text style={[styles.aboutLink, { color: colors.tint }]}>Voorwaarden</Text>
            <Text style={[styles.aboutDivider, { color: colors.border }]}>·</Text>
            <Text style={[styles.aboutLink, { color: colors.tint }]}>Contact</Text>
          </View>
          <Text style={[styles.aboutCopy, { color: colors.textSecondary }]}>
            © 2026 Tweakly
          </Text>
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        visible={editModalVisible}
        name={profile.displayName}
        email={profile.email}
        onSave={handleSaveProfile}
        onClose={() => setEditModalVisible(false)}
        colors={colors}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
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

  // Account card
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  accountAvatarWrap: {},
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  accountEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  editBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
  },

  // Sections
  section: { gap: Spacing.xs },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Intro / Onboarding
  introCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  introEmoji: {
    fontSize: 24,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  introDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  introFeatures: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  introFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  introFeatureText: {
    fontSize: 12,
    fontWeight: '500',
  },
  introButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  introButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Tip row
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  tipContent: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Group container
  group: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 30 + Spacing.sm,
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
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 16, fontWeight: '400' },
  rowDesc: { fontSize: 12 },

  // Bookmark rows
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  bookmarkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  bookmarkInfo: { flex: 1, gap: 2 },
  bookmarkTitle: { fontSize: 14, fontWeight: '500' },
  bookmarkCat: { fontSize: 12 },

  // Empty state
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  emptyText: { fontSize: 14 },

  // About
  aboutSection: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  aboutAppName: { fontSize: 20, fontWeight: '700', letterSpacing: 0.35 },
  aboutVersion: { fontSize: 13 },
  aboutLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  aboutLink: { fontSize: 13 },
  aboutDivider: { fontSize: 13 },
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
    borderRadius: 40,
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
});
