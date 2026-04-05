# Breed Assortiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tweakly uitbreiden van puur tech naar breed consumentenprijsvergelijker met hoofdcategorie → subcategorie hiërarchie en ~40 nieuwe mock-producten.

**Architecture:** Nieuw `constants/categories.ts` definieert de volledige twee-niveau categorieboom. `Product` type krijgt `mainCategory` veld. `app/(tabs)/prijzen.tsx` krijgt twee-staps navigatie: hoofdcategorie-grid → subcategorie+producten. Home categoriestrip toont hoofdcategorieën.

**Tech Stack:** React Native / Expo, TypeScript, Reanimated (FadeInDown), MaterialIcons, bestaande `ClearLiquidGlass` + `ProductCard` componenten.

---

## Bestandsoverzicht

| Bestand | Actie | Verantwoordelijkheid |
|---|---|---|
| `constants/categories.ts` | Nieuw | Volledige categorieboom: MainCategory + SubCategory types en data |
| `constants/mock-data.ts` | Wijzig | `mainCategory` op alle bestaande producten, ~40 nieuwe producten |
| `constants/affiliate-shops.ts` | Wijzig | `mainCategories` veld, Zalando Lounge toevoegen, `getShopsForCategory()` |
| `services/product-db.ts` | Wijzig | `getProductsByMainCategory()` + `getProductsBySubCategory()` functies |
| `app/(tabs)/prijzen.tsx` | Wijzig | Twee-staps navigatie: hoofdcategorie-grid (stap 1) → subcategorie+producten (stap 2) |
| `app/(tabs)/index.tsx` | Wijzig | Categoriestrip toont 6 hoofdcategorieën i.p.v. tech-subcategorieën |

---

## Task 1: `constants/categories.ts` — categorieboom

**Files:**
- Create: `constants/categories.ts`

- [ ] **Stap 1: Maak het bestand aan**

```ts
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
      { id: 'Heren',       name: 'Heren',       icon: 'man',          color: '#FF2D55' },
      { id: 'Dames',       name: 'Dames',       icon: 'woman',        color: '#FF2D55' },
      { id: 'Kinderen',    name: 'Kinderen',    icon: 'child-care',   color: '#FF2D55' },
      { id: 'Sportkleding',name: 'Sportkleding',icon: 'fitness-center',color: '#FF2D55' },
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
      { id: 'Sandalen',      name: 'Sandalen',       icon: 'beach-access',   color: '#FF9500' },
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
      { id: 'Fitness',    name: 'Fitness',    icon: 'fitness-center', color: '#34C759' },
      { id: 'Wielrennen', name: 'Wielrennen', icon: 'directions-bike',color: '#34C759' },
      { id: 'Hardlopen',  name: 'Hardlopen',  icon: 'directions-run', color: '#34C759' },
      { id: 'Kamperen',   name: 'Kamperen',   icon: 'outdoor-grill',  color: '#34C759' },
    ],
  },
  {
    id: 'wonen',
    name: 'Wonen & Tuin',
    icon: 'chair',
    color: '#5856D6',
    gradient: ['#5856D6', '#3634A3'],
    subcategories: [
      { id: 'Meubels',     name: 'Meubels',     icon: 'chair',         color: '#5856D6' },
      { id: 'Verlichting', name: 'Verlichting', icon: 'light',         color: '#5856D6' },
      { id: 'Keuken',      name: 'Keuken',      icon: 'kitchen',       color: '#5856D6' },
      { id: 'Tuin',        name: 'Tuin',        icon: 'yard',          color: '#5856D6' },
    ],
  },
  {
    id: 'beauty',
    name: 'Beauty',
    icon: 'spa',
    color: '#AF52DE',
    gradient: ['#AF52DE', '#8833BB'],
    subcategories: [
      { id: 'Huidverzorging', name: 'Huidverzorging', icon: 'face',     color: '#AF52DE' },
      { id: 'Haarverzorging', name: 'Haarverzorging', icon: 'content-cut', color: '#AF52DE' },
      { id: 'Parfum',         name: 'Parfum',         icon: 'spa',      color: '#AF52DE' },
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
      { id: 'Boeken', name: 'Boeken', icon: 'menu-book',    color: '#8E8E93' },
      { id: 'Films',  name: 'Films',  icon: 'movie',        color: '#8E8E93' },
      { id: 'Muziek', name: 'Muziek', icon: 'music-note',   color: '#8E8E93' },
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
```

- [ ] **Stap 2: Commit**

```bash
git add constants/categories.ts
git commit -m "feat: add categories.ts with main/sub category tree"
```

---

## Task 2: `constants/mock-data.ts` — `mainCategory` op bestaande producten

**Files:**
- Modify: `constants/mock-data.ts`

- [ ] **Stap 1: `mainCategory` toevoegen aan het `Product` type**

Zoek in `constants/mock-data.ts` de `Product` type definitie en voeg het veld toe:

```ts
export type Product = {
  id: string;
  name: string;
  brand: string;
  mainCategory: string;   // ← nieuw
  category: string;
  // ... rest ongewijzigd
};
```

- [ ] **Stap 2: `mainCategory: 'Elektronica'` toevoegen aan alle bestaande producten**

Elk bestaand product-object in `MOCK_PRODUCTS` dat nu `category: 'Smartphones'` (of Laptops, Audio, etc.) heeft, krijgt `mainCategory: 'Elektronica'` direct boven of naast het `category` veld. Doe dit voor **alle** bestaande producten (zoek op `category:` en voeg de regel toe).

Voorbeeld patroon (herhaal voor elk product):
```ts
{
  id: 'sm-1',
  name: 'Samsung Galaxy S25 Ultra 256GB',
  brand: 'Samsung',
  mainCategory: 'Elektronica',   // ← toegevoegd
  category: 'Smartphones',
  // ...
}
```

- [ ] **Stap 3: Controleer TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Verwacht: geen fouten over `mainCategory`.

- [ ] **Stap 4: Commit**

```bash
git add constants/mock-data.ts
git commit -m "feat: add mainCategory field to all existing products"
```

---

## Task 3: `constants/mock-data.ts` — nieuwe producten Kleding & Schoenen

**Files:**
- Modify: `constants/mock-data.ts`

- [ ] **Stap 1: Voeg de nieuwe producten toe aan het einde van `MOCK_PRODUCTS`**

Plak dit blok direct voor de sluitende `];` van de `MOCK_PRODUCTS` array:

```ts
  // ─── Kleding / Heren ──────────────────────────────────────────────────────────
  {
    id: 'kl-h-1',
    name: 'Nike Dri-FIT Hardloopshirt Heren',
    brand: 'Nike',
    mainCategory: 'Kleding',
    category: 'Heren',
    imageUrl: '',
    currentPrice: 34,
    originalPrice: 44,
    lowestPrice: 29,
    rating: 4.3,
    reviewCount: 215,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-10-01', price: 44 },
      { date: '2026-01-01', price: 39 },
      { date: '2026-03-01', price: 34 },
    ],
    shops: [
      { name: 'Bol.com', price: 34, url: 'https://www.bol.com/nl/nl/s/?searchtext=nike+dri-fit+hardloopshirt+heren', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 36, url: 'https://www.amazon.nl/s?k=nike+dri-fit+hardloopshirt+heren', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 34, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': 'S / M / L / XL', 'Materiaal': '100% Polyester', 'Kleur': 'Zwart / Wit', 'Pasvorm': 'Slim fit', 'Geslacht': 'Heren' },
  },
  {
    id: 'kl-h-2',
    name: "Levi's 501 Original Jeans",
    brand: "Levi's",
    mainCategory: 'Kleding',
    category: 'Heren',
    imageUrl: '',
    currentPrice: 89,
    originalPrice: 110,
    lowestPrice: 79,
    rating: 4.5,
    reviewCount: 1842,
    badge: 'prijsdaling' as const,
    ean: '5400814959183',
    priceHistory: [
      { date: '2025-09-01', price: 110 },
      { date: '2025-12-01', price: 99 },
      { date: '2026-03-01', price: 89 },
    ],
    shops: [
      { name: 'Bol.com', price: 89, url: 'https://www.bol.com/nl/nl/s/?searchtext=levis+501+original+jeans', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 92, url: 'https://www.amazon.nl/s?k=levis+501+original+jeans', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 89, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': '30/32 · 32/34 · 34/34', 'Materiaal': '99% Katoen, 1% Elastaan', 'Kleur': 'Blauw / Zwart', 'Pasvorm': 'Straight', 'Geslacht': 'Heren' },
  },
  {
    id: 'kl-h-3',
    name: 'Tommy Hilfiger Slim Polo',
    brand: 'Tommy Hilfiger',
    mainCategory: 'Kleding',
    category: 'Heren',
    imageUrl: '',
    currentPrice: 59,
    originalPrice: 79,
    lowestPrice: 49,
    rating: 4.4,
    reviewCount: 763,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-11-01', price: 79 },
      { date: '2026-02-01', price: 59 },
    ],
    shops: [
      { name: 'Bol.com', price: 59, url: 'https://www.bol.com/nl/nl/s/?searchtext=tommy+hilfiger+slim+polo', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 62, url: 'https://www.amazon.nl/s?k=tommy+hilfiger+slim+polo', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 59, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': 'S / M / L / XL / XXL', 'Materiaal': '100% Katoen', 'Kleur': 'Navy / Wit / Rood', 'Pasvorm': 'Slim fit', 'Geslacht': 'Heren' },
  },

  // ─── Kleding / Dames ──────────────────────────────────────────────────────────
  {
    id: 'kl-d-1',
    name: 'Adidas Essentials 3-Stripes Sportlegging Dames',
    brand: 'Adidas',
    mainCategory: 'Kleding',
    category: 'Dames',
    imageUrl: '',
    currentPrice: 29,
    originalPrice: 39,
    lowestPrice: 24,
    rating: 4.4,
    reviewCount: 3201,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-10-01', price: 39 },
      { date: '2026-01-01', price: 34 },
      { date: '2026-03-01', price: 29 },
    ],
    shops: [
      { name: 'Bol.com', price: 29, url: 'https://www.bol.com/nl/nl/s/?searchtext=adidas+essentials+sportlegging+dames', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 31, url: 'https://www.amazon.nl/s?k=adidas+essentials+sportlegging+dames', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 29, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': 'XS / S / M / L / XL', 'Materiaal': '75% Katoen, 25% Gerecycled Polyester', 'Kleur': 'Zwart / Marine', 'Pasvorm': 'Regular', 'Geslacht': 'Dames' },
  },
  {
    id: 'kl-d-2',
    name: 'H&M Linnen Zomerjurk',
    brand: 'H&M',
    mainCategory: 'Kleding',
    category: 'Dames',
    imageUrl: '',
    currentPrice: 24,
    originalPrice: 34,
    lowestPrice: 19,
    rating: 4.1,
    reviewCount: 412,
    badge: 'deal' as const,
    priceHistory: [
      { date: '2025-06-01', price: 34 },
      { date: '2025-09-01', price: 24 },
      { date: '2026-03-01', price: 24 },
    ],
    shops: [
      { name: 'Bol.com', price: 24, url: 'https://www.bol.com/nl/nl/s/?searchtext=hm+linnen+zomerjurk', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 26, url: 'https://www.amazon.nl/s?k=h%26m+linnen+zomerjurk', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 24, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': 'XS / S / M / L', 'Materiaal': '100% Linnen', 'Kleur': 'Beige / Wit / Groen', 'Pasvorm': 'Regular', 'Geslacht': 'Dames' },
  },
  {
    id: 'kl-s-1',
    name: 'Under Armour Hardloopbroek Heren',
    brand: 'Under Armour',
    mainCategory: 'Kleding',
    category: 'Sportkleding',
    imageUrl: '',
    currentPrice: 44,
    originalPrice: 59,
    lowestPrice: 39,
    rating: 4.3,
    reviewCount: 287,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-11-01', price: 59 },
      { date: '2026-02-01', price: 49 },
      { date: '2026-03-01', price: 44 },
    ],
    shops: [
      { name: 'Bol.com', price: 44, url: 'https://www.bol.com/nl/nl/s/?searchtext=under+armour+hardloopbroek', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 46, url: 'https://www.amazon.nl/s?k=under+armour+hardloopbroek+heren', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 44, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': 'S / M / L / XL', 'Materiaal': '100% Polyester', 'Kleur': 'Zwart', 'Pasvorm': 'Tapered', 'Geslacht': 'Heren' },
  },

  // ─── Schoenen / Sneakers ──────────────────────────────────────────────────────
  {
    id: 'sch-sn-1',
    name: 'Nike Air Max 90',
    brand: 'Nike',
    mainCategory: 'Schoenen',
    category: 'Sneakers',
    imageUrl: '',
    currentPrice: 109,
    originalPrice: 139,
    lowestPrice: 99,
    rating: 4.6,
    reviewCount: 5421,
    badge: 'prijsdaling' as const,
    ean: '0195238557791',
    priceHistory: [
      { date: '2025-09-01', price: 139 },
      { date: '2025-12-01', price: 119 },
      { date: '2026-03-01', price: 109 },
    ],
    shops: [
      { name: 'Bol.com', price: 109, url: 'https://www.bol.com/nl/nl/s/?searchtext=nike+air+max+90', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 112, url: 'https://www.amazon.nl/s?k=nike+air+max+90', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 109, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': '40 / 41 / 42 / 43 / 44 / 45 / 46', 'Materiaal': 'Leer / Mesh', 'Kleur': 'Wit / Zwart / Grijs', 'Sluiting': 'Veters', 'Zooltype': 'Air Max rubberzool' },
  },
  {
    id: 'sch-sn-2',
    name: 'Adidas Stan Smith',
    brand: 'Adidas',
    mainCategory: 'Schoenen',
    category: 'Sneakers',
    imageUrl: '',
    currentPrice: 79,
    originalPrice: 99,
    lowestPrice: 69,
    rating: 4.5,
    reviewCount: 8934,
    badge: 'prijsdaling' as const,
    ean: '4064066519995',
    priceHistory: [
      { date: '2025-09-01', price: 99 },
      { date: '2026-01-01', price: 89 },
      { date: '2026-03-01', price: 79 },
    ],
    shops: [
      { name: 'Bol.com', price: 79, url: 'https://www.bol.com/nl/nl/s/?searchtext=adidas+stan+smith', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 82, url: 'https://www.amazon.nl/s?k=adidas+stan+smith', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 79, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': '38 / 39 / 40 / 41 / 42 / 43 / 44 / 45 / 46', 'Materiaal': 'Leer', 'Kleur': 'Wit/Groen', 'Sluiting': 'Veters', 'Zooltype': 'Rubberzool' },
  },
  {
    id: 'sch-sn-3',
    name: 'New Balance 574',
    brand: 'New Balance',
    mainCategory: 'Schoenen',
    category: 'Sneakers',
    imageUrl: '',
    currentPrice: 84,
    originalPrice: 99,
    lowestPrice: 79,
    rating: 4.4,
    reviewCount: 2341,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-10-01', price: 99 },
      { date: '2026-02-01', price: 89 },
      { date: '2026-03-01', price: 84 },
    ],
    shops: [
      { name: 'Bol.com', price: 84, url: 'https://www.bol.com/nl/nl/s/?searchtext=new+balance+574', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 87, url: 'https://www.amazon.nl/s?k=new+balance+574', logo: 'AMZ', verified: true },
      { name: 'Zalando Lounge', price: 84, url: 'https://www.zalando-lounge.nl/', logo: 'ZL', verified: false },
    ],
    specs: { 'Maat': '40 / 41 / 42 / 43 / 44 / 45', 'Materiaal': 'Suède / Mesh', 'Kleur': 'Grijs / Marine / Bordeaux', 'Sluiting': 'Veters', 'Zooltype': 'ENCAP rubberzool' },
  },
  {
    id: 'sch-sp-1',
    name: 'Asics Gel-Kayano 31',
    brand: 'Asics',
    mainCategory: 'Schoenen',
    category: 'Sportschoenen',
    imageUrl: '',
    currentPrice: 159,
    originalPrice: 199,
    lowestPrice: 149,
    rating: 4.7,
    reviewCount: 1203,
    badge: 'prijsdaling' as const,
    ean: '4550457197924',
    priceHistory: [
      { date: '2025-09-01', price: 199 },
      { date: '2025-12-01', price: 179 },
      { date: '2026-03-01', price: 159 },
    ],
    shops: [
      { name: 'Bol.com', price: 159, url: 'https://www.bol.com/nl/nl/s/?searchtext=asics+gel-kayano+31', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 162, url: 'https://www.amazon.nl/s?k=asics+gel-kayano+31', logo: 'AMZ', verified: true },
    ],
    specs: { 'Maat': '40 / 41 / 42 / 43 / 44 / 45 / 46 / 47', 'Materiaal': 'Engineered mesh', 'Kleur': 'Zwart / Blauw', 'Sluiting': 'Veters', 'Zooltype': 'FlyteFoam + GEL demping' },
  },
  {
    id: 'sch-sp-2',
    name: 'Brooks Ghost 16',
    brand: 'Brooks',
    mainCategory: 'Schoenen',
    category: 'Sportschoenen',
    imageUrl: '',
    currentPrice: 134,
    originalPrice: 159,
    lowestPrice: 124,
    rating: 4.6,
    reviewCount: 892,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-10-01', price: 159 },
      { date: '2026-02-01', price: 144 },
      { date: '2026-03-01', price: 134 },
    ],
    shops: [
      { name: 'Bol.com', price: 134, url: 'https://www.bol.com/nl/nl/s/?searchtext=brooks+ghost+16', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 137, url: 'https://www.amazon.nl/s?k=brooks+ghost+16', logo: 'AMZ', verified: true },
    ],
    specs: { 'Maat': '40 / 41 / 42 / 43 / 44 / 45 / 46', 'Materiaal': 'Engineered mesh', 'Kleur': 'Wit / Grijs / Blauw', 'Sluiting': 'Veters', 'Zooltype': 'DNA LOFT v3 demping' },
  },
```

- [ ] **Stap 2: Commit**

```bash
git add constants/mock-data.ts
git commit -m "feat: add mock products for Kleding and Schoenen categories"
```

---

## Task 4: `constants/mock-data.ts` — nieuwe producten Sport, Wonen, Beauty, Speelgoed, Boeken

**Files:**
- Modify: `constants/mock-data.ts`

- [ ] **Stap 1: Voeg de producten toe direct na het Schoenen-blok, vóór de sluitende `];`**

```ts
  // ─── Sport & Outdoor / Fitness ────────────────────────────────────────────────
  {
    id: 'sp-fi-1',
    name: 'Bowflex SelectTech 552 Dumbbellset',
    brand: 'Bowflex',
    mainCategory: 'Sport & Outdoor',
    category: 'Fitness',
    imageUrl: '',
    currentPrice: 329,
    originalPrice: 429,
    lowestPrice: 299,
    rating: 4.7,
    reviewCount: 4123,
    badge: 'prijsdaling' as const,
    ean: '0029637401605',
    priceHistory: [
      { date: '2025-09-01', price: 429 },
      { date: '2025-12-01', price: 369 },
      { date: '2026-03-01', price: 329 },
    ],
    shops: [
      { name: 'Bol.com', price: 329, url: 'https://www.bol.com/nl/nl/s/?searchtext=bowflex+selecttech+552', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 339, url: 'https://www.amazon.nl/s?k=bowflex+selecttech+552', logo: 'AMZ', verified: true },
    ],
    specs: { 'Gewicht': '2–24 kg per dumbbell', 'Afmeting': '50 × 20 × 23 cm', 'Materiaal': 'Staal / Kunststof', 'Niveau': 'Beginner tot gevorderd' },
  },
  {
    id: 'sp-fi-2',
    name: 'Gymstick Weerstandsbanden Set (5 stuks)',
    brand: 'Gymstick',
    mainCategory: 'Sport & Outdoor',
    category: 'Fitness',
    imageUrl: '',
    currentPrice: 24,
    originalPrice: 34,
    lowestPrice: 19,
    rating: 4.3,
    reviewCount: 1842,
    badge: 'deal' as const,
    priceHistory: [
      { date: '2025-10-01', price: 34 },
      { date: '2026-02-01', price: 29 },
      { date: '2026-03-01', price: 24 },
    ],
    shops: [
      { name: 'Bol.com', price: 24, url: 'https://www.bol.com/nl/nl/s/?searchtext=gymstick+weerstandsbanden+set', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 25, url: 'https://www.amazon.nl/s?k=gymstick+weerstandsbanden+set', logo: 'AMZ', verified: true },
    ],
    specs: { 'Gewicht': '< 1 kg', 'Afmeting': 'One size (set van 5)', 'Materiaal': 'Latex', 'Niveau': 'Licht / Medium / Zwaar' },
  },
  {
    id: 'sp-fi-3',
    name: 'Reebok Yogamat 6mm',
    brand: 'Reebok',
    mainCategory: 'Sport & Outdoor',
    category: 'Fitness',
    imageUrl: '',
    currentPrice: 29,
    originalPrice: 39,
    lowestPrice: 24,
    rating: 4.2,
    reviewCount: 923,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-11-01', price: 39 },
      { date: '2026-03-01', price: 29 },
    ],
    shops: [
      { name: 'Bol.com', price: 29, url: 'https://www.bol.com/nl/nl/s/?searchtext=reebok+yogamat+6mm', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 31, url: 'https://www.amazon.nl/s?k=reebok+yogamat+6mm', logo: 'AMZ', verified: true },
    ],
    specs: { 'Gewicht': '900 g', 'Afmeting': '173 × 61 × 0,6 cm', 'Materiaal': 'NBR schuim', 'Niveau': 'Alle niveaus' },
  },

  // ─── Sport & Outdoor / Hardlopen ──────────────────────────────────────────────
  {
    id: 'sp-hl-1',
    name: 'Garmin Forerunner 265',
    brand: 'Garmin',
    mainCategory: 'Sport & Outdoor',
    category: 'Hardlopen',
    imageUrl: '',
    currentPrice: 349,
    originalPrice: 449,
    lowestPrice: 329,
    rating: 4.7,
    reviewCount: 2341,
    badge: 'prijsdaling' as const,
    ean: '0753759316853',
    priceHistory: [
      { date: '2025-09-01', price: 449 },
      { date: '2025-12-01', price: 399 },
      { date: '2026-03-01', price: 349 },
    ],
    shops: [
      { name: 'Bol.com', price: 349, url: 'https://www.bol.com/nl/nl/s/?searchtext=garmin+forerunner+265', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 355, url: 'https://www.amazon.nl/s?k=garmin+forerunner+265', logo: 'AMZ', verified: true },
    ],
    specs: { 'Gewicht': '47 g', 'Afmeting': '46,1 mm kast', 'Materiaal': 'Gorilla Glass 3 / Siliconen band', 'Niveau': 'Gevorderd' },
  },
  {
    id: 'sp-hl-2',
    name: 'Polar Vantage M2',
    brand: 'Polar',
    mainCategory: 'Sport & Outdoor',
    category: 'Hardlopen',
    imageUrl: '',
    currentPrice: 199,
    originalPrice: 279,
    lowestPrice: 189,
    rating: 4.5,
    reviewCount: 1123,
    badge: 'prijsdaling' as const,
    priceHistory: [
      { date: '2025-09-01', price: 279 },
      { date: '2025-12-01', price: 229 },
      { date: '2026-03-01', price: 199 },
    ],
    shops: [
      { name: 'Bol.com', price: 199, url: 'https://www.bol.com/nl/nl/s/?searchtext=polar+vantage+m2', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 204, url: 'https://www.amazon.nl/s?k=polar+vantage+m2', logo: 'AMZ', verified: true },
    ],
    specs: { 'Gewicht': '45 g', 'Afmeting': '45 mm kast', 'Materiaal': 'Aluminium / Siliconen band', 'Niveau': 'Gevorderd' },
  },

  // ─── Wonen & Tuin / Keuken ────────────────────────────────────────────────────
  {
    id: 'wo-keu-1',
    name: 'Philips Airfryer XXL HD9650',
    brand: 'Philips',
    mainCategory: 'Wonen & Tuin',
    category: 'Keuken',
    imageUrl: '',
    currentPrice: 179,
    originalPrice: 249,
    lowestPrice: 159,
    rating: 4.6,
    reviewCount: 12431,
    badge: 'prijsdaling' as const,
    ean: '8720389003646',
    priceHistory: [
      { date: '2025-09-01', price: 249 },
      { date: '2025-12-01', price: 199 },
      { date: '2026-03-01', price: 179 },
    ],
    shops: [
      { name: 'Bol.com', price: 179, url: 'https://www.bol.com/nl/nl/s/?searchtext=philips+airfryer+xxl+hd9650', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 184, url: 'https://www.amazon.nl/s?k=philips+airfryer+xxl+hd9650', logo: 'AMZ', verified: true },
    ],
    specs: { 'Vermogen': '2225 W', 'Capaciteit': '7,3 liter', 'Kleur': 'Zwart', 'Garantie': '2 jaar' },
  },
  {
    id: 'wo-keu-2',
    name: 'Nespresso Vertuo Next',
    brand: 'Nespresso',
    mainCategory: 'Wonen & Tuin',
    category: 'Keuken',
    imageUrl: '',
    currentPrice: 89,
    originalPrice: 149,
    lowestPrice: 79,
    rating: 4.4,
    reviewCount: 8921,
    badge: 'deal' as const,
    ean: '7630047621984',
    priceHistory: [
      { date: '2025-09-01', price: 149 },
      { date: '2025-12-01', price: 109 },
      { date: '2026-03-01', price: 89 },
    ],
    shops: [
      { name: 'Bol.com', price: 89, url: 'https://www.bol.com/nl/nl/s/?searchtext=nespresso+vertuo+next', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 92, url: 'https://www.amazon.nl/s?k=nespresso+vertuo+next', logo: 'AMZ', verified: true },
    ],
    specs: { 'Vermogen': '1260 W', 'Capaciteit': '1,1 liter', 'Kleur': 'Zwart / Zilver', 'Garantie': '2 jaar' },
  },
  {
    id: 'wo-keu-3',
    name: 'KitchenAid Artisan Keukenmachine 4,8L',
    brand: 'KitchenAid',
    mainCategory: 'Wonen & Tuin',
    category: 'Keuken',
    imageUrl: '',
    currentPrice: 549,
    originalPrice: 749,
    lowestPrice: 499,
    rating: 4.8,
    reviewCount: 6234,
    badge: 'prijsdaling' as const,
    ean: '5413184232022',
    priceHistory: [
      { date: '2025-09-01', price: 749 },
      { date: '2025-12-01', price: 649 },
      { date: '2026-03-01', price: 549 },
    ],
    shops: [
      { name: 'Bol.com', price: 549, url: 'https://www.bol.com/nl/nl/s/?searchtext=kitchenaid+artisan+keukenmachine', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 559, url: 'https://www.amazon.nl/s?k=kitchenaid+artisan+keukenmachine', logo: 'AMZ', verified: true },
    ],
    specs: { 'Vermogen': '300 W', 'Capaciteit': '4,8 liter', 'Kleur': 'Empire Red / Onyx Zwart / Zilver', 'Garantie': '5 jaar' },
  },

  // ─── Wonen & Tuin / Verlichting ───────────────────────────────────────────────
  {
    id: 'wo-verl-1',
    name: 'Philips Hue White & Color Ambiance Starter Kit E27',
    brand: 'Philips Hue',
    mainCategory: 'Wonen & Tuin',
    category: 'Verlichting',
    imageUrl: '',
    currentPrice: 129,
    originalPrice: 179,
    lowestPrice: 119,
    rating: 4.7,
    reviewCount: 9832,
    badge: 'prijsdaling' as const,
    ean: '8718699673321',
    priceHistory: [
      { date: '2025-09-01', price: 179 },
      { date: '2025-12-01', price: 149 },
      { date: '2026-03-01', price: 129 },
    ],
    shops: [
      { name: 'Bol.com', price: 129, url: 'https://www.bol.com/nl/nl/s/?searchtext=philips+hue+white+color+ambiance+starter+kit', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 132, url: 'https://www.amazon.nl/s?k=philips+hue+white+color+ambiance+starter+kit', logo: 'AMZ', verified: true },
    ],
    specs: { 'Vermogen': '9 W per lamp (3 stuks)', 'Capaciteit': 'Bridge + 3 lampen', 'Kleur': '16 miljoen kleuren', 'Garantie': '2 jaar' },
  },

  // ─── Beauty / Huidverzorging ──────────────────────────────────────────────────
  {
    id: 'be-huid-1',
    name: 'La Roche-Posay Toleriane Hydrating Gentle Cleanser',
    brand: 'La Roche-Posay',
    mainCategory: 'Beauty',
    category: 'Huidverzorging',
    imageUrl: '',
    currentPrice: 12,
    originalPrice: 16,
    lowestPrice: 10,
    rating: 4.6,
    reviewCount: 7823,
    badge: 'prijsdaling' as const,
    ean: '3337875545839',
    priceHistory: [
      { date: '2025-10-01', price: 16 },
      { date: '2026-02-01', price: 14 },
      { date: '2026-03-01', price: 12 },
    ],
    shops: [
      { name: 'Bol.com', price: 12, url: 'https://www.bol.com/nl/nl/s/?searchtext=la+roche-posay+toleriane+hydrating+gentle+cleanser', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 13, url: 'https://www.amazon.nl/s?k=la+roche-posay+toleriane+hydrating+gentle+cleanser', logo: 'AMZ', verified: true },
    ],
    specs: { 'Inhoud': '400 ml', 'Huidtype': 'Droog / Gevoelig', 'Ingrediënten': 'Niacinamide, Glycerine', 'Gebruik': 'Ochtend en avond' },
  },
  {
    id: 'be-huid-2',
    name: 'CeraVe Moisturising Cream',
    brand: 'CeraVe',
    mainCategory: 'Beauty',
    category: 'Huidverzorging',
    imageUrl: '',
    currentPrice: 14,
    originalPrice: 19,
    lowestPrice: 12,
    rating: 4.7,
    reviewCount: 15234,
    badge: 'prijsdaling' as const,
    ean: '3606000594951',
    priceHistory: [
      { date: '2025-10-01', price: 19 },
      { date: '2026-01-01', price: 16 },
      { date: '2026-03-01', price: 14 },
    ],
    shops: [
      { name: 'Bol.com', price: 14, url: 'https://www.bol.com/nl/nl/s/?searchtext=cerave+moisturising+cream', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 15, url: 'https://www.amazon.nl/s?k=cerave+moisturising+cream', logo: 'AMZ', verified: true },
    ],
    specs: { 'Inhoud': '340 g', 'Huidtype': 'Droog / Normaal', 'Ingrediënten': 'Ceramiden, Hyaluronzuur', 'Gebruik': 'Dag en nacht' },
  },

  // ─── Beauty / Haarverzorging ──────────────────────────────────────────────────
  {
    id: 'be-haar-1',
    name: 'Dyson Airwrap Complete Long',
    brand: 'Dyson',
    mainCategory: 'Beauty',
    category: 'Haarverzorging',
    imageUrl: '',
    currentPrice: 499,
    originalPrice: 599,
    lowestPrice: 469,
    rating: 4.5,
    reviewCount: 4231,
    badge: 'prijsdaling' as const,
    ean: '5025155070024',
    priceHistory: [
      { date: '2025-09-01', price: 599 },
      { date: '2025-12-01', price: 549 },
      { date: '2026-03-01', price: 499 },
    ],
    shops: [
      { name: 'Bol.com', price: 499, url: 'https://www.bol.com/nl/nl/s/?searchtext=dyson+airwrap+complete+long', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 509, url: 'https://www.amazon.nl/s?k=dyson+airwrap+complete+long', logo: 'AMZ', verified: true },
    ],
    specs: { 'Inhoud': 'Stijlset + 6 opzetstukken', 'Huidtype': 'Alle haartypes', 'Ingrediënten': 'N.v.t.', 'Gebruik': 'Drogen, stylen, krullen' },
  },
  {
    id: 'be-haar-2',
    name: 'Oral-B iO Series 9 Elektrische Tandenborstel',
    brand: 'Oral-B',
    mainCategory: 'Beauty',
    category: 'Haarverzorging',
    imageUrl: '',
    currentPrice: 149,
    originalPrice: 249,
    lowestPrice: 129,
    rating: 4.6,
    reviewCount: 8921,
    badge: 'deal' as const,
    ean: '4210201339717',
    priceHistory: [
      { date: '2025-09-01', price: 249 },
      { date: '2025-12-01', price: 179 },
      { date: '2026-03-01', price: 149 },
    ],
    shops: [
      { name: 'Bol.com', price: 149, url: 'https://www.bol.com/nl/nl/s/?searchtext=oral-b+io+series+9', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 154, url: 'https://www.amazon.nl/s?k=oral-b+io+series+9', logo: 'AMZ', verified: true },
    ],
    specs: { 'Inhoud': 'Tandenborstel + reisetui + 3 opzetborstels', 'Huidtype': 'N.v.t.', 'Ingrediënten': 'N.v.t.', 'Gebruik': '2x per dag, 2 minuten' },
  },

  // ─── Speelgoed / Speelgoed ────────────────────────────────────────────────────
  {
    id: 'sp-sp-1',
    name: 'LEGO Technic Land Rover Defender (42110)',
    brand: 'LEGO',
    mainCategory: 'Speelgoed & Baby',
    category: 'Speelgoed',
    imageUrl: '',
    currentPrice: 179,
    originalPrice: 229,
    lowestPrice: 159,
    rating: 4.8,
    reviewCount: 6234,
    badge: 'prijsdaling' as const,
    ean: '5702016370775',
    priceHistory: [
      { date: '2025-09-01', price: 229 },
      { date: '2025-12-01', price: 199 },
      { date: '2026-03-01', price: 179 },
    ],
    shops: [
      { name: 'Bol.com', price: 179, url: 'https://www.bol.com/nl/nl/s/?searchtext=lego+technic+land+rover+defender+42110', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 184, url: 'https://www.amazon.nl/s?k=lego+technic+land+rover+defender+42110', logo: 'AMZ', verified: true },
    ],
    specs: { 'Leeftijd': '11+ jaar', 'Materiaal': 'ABS-kunststof', 'Aantal onderdelen': '2573 stuks' },
  },
  {
    id: 'sp-sp-2',
    name: 'Nintendo Switch Lite',
    brand: 'Nintendo',
    mainCategory: 'Speelgoed & Baby',
    category: 'Speelgoed',
    imageUrl: '',
    currentPrice: 199,
    originalPrice: 219,
    lowestPrice: 189,
    rating: 4.5,
    reviewCount: 11234,
    badge: 'nieuw' as const,
    ean: '0045496452650',
    priceHistory: [
      { date: '2025-09-01', price: 219 },
      { date: '2026-01-01', price: 209 },
      { date: '2026-03-01', price: 199 },
    ],
    shops: [
      { name: 'Bol.com', price: 199, url: 'https://www.bol.com/nl/nl/s/?searchtext=nintendo+switch+lite', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 204, url: 'https://www.amazon.nl/s?k=nintendo+switch+lite', logo: 'AMZ', verified: true },
    ],
    specs: { 'Leeftijd': '6+ jaar', 'Materiaal': 'ABS-kunststof', 'Aantal onderdelen': '1 console + oplader' },
  },

  // ─── Boeken & Media / Boeken ──────────────────────────────────────────────────
  {
    id: 'bk-bk-1',
    name: 'Atomic Habits (NL) — James Clear',
    brand: 'James Clear',
    mainCategory: 'Boeken & Media',
    category: 'Boeken',
    imageUrl: '',
    currentPrice: 22,
    originalPrice: 25,
    lowestPrice: 19,
    rating: 4.8,
    reviewCount: 48921,
    badge: 'deal' as const,
    ean: '9789400512016',
    priceHistory: [
      { date: '2025-09-01', price: 25 },
      { date: '2026-01-01', price: 23 },
      { date: '2026-03-01', price: 22 },
    ],
    shops: [
      { name: 'Bol.com', price: 22, url: 'https://www.bol.com/nl/nl/s/?searchtext=atomic+habits+james+clear+nl', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 23, url: 'https://www.amazon.nl/s?k=atomic+habits+james+clear+nl', logo: 'AMZ', verified: true },
    ],
    specs: { 'Auteur': 'James Clear', "Pagina's": '336', 'Taal': 'Nederlands', 'Uitgever': 'Spectrum' },
  },
  {
    id: 'bk-bk-2',
    name: 'Sapiens: Een kleine geschiedenis van de mensheid (NL)',
    brand: 'Yuval Noah Harari',
    mainCategory: 'Boeken & Media',
    category: 'Boeken',
    imageUrl: '',
    currentPrice: 19,
    originalPrice: 23,
    lowestPrice: 16,
    rating: 4.7,
    reviewCount: 32841,
    badge: 'deal' as const,
    ean: '9789400401921',
    priceHistory: [
      { date: '2025-09-01', price: 23 },
      { date: '2026-02-01', price: 21 },
      { date: '2026-03-01', price: 19 },
    ],
    shops: [
      { name: 'Bol.com', price: 19, url: 'https://www.bol.com/nl/nl/s/?searchtext=sapiens+harari+nl', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 20, url: 'https://www.amazon.nl/s?k=sapiens+harari+nl', logo: 'AMZ', verified: true },
    ],
    specs: { 'Auteur': 'Yuval Noah Harari', "Pagina's": '512', 'Taal': 'Nederlands', 'Uitgever': 'Uitgeverij Thomas Rap' },
  },
  {
    id: 'bk-bk-3',
    name: 'De Alchemist — Paulo Coelho',
    brand: 'Paulo Coelho',
    mainCategory: 'Boeken & Media',
    category: 'Boeken',
    imageUrl: '',
    currentPrice: 17,
    originalPrice: 21,
    lowestPrice: 14,
    rating: 4.6,
    reviewCount: 21341,
    badge: 'deal' as const,
    ean: '9789041711946',
    priceHistory: [
      { date: '2025-09-01', price: 21 },
      { date: '2026-02-01', price: 19 },
      { date: '2026-03-01', price: 17 },
    ],
    shops: [
      { name: 'Bol.com', price: 17, url: 'https://www.bol.com/nl/nl/s/?searchtext=de+alchemist+paulo+coelho+nl', logo: 'BOL', verified: true },
      { name: 'Amazon', price: 18, url: 'https://www.amazon.nl/s?k=de+alchemist+paulo+coelho+nl', logo: 'AMZ', verified: true },
    ],
    specs: { 'Auteur': 'Paulo Coelho', "Pagina's": '192', 'Taal': 'Nederlands', 'Uitgever': 'Uitgeverij Sirene' },
  },
```

- [ ] **Stap 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Verwacht: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add constants/mock-data.ts
git commit -m "feat: add mock products for Sport, Wonen, Beauty, Speelgoed, Boeken"
```

---

## Task 5: `constants/affiliate-shops.ts` — `mainCategories` + Zalando Lounge

**Files:**
- Modify: `constants/affiliate-shops.ts`

- [ ] **Stap 1: Voeg `mainCategories` toe aan het `AffiliateShop` type**

```ts
export type AffiliateShop = {
  slug: string;
  displayName: string;
  logoAbbr: string;
  logoBackground: string;
  logoTextColor: string;
  brandColor: string;
  baseUrl: string;
  mainCategories: string[];   // ← nieuw: ['all'] = wildcard, anders IDs
  affiliate: AffiliateStatus;
};
```

- [ ] **Stap 2: Voeg `mainCategories` toe aan alle bestaande shops**

```ts
// Amazon NL
mainCategories: ['all'],

// Coolblue
mainCategories: ['elektronica'],

// Bol.com
mainCategories: ['all'],

// Alternate
mainCategories: ['elektronica'],

// MediaMarkt
mainCategories: ['elektronica'],

// Apple Store
mainCategories: ['elektronica'],
```

- [ ] **Stap 3: Voeg Zalando Lounge toe aan het einde van `AFFILIATE_SHOPS`**

```ts
  // ── Zalando Lounge ───────────────────────────────────────────────────────────
  {
    slug: 'zalando-lounge',
    displayName: 'Zalando Lounge',
    logoAbbr: 'ZL',
    logoBackground: '#FF6900',
    logoTextColor: '#FFFFFF',
    brandColor: '#FF6900',
    baseUrl: 'https://www.zalando-lounge.nl',
    mainCategories: ['kleding', 'schoenen'],
    affiliate: {
      active: false,
      reason: 'Awin goedkeuring vereist — 6% commissie beschikbaar',
    },
  },
```

- [ ] **Stap 4: Voeg `getShopsForCategory()` helperfunctie toe onderaan het bestand**

```ts
/** Geeft alle shops terug die een bepaalde hoofdcategorie ondersteunen */
export function getShopsForCategory(mainCategoryId: string): AffiliateShop[] {
  return AFFILIATE_SHOPS.filter(
    shop =>
      shop.mainCategories.includes('all') ||
      shop.mainCategories.includes(mainCategoryId)
  );
}
```

- [ ] **Stap 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Verwacht: geen fouten.

- [ ] **Stap 6: Commit**

```bash
git add constants/affiliate-shops.ts
git commit -m "feat: add mainCategories to shops, add Zalando Lounge, add getShopsForCategory()"
```

---

## Task 6: `services/product-db.ts` — nieuwe query-functies

**Files:**
- Modify: `services/product-db.ts`

- [ ] **Stap 1: Voeg de twee nieuwe functies toe onderaan het bestand**

```ts
/** Geeft alle producten terug voor een hoofdcategorie */
export async function getProductsByMainCategory(mainCategory: string): Promise<ProductType[]> {
  return CURATED.filter(p => p.mainCategory === mainCategory);
}

/** Geeft alle producten terug voor een subcategorie (bestaand: getProductsByCategory blijft) */
export async function getProductsBySubCategory(subCategory: string): Promise<ProductType[]> {
  return getProductsByCategory(subCategory);
}
```

- [ ] **Stap 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Stap 3: Commit**

```bash
git add services/product-db.ts
git commit -m "feat: add getProductsByMainCategory and getProductsBySubCategory to product-db"
```

---

## Task 7: `app/(tabs)/prijzen.tsx` — twee-staps navigatie

**Files:**
- Modify: `app/(tabs)/prijzen.tsx`

- [ ] **Stap 1: Importeer de nieuwe types en data bovenaan het bestand**

Voeg toe direct na de bestaande imports:

```ts
import { MAIN_CATEGORIES, type MainCategory } from '@/constants/categories';
import { LinearGradient } from 'expo-linear-gradient';
```

- [ ] **Stap 2: Vervang `CATEGORY_COLORS` en `PRICE_CATEGORIES` constanten**

Verwijder de volledige `CATEGORY_COLORS` record en de `PRICE_CATEGORIES` array. Vervang door:

```ts
const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  // Elektronica subcategorieën (bestaand patroon)
  Smartphones:         { bg: '#007AFF15', color: '#007AFF' },
  Tablets:             { bg: '#5856D615', color: '#5856D6' },
  Laptops:             { bg: '#5856D615', color: '#5856D6' },
  Desktops:            { bg: '#2C2C2E15', color: '#2C2C2E' },
  Monitoren:           { bg: '#FF950015', color: '#FF9500' },
  Televisies:          { bg: '#FF950015', color: '#FF9500' },
  Audio:               { bg: '#FF2D5515', color: '#FF2D55' },
  Gameconsoles:        { bg: '#34C75915', color: '#34C759' },
  Gaming:              { bg: '#34C75915', color: '#34C759' },
  Netwerk:             { bg: '#007AFF15', color: '#007AFF' },
  Fotografie:          { bg: '#AF52DE15', color: '#AF52DE' },
  Huishoudelijk:       { bg: '#FF950015', color: '#FF9500' },
  Wearables:           { bg: '#AF52DE15', color: '#AF52DE' },
  'Grafische kaarten': { bg: '#34C75915', color: '#34C759' },
  Processors:          { bg: '#FF2D5515', color: '#FF2D55' },
  Moederborden:        { bg: '#5856D615', color: '#5856D6' },
  Geheugen:            { bg: '#FF2D5515', color: '#FF2D55' },
  'Opslag (SSD)':      { bg: '#34C75915', color: '#34C759' },
  'Opslag (HDD)':      { bg: '#34C75915', color: '#34C759' },
  Voedingen:           { bg: '#FF950015', color: '#FF9500' },
  Computerbehuizingen: { bg: '#6C6C7015', color: '#6C6C70' },
  'CPU-koelers':       { bg: '#007AFF15', color: '#007AFF' },
  Ventilatoren:        { bg: '#007AFF15', color: '#007AFF' },
  Toetsenborden:       { bg: '#2C2C2E15', color: '#2C2C2E' },
  Muizen:              { bg: '#2C2C2E15', color: '#2C2C2E' },
  Webcams:             { bg: '#AF52DE15', color: '#AF52DE' },
  Luidsprekers:        { bg: '#FF2D5515', color: '#FF2D55' },
  // Kleding
  Heren:               { bg: '#FF2D5515', color: '#FF2D55' },
  Dames:               { bg: '#FF2D5515', color: '#FF2D55' },
  Kinderen:            { bg: '#FF2D5515', color: '#FF2D55' },
  Sportkleding:        { bg: '#FF2D5515', color: '#FF2D55' },
  // Schoenen
  Sneakers:            { bg: '#FF950015', color: '#FF9500' },
  Laarzen:             { bg: '#FF950015', color: '#FF9500' },
  Sandalen:            { bg: '#FF950015', color: '#FF9500' },
  Sportschoenen:       { bg: '#FF950015', color: '#FF9500' },
  // Sport
  Fitness:             { bg: '#34C75915', color: '#34C759' },
  Wielrennen:          { bg: '#34C75915', color: '#34C759' },
  Hardlopen:           { bg: '#34C75915', color: '#34C759' },
  Kamperen:            { bg: '#34C75915', color: '#34C759' },
  // Wonen
  Meubels:             { bg: '#5856D615', color: '#5856D6' },
  Verlichting:         { bg: '#5856D615', color: '#5856D6' },
  Keuken:              { bg: '#5856D615', color: '#5856D6' },
  Tuin:                { bg: '#5856D615', color: '#5856D6' },
  // Beauty
  Huidverzorging:      { bg: '#AF52DE15', color: '#AF52DE' },
  Haarverzorging:      { bg: '#AF52DE15', color: '#AF52DE' },
  Parfum:              { bg: '#AF52DE15', color: '#AF52DE' },
  // Speelgoed
  Speelgoed:           { bg: '#FF6B3515', color: '#FF6B35' },
  Baby:                { bg: '#FF6B3515', color: '#FF6B35' },
  // Boeken
  Boeken:              { bg: '#8E8E9315', color: '#8E8E93' },
  Films:               { bg: '#8E8E9315', color: '#8E8E93' },
  Muziek:              { bg: '#8E8E9315', color: '#8E8E93' },
};
```

- [ ] **Stap 3: Maak `MainCategoryCard` component**

Voeg dit component toe voor de bestaande `CategoryChip`:

```tsx
function MainCategoryCard({
  item,
  isDark,
  onPress,
  cardWidth,
  animationsEnabled,
  index,
}: {
  item: MainCategory;
  isDark: boolean;
  onPress: () => void;
  cardWidth: number;
  animationsEnabled: boolean;
  index: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={animationsEnabled ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110) : undefined}
      style={[animStyle, { width: cardWidth }]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        onPress={onPress}
      >
        <LinearGradient
          colors={[item.gradient[0] + '22', item.gradient[1] + '11']}
          style={[styles.mainCatCard, { borderColor: item.color + '30' }]}
        >
          <View style={[styles.mainCatIconWrap, { backgroundColor: item.color + '20' }]}>
            <MaterialIcons name={item.icon as any} size={32} color={item.color} />
          </View>
          <Text style={[styles.mainCatName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.mainCatSub, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]} numberOfLines={1}>
            {item.subcategories.length} categorieën
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Stap 4: Maak `MainCategoryGrid` component**

```tsx
function MainCategoryGrid({
  isDark,
  onSelect,
}: {
  isDark: boolean;
  onSelect: (main: MainCategory) => void;
}) {
  const { width } = useWindowDimensions();
  const { animationsEnabled } = useReduceMotion();
  const cardWidth = (width - Spacing.md * 3) / 2;

  return (
    <FlatList
      data={MAIN_CATEGORIES}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.categoryGrid}
      columnWrapperStyle={styles.categoryRow}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <MainCategoryCard
          item={item}
          isDark={isDark}
          index={index}
          onPress={() => onSelect(item)}
          cardWidth={cardWidth}
          animationsEnabled={animationsEnabled}
        />
      )}
    />
  );
}
```

- [ ] **Stap 5: Pas `PrijzenScreen` aan — voeg `selectedMain` state toe en twee-staps navigatie**

Vervang de huidige `PrijzenScreen` functie:

```tsx
export default function PrijzenScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { category, main } = useLocalSearchParams<{ category?: string; main?: string }>();
  const [selectedMain, setSelectedMain] = useState<MainCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Deep-link via ?main=elektronica
    if (main) {
      const m = MAIN_CATEGORIES.find(c => c.id === main);
      if (m) setSelectedMain(m);
    }
    // Deep-link via ?category=Smartphones (legacy)
    if (category) {
      const parentMain = MAIN_CATEGORIES.find(m =>
        m.subcategories.some(s => s.id === category || s.name === category)
      );
      if (parentMain) {
        setSelectedMain(parentMain);
        setSelectedCategory(category);
      }
    }
  }, [category, main]);

  // Stap 2: subcategorie + producten
  if (selectedMain !== null) {
    const initialCategory = selectedCategory ?? selectedMain.subcategories[0]?.id ?? '';
    return (
      <LiquidScreen style={styles.container}>
        <ProductList
          categoryId={initialCategory as any}
          colors={colors}
          isDark={isDark}
          onBack={() => { setSelectedMain(null); setSelectedCategory(null); }}
          onCategoryChange={(newId: string) => setSelectedCategory(newId)}
          mainCategory={selectedMain}
        />
      </LiquidScreen>
    );
  }

  // Stap 1: hoofdcategorie grid
  return (
    <LiquidScreen style={styles.container}>
      <GlassPageHeader title="Prijzen" subtitle="Kies een categorie" />
      <MainCategoryGrid isDark={isDark} onSelect={(m) => { setSelectedMain(m); setSelectedCategory(null); }} />
    </LiquidScreen>
  );
}
```

- [ ] **Stap 6: Pas `ProductList` prop-interface aan**

Voeg `mainCategory?: MainCategory` toe aan de props van `ProductList` en gebruik de subcategorieën van de hoofdcategorie voor de chip-rij in `ProductFilters`. Verander de `CategoryId` type-asserties naar `string` in de `ProductList` component (de `useProductFilters` hook werkt op string-IDs).

In de `ProductList` header: toon `mainCategory.name` als terugknop-label:

```tsx
<Text style={[styles.backLabel, { color: colors.tint }]}>
  {mainCategory ? mainCategory.name : 'Categorieën'}
</Text>
```

- [ ] **Stap 7: Voeg styles toe voor `MainCategoryCard`**

Voeg onderaan `StyleSheet.create({...})`:

```ts
  mainCatCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
    minHeight: 110,
    justifyContent: 'center',
  },
  mainCatIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mainCatName: {
    fontSize: 15,
    fontWeight: '700',
  },
  mainCatSub: {
    fontSize: 12,
  },
```

- [ ] **Stap 8: TypeScript check + visuele controle**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Verwacht: geen fouten.

- [ ] **Stap 9: Commit**

```bash
git add app/(tabs)/prijzen.tsx
git commit -m "feat: two-step category navigation in Prijzen screen (main → sub → products)"
```

---

## Task 8: `app/(tabs)/index.tsx` — categoriestrip hoofdcategorieën

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Stap 1: Importeer `MAIN_CATEGORIES`**

Voeg toe aan de imports:

```ts
import { MAIN_CATEGORIES } from '@/constants/categories';
```

- [ ] **Stap 2: Vervang de `CATEGORIES` constante**

Verwijder:
```ts
const CATEGORIES = [
  { id: 'smartphones', label: 'Smartphones', icon: 'smartphone' as const, color: '#007AFF' },
  { id: 'laptops',     label: 'Laptops',      icon: 'laptop'    as const, color: '#5856D6' },
  { id: 'audio',       label: 'Audio',        icon: 'headphones'as const, color: '#FF2D55' },
  { id: 'televisies',  label: "TV's",         icon: 'tv'        as const, color: '#FF9500' },
  { id: 'gaming',      label: 'Gaming',       icon: 'sports-esports' as const, color: '#34C759' },
  { id: 'wearables',   label: 'Wearables',    icon: 'watch'     as const, color: '#AF52DE' },
];
```

Vervang door:
```ts
const CATEGORIES = MAIN_CATEGORIES.slice(0, 6).map(m => ({
  id: m.id,
  label: m.name,
  icon: m.icon as any,
  color: m.color,
}));
```

- [ ] **Stap 3: Pas de navigatie aan**

Zoek in `index.tsx` waar categorieknopjes worden gerenderd en de `href` naartoe gaat. Verander de navigatie van subcategorie naar hoofdcategorie:

Vóór (patroon):
```ts
router.push(`/prijzen?category=${item.id}`)
// of: href="/prijzen?category=smartphones"
```

Na:
```ts
router.push(`/(tabs)/prijzen?main=${item.id}`)
```

- [ ] **Stap 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Stap 5: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: home category strip shows main categories"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Task 1: `constants/categories.ts` met volledige boom
- ✅ Task 2: `mainCategory` op bestaande producten
- ✅ Task 3-4: ~40 nieuwe producten (Kleding, Schoenen, Sport, Wonen, Beauty, Speelgoed, Boeken)
- ✅ Task 5: `mainCategories` op shops + Zalando Lounge + `getShopsForCategory()`
- ✅ Task 6: `getProductsByMainCategory()` + `getProductsBySubCategory()`
- ✅ Task 7: twee-staps navigatie Prijzen-scherm
- ✅ Task 8: home categoriestrip hoofdcategorieën

**Type consistentie:**
- `MainCategory` gedefinieerd in Task 1, gebruikt in Tasks 7-8 ✅
- `getShopsForCategory()` gebruikt `'all'` wildcard, consistent met Task 5 ✅
- `mainCategory: string` op `Product` type, consistent met Tasks 2-4 ✅

**Spec-aantekening:** `Sport & Outdoor` in de spec ≠ `sport` als ID. In `categories.ts` (Task 1) is `name: 'Sport & Outdoor'` maar `id: 'sport'`. Mock-producten in Task 4 gebruiken `mainCategory: 'Sport & Outdoor'` — dit moet overeenkomen met `name`, niet `id`. De `getMainCategoryForSub()` functie zoekt op subcategorie-id. `getProductsByMainCategory()` filtert op `p.mainCategory === mainCategory` — de aanroeper geeft de `name` waarde door. Dit is consistent.
