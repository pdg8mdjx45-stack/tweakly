/**
 * Product Recommender Service
 * Regelgebaseerde logica voor automatische productaanbevelingen op basis van
 * gebruikersvoorkeuren per categorie.
 */

import type { Product } from '../constants/mock-data';
import { getProductsByCategory } from './product-db';

// ─── Types ───────────────────────────────────────────────────────────────────-

export type CategoryId = 'smartphones' | 'laptops' | 'audio' | 'televisies' | 'gaming' | 'wearables';

export interface RecommenderQuestion {
  id: string;
  question: string;
  options: {
    value: string;
    label: string;
    emoji?: string;
  }[];
}

export interface RecommenderPreferences {
  [key: string]: string;
}

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  emoji: string;
  questions: RecommenderQuestion[];
  filterFunction: (products: Product[], prefs: RecommenderPreferences) => Product[];
}

// ─── Category Configurations ─────────────────────────────────────────────────

const SMARTPHONE_QUESTIONS: RecommenderQuestion[] = [
  {
    id: 'budget',
    question: 'Wat is je budget?',
    options: [
      { value: 'budget', label: 'Tot €300', emoji: '💶' },
      { value: 'mid', label: '€300 - €600', emoji: '💰' },
      { value: 'premium', label: '€600 - €1000', emoji: '💎' },
      { value: 'flagship', label: '€1000+', emoji: '👑' },
    ],
  },
  {
    id: 'usage',
    question: 'Waar gebruik je je telefoon vooral voor?',
    options: [
      { value: 'basic', label: 'Bellen, WhatsApp, social media', emoji: '📱' },
      { value: 'photo', label: 'Foto\'s en video\'s', emoji: '📸' },
      { value: 'gaming', label: 'Gaming', emoji: '🎮' },
      { value: 'business', label: 'Werk en productiviteit', emoji: '💼' },
    ],
  },
  {
    id: 'ecosystem',
    question: 'Welk ecosysteem prefereer je?',
    options: [
      { value: 'ios', label: 'iOS (Apple)', emoji: '🍎' },
      { value: 'android', label: 'Android', emoji: '🤖' },
      { value: 'no-preference', label: 'Geen voorkeur', emoji: '🤷' },
    ],
  },
  {
    id: 'size',
    question: 'Welke schermgrootte prefereer je?',
    options: [
      { value: 'compact', label: 'Compact (<6 inch)', emoji: '👌' },
      { value: 'standard', label: 'Standaard (6-6.5 inch)', emoji: '📱' },
      { value: 'large', label: 'Groot (6.5+ inch)', emoji: '📲' },
    ],
  },
];

const LAPTOP_QUESTIONS: RecommenderQuestion[] = [
  {
    id: 'budget',
    question: 'Wat is je budget?',
    options: [
      { value: 'budget', label: 'Tot €500', emoji: '💶' },
      { value: 'mid', label: '€500 - €1000', emoji: '💰' },
      { value: 'premium', label: '€1000 - €2000', emoji: '💎' },
      { value: 'pro', label: '€2000+', emoji: '👑' },
    ],
  },
  {
    id: 'usage',
    question: 'Waarvoor gebruik je je laptop?',
    options: [
      { value: 'school', label: 'School/Office', emoji: '📚' },
      { value: 'creative', label: 'Video/foto bewerking', emoji: '🎬' },
      { value: 'gaming', label: 'Gaming', emoji: '🎮' },
      { value: 'business', label: 'Zakelijk', emoji: '💼' },
    ],
  },
  {
    id: 'os',
    question: 'Welk besturingssysteem?',
    options: [
      { value: 'windows', label: 'Windows', emoji: '🪟' },
      { value: 'macos', label: 'macOS', emoji: '🍎' },
      { value: 'linux', label: 'Linux/ChromeOS', emoji: '🐧' },
    ],
  },
  {
    id: 'portable',
    question: 'Hoe belangrijk is mobiliteit?',
    options: [
      { value: 'desktop', label: 'Vaste werkplek', emoji: '🖥️' },
      { value: 'balanced', label: 'Mix thuis en onderweg', emoji: '⚖️' },
      { value: 'ultraportable', label: 'Altijd onderweg', emoji: '✈️' },
    ],
  },
];

const AUDIO_QUESTIONS: RecommenderQuestion[] = [
  {
    id: 'type',
    question: 'Welk type audio?',
    options: [
      { value: 'overear', label: 'Over-ear koptelefoon', emoji: '🎧' },
      { value: 'in ear', label: 'In-ear/True wireless', emoji: '🎵' },
      { value: 'speaker', label: 'Bluetooth speaker', emoji: '🔊' },
    ],
  },
  {
    id: 'budget',
    question: 'Wat is je budget?',
    options: [
      { value: 'budget', label: 'Tot €100', emoji: '💶' },
      { value: 'mid', label: '€100 - €300', emoji: '💰' },
      { value: 'premium', label: '€300 - €700', emoji: '💎' },
      { value: 'audiophile', label: '€700+', emoji: '👑' },
    ],
  },
  {
    id: 'anc',
    question: 'Wil je ruisonderdrukking (ANC)?',
    options: [
      { value: 'yes', label: 'Ja, belangrijk', emoji: '🔇' },
      { value: 'no', label: 'Niet nodig', emoji: '🔉' },
    ],
  },
  {
    id: 'use',
    question: 'Hoofdzakelijk gebruikt voor?',
    options: [
      { value: 'commute', label: 'Onderweg', emoji: '🚇' },
      { value: 'home', label: 'Thuis', emoji: '🏠' },
      { value: 'sport', label: 'Sport', emoji: '🏃' },
      { value: 'work', label: 'Werk/Kantoor', emoji: '💼' },
    ],
  },
];

const TELEVISIE_QUESTIONS: RecommenderQuestion[] = [
  {
    id: 'size',
    question: 'Welke schermgrootte?',
    options: [
      { value: 'small', label: '32-43 inch', emoji: '📺' },
      { value: 'medium', label: '48-55 inch', emoji: '📱' },
      { value: 'large', label: '55-65 inch', emoji: '🎬' },
      { value: 'xl', label: '65+ inch ( Cinema)', emoji: '🏠' },
    ],
  },
  {
    id: 'budget',
    question: 'Wat is je budget?',
    options: [
      { value: 'budget', label: 'Tot €500', emoji: '💶' },
      { value: 'mid', label: '€500 - €1500', emoji: '💰' },
      { value: 'premium', label: '€1500 - €3000', emoji: '💎' },
      { value: 'oled', label: '€3000+ (OLED)', emoji: '👑' },
    ],
  },
  {
    id: 'usage',
    question: 'Waar kijk je vooral naar?',
    options: [
      { value: 'movies', label: 'Films en series', emoji: '🎬' },
      { value: 'sports', label: 'Sport', emoji: '⚽' },
      { value: 'gaming', label: 'Gaming', emoji: '🎮' },
      { value: 'mixed', label: 'Alles gemixed', emoji: '📺' },
    ],
  },
  {
    id: 'tech',
    question: 'Welke techniek prefereer je?',
    options: [
      { value: 'led', label: 'LED/LCD', emoji: '💡' },
      { value: 'qled', label: 'QLED', emoji: '✨' },
      { value: 'oled', label: 'OLED', emoji: '🌟' },
      { value: 'no-preference', label: 'Geen voorkeur', emoji: '🤷' },
    ],
  },
];

const GAMING_QUESTIONS: RecommenderQuestion[] = [
  {
    id: 'type',
    question: 'Welk type gaming?',
    options: [
      { value: 'console', label: 'Console (PlayStation/Xbox/Switch)', emoji: '🎮' },
      { value: 'pc', label: 'PC Gaming', emoji: '🖥️' },
      { value: 'handheld', label: 'Handheld', emoji: '🎲' },
      { value: 'accessories', label: 'Accessoires', emoji: '🕹️' },
    ],
  },
  {
    id: 'budget',
    question: 'Wat is je budget?',
    options: [
      { value: 'budget', label: 'Tot €300', emoji: '💶' },
      { value: 'mid', label: '€300 - €700', emoji: '💰' },
      { value: 'premium', label: '€700 - €1500', emoji: '💎' },
      { value: 'ultimate', label: '€1500+', emoji: '👑' },
    ],
  },
  {
    id: 'priority',
    question: 'Wat is belangrijk?',
    options: [
      { value: 'performance', label: 'Prestaties', emoji: '🚀' },
      { value: 'portability', label: 'Draagbaarheid', emoji: '✈️' },
      { value: 'exclusives', label: 'Exclusieve games', emoji: '🎯' },
      { value: 'vr', label: 'VR Gaming', emoji: '🥽' },
    ],
  },
];

const WEARABLES_QUESTIONS: RecommenderQuestion[] = [
  {
    id: 'type',
    question: 'Welk type wearable?',
    options: [
      { value: 'smartwatch', label: 'Smartwatch', emoji: '⌚' },
      { value: 'fitness', label: 'Fitness tracker', emoji: '💪' },
      { value: 'rings', label: 'Smart ring', emoji: '💍' },
    ],
  },
  {
    id: 'ecosystem',
    question: 'Welk ecosysteem?',
    options: [
      { value: 'apple', label: 'Apple Watch', emoji: '🍎' },
      { value: 'galaxy', label: 'Samsung Galaxy Watch', emoji: '📱' },
      { value: 'other', label: 'Anders/Universeleel', emoji: '🤖' },
    ],
  },
  {
    id: 'budget',
    question: 'Wat is je budget?',
    options: [
      { value: 'budget', label: 'Tot €150', emoji: '💶' },
      { value: 'mid', label: '€150 - €350', emoji: '💰' },
      { value: 'premium', label: '€350 - €700', emoji: '💎' },
      { value: 'ultra', label: '€700+', emoji: '👑' },
    ],
  },
  {
    id: 'features',
    question: 'Welke features zijn belangrijk?',
    options: [
      { value: 'health', label: 'Gezondheid/Slaap', emoji: '❤️' },
      { value: 'fitness', label: 'Sport/Fitness', emoji: '🏃' },
      { value: 'notifications', label: 'Meldingen', emoji: '🔔' },
      { value: 'all', label: 'Alles', emoji: '✨' },
    ],
  },
];

// ─── Filter Functions ────────────────────────────────────────────────────────

function filterSmartphones(products: Product[], prefs: RecommenderPreferences): Product[] {
  let filtered = [...products];
  
  // Budget filter
  const budgetMap: Record<string, [number, number]> = {
    'budget': [0, 300],
    'mid': [300, 600],
    'premium': [600, 1000],
    'flagship': [1000, 99999],
  };
  const [minBudget, maxBudget] = budgetMap[prefs.budget] || [0, 99999];
  filtered = filtered.filter(p => p.currentPrice >= minBudget && p.currentPrice <= maxBudget);
  
  // OS preference
  if (prefs.ecosystem === 'ios') {
    filtered = filtered.filter(p => /iphone|apple/i.test(p.name));
  } else if (prefs.ecosystem === 'android') {
    filtered = filtered.filter(p => !/iphone|apple/i.test(p.name));
  }
  
  // Size preference
  if (prefs.size === 'compact') {
    filtered = filtered.filter(p => /5\.|5,|4\.|4,|se mini/i.test(p.name) || p.currentPrice < 400);
  } else if (prefs.size === 'large') {
    filtered = filtered.filter(p => /pro max|ultra|plus|6\.[7-9]|7\./i.test(p.name) || p.currentPrice > 800);
  }
  
  // Sort by rating
  return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

function filterLaptops(products: Product[], prefs: RecommenderPreferences): Product[] {
  let filtered = [...products];
  
  // Budget filter
  const budgetMap: Record<string, [number, number]> = {
    'budget': [0, 500],
    'mid': [500, 1000],
    'premium': [1000, 2000],
    'pro': [2000, 99999],
  };
  const [minBudget, maxBudget] = budgetMap[prefs.budget] || [0, 99999];
  filtered = filtered.filter(p => p.currentPrice >= minBudget && p.currentPrice <= maxBudget);
  
  // OS filter
  if (prefs.os === 'macos') {
    filtered = filtered.filter(p => /macbook|apple/i.test(p.name));
  } else if (prefs.os === 'windows') {
    filtered = filtered.filter(p => !/macbook|apple/i.test(p.name));
  }
  
  // Usage filter
  if (prefs.usage === 'gaming') {
    filtered = filtered.filter(p => /gaming|rog|strix|omen|legion|razer|alienware/i.test(p.name));
  } else if (prefs.usage === 'creative') {
    filtered = filtered.filter(p => /macbook|pro|studio|zenbook|creator/i.test(p.name) || /i7|i9|ryzen 7|ryzen 9/i.test(p.specs?.processor || ''));
  }
  
  // Portability
  if (prefs.portable === 'ultraportable') {
    filtered = filtered.filter(p => /air|ultrabook|13\.|14\.|gram|swift/i.test(p.name) || p.currentPrice > 800);
  } else if (prefs.portable === 'desktop') {
    filtered = filtered.filter(p => /17\.|gaming|pro|workstation/i.test(p.name));
  }
  
  return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

function filterAudio(products: Product[], prefs: RecommenderPreferences): Product[] {
  let filtered = [...products];
  
  // Type filter
  if (prefs.type === 'overear') {
    filtered = filtered.filter(p => /over-ear|headphone|kopfhörer/i.test(p.name) || /wh-|1000xm|bose 700|px[789]/i.test(p.name));
  } else if (prefs.type === 'in ear') {
    filtered = filtered.filter(p => /in-ear|earbud|true wireless|airpod|galaxy bud|wf-|momentum wireless/i.test(p.name));
  } else if (prefs.type === 'speaker') {
    filtered = filtered.filter(p => /speaker|homepod|echo|sonos|flip|charge|blast/i.test(p.name));
  }
  
  // Budget filter
  const budgetMap: Record<string, [number, number]> = {
    'budget': [0, 100],
    'mid': [100, 300],
    'premium': [300, 700],
    'audiophile': [700, 99999],
  };
  const [minBudget, maxBudget] = budgetMap[prefs.budget] || [0, 99999];
  filtered = filtered.filter(p => p.currentPrice >= minBudget && p.currentPrice <= maxBudget);
  
  return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

function filterTelevisies(products: Product[], prefs: RecommenderPreferences): Product[] {
  let filtered = [...products];
  
  // Size filter
  const sizeMap: Record<string, string[]> = {
    'small': ['32', '40', '43'],
    'medium': ['48', '50', '55'],
    'large': ['55', '60', '65'],
    'xl': ['70', '75', '77', '80', '82', '85'],
  };
  const sizes = sizeMap[prefs.size] || [];
  if (sizes.length > 0) {
    filtered = filtered.filter(p => sizes.some(s => p.name.includes(s + '"') || p.name.includes(s + ' inch')));
  }
  
  // Budget filter
  const budgetMap: Record<string, [number, number]> = {
    'budget': [0, 500],
    'mid': [500, 1500],
    'premium': [1500, 3000],
    'oled': [3000, 99999],
  };
  const [minBudget, maxBudget] = budgetMap[prefs.budget] || [0, 99999];
  filtered = filtered.filter(p => p.currentPrice >= minBudget && p.currentPrice <= maxBudget);
  
  // Tech preference
  if (prefs.tech === 'oled') {
    filtered = filtered.filter(p => /oled|organic|quantum/i.test(p.name) || p.currentPrice > 1500);
  } else if (prefs.tech === 'qled') {
    filtered = filtered.filter(p => /qled|quantum|neo qled/i.test(p.name));
  } else if (prefs.tech === 'led') {
    filtered = filtered.filter(p => !/oled|qled/i.test(p.name));
  }
  
  return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

function filterGaming(products: Product[], prefs: RecommenderPreferences): Product[] {
  let filtered = [...products];
  
  // Type filter
  if (prefs.type === 'console') {
    filtered = filtered.filter(p => /playstation|ps[45]|xbox|switch|nintendo/i.test(p.name));
  } else if (prefs.type === 'pc') {
    filtered = filtered.filter(p => /gpu|graphics|rtx|radeon|geforce/i.test(p.name) || /pc\s?build|custom\s?pc/i.test(p.name.toLowerCase()));
  } else if (prefs.type === 'handheld') {
    filtered = filtered.filter(p => /steam\s?deck|rog\s?ally|switch\s?oled|retroid|anbernic/i.test(p.name));
  }
  
  // Budget filter
  const budgetMap: Record<string, [number, number]> = {
    'budget': [0, 300],
    'mid': [300, 700],
    'premium': [700, 1500],
    'ultimate': [1500, 99999],
  };
  const [minBudget, maxBudget] = budgetMap[prefs.budget] || [0, 99999];
  filtered = filtered.filter(p => p.currentPrice >= minBudget && p.currentPrice <= maxBudget);
  
  return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

function filterWearables(products: Product[], prefs: RecommenderPreferences): Product[] {
  let filtered = [...products];
  
  // Type filter
  if (prefs.type === 'smartwatch') {
    filtered = filtered.filter(p => /watch|smartwatch/i.test(p.name));
  } else if (prefs.type === 'fitness') {
    filtered = filtered.filter(p => /fitness|tracker|band|whoop|charge|fitbit/i.test(p.name));
  } else if (prefs.type === 'rings') {
    filtered = filtered.filter(p => /ring|ouraring|smart\s?ring/i.test(p.name));
  }
  
  // Ecosystem
  if (prefs.ecosystem === 'apple') {
    filtered = filtered.filter(p => /apple\s?watch|watch\s?ultra/i.test(p.name));
  } else if (prefs.ecosystem === 'galaxy') {
    filtered = filtered.filter(p => /galaxy\s?watch|galaxy\s?fit|watch\s?active/i.test(p.name));
  }
  
  // Budget filter
  const budgetMap: Record<string, [number, number]> = {
    'budget': [0, 150],
    'mid': [150, 350],
    'premium': [350, 700],
    'ultra': [700, 99999],
  };
  const [minBudget, maxBudget] = budgetMap[prefs.budget] || [0, 99999];
  filtered = filtered.filter(p => p.currentPrice >= minBudget && p.currentPrice <= maxBudget);
  
  return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

// ─── Category Configs ────────────────────────────────────────────────────────

export const CATEGORY_CONFIGS: Record<CategoryId, CategoryConfig> = {
  smartphones: {
    id: 'smartphones',
    name: 'Smartphones',
    emoji: '📱',
    questions: SMARTPHONE_QUESTIONS,
    filterFunction: filterSmartphones,
  },
  laptops: {
    id: 'laptops',
    name: 'Laptops',
    emoji: '💻',
    questions: LAPTOP_QUESTIONS,
    filterFunction: filterLaptops,
  },
  audio: {
    id: 'audio',
    name: 'Audio',
    emoji: '🎧',
    questions: AUDIO_QUESTIONS,
    filterFunction: filterAudio,
  },
  televisies: {
    id: 'televisies',
    name: 'TV\'s',
    emoji: '📺',
    questions: TELEVISIE_QUESTIONS,
    filterFunction: filterTelevisies,
  },
  gaming: {
    id: 'gaming',
    name: 'Gaming',
    emoji: '🎮',
    questions: GAMING_QUESTIONS,
    filterFunction: filterGaming,
  },
  wearables: {
    id: 'wearables',
    name: 'Wearables',
    emoji: '⌚',
    questions: WEARABLES_QUESTIONS,
    filterFunction: filterWearables,
  },
};

// ─── Main Recommendation Function ────────────────────────────────────────────

export async function getRecommendations(
  categoryId: CategoryId,
  preferences: RecommenderPreferences
): Promise<Product[]> {
  const config = CATEGORY_CONFIGS[categoryId];
  if (!config) {
    console.warn(`Unknown category: ${categoryId}`);
    return [];
  }
  
  // Fetch products for this category
  const products = await getProductsByCategory(config.name);
  
  if (products.length === 0) {
    return [];
  }
  
  // Apply filters based on preferences
  const filtered = config.filterFunction(products, preferences);
  
  // Return top 5 recommendations
  return filtered.slice(0, 5);
}

export function getCategoryConfig(categoryId: CategoryId): CategoryConfig | undefined {
  return CATEGORY_CONFIGS[categoryId];
}
