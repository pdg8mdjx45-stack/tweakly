import { useState } from 'react';
import { LiquidScreen } from '@/components/liquid-screen';
import { BackButton } from '@/components/back-button';
import { LiquidSwitch } from '@/components/liquid-switch';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { requestPermissions } from '@/services/notification-service';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/confirm-sheet';

function SectionLabel({ label, colors }: { label: string; colors: (typeof Colors)['light'] }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{label}</Text>
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
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor ?? Palette.primary }]}>
        <IconSymbol name={icon as any} size={18} color="#fff" />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      <LiquidSwitch value={value} onChange={onChange} isDark={isDark} disabled={disabled} />
    </View>
  );
}

export default function InstellingenMeldingenScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';
  const { profile, profileLoading, updateProfile } = useAuth();
  const [sheetPermissions, setSheetPermissions] = useState(false);

  if (profileLoading || !profile) {
    return (
      <LiquidScreen style={styles.safe}>
        <View style={[styles.header, { backgroundColor: 'transparent' }]}>
          <BackButton color={colors.tint} />
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.text }]}>Meldingen</Text>
          </View>
        </View>
        <View style={styles.loading}>
          <Text style={{ color: colors.textSecondary }}>Laden...</Text>
        </View>
      </LiquidScreen>
    );
  }

  const pushOff = !profile.pushEnabled;

  return (
    <LiquidScreen style={styles.safe}>
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <BackButton color={colors.tint} />
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>Meldingen</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {profile.pushEnabled ? 'Push ingeschakeld' : 'Push uitgeschakeld'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Push uitgeschakeld banner */}
        {pushOff && (
          <View style={[styles.warningCard, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : '#FFF2F0' }]}>
            <IconSymbol name="bell.slash" size={16} color={Palette.danger} />
            <Text style={[styles.warningText, { color: Palette.danger }]}>
              Push-notificaties zijn uitgeschakeld. Zet ze aan om meldingen te ontvangen.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel label="KANALEN" colors={colors} />
          <Group colors={colors}>
            <ToggleRow
              icon="bell.fill"
              label="Push-notificaties"
              description="Ontvang meldingen op je telefoon"
              value={profile.pushEnabled}
              onChange={async (v) => {
                if (v) {
                  const granted = await requestPermissions();
                  if (!granted) {
                    setSheetPermissions(true);
                    return;
                  }
                }
                updateProfile({ pushEnabled: v });
              }}
              colors={colors}
              isDark={isDark}
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
              isDark={isDark}
            />
          </Group>
        </View>

        <View style={styles.section}>
          <SectionLabel label="TYPES" colors={colors} />
          <Group colors={colors}>
            <ToggleRow
              icon="tag.fill"
              iconColor="#10B981"
              label="Prijsdalingen"
              description="Meldingen bij prijsdalingen van gevolgde producten"
              value={profile.notifPrijzen}
              onChange={(v) => updateProfile({ notifPrijzen: v })}
              colors={colors}
              isDark={isDark}
              disabled={pushOff}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="newspaper"
              iconColor={Palette.primary}
              label="Nieuws"
              description="Meldingen bij nieuwsartikelen"
              value={profile.notifNieuws}
              onChange={(v) => updateProfile({ notifNieuws: v })}
              colors={colors}
              isDark={isDark}
              disabled={pushOff}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="star.fill"
              iconColor="#F59E0B"
              label="Reviews"
              description="Meldingen bij nieuwe reviews"
              value={profile.notifReviews}
              onChange={(v) => updateProfile({ notifReviews: v })}
              colors={colors}
              isDark={isDark}
              disabled={pushOff}
            />
          </Group>
        </View>

        <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <IconSymbol name="info.circle" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Type-instellingen gelden alleen als push-notificaties zijn ingeschakeld.
          </Text>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={sheetPermissions}
        title="Meldingen uitgeschakeld"
        message="Om meldingen te ontvangen moet je toestemming geven in je device-instellingen."
        onClose={() => setSheetPermissions(false)}
        actions={[{ label: 'OK', style: 'default' }]}
      />
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { gap: Spacing.xs },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
  },

  group: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 36 + Spacing.sm,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  warningCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  infoCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
