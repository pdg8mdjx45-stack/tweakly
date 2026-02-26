/**
 * Profile Header Component
 * Displays logo on left, profile avatar on right with dropdown menu
 */

import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TweaklyLogo } from './tweakly-logo';
import { IconSymbol } from './ui/icon-symbol';

interface ProfileHeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  title?: string;
}

export function ProfileHeader({ showBackButton, onBackPress, title }: ProfileHeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const menuItems = [
    { id: 'account', label: 'Account', icon: 'person.fill' },
    { id: 'notifications', label: 'Meldingen', icon: 'bell.fill' },
    { id: 'bookmarks', label: 'Opgeslagen', icon: 'bookmark.fill' },
    { id: 'settings', label: 'Instellingen', icon: 'gearshape.fill' },
    { id: 'divider1', label: '', icon: '' },
    { id: 'logout', label: 'Uitloggen', icon: 'rectangle.portrait.and.arrow.right', danger: true },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContent}>
        {showBackButton ? (
          <Pressable onPress={onBackPress} style={styles.backButton}>
            <IconSymbol size={22} name="chevron.left" color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.logoContainer}>
            <TweaklyLogo height={28} />
          </View>
        )}

        {title && (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        )}

        <View style={styles.iconContainer}>
          <Pressable
            onPress={() => setDropdownVisible(true)}
            style={({ pressed }) => [
              styles.avatarBtn,
              { backgroundColor: isDark ? Palette.dark3 : Palette.grey5 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol size={18} name="person.fill" color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          <View style={[styles.dropdown, { backgroundColor: colors.surface }]}>
            <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatarLarge, { backgroundColor: isDark ? Palette.dark3 : Palette.grey5 }]}>
                <IconSymbol size={28} name="person.fill" color={colors.textSecondary} />
              </View>
              <Text style={[styles.userName, { color: colors.text }]}>Gast</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                Log in voor meer features
              </Text>
            </View>

            {menuItems.map((item) => {
              if (item.id === 'divider1') {
                return <View key={item.id} style={[styles.divider, { backgroundColor: colors.border }]} />;
              }

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => setDropdownVisible(false)}
                >
                  <IconSymbol
                    size={18}
                    name={item.icon as any}
                    color={item.danger ? Palette.danger : colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: item.danger ? Palette.danger : colors.text }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.xs,
  },
  logoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: Spacing.md,
  },
  dropdown: {
    width: 280,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  dropdownHeader: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
