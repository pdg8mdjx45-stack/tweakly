/**
 * PC Builder Service
 * Regelgebaseerde logica voor automatische pc-samenstelling op basis van
 * gebruikersvoorkeuren. Selecteert compatibele componenten binnen budget.
 */

import type { Product } from '@/constants/mock-data';
import pcComponentsData from '@/data/pc-components.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UseCase = 'school' | 'gaming' | 'video' | 'programmeren';
export type PerformanceTier = 'budget' | 'mid' | 'high' | 'extreme';

export interface BuildPreferences {
  budget: number;
  useCase: UseCase;
  wantsQuiet: boolean;
  wantsCompact: boolean;
  wantsRGB: boolean;
  brandPreference: 'intel' | 'amd' | 'geen';
}

export interface CPU {
  id: string;
  name: string;
  brand: string;
  socket: string;
  cores: number;
  threads: number;
  baseFreqGHz: number;
  boostFreqGHz: number;
  tdp: number;
  tier: string;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface GPU {
  id: string;
  name: string;
  brand: string;
  vramGB: number;
  tdp: number;
  tier: string;
  targetResolution: string;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface RAM {
  id: string;
  name: string;
  brand: string;
  type: 'DDR4' | 'DDR5';
  capacityGB: number;
  speedMHz: number;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface Motherboard {
  id: string;
  name: string;
  brand: string;
  socket: string;
  chipset: string;
  ramType: 'DDR4' | 'DDR5';
  ramSlots: number;
  maxRamGB: number;
  formFactor: 'ITX' | 'mATX' | 'ATX';
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface Storage {
  id: string;
  name: string;
  brand: string;
  storageType: 'NVMe' | 'SATA';
  capacityGB: number;
  readMBps: number;
  writeMBps: number;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface PSU {
  id: string;
  name: string;
  brand: string;
  wattage: number;
  efficiency: string;
  modular: boolean;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface Case {
  id: string;
  name: string;
  brand: string;
  formFactor: 'ITX' | 'mATX' | 'ATX';
  hasRGB: boolean;
  isCompact: boolean;
  noiseDampening: boolean;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface Cooler {
  id: string;
  name: string;
  brand: string;
  type: 'Lucht' | 'AIO';
  aioSizeMm: number | null;
  supportedSockets: string[];
  tdpRating: number;
  hasRGB: boolean;
  isQuiet: boolean;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  shops: { name: string; price: number; url: string }[];
}

export interface BuildResult {
  cpu: CPU;
  gpu: GPU | null;
  ram: RAM;
  motherboard: Motherboard;
  storage: Storage;
  psu: PSU;
  case: Case;
  cooler: Cooler;
  totalPrice: number;
  budgetUsedPercent: number;
  explanation: string;
  compatibilityNotes: string[];
}

// ─── Budgetverdeling per gebruik ─────────────────────────────────────────────

/**
 * Geeft de procentuele budgetverdeling per componentcategorie terug,
 * afhankelijk van het gebruiksdoel.
 */
export function getBudgetAllocations(
  useCase: UseCase,
): Record<string, number> {
  const allocations: Record<UseCase, Record<string, number>> = {
    school: {
      cpu: 0.28,
      gpu: 0.00,   // geen discrete GPU nodig
      ram: 0.15,
      motherboard: 0.17,
      storage: 0.15,
      psu: 0.13,
      case: 0.08,
      cooler: 0.04,
    },
    gaming: {
      cpu: 0.20,
      gpu: 0.35,
      ram: 0.10,
      motherboard: 0.12,
      storage: 0.09,
      psu: 0.07,
      case: 0.05,
      cooler: 0.02,
    },
    video: {
      cpu: 0.22,
      gpu: 0.28,
      ram: 0.20,   // video-editing profiteert van veel RAM
      motherboard: 0.12,
      storage: 0.08,
      psu: 0.05,
      case: 0.03,
      cooler: 0.02,
    },
    programmeren: {
      cpu: 0.28,
      gpu: 0.18,
      ram: 0.17,   // compilatie profiteert van RAM
      motherboard: 0.14,
      storage: 0.10,
      psu: 0.07,
      case: 0.04,
      cooler: 0.02,
    },
  };
  return allocations[useCase];
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Berekent de prijs/kwaliteit-score voor een component binnen een categorie-budget.
 * Hogere score = betere keuze. Producten boven budget krijgen -1 (uitgesloten).
 */
function scoreComponent(
  price: number,
  rating: number,
  reviewCount: number,
  budget: number,
): number {
  if (price > budget) return -1;
  const qualityScore = rating / 5;                            // 0–1
  const budgetFit = price / budget;                           // 0–1 (hoger = benut meer van budget)
  const popularityBonus = Math.log10(reviewCount + 1) / 4;   // 0–~1
  // Gewogen score: kwaliteit telt zwaar, budgetbenutting beloont dure opties, populariteit als tiebreaker
  return qualityScore * 0.55 + budgetFit * 0.35 + popularityBonus * 0.10;
}

function bestOf<T extends { currentPrice: number; rating: number; reviewCount: number }>(
  items: T[],
  budget: number,
  filter?: (item: T) => boolean,
): T | null {
  const candidates = items.filter((item) => {
    if (item.currentPrice > budget) return false;
    return filter ? filter(item) : true;
  });
  if (candidates.length === 0) return null;

  return candidates.reduce((best, item) => {
    const bestScore = scoreComponent(best.currentPrice, best.rating, best.reviewCount, budget);
    const itemScore = scoreComponent(item.currentPrice, item.rating, item.reviewCount, budget);
    return itemScore > bestScore ? item : best;
  });
}

// ─── Compatibiliteitscontrole ─────────────────────────────────────────────────

/**
 * Controleert of alle geselecteerde componenten compatibel zijn.
 * Geeft een lijst van compatibiliteitsproblemen terug (leeg = alles OK).
 */
export function checkCompatibility(
  cpu: CPU,
  motherboard: Motherboard,
  ram: RAM,
  gpu: GPU | null,
  psu: PSU,
  cooler: Cooler,
): string[] {
  const issues: string[] = [];

  // 1. CPU socket ↔ Moederbord socket
  if (cpu.socket !== motherboard.socket) {
    issues.push(
      `CPU (${cpu.socket}) is niet compatibel met moederbord socket (${motherboard.socket}).`,
    );
  }

  // 2. Moederbord RAM-type ↔ RAM
  if (motherboard.ramType !== ram.type) {
    issues.push(
      `Moederbord ondersteunt ${motherboard.ramType}, maar geselecteerd RAM is ${ram.type}.`,
    );
  }

  // 3. PSU wattage ≥ CPU TDP + GPU TDP + 150W marge
  const requiredWattage = cpu.tdp + (gpu?.tdp ?? 0) + 150;
  if (psu.wattage < requiredWattage) {
    issues.push(
      `Voeding (${psu.wattage}W) is te zwak voor CPU + GPU verbruik (min. ${requiredWattage}W aanbevolen).`,
    );
  }

  // 4. Koeler ondersteunt CPU socket
  if (!cooler.supportedSockets.includes(cpu.socket)) {
    issues.push(
      `Koeler ondersteunt socket ${cooler.supportedSockets.join('/')} maar CPU heeft socket ${cpu.socket}.`,
    );
  }

  // 5. Koeler TDP ≥ CPU TDP
  if (cooler.tdpRating < cpu.tdp) {
    issues.push(
      `Koeler is beoordeeld voor ${cooler.tdpRating}W maar CPU heeft een TDP van ${cpu.tdp}W.`,
    );
  }

  return issues;
}

// ─── Formfactor-compatibiliteit ───────────────────────────────────────────────

/**
 * Controleert of een behuizing het moederbord formfactor ondersteunt.
 * ATX behuizing past: ATX, mATX, ITX
 * mATX behuizing past: mATX, ITX
 * ITX behuizing past: ITX only
 */
function caseSupportsMotherboard(caseFF: string, mbFF: string): boolean {
  const hierarchy: Record<string, string[]> = {
    ATX: ['ATX', 'mATX', 'ITX'],
    mATX: ['mATX', 'ITX'],
    ITX: ['ITX'],
  };
  return (hierarchy[caseFF] ?? []).includes(mbFF);
}

// ─── Uitleg genereren ─────────────────────────────────────────────────────────

function generateExplanation(
  preferences: BuildPreferences,
  cpu: CPU,
  gpu: GPU | null,
  ram: RAM,
  totalPrice: number,
): string {
  const useCaseLabels: Record<UseCase, string> = {
    school: 'school en kantoor',
    gaming: 'gaming',
    video: 'video-editing en contentcreatie',
    programmeren: 'softwareontwikkeling en programmeren',
  };

  const label = useCaseLabels[preferences.useCase];
  const gpuLine = gpu
    ? ` De ${gpu.name} (${gpu.vramGB}GB VRAM) zorgt voor vlotte graphics en ${gpu.targetResolution} gaming-prestaties.`
    : ' Zonder discrete GPU is dit systeem gericht op kantoor- en productiviteitstaken.';

  return (
    `Deze configuratie is samengesteld voor ${label} binnen een budget van €${preferences.budget.toLocaleString('nl-NL')}.` +
    ` De ${cpu.name} (${cpu.cores} cores, tot ${cpu.boostFreqGHz} GHz) biedt uitstekende prestaties voor dit gebruiksdoel.` +
    gpuLine +
    ` Met ${ram.capacityGB}GB ${ram.type} werkgeheugen zijn zware taken goed te handelen.` +
    ` Totaalprijs: €${totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
  );
}

// ─── Hoofd-algoritme ─────────────────────────────────────────────────────────

/**
 * Stelt automatisch een pc samen op basis van de opgegeven voorkeuren.
 * Selecteert de beste prijs/kwaliteit-combinatie per component,
 * met respect voor compatibiliteitsregels en het totaalbudget.
 */
export function buildPC(preferences: BuildPreferences): BuildResult | null {
  const { budget, useCase, wantsQuiet, wantsCompact, wantsRGB, brandPreference } = preferences;

  const alloc = getBudgetAllocations(useCase);

  const cpuBudget = Math.round(budget * alloc.cpu);
  const gpuBudget = Math.round(budget * alloc.gpu);
  const ramBudget = Math.round(budget * alloc.ram);
  const mbBudget = Math.round(budget * alloc.motherboard);
  const storageBudget = Math.round(budget * alloc.storage);
  const psuBudget = Math.round(budget * alloc.psu);
  const caseBudget = Math.round(budget * alloc.case);
  const coolerBudget = Math.round(budget * alloc.cooler);

  const cpuList = pcComponentsData.cpu as CPU[];
  const gpuList = pcComponentsData.gpu as GPU[];
  const ramList = pcComponentsData.ram as RAM[];
  const mbList = pcComponentsData.motherboard as Motherboard[];
  const storageList = pcComponentsData.storage as Storage[];
  const psuList = pcComponentsData.psu as PSU[];
  const caseList = pcComponentsData.case as Case[];
  const coolerList = pcComponentsData.cooler as Cooler[];

  // 1. Selecteer CPU (pas merkvoorkeur toe)
  const cpu = bestOf(cpuList, cpuBudget, (c) => {
    if (brandPreference === 'intel') return c.brand === 'Intel';
    if (brandPreference === 'amd') return c.brand === 'AMD';
    return true;
  }) ?? bestOf(cpuList, cpuBudget); // fallback zonder merkfilter

  if (!cpu) return null;

  // 2. Selecteer moederbord (socket moet overeenkomen met CPU)
  const targetFormFactor = wantsCompact ? ['mATX', 'ITX'] : ['ATX', 'mATX'];
  const motherboard =
    bestOf(mbList, mbBudget, (mb) =>
      mb.socket === cpu.socket && targetFormFactor.includes(mb.formFactor),
    ) ??
    bestOf(mbList, mbBudget, (mb) => mb.socket === cpu.socket);

  if (!motherboard) return null;

  // 3. Selecteer RAM (type moet overeenkomen met moederbord)
  const ram = bestOf(ramList, ramBudget, (r) => r.type === motherboard.ramType);
  if (!ram) return null;

  // 4. Selecteer GPU (skip voor school-gebruik)
  let gpu: GPU | null = null;
  if (alloc.gpu > 0) {
    gpu =
      bestOf(gpuList, gpuBudget, (g) => {
        if (brandPreference === 'intel') return false; // Intel heeft geen discrete GPU in de database
        if (brandPreference === 'amd') return g.brand === 'AMD';
        return true;
      }) ?? bestOf(gpuList, gpuBudget);
  }

  // 5. Selecteer opslag
  const storage = bestOf(storageList, storageBudget);
  if (!storage) return null;

  // 6. Bepaal minimaal benodigde PSU-wattage en selecteer voeding
  const minWattage = cpu.tdp + (gpu?.tdp ?? 0) + 150;
  const psu = bestOf(psuList, psuBudget, (p) => p.wattage >= minWattage);
  if (!psu) return null;

  // 7. Selecteer behuizing (formfactor ↔ moederbord, pas compact/RGB voorkeur toe)
  const pcCase =
    bestOf(caseList, caseBudget, (c) => {
      if (!caseSupportsMotherboard(c.formFactor, motherboard.formFactor)) return false;
      if (wantsCompact && !c.isCompact) return false;
      if (wantsRGB && !c.hasRGB) return false;
      if (wantsQuiet && !c.noiseDampening) return false;
      return true;
    }) ??
    // fallback: laat stille/RGB voorkeur los, houd formfactor
    bestOf(caseList, caseBudget, (c) =>
      caseSupportsMotherboard(c.formFactor, motherboard.formFactor),
    ) ??
    bestOf(caseList, caseBudget);

  if (!pcCase) return null;

  // 8. Selecteer koeler (socket + TDP + stille voorkeur)
  const cooler =
    bestOf(coolerList, coolerBudget, (c) => {
      if (!c.supportedSockets.includes(cpu.socket)) return false;
      if (c.tdpRating < cpu.tdp) return false;
      if (wantsQuiet && !c.isQuiet) return false;
      if (wantsRGB && !c.hasRGB) return false;
      return true;
    }) ??
    // fallback: houd alleen socket + TDP vereiste
    bestOf(coolerList, coolerBudget, (c) =>
      c.supportedSockets.includes(cpu.socket) && c.tdpRating >= cpu.tdp,
    ) ??
    bestOf(coolerList, coolerBudget, (c) => c.supportedSockets.includes(cpu.socket));

  if (!cooler) return null;

  // 9. Compatibiliteitscontrole
  const compatibilityIssues = checkCompatibility(cpu, motherboard, ram, gpu, psu, cooler);

  // 10. Totaalprijs en eindresultaat
  const totalPrice =
    cpu.currentPrice +
    (gpu?.currentPrice ?? 0) +
    ram.currentPrice +
    motherboard.currentPrice +
    storage.currentPrice +
    psu.currentPrice +
    pcCase.currentPrice +
    cooler.currentPrice;

  const budgetUsedPercent = Math.round((totalPrice / budget) * 100);

  const compatibilityNotes =
    compatibilityIssues.length === 0
      ? ['✓ Alle onderdelen zijn compatibel met elkaar.']
      : compatibilityIssues;

  const explanation = generateExplanation(preferences, cpu, gpu, ram, totalPrice);

  return {
    cpu,
    gpu,
    ram,
    motherboard,
    storage,
    psu,
    case: pcCase,
    cooler,
    totalPrice,
    budgetUsedPercent,
    explanation,
    compatibilityNotes,
  };
}

// ─── Component → Product conversie ──────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  cpu: 'Processors',
  gpu: 'Grafische kaarten',
  ram: 'Geheugen',
  motherboard: 'Moederborden',
  storage: 'Opslag (SSD)',
  psu: 'Voedingen',
  case: 'Computerbehuizingen',
  cooler: 'CPU-koelers',
};

function specsForComponent(type: string, component: Record<string, unknown>): Record<string, string> {
  switch (type) {
    case 'cpu': {
      const c = component as unknown as CPU;
      return { Socket: c.socket, Cores: `${c.cores}`, Threads: `${c.threads}`, 'Base klok': `${c.baseFreqGHz} GHz`, 'Boost klok': `${c.boostFreqGHz} GHz`, TDP: `${c.tdp}W` };
    }
    case 'gpu': {
      const g = component as unknown as GPU;
      return { VRAM: `${g.vramGB} GB`, TDP: `${g.tdp}W`, Resolutie: g.targetResolution };
    }
    case 'ram': {
      const r = component as unknown as RAM;
      return { Type: r.type, Capaciteit: `${r.capacityGB} GB`, Snelheid: `${r.speedMHz} MHz` };
    }
    case 'motherboard': {
      const mb = component as unknown as Motherboard;
      return { Socket: mb.socket, Chipset: mb.chipset, 'RAM type': mb.ramType, Formfactor: mb.formFactor, 'RAM slots': `${mb.ramSlots}` };
    }
    case 'storage': {
      const s = component as unknown as Storage;
      return { Type: s.storageType, Capaciteit: s.capacityGB >= 1000 ? `${s.capacityGB / 1000} TB` : `${s.capacityGB} GB`, Lezen: `${s.readMBps} MB/s`, Schrijven: `${s.writeMBps} MB/s` };
    }
    case 'psu': {
      const p = component as unknown as PSU;
      return { Wattage: `${p.wattage}W`, Efficiëntie: p.efficiency, Modulair: p.modular ? 'Ja' : 'Nee' };
    }
    case 'case': {
      const cs = component as unknown as Case;
      return { Formfactor: cs.formFactor, RGB: cs.hasRGB ? 'Ja' : 'Nee', Geluidsdemping: cs.noiseDampening ? 'Ja' : 'Nee', Compact: cs.isCompact ? 'Ja' : 'Nee' };
    }
    case 'cooler': {
      const cl = component as unknown as Cooler;
      return { Type: cl.type, 'Max TDP': `${cl.tdpRating}W`, Sockets: cl.supportedSockets.join(', '), RGB: cl.hasRGB ? 'Ja' : 'Nee', Stil: cl.isQuiet ? 'Ja' : 'Nee' };
    }
    default:
      return {};
  }
}

/**
 * Converteert een PC-component naar het Product formaat zodat de product-detailpagina
 * het kan weergeven. Wordt gebruikt door fetchProductById als fallback.
 */
export function pcComponentToProduct(id: string): Product | undefined {
  for (const [type, components] of Object.entries(pcComponentsData)) {
    const comp = (components as Array<{ id: string; name: string; brand: string; currentPrice: number; rating: number; reviewCount: number; shops: { name: string; price: number; url: string }[] }>).find(c => c.id === id);
    if (!comp) continue;

    return {
      id: comp.id,
      name: comp.name,
      brand: comp.brand,
      category: CATEGORY_MAP[type] ?? type,
      imageUrl: `https://placehold.co/600x400/1a1a1a/ffffff?text=${encodeURIComponent(comp.name.slice(0, 20))}`,
      currentPrice: comp.currentPrice,
      originalPrice: comp.currentPrice,
      lowestPrice: comp.currentPrice,
      rating: comp.rating,
      reviewCount: comp.reviewCount,
      priceHistory: [],
      shops: comp.shops.map(s => ({ ...s, logo: s.name.slice(0, 3).toUpperCase() })),
      specs: specsForComponent(type, comp as unknown as Record<string, unknown>),
    };
  }
  return undefined;
}
