import { BackButton } from '@/components/back-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/hooks/use-theme-context';
import { requestPermissions } from '@/services/notification-service';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

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

export default function InstellingenMeldingenScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const { profile, profileLoading, updateProfile } = useAuth();

  if (profileLoading || !profile) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <BackButton color={colors.tint} />
          <Text style={[styles.title, { color: colors.text }]}>Meldingen</Text>
        </View>
        <View style={styles.loading}>
          <Text style={{ color: colors.textSecondary }}>Laden...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <BackButton color={colors.tint} />
        <Text style={[styles.title, { color: colors.text }]}>Meldingen</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Beheer push en e-mail</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <SectionLabel label="ALGEMEEN" colors={colors} />
          <Group colors={colors}>
            <ToggleRow
              icon="bell.fill"
              label="Push-notificaties"
              description="Ontvang meldingen op je telefoon"
              value={profile?.pushEnabled}
              onChange={async (v) => {
                if (v) {
                  const granted = await requestPermissions();
                  if (!granted) {
                    Alert.alert(
                      'Meldingen uitgeschakeld',
                      'Om meldingen te ontvangen moet je toestemming geven in je device-instellingen.',
                      [{ text: 'OK' }],
                    );
                    return;
                  }
                }
                updateProfile({ pushEnabled: v });
              }}
              colors={colors}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="envelope"
              iconColor={Palette.blue}
              label="E-mailmeldingen"
              description="Ontvang meldingen per e-mail"
              value={profile?.emailNotifEnabled}
              onChange={(v) => updateProfile({ emailNotifEnabled: v })}
              colors={colors}
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
              description="Meldingen bij prijsdalingen"
              value={profile?.notifPrijzen}
              onChange={(v) => updateProfile({ notifPrijzen: v })}
              colors={colors}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="newspaper"
              iconColor={Palette.primary}
              label="Nieuws"
              description="Meldingen bij nieuwsartikelen"
              value={profile?.notifNieuws}
              onChange={(v) => updateProfile({ notifNieuws: v })}
              colors={colors}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="star.fill"
              iconColor="#F59E0B"
              label="Reviews"
              description="Meldingen bij nieuwe reviews"
              value={profile?.notifReviews}
              onChange={(v) => updateProfile({ notifReviews: v })}
              colors={colors}
            />
          </Group>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
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
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
  },

  group: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 30 + Spacing.sm,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },

  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
