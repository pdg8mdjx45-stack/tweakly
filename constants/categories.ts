// constants/categories.ts

export type SubCategory = {
  id: string;
  name: string;
  icon: string;   // MaterialIcons naam
  color: string;
};

export type MainCategory = {
  id: string;
  name: string;
  icon: string;   // MaterialIcons naam
  color: string;
  gradient: [string, string];
  subcategories: SubCategory[];
};

export const MAIN_CATEGORIES: MainCategory[] = [
  {
    id: 'elektronica',
    name: 'Elektronica',
    icon: 'devices',
    color: '#007AFF',
    gradient: ['#007AFF', '#0055CC'],
    subcategories: [
      { id: 'Smartphones',         name: 'Smartphones',       icon: 'smartphone',       color: '#007AFF' },
      { id: 'Laptops',             name: 'Laptops',           icon: 'laptop',           color: '#5856D6' },
      { id: 'Tablets',             name: 'Tablets',           icon: 'tablet-mac',       color: '#5856D6' },
      { id: 'Audio',               name: 'Audio',             icon: 'headphones',       color: '#FF2D55' },
      { id: 'Televisies',          name: 'Televisies',        icon: 'tv',               color: '#FF9500' },
      { id: 'Gaming',              name: 'Gaming',            icon: 'sports-esports',   color: '#34C759' },
      { id: 'Gameconsoles',        name: 'Gameconsoles',      icon: 'gamepad',          color: '#34C759' },
      { id: 'Wearables',           name: 'Wearables',         icon: 'watch',            color: '#AF52DE' },
      { id: 'Fotografie',          name: 'Fotografie',        icon: 'photo-camera',     color: '#AF52DE' },
      { id: 'Netwerk',             name: 'Netwerk',           icon: 'router',           color: '#007AFF' },
      { id: 'Huishoudelijk',       name: 'Huishoudelijk',     icon: 'home',             color: '#FF9500' },
      { id: 'Grafische kaarten',   name: 'Grafische kaarten', icon: 'memory',           color: '#34C759' },
      { id: 'Processors',          name: 'Processors',        icon: 'developer-board',  color: '#FF2D55' },
      { id: 'Moederborden',        name: 'Moederborden',      icon: 'developer-board',  color: '#5856D6' },
      { id: 'Geheugen',            name: 'Geheugen',          icon: 'memory',           color: '#FF2D55' },
      { id: 'Opslag (SSD)',        name: 'Opslag (SSD)',      icon: 'sd-storage',       color: '#34C759' },
      { id: 'Opslag (HDD)',        name: 'Opslag (HDD)',      icon: 'album',            color: '#34C759' },
      { id: 'Monitoren',           name: 'Monitoren',         icon: 'monitor',          color: '#FF9500' },
      { id: 'Toetsenborden',       name: 'Toetsenborden',     icon: 'keyboard',         color: '#2C2C2E' },
      { id: 'Muizen',              name: 'Muizen',            icon: 'mouse',            color: '#2C2C2E' },
      { id: 'Luidsprekers',        name: 'Luidsprekers',      icon: 'speaker',          color: '#FF2D55' },
      { id: 'Webcams',             name: 'Webcams',           icon: 'videocam',         color: '#AF52DE' },
    ],
  },
  {
    id: 'kleding',
    name: 'Kleding',
    icon: 'checkroom',
    color: '#FF2D55',
    gradient: ['#FF2D55', '#CC0033'],
    subcategories: [
      { id: 'Heren',        name: 'Heren',        icon: 'man',            color: '#FF2D55' },
      { id: 'Dames',        name: 'Dames',        icon: 'woman',          color: '#FF2D55' },
      { id: 'Kinderen',     name: 'Kinderen',     icon: 'child-care',     color: '#FF2D55' },
      { id: 'Sportkleding', name: 'Sportkleding', icon: 'fitness-center', color: '#FF2D55' },
    ],
  },
  {
    id: 'schoenen',
    name: 'Schoenen',
    icon: 'directions-walk',
    color: '#FF9500',
    gradient: ['#FF9500', '#CC7700'],
    subcategories: [
      { id: 'Sneakers',      name: 'Sneakers',      icon: 'directions-run', color: '#FF9500' },
      { id: 'Laarzen',       name: 'Laarzen',       icon: 'hiking',         color: '#FF9500' },
      { id: 'Sandalen',      name: 'Sandalen',      icon: 'beach-access',   color: '#FF9500' },
      { id: 'Sportschoenen', name: 'Sportschoenen', icon: 'directions-run', color: '#FF9500' },
    ],
  },
  {
    id: 'sport',
    name: 'Sport & Outdoor',
    icon: 'fitness-center',
    color: '#34C759',
    gradient: ['#34C759', '#1A9E3F'],
    subcategories: [
      { id: 'Fitness',    name: 'Fitness',    icon: 'fitness-center',  color: '#34C759' },
      { id: 'Wielrennen', name: 'Wielrennen', icon: 'directions-bike', color: '#34C759' },
      { id: 'Hardlopen',  name: 'Hardlopen',  icon: 'directions-run',  color: '#34C759' },
      { id: 'Kamperen',   name: 'Kamperen',   icon: 'outdoor-grill',   color: '#34C759' },
    ],
  },
  {
    id: 'wonen',
    name: 'Wonen & Tuin',
    icon: 'chair',
    color: '#5856D6',
    gradient: ['#5856D6', '#3634A3'],
    subcategories: [
      { id: 'Meubels',     name: 'Meubels',     icon: 'chair',   color: '#5856D6' },
      { id: 'Verlichting', name: 'Verlichting', icon: 'light',   color: '#5856D6' },
      { id: 'Keuken',      name: 'Keuken',      icon: 'kitchen', color: '#5856D6' },
      { id: 'Tuin',        name: 'Tuin',        icon: 'yard',    color: '#5856D6' },
    ],
  },
  {
    id: 'beauty',
    name: 'Beauty',
    icon: 'spa',
    color: '#AF52DE',
    gradient: ['#AF52DE', '#8833BB'],
    subcategories: [
      { id: 'Huidverzorging', name: 'Huidverzorging', icon: 'face',        color: '#AF52DE' },
      { id: 'Haarverzorging', name: 'Haarverzorging', icon: 'content-cut', color: '#AF52DE' },
      { id: 'Parfum',         name: 'Parfum',         icon: 'spa',         color: '#AF52DE' },
    ],
  },
  {
    id: 'speelgoed',
    name: 'Speelgoed & Baby',
    icon: 'toys',
    color: '#FF6B35',
    gradient: ['#FF6B35', '#CC4A14'],
    subcategories: [
      { id: 'Speelgoed', name: 'Speelgoed', icon: 'toys',       color: '#FF6B35' },
      { id: 'Baby',      name: 'Baby',      icon: 'child-care', color: '#FF6B35' },
    ],
  },
  {
    id: 'boeken',
    name: 'Boeken & Media',
    icon: 'menu-book',
    color: '#8E8E93',
    gradient: ['#8E8E93', '#636366'],
    subcategories: [
      { id: 'Boeken', name: 'Boeken', icon: 'menu-book', color: '#8E8E93' },
      { id: 'Films',  name: 'Films',  icon: 'movie',     color: '#8E8E93' },
      { id: 'Muziek', name: 'Muziek', icon: 'music-note', color: '#8E8E93' },
    ],
  },
];

/** Zoek hoofdcategorie op id */
export function getMainCategory(id: string): MainCategory | undefined {
  return MAIN_CATEGORIES.find(m => m.id === id);
}

/** Zoek hoofdcategorie op basis van subcategorie-id */
export function getMainCategoryForSub(subId: string): MainCategory | undefined {
  return MAIN_CATEGORIES.find(m => m.subcategories.some(s => s.id === subId));
}
