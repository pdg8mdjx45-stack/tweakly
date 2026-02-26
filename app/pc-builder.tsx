/**
 * PC Builder Screen
 * Multi-step wizard waarbij de gebruiker budget, gebruik en voorkeuren
 * invult, waarna de app automatisch een compatibele pc-configuratie samenstelt.
 */

import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  type BuildPreferences,
  type BuildResult,
  type UseCase,
  buildPC,
} from '@/services/pc-builder';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Constanten ───────────────────────────────────────────────────────────────

const BUDGET_PRESETS = [500, 750, 1000, 1500, 2000, 3000];

const USE_CASES: { id: UseCase; label: string; emoji: string; description: string }[] = [
  {
    id: 'school',
    label: 'School / Kantoor',
    emoji: '📚',
    description: 'Office, surfen, lichte taken',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    description: '1080p t/m 4K gaming',
  },
  {
    id: 'video',
    label: 'Video-editing',
    emoji: '🎬',
    description: 'Rendering, DaVinci, Premiere',
  },
  {
    id: 'programmeren',
    label: 'Programmeren',
    emoji: '💻',
    description: 'Compilatie, VMs, DevOps',
  },
];

// ─── Step-indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  totalSteps,
  colors,
}: {
  currentStep: number;
  totalSteps: number;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={stepStyles.row}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={[
            stepStyles.dot,
            {
              backgroundColor:
                i < currentStep ? Palette.primary : i === currentStep ? Palette.primary : colors.border,
              opacity: i === currentStep ? 1 : i < currentStep ? 0.5 : 0.25,
              width: i === currentStep ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },
});

// ─── Stap 1: Budget ───────────────────────────────────────────────────────────

function StepBudget({
  budget,
  onChange,
  colors,
}: {
  budget: string;
  onChange: (v: string) => void;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Wat is je budget?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Voer een bedrag in of kies een voorinstelling.
      </Text>

      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.euroSign, { color: colors.textSecondary }]}>€</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={budget}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="1000"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
        />
      </View>

      <View style={styles.presetGrid}>
        {BUDGET_PRESETS.map((preset) => {
          const isActive = budget === String(preset);
          return (
            <Pressable
              key={preset}
              style={({ pressed }) => [
                styles.presetChip,
                {
                  backgroundColor: isActive ? Palette.primary : colors.surface,
                  borderColor: isActive ? Palette.primary : colors.border,
                },
                pressed && { opacity: 0.82 },
              ]}
              onPress={() => onChange(String(preset))}
            >
              <Text
                style={[
                  styles.presetChipText,
                  { color: isActive ? '#fff' : colors.textSecondary },
                ]}
              >
                €{preset.toLocaleString('nl-NL')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Stap 2: Gebruik ──────────────────────────────────────────────────────────

function StepUseCase({
  selected,
  onSelect,
  colors,
}: {
  selected: UseCase | null;
  onSelect: (id: UseCase) => void;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Waarvoor gebruik je de pc?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        We stemmen de componenten af op jouw gebruik.
      </Text>

      <View style={styles.useCaseGrid}>
        {USE_CASES.map((uc) => {
          const isActive = selected === uc.id;
          return (
            <Pressable
              key={uc.id}
              style={({ pressed }) => [
                styles.useCaseCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isActive ? Palette.primary : colors.border,
                  borderWidth: isActive ? 2 : 1,
                },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => onSelect(uc.id)}
            >
              <Text style={styles.useCaseEmoji}>{uc.emoji}</Text>
              <Text style={[styles.useCaseLabel, { color: colors.text }]}>{uc.label}</Text>
              <Text style={[styles.useCaseDesc, { color: colors.textSecondary }]}>
                {uc.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Stap 3: Extra wensen ─────────────────────────────────────────────────────

type PrefKey = 'wantsQuiet' | 'wantsCompact' | 'wantsRGB';
type BrandPref = 'geen' | 'intel' | 'amd';

const EXTRA_PREFS: { key: PrefKey; label: string; emoji: string; description: string }[] = [
  { key: 'wantsQuiet', label: 'Stille pc', emoji: '🔇', description: 'Weinig ventilatorgeluid' },
  { key: 'wantsCompact', label: 'Compact formaat', emoji: '📦', description: 'Kleine behuizing (mATX/ITX)' },
  { key: 'wantsRGB', label: 'RGB-verlichting', emoji: '🌈', description: 'Gekleurde LED-verlichting' },
];

const BRAND_PREFS: { id: BrandPref; label: string; emoji: string }[] = [
  { id: 'geen', label: 'Geen voorkeur', emoji: '⚖️' },
  { id: 'intel', label: 'Intel voorkeur', emoji: '🔵' },
  { id: 'amd', label: 'AMD voorkeur', emoji: '🔴' },
];

function StepExtraPrefs({
  prefs,
  brandPref,
  onTogglePref,
  onSetBrand,
  colors,
}: {
  prefs: Record<PrefKey, boolean>;
  brandPref: BrandPref;
  onTogglePref: (key: PrefKey) => void;
  onSetBrand: (b: BrandPref) => void;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Extra wensen</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Optioneel – selecteer wat voor jou belangrijk is.
      </Text>

      {EXTRA_PREFS.map((pref) => {
        const isActive = prefs[pref.key];
        return (
          <Pressable
            key={pref.key}
            style={({ pressed }) => [
              styles.prefRow,
              {
                backgroundColor: isActive ? `${Palette.primary}18` : colors.surface,
                borderColor: isActive ? Palette.primary : colors.border,
              },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => onTogglePref(pref.key)}
          >
            <Text style={styles.prefEmoji}>{pref.emoji}</Text>
            <View style={styles.prefText}>
              <Text style={[styles.prefLabel, { color: colors.text }]}>{pref.label}</Text>
              <Text style={[styles.prefDesc, { color: colors.textSecondary }]}>{pref.description}</Text>
            </View>
            <View
              style={[
                styles.checkbox,
                { borderColor: isActive ? Palette.primary : colors.border },
                isActive && { backgroundColor: Palette.primary },
              ]}
            >
              {isActive && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </Pressable>
        );
      })}

      <Text style={[styles.brandTitle, { color: colors.textSecondary }]}>Merkvoorkeur CPU</Text>
      <View style={styles.brandRow}>
        {BRAND_PREFS.map((b) => {
          const isActive = brandPref === b.id;
          return (
            <Pressable
              key={b.id}
              style={({ pressed }) => [
                styles.brandChip,
                {
                  backgroundColor: isActive ? Palette.primary : colors.surface,
                  borderColor: isActive ? Palette.primary : colors.border,
                },
                pressed && { opacity: 0.82 },
              ]}
              onPress={() => onSetBrand(b.id)}
            >
              <Text style={styles.brandEmoji}>{b.emoji}</Text>
              <Text style={[styles.brandLabel, { color: isActive ? '#fff' : colors.text }]}>
                {b.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Resultaat ────────────────────────────────────────────────────────────────

function ComponentRow({
  label,
  name,
  price,
  spec,
  componentId,
  colors,
}: {
  label: string;
  name: string;
  price: number;
  spec: string;
  componentId: string;
  colors: (typeof Colors)['light'];
}) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.componentRow,
        { borderBottomColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => router.push(`/product/${componentId}`)}
    >
      <View style={styles.componentLeft}>
        <Text style={[styles.componentLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.componentName, { color: colors.text }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.componentSpec, { color: colors.textSecondary }]}>{spec}</Text>
      </View>
      <View style={styles.componentRight}>
        <Text style={[styles.componentPrice, { color: Palette.primary }]}>
          €{price.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </Text>
        <Text style={[styles.componentArrow, { color: colors.textSecondary }]}>›</Text>
      </View>
    </Pressable>
  );
}

function ResultScreen({
  result,
  budget,
  onReset,
  colors,
}: {
  result: BuildResult;
  budget: number;
  onReset: () => void;
  colors: (typeof Colors)['light'];
}) {
  const barWidth = Math.min(result.budgetUsedPercent, 100);
  const isOverBudget = result.totalPrice > budget;
  const allCompatible = result.compatibilityNotes.every((n) => n.startsWith('✓'));

  return (
    <ScrollView
      style={styles.resultScroll}
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Budget balk */}
      <View style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
        <View style={styles.budgetHeader}>
          <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>Budgetgebruik</Text>
          <Text style={[styles.budgetAmount, { color: isOverBudget ? Palette.danger : Palette.accent }]}>
            €{result.totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0 })} / €{budget.toLocaleString('nl-NL')}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${barWidth}%` as `${number}%`,
                backgroundColor: isOverBudget ? Palette.danger : Palette.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.budgetPercent, { color: colors.textSecondary }]}>
          {result.budgetUsedPercent}% van budget benut
        </Text>
      </View>

      {/* Componentenlijst */}
      <View style={[styles.componentCard, { backgroundColor: colors.surface }]}>
        <ComponentRow
          label="PROCESSOR"
          name={result.cpu.name}
          price={result.cpu.currentPrice}
          spec={`${result.cpu.cores} cores • tot ${result.cpu.boostFreqGHz} GHz • ${result.cpu.socket}`}
          componentId={result.cpu.id}
          colors={colors}
        />
        {result.gpu && (
          <ComponentRow
            label="GRAFISCHE KAART"
            name={result.gpu.name}
            price={result.gpu.currentPrice}
            spec={`${result.gpu.vramGB}GB VRAM • ${result.gpu.targetResolution}`}
            componentId={result.gpu.id}
            colors={colors}
          />
        )}
        <ComponentRow
          label="WERKGEHEUGEN"
          name={result.ram.name}
          price={result.ram.currentPrice}
          spec={`${result.ram.capacityGB}GB ${result.ram.type}-${result.ram.speedMHz}`}
          componentId={result.ram.id}
          colors={colors}
        />
        <ComponentRow
          label="MOEDERBORD"
          name={result.motherboard.name}
          price={result.motherboard.currentPrice}
          spec={`${result.motherboard.socket} • ${result.motherboard.chipset} • ${result.motherboard.formFactor}`}
          componentId={result.motherboard.id}
          colors={colors}
        />
        <ComponentRow
          label="OPSLAG"
          name={result.storage.name}
          price={result.storage.currentPrice}
          spec={`${result.storage.capacityGB >= 1000 ? `${result.storage.capacityGB / 1000}TB` : `${result.storage.capacityGB}GB`} ${result.storage.storageType}`}
          componentId={result.storage.id}
          colors={colors}
        />
        <ComponentRow
          label="VOEDING"
          name={result.psu.name}
          price={result.psu.currentPrice}
          spec={`${result.psu.wattage}W • ${result.psu.efficiency} • ${result.psu.modular ? 'Modulair' : 'Niet modulair'}`}
          componentId={result.psu.id}
          colors={colors}
        />
        <ComponentRow
          label="BEHUIZING"
          name={result.case.name}
          price={result.case.currentPrice}
          spec={`${result.case.formFactor}${result.case.hasRGB ? ' • RGB' : ''}${result.case.noiseDampening ? ' • Geluidsdemping' : ''}`}
          componentId={result.case.id}
          colors={colors}
        />
        <ComponentRow
          label="KOELING"
          name={result.cooler.name}
          price={result.cooler.currentPrice}
          spec={`${result.cooler.type}${result.cooler.aioSizeMm ? ` ${result.cooler.aioSizeMm}mm` : ''} • max ${result.cooler.tdpRating}W TDP`}
          componentId={result.cooler.id}
          colors={colors}
        />

        {/* Totaal */}
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Totaal</Text>
          <Text style={[styles.totalPrice, { color: Palette.primary }]}>
            €{result.totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* Compatibiliteit */}
      <View style={[styles.compatCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Compatibiliteit</Text>
        {result.compatibilityNotes.map((note, i) => (
          <Text
            key={i}
            style={[
              styles.compatNote,
              { color: note.startsWith('✓') ? Palette.accent : Palette.danger },
            ]}
          >
            {note}
          </Text>
        ))}
      </View>

      {/* Uitleg */}
      <View style={[styles.explanationCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionHeader, { color: colors.text }]}>💡 Waarom deze configuratie?</Text>
        <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
          {result.explanation}
        </Text>
      </View>

      {/* Opnieuw knop */}
      <Pressable
        style={({ pressed }) => [styles.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
        onPress={onReset}
      >
        <Text style={[styles.resetBtnText, { color: colors.text }]}>🔄 Opnieuw samenstellen</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Hoofd-component ──────────────────────────────────────────────────────────

export default function PCBuilderScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const TOTAL_STEPS = 3;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);

  // Stap-states
  const [budgetStr, setBudgetStr] = useState('1000');
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [extraPrefs, setExtraPrefs] = useState<Record<PrefKey, boolean>>({
    wantsQuiet: false,
    wantsCompact: false,
    wantsRGB: false,
  });
  const [brandPref, setBrandPref] = useState<BrandPref>('geen');

  const budget = Math.max(300, parseInt(budgetStr, 10) || 1000);

  function canAdvance(): boolean {
    if (step === 0) return budget >= 300;
    if (step === 1) return useCase !== null;
    return true;
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleBuild();
    }
  }

  function handleBuild() {
    if (!useCase) return;
    setLoading(true);

    // Kleine timeout zodat de loading-indicator zichtbaar is
    setTimeout(() => {
      const prefs: BuildPreferences = {
        budget,
        useCase,
        wantsQuiet: extraPrefs.wantsQuiet,
        wantsCompact: extraPrefs.wantsCompact,
        wantsRGB: extraPrefs.wantsRGB,
        brandPreference: brandPref,
      };
      const buildResult = buildPC(prefs);
      setResult(buildResult);
      setLoading(false);
    }, 600);
  }

  function handleReset() {
    setResult(null);
    setStep(0);
    setBudgetStr('1000');
    setUseCase(null);
    setExtraPrefs({ wantsQuiet: false, wantsCompact: false, wantsRGB: false });
    setBrandPref('geen');
  }

  function togglePref(key: PrefKey) {
    setExtraPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const stepLabels = ['Budget', 'Gebruik', 'Wensen'];

  // ── Render: resultaat ──
  if (result) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Pressable onPress={handleReset} style={styles.backBtn} hitSlop={12}>
            <Text style={[styles.backArrow, { color: colors.tint }]}>‹</Text>
            <Text style={[styles.backLabel, { color: colors.tint }]}>Opnieuw</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Jouw configuratie</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ResultScreen result={result} budget={budget} onReset={handleReset} colors={colors} />
      </View>
    );
  }

  // ── Render: loading ──
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Beste configuratie berekenen…
        </Text>
      </View>
    );
  }

  // ── Render: wizard ──
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Text style={[styles.backArrow, { color: colors.tint }]}>‹</Text>
          <Text style={[styles.backLabel, { color: colors.tint }]}>
            {step > 0 ? stepLabels[step - 1] : 'Terug'}
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>💻 PC Samenstellen</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicatorRow}>
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} colors={colors} />
        <Text style={[styles.stepCounter, { color: colors.textSecondary }]}>
          Stap {step + 1} van {TOTAL_STEPS}
        </Text>
      </View>

      {/* Stap-inhoud */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <StepBudget budget={budgetStr} onChange={setBudgetStr} colors={colors} />
        )}
        {step === 1 && (
          <StepUseCase selected={useCase} onSelect={setUseCase} colors={colors} />
        )}
        {step === 2 && (
          <StepExtraPrefs
            prefs={extraPrefs}
            brandPref={brandPref}
            onTogglePref={togglePref}
            onSetBrand={setBrandPref}
            colors={colors}
          />
        )}
      </ScrollView>

      {/* Doorgaan-knop */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: canAdvance() ? Palette.primary : colors.border },
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleNext}
          disabled={!canAdvance()}
        >
          <Text style={styles.nextBtnText}>
            {step === TOTAL_STEPS - 1 ? '🔧 Stel pc samen' : 'Volgende →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', gap: Spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xl + Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 80 },
  backArrow: { fontSize: 28, fontWeight: '300', lineHeight: 32, marginRight: 2 },
  backLabel: { fontSize: 17 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  headerSpacer: { minWidth: 80 },

  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  stepCounter: { fontSize: 13 },

  scrollArea: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  // ── Stap-inhoud ──
  stepContent: { gap: Spacing.md },
  stepTitle: { fontSize: 24, fontWeight: '700', letterSpacing: 0.3 },
  stepSubtitle: { fontSize: 14, lineHeight: 20 },

  // Budget
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  euroSign: { fontSize: 20, fontWeight: '500' },
  input: { flex: 1, fontSize: 28, fontWeight: '700', paddingVertical: 4 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  presetChipText: { fontSize: 14, fontWeight: '500' },

  // Gebruik
  useCaseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  useCaseCard: {
    width: '47%',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  useCaseEmoji: { fontSize: 28 },
  useCaseLabel: { fontSize: 14, fontWeight: '600' },
  useCaseDesc: { fontSize: 12, lineHeight: 16 },

  // Extra wensen
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  prefEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  prefText: { flex: 1, gap: 2 },
  prefLabel: { fontSize: 15, fontWeight: '600' },
  prefDesc: { fontSize: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  brandTitle: { fontSize: 13, fontWeight: '500', marginTop: Spacing.sm },
  brandRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  brandEmoji: { fontSize: 16 },
  brandLabel: { fontSize: 13, fontWeight: '500' },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  nextBtn: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Loading
  loadingText: { fontSize: 15, marginTop: Spacing.sm },

  // Resultaat
  resultScroll: { flex: 1 },
  resultContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  budgetCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLabel: { fontSize: 13, fontWeight: '500' },
  budgetAmount: { fontSize: 15, fontWeight: '700' },
  progressBar: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  budgetPercent: { fontSize: 12 },

  componentCard: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  componentLeft: { flex: 1, gap: 2 },
  componentLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  componentName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  componentSpec: { fontSize: 11, lineHeight: 16 },
  componentRight: { alignItems: 'flex-end', gap: 2 },
  componentPrice: { fontSize: 15, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  componentArrow: { fontSize: 18, fontWeight: '300' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalPrice: { fontSize: 20, fontWeight: '800' },

  compatCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: { fontSize: 15, fontWeight: '700' },
  compatNote: { fontSize: 13, lineHeight: 20 },

  explanationCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  explanationText: { fontSize: 14, lineHeight: 22 },

  resetBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  resetBtnText: { fontSize: 15, fontWeight: '600' },
});
