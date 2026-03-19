// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;

const MAPPING: IconMapping = {
  // Navigation
  'house.fill': 'home',
  house: 'home',
  magnifyingglass: 'search',
  'bell.fill': 'notifications',
  bell: 'notifications-none',
  'square.grid.2x2.fill': 'grid-view',
  'person.fill': 'person',

  // Actions
  'paperplane.fill': 'send',
  heart: 'favorite-border',
  'heart.fill': 'favorite',
  bookmark: 'bookmark-border',
  'bookmark.fill': 'bookmark',
  'bell.badge.fill': 'notifications-active',
  plus: 'add',
  xmark: 'close',
  'xmark.circle.fill': 'cancel',
  checkmark: 'check',
  trash: 'delete',
  'square.and.arrow.up': 'share',
  'slider.horizontal.3': 'tune',
  pencil: 'edit',
  safari: 'language',
  'exclamationmark.triangle': 'warning',
  'exclamationmark.triangle.fill': 'warning',

  // Navigation arrows
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',

  // Product / shop
  cart: 'shopping-cart',
  'cart.fill': 'shopping-cart',
  tag: 'sell',
  'tag.fill': 'sell',
  star: 'star-border',
  'star.fill': 'star',
  'chart.xyaxis.line': 'show-chart',
  'chart.line.uptrend.xyaxis': 'show-chart',
  'arrow.down.right': 'trending-down',
  'arrow.up.right': 'trending-up',
  'arrow.up.right.and.arrow.down.right': 'trending-flat',
  'info.circle': 'info',
  'info.circle.fill': 'info',
  ellipsis: 'more-horiz',
  'ellipsis.circle': 'more-horiz',

  // Settings / profile
  gear: 'settings',
  'person.crop.circle': 'account-circle',
  envelope: 'email',
  'envelope.fill': 'email',
  lock: 'lock',
  'lock.fill': 'lock',
  'questionmark.circle': 'help',
  moon: 'dark-mode',
  'moon.fill': 'dark-mode',
  'bell.slash': 'notifications-off',
  'figure.walk': 'directions-walk',

  // Media / content
  newspaper: 'article',
  'newspaper.fill': 'article',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'speaker.wave.2.fill': 'volume-up',
  'speaker.slash.fill': 'volume-off',
  photo: 'image',
  link: 'link',
  'link.circle': 'link',

  // Social / communication
  'bubble.left.fill': 'chat',
  'bubble.right.fill': 'chat',
  'person.2.fill': 'group',

  // Categories
  'folder.fill': 'folder',
  archivebox: 'inventory-2',
  'megaphone.fill': 'campaign',
  'lightbulb.fill': 'lightbulb',
  'flame.fill': 'whatshot',
  'bolt.fill': 'flash-on',

  // Comparison / stats
  'scale.3d': 'compare-arrows',
  'arrow.left.arrow.right': 'swap-horiz',
  'arrow.right': 'arrow-forward',
  'chart.bar.fill': 'bar-chart',
  'chart.pie.fill': 'pie-chart',

  // Settings variations
  gearshape: 'settings',
  'gearshape.fill': 'settings',
  'rectangle.portrait.and.arrow.right': 'logout',
  'person.crop.circle.badge.plus': 'person-add',
  'plus.circle.fill': 'add-circle',
  'minus.circle.fill': 'remove-circle',
  'arrow.clockwise': 'refresh',
  'arrow.counterclockwise': 'replay',
  'square.and.arrow.down': 'download',
  'square.and.pencil': 'upload',
  'doc.text': 'description',
  'doc.text.fill': 'description',
  clock: 'access-time',
  calendar: 'event',
  globe: 'language',
  wifi: 'wifi',
  'wifi.slash': 'wifi-off',
  'battery.100': 'battery-full',
  'battery.50': 'battery-5-bar',
  bolt: 'flash-on',
  flame: 'whatshot',
  drop: 'water-drop',
  'drop.fill': 'water-drop',
  'sun.max': 'wb-sunny',
  eye: 'visibility',
  'eye.slash': 'visibility-off',
  'hand.raised': 'pan-tool',
  'star.circle': 'star-rate',
  'heart.circle': 'favorite',
  flag: 'flag',
  'flag.fill': 'flag',
  pin: 'push-pin',
  'pin.fill': 'push-pin',
  mappin: 'location-on',
  map: 'map',
  'building.2': 'business',
  'cart.badge.plus': 'add-shopping-cart',
  creditcard: 'credit-card',
  banknote: 'money',
  percent: 'percent',
  'arrow.up.arrow.down': 'sort',
  'list.bullet': 'list',
  'line.3.horizontal': 'reorder',
  'square.grid.3x3': 'grid-on',
  'puzzlepiece.extension': 'extension',
  'wrench.and.screwdriver': 'build',
  hammer: 'construction',
  paintbrush: 'brush',
  'pencil.and.ruler': 'edit',
  scissors: 'content-cut',
  'doc.on.doc': 'content-copy',
  'trash.fill': 'delete',
  'xmark.circle': 'cancel',
  'checkmark.circle': 'check-circle',
  'checkmark.seal': 'verified',
  questionmark: 'help-outline',
  exclamationmark: 'error-outline',
  info: 'info',
  lightbulb: 'lightbulb-outline',
  megaphone: 'campaign',
  'bell.badge': 'notification-important',
  
  // Device / hardware icons - matching mock-data.ts
  smartphone: 'smartphone',
  tablet: 'tablet',
  'tablet-mac': 'tablet',
  laptop: 'laptop',
  computer: 'computer',
  'desktop-windows': 'computer',
  monitor: 'monitor',
  tv: 'tv',
  headphones: 'headphones',
  'sports-esports': 'sports-esports',
  gamepad: 'gamepad',
  'camera-alt': 'photo-camera',
  'photo-camera': 'photo-camera',
  home: 'home',
  watch: 'watch',
  memory: 'memory',
  developer: 'memory',
  'developer-board': 'memory',
  storage: 'storage',
  'sd-storage': 'sd-card',
  album: 'photo-library',
  'ac-unit': 'ac-unit',
  air: 'air',
  keyboard: 'keyboard',
  mouse: 'mouse',
  videocam: 'videocam',
  speaker: 'speaker',
  print: 'print',
  cable: 'cable',
  router: 'router',
  power: 'power',
  'inventory-2': 'inventory-2',
  square: 'square',
  'square.grid.2x2': 'grid-view',
  apps: 'apps',
  
  // Additional common icons
  category: 'category',
  devices: 'devices',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] || 'category';
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
