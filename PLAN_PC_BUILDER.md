# PC Builder Feature – Implementatieplan

## Overzicht
Een "PC Samenstellen"-kaart toevoegen aan de categorie-grid in de Prijzen-tab. Die opent een multi-step wizard waarbij de gebruiker budget/gebruik/voorkeuren invult, en de app automatisch compatibele onderdelen selecteert uit een gecureerde database.

---

## Nieuwe bestanden

### 1. `data/pc-components.json`
Gecureerde componentendatabase met ~65 producten in 8 categorieën:

| Categorie | Sleutel | Aantal | Sleutelvelden |
|-----------|---------|--------|---------------|
| Processors | `cpu` | 10 | socket, tdp, cores, brand |
| Grafische kaarten | `gpu` | 10 | vram, tdp, tier |
| Geheugen | `ram` | 7 | type (DDR4/DDR5), capacityGB |
| Moederborden | `motherboard` | 10 | socket, ramType, formFactor, chipset |
| Opslag | `storage` | 7 | capacityGB, storageType (NVMe/SATA) |
| Voedingen | `psu` | 7 | wattage, efficiency, modular |
| Behuizingen | `case` | 8 | formFactor, hasRGB, isCompact, noiseDampening |
| Koeling | `cooler` | 8 | type, supportedSockets, isQuiet, hasRGB, tdpRating |

### 2. `services/pc-builder.ts`
Modulaire logica met volgende exports:

```
Types:
  BuildPreferences  – budget, useCase, performanceLevel, extra preferences
  PCComponent       – id, name, brand, price, category, specs + typed velden
  BuildResult       – geselecteerde componenten + totaalprijs + uitleg

Functies:
  getBudgetAllocations(useCase, performanceLevel, budget) → Record<category, €>
  selectBestComponent(components[], budget) → component | null
  checkCompatibility(cpu, motherboard, ram, gpu, psu, cooler) → CompatibilityResult
  buildPC(preferences) → BuildResult
  generateExplanation(preferences, result) → string
```

**Scoring formule** (beste prijs/kwaliteit):
```
score = (rating / 5) * 0.55 + (price / budgetForCategory) * 0.35 + log(reviewCount+1)/10 * 0.10
```
Producten boven budget krijgen score -1 (uitgesloten).

**Compatibiliteitsregels:**
- CPU socket === Moederbord socket (AM4/AM5/LGA1700/LGA1851)
- Moederbord ramType === RAM type (DDR4/DDR5)
- PSU wattage ≥ CPU tdp + GPU tdp + 150W headroom
- Behuizing formFactor ≥ Moederbord formFactor (ATX > mATX > ITX)
- Koeling supportedSockets.includes(cpu.socket)

**Budgetverdeling per gebruik:**

| Component | School | Gaming | Video | Programmeren |
|-----------|--------|--------|-------|--------------|
| CPU | 30% | 20% | 22% | 28% |
| GPU | 0% | 35% | 28% | 18% |
| RAM | 15% | 10% | 18% | 15% |
| Moederbord | 18% | 12% | 12% | 14% |
| Opslag | 15% | 9% | 8% | 10% |
| Voeding | 10% | 7% | 5% | 7% |
| Behuizing | 8% | 5% | 5% | 5% |
| Koeling | 4% | 2% | 2% | 3% |

### 3. `app/pc-builder.tsx`
Multi-step wizard screen (4 stappen + resultaat):

**Stap 1 – Budget:**
- Tekstinvoer (€) + snelkeuze-chips: €500 / €750 / €1000 / €1500 / €2000 / €3000

**Stap 2 – Gebruik:**
- 2×2 kaartgrid: 📚 School/Kantoor · 🎮 Gaming · 🎬 Video-editing · 💻 Programmeren

**Stap 3 – Extra wensen** (multiselect chips):
- Stille pc · Compact formaat · RGB verlichting · Intel voorkeur · AMD voorkeur

**Stap 4 – Resultaat:**
- Budgetbalk (verbruikt/totaal)
- Componentenlijst: categorie-label · naam · prijs · korte spec-samenvatting
- Totaalprijs onderaan
- Compatibiliteitsbevestiging ("✓ Alle onderdelen zijn compatibel")
- Uitlegblok (gegenereerde tekst)
- "Opnieuw" knop

---

## Gewijzigde bestanden

### `app/(tabs)/prijzen.tsx`
- Voeg een prominente full-width banner-kaart "💻 PC Samenstellen" toe bóven het categorie-grid
- Kaart bevat: icoon + titel + subtitel ("Stel automatisch je ideale pc samen")
- `onPress` → `router.push('/pc-builder')`

---

## Volgorde van implementatie

1. `data/pc-components.json` aanmaken (componentendata)
2. `services/pc-builder.ts` aanmaken (logica)
3. `app/pc-builder.tsx` aanmaken (UI)
4. `app/(tabs)/prijzen.tsx` aanpassen (banner-kaart)
