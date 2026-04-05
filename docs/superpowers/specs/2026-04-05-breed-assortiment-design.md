# Breed Assortiment — Design Spec

**Datum:** 2026-04-05
**Status:** Goedgekeurd

## Samenvatting

Tweakly uitbreiden van een puur tech-prijsvergelijker naar een breed consumentenprijsvergelijker. Alle productcategorieën (Elektronica, Kleding, Schoenen, Sport, Wonen, Beauty, Speelgoed, Boeken) worden ondersteund via een twee-niveau categoriestructuur: hoofdcategorie → subcategorie → producten.

---

## 1. Datamodel

### 1.1 `Product` type (uitbreiding in `constants/mock-data.ts`)

`mainCategory: string` toegevoegd als verplicht veld. Het bestaande `category` veld blijft de subcategorie. Alle bestaande producten krijgen `mainCategory: 'Elektronica'`.

```ts
export type Product = {
  // ... bestaande velden
  mainCategory: string;   // nieuw — 'Elektronica' | 'Kleding' | etc.
  category: string;       // subcategorie — ongewijzigd
  // ...
};
```

### 1.2 Nieuwe constante `constants/categories.ts`

Nieuw bestand met de volledige categorieboom, iconen en kleuren:

```ts
export type SubCategory = {
  id: string;
  name: string;
  icon: string;           // MaterialIcons naam
  color: string;
};

export type MainCategory = {
  id: string;
  name: string;
  icon: string;           // MaterialIcons naam
  color: string;
  gradient: [string, string];
  subcategories: SubCategory[];
};
```

**Volledige boom:**

| Hoofdcategorie | id | Subcategorieën |
|---|---|---|
| Elektronica | `elektronica` | Smartphones, Laptops, Tablets, Audio, Televisies, Gaming, Gameconsoles, Wearables, Fotografie, Netwerk, Huishoudelijk, Grafische kaarten, Processors, Moederborden, Geheugen, Opslag (SSD), Opslag (HDD), Monitoren, Toetsenborden, Muizen, Luidsprekers, Webcams |
| Kleding | `kleding` | Heren, Dames, Kinderen, Sportkleding |
| Schoenen | `schoenen` | Sneakers, Laarzen, Sandalen, Sportschoenen |
| Sport & Outdoor | `sport` | Fitness, Wielrennen, Hardlopen, Kamperen |
| Wonen & Tuin | `wonen` | Meubels, Verlichting, Keuken, Tuin |
| Beauty | `beauty` | Huidverzorging, Haarverzorging, Parfum |
| Speelgoed & Baby | `speelgoed` | Speelgoed, Baby |
| Boeken & Media | `boeken` | Boeken, Films, Muziek |

### 1.3 `AffiliateShop` uitbreiding (`constants/affiliate-shops.ts`)

`mainCategories: string[]` veld toegevoegd — welke hoofdcategorie-IDs de shop dekt.

| Shop | mainCategories |
|---|---|
| Amazon | `['all']` (wildcard) |
| Bol.com | `['all']` (wildcard) |
| Coolblue | `['elektronica']` |
| Alternate | `['elektronica']` |
| MediaMarkt | `['elektronica']` |
| Apple Store | `['elektronica']` |
| Zalando Lounge | `['kleding', 'schoenen']` |

**Nieuwe shop: Zalando Lounge**

```ts
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
}
```

---

## 2. Navigatie

### 2.1 Prijzen-scherm (`app/(tabs)/prijzen.tsx`)

**Stap 1 — Hoofdcategoriescherm** (nieuwe standaardweergave):
- 2-koloms grid van hoofdcategorie-tegels
- Elke tegel: gradient achtergrond, groot icoon, naam, aantal subcategorieën
- Zoekbalk bovenaan doorzoekt alle producten over alle categorieën
- Geen terugknop nodig (dit is de rootweergave)

**Stap 2 — Subcategorie + producten** (na tap op hoofdcategorie):
- Header met naam hoofdcategorie + terugknop
- Horizontale chip-rij van subcategorieën (bestaand patroon)
- Productgrid eronder (bestaand patroon, ongewijzigd)
- State: `selectedMain: MainCategory | null` — null = stap 1, ingevuld = stap 2

Navigatie verloopt volledig via lokale state, geen Expo Router push. Animatie: `FadeInDown` bij overgang stap 1 → stap 2 (bestaand patroon).

### 2.2 Home-tab categoriestrip (`app/(tabs)/index.tsx`)

De 6 categorieknopjes worden vervangen door hoofdcategorieën:

```
Elektronica | Kleding | Schoenen | Sport | Wonen | Beauty
```

Tap navigeert naar `/prijzen?main=elektronica` (via `useLocalSearchParams` in prijzen.tsx).

### 2.3 `CATEGORY_COLORS` record (`app/(tabs)/prijzen.tsx`)

Uitgebreid met alle nieuwe subcategorieën. Nieuwe hoofdcategoriën krijgen eigen kleur:

| Hoofdcategorie | Kleur |
|---|---|
| Elektronica | `#007AFF` (bestaand) |
| Kleding | `#FF2D55` |
| Schoenen | `#FF9500` |
| Sport & Outdoor | `#34C759` |
| Wonen & Tuin | `#5856D6` |
| Beauty | `#AF52DE` |
| Speelgoed & Baby | `#FF6B35` |
| Boeken & Media | `#8E8E93` |

---

## 3. Mock-producten

### 3.1 Aanpak

~40 nieuwe producten toegevoegd aan `MOCK_PRODUCTS` in `constants/mock-data.ts`. Elk product:
- Heeft `mainCategory` + `category` (subcategorie)
- Heeft echte EAN waar beschikbaar
- Heeft shop-links naar Bol.com + Amazon (search-URLs, indicatieve prijzen)
- Kleding/Schoenen ook met Zalando Lounge search-URL
- `specs` aangepast per categorietype (zie tabel hieronder)

### 3.2 Specs per categorietype

| Categorietype | Spec-velden |
|---|---|
| Kleding | Maat, Materiaal, Kleur, Pasvorm, Geslacht |
| Schoenen | Maat, Materiaal, Kleur, Sluiting, Zooltype |
| Sport | Gewicht, Afmeting, Materiaal, Niveau |
| Keukenapparatuur | Vermogen, Capaciteit, Kleur, Garantie |
| Beauty | Inhoud, Huidtype, Ingrediënten, Gebruik |
| Speelgoed | Leeftijd, Materiaal, Aantal onderdelen |
| Boeken | Auteur, Pagina's, Taal, Uitgever |

### 3.3 Productenlijst per subcategorie

**Kleding / Heren:**
- Nike Dri-FIT hardloopshirt (maat M/L/XL, zwart/wit)
- Levi's 501 Original jeans (maat 32/34)
- Tommy Hilfiger slim polo

**Kleding / Dames:**
- Adidas Essentials sportlegging
- H&M linnen zomerjurk
- Nike sportbeha (maat S/M/L)

**Kleding / Sportkleding:**
- Under Armour hardloopbroek
- Odlo thermoshirt

**Schoenen / Sneakers:**
- Nike Air Max 90 (maat 40–46)
- Adidas Stan Smith (maat 38–46)
- New Balance 574

**Schoenen / Sportschoenen:**
- Asics Gel-Kayano 31
- Brooks Ghost 16

**Sport & Outdoor / Fitness:**
- Bowflex SelectTech 552 dumbbellset
- Gymstick weerstandsbanden set
- Reebok yogamat 6mm

**Sport & Outdoor / Hardlopen:**
- Garmin Forerunner 265
- Polar Vantage M2

**Wonen & Tuin / Keuken:**
- Philips Airfryer XXL (EAN beschikbaar)
- Nespresso Vertuo Next
- KitchenAid Artisan staafmixer

**Wonen & Tuin / Verlichting:**
- Philips Hue White & Color Ambiance starter kit

**Beauty / Huidverzorging:**
- La Roche-Posay Toleriane Hydrating Gentle Cleanser
- CeraVe Moisturising Cream

**Beauty / Haarverzorging:**
- Dyson Airwrap Complete (EAN beschikbaar)
- Oral-B iO Series 9 elektrische tandenborstel

**Speelgoed / Speelgoed:**
- LEGO Technic Land Rover Defender (42110)
- Nintendo Switch Lite (ook in Gaming)

**Boeken / Boeken:**
- "Atomic Habits" — James Clear (NL editie)
- "De Belegger" — Dik Binnendijk
- "Sapiens" — Yuval Noah Harari (NL editie)

---

## 4. Affiliate shops per categorie

De `getShopsForCategory(mainCategoryId: string)` helperfunctie wordt toegevoegd aan `affiliate-shops.ts`:

```ts
export function getShopsForCategory(mainCategoryId: string): AffiliateShop[] {
  return AFFILIATE_SHOPS.filter(shop =>
    shop.mainCategories.includes('all') ||
    shop.mainCategories.includes(mainCategoryId)
  );
}
// 'all' is een wildcard — Bol.com en Amazon krijgen mainCategories: ['all']
```

Link-scanner (`app/link-scanner.tsx`) gebruikt dit om enkel relevante shops te tonen na het scannen van een URL.

---

## 5. Gewijzigde bestanden

| Bestand | Wijziging |
|---|---|
| `constants/categories.ts` | Nieuw — volledige categorieboom |
| `constants/mock-data.ts` | `mainCategory` veld op alle producten, ~40 nieuwe producten |
| `constants/affiliate-shops.ts` | `mainCategories` veld, Zalando Lounge toegevoegd, `getShopsForCategory()` |
| `app/(tabs)/prijzen.tsx` | Twee-staps navigatie, hoofdcategorie-grid stap 1 |
| `app/(tabs)/index.tsx` | Categoriestrip toont hoofdcategorieën |
| `services/product-db.ts` | `getProductsByMainCategory()` + `getProductsBySubCategory()` functies |

---

## 6. Buiten scope

- Echte productdata van externe APIs (Icecat, Bol API, etc.) — mock blijft basis
- Zoekfunctionaliteit over nieuwe categorieën uitbreiden (apart ticket)
- Zalando Lounge affiliate aanvraag (handmatig via Awin)
- Filteropties per niet-tech categorie (maat, kleur, etc.) — apart ticket
- Recommender uitbreiden naar nieuwe categorieën
