// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'magnifyingglass': 'search',
  'bell.fill': 'notifications',
  'square.grid.2x2.fill': 'grid-view',
  'person.fill': 'person',

  // Actions
  'paperplane.fill': 'send',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'bookmark': 'bookmark-border',
  'bookmark.fill': 'bookmark',
  'bell': 'notifications-none',
  'bell.badge.fill': 'notifications-active',
  'plus': 'add',
  'xmark': 'close',
  'checkmark': 'check',
  'trash': 'delete',
  'square.and.arrow.up': 'share',
  'slider.horizontal.3': 'tune',

  // Navigation arrows
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',

  // Product / shop
  'cart': 'shopping-cart',
  'cart.fill': 'shopping-cart',
  'tag': 'sell',
  'tag.fill': 'sell',
  'star': 'star-border',
  'star.fill': 'star',
  'chart.xyaxis.line': 'show-chart',
  'arrow.down.right': 'trending-down',
  'arrow.up.right': 'trending-up',
  'info.circle': 'info',
  'ellipsis': 'more-horiz',

  // Settings / profile
  'gear': 'settings',
  'person.crop.circle': 'account-circle',
  'envelope': 'email',
  'lock': 'lock',
  'questionmark.circle': 'help',
  'moon': 'dark-mode',
  'bell.slash': 'notifications-off',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
