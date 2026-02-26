/**
 * Product Filters UI
 * Collapsible, dynamic filter panel that adapts to any category's specs.
 * Features: visible filter button, confirm results button, category dropdown
 */

import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  BADGE_FILTERS,
  SORT_OPTIONS,
  type BadgeFilter,
  type SortOption,
} from '@/hooks/use-product-filters';
import { PRICE_RANGE_PRESETS, type FilterConfig } from '@/services/filter-config';
import { useCallback, useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View
} from 'react-native';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Category Options ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { id: 'all', name: 'Alle categorieën', emoji: '🛒' },
  { id: 'Smartphones', name: 'Smartphones', emoji: '📱' },
  { id: 'Tablets', name: 'Tablets', emoji: '📲' },
  { id: 'Laptops', name: 'Laptops', emoji: '💻' },
  { id: 'Desktops', name: 'Desktops', emoji: '🖥️' },
  { id: 'Monitoren', name: 'Monitoren', emoji: '🖥️' },
  { id: 'Televisies', name: 'Televisies', emoji: '📺' },
  { id: 'Audio', name: 'Audio', emoji: '🎧' },
  { id: 'Gameconsoles', name: 'Gameconsoles', emoji: '🎮' },
  { id: 'Gaming', name: 'Gaming', emoji: '🕹️' },
  { id: 'Netwerk', name: 'Netwerk', emoji: '📡' },
  { id: 'Fotografie', name: 'Fotografie', emoji: '📷' },
  { id: 'Huishoudelijk', name: 'Huishoudelijk', emoji: '🏠' },
  { id: 'Wearables', name: 'Wearables', emoji: '⌚' },
  { id: 'Grafische kaarten', name: 'Grafische kaarten', emoji: '🎴' },
  { id: 'Processors', name: 'Processors', emoji: '⚡' },
  { id: 'Moederborden', name: 'Moederborden', emoji: '🔧' },
  { id: 'Geheugen', name: 'Geheugen', emoji: '🧩' },
  { id: 'Opslag (SSD)', name: 'Opslag (SSD)', emoji: '💾' },
  { id: 'Opslag (HDD)', name: 'Opslag (HDD)', emoji: '💿' },
  { id: 'Voedingen', name: 'Voedingen', emoji: '🔌' },
  { id: 'Computerbehuizingen', name: 'Behuizingen', emoji: '📦' },
  { id: 'CPU-koelers', name: 'CPU-koelers', emoji: '❄️' },
  { id: 'Ventilatoren', name: 'Ventilatoren', emoji: '🌀' },
  { id: 'Toetsenborden', name: 'Toetsenborden', emoji: '⌨️' },
  { id: 'Muizen', name: 'Muizen', emoji: '🖱️' },
  { id: 'Webcams', name: 'Webcams', emoji: '📹' },
  { id: 'Luidsprekers', name: 'Luidsprekers', emoji: '🔊' },
  { id: 'Printers', name: 'Printers', emoji: '🖨️' },
  { id: 'Kabels & Adapters', name: 'Kabels & Adapters', emoji: '🔗' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductFiltersProps = {
  filterConfigs: FilterConfig[];
  activeFilters: Record<string, string[]>;
  onToggleFilterValue: (key: string, value: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  badgeFilter: BadgeFilter;
  onBadgeFilterChange: (badge: BadgeFilter) => void;
  priceRangeId: string;
  onPriceRangeChange: (id: string) => void;
  activeFilterCount: number;
  onReset: () => void;
  resultCount: number;
  currentCategoryId?: string;
  onCategoryChange?: (categoryId: string) => void;
};

// ─── Chip ────────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
  colors,
  accentColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'];
  accentColor?: string;
}) {
  const bg = selected ? (accentColor || colors.tint) : colors.surface;
  const textColor = selected ? '#fff' : colors.textSecondary;
  const borderStyle = selected
    ? {}
    : { borderColor: colors.border, borderWidth: 1 };

  return (
    <Pressable
      style={[styles.chip, { backgroundColor: bg }, borderStyle]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Chip Row ────────────────────────────────────────────────────────────────

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {children}
    </ScrollView>
  );
}

// ─── Filter Section ──────────────────────────────────────────────────────────

function FilterSection({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={[styles.filterSectionLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// ─── Category Dropdown Component ─────────────────────────────────────────────

function CategoryDropdown({
  selectedCategory,
  onSelectCategory,
  colors,
}: {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  colors: (typeof Colors)['light'];
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedOption = CATEGORY_OPTIONS.find(c => c.id === selectedCategory) || CATEGORY_OPTIONS[0];

  // Filter categories based on search query
  const filteredCategories = CATEGORY_OPTIONS.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (id: string) => {
    onSelectCategory(id);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.dropdownContainer}>
      <Text style={[styles.filterSectionLabel, { color: colors.textSecondary }]}>
        Categorie
      </Text>
      
      {/* Dropdown Button */}
      <Pressable
        style={[styles.dropdownButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.dropdownEmoji}>{selectedOption.emoji}</Text>
        <Text style={[styles.dropdownText, { color: colors.text }]}>
          {selectedOption.name}
        </Text>
        <Text style={[styles.dropdownArrow, { color: colors.textSecondary }]}>▼</Text>
      </Pressable>

      {/* Modal Picker */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Kies categorie
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={[styles.modalClose, { color: Palette.primary }]}>
                  ✕
                </Text>
              </Pressable>
            </View>
            
            {/* Search input in modal */}
            <View style={[styles.categorySearchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.categorySearchIcon}>🔍</Text>
              <TextInput
                style={[styles.categorySearchInput, { color: colors.text }]}
                placeholder="Zoek categorie..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {(searchQuery ? filteredCategories : CATEGORY_OPTIONS).map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.modalOption,
                    selectedCategory === category.id && { 
                      backgroundColor: Palette.primary + '20' 
                    },
                  ]}
                  onPress={() => handleSelect(category.id)}
                >
                  <Text style={styles.modalOptionEmoji}>{category.emoji}</Text>
                  <Text 
                    style={[
                      styles.modalOptionText, 
                      { color: colors.text },
                      selectedCategory === category.id && { color: Palette.primary, fontWeight: '600' }
                    ]}
                  >
                    {category.name}
                  </Text>
                  {selectedCategory === category.id && (
                    <Text style={[styles.modalCheck, { color: Palette.primary }]}>✓</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProductFilters({
  filterConfigs,
  activeFilters,
  onToggleFilterValue,
  sortOption,
  onSortChange,
  badgeFilter,
  onBadgeFilterChange,
  priceRangeId,
  onPriceRangeChange,
  activeFilterCount,
  onReset,
  resultCount,
  currentCategoryId = 'all',
  onCategoryChange,
}: ProductFiltersProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [expanded, setExpanded] = useState(false);
  
  // Pending filters state (for confirm button functionality)
  const [pendingFilters, setPendingFilters] = useState<{
    activeFilters: Record<string, string[]>;
    badgeFilter: BadgeFilter;
    priceRangeId: string;
  }>({
    activeFilters,
    badgeFilter,
    priceRangeId,
  });
  
  // Track if there are pending changes
  const hasPendingChanges = 
    JSON.stringify(pendingFilters.activeFilters) !== JSON.stringify(activeFilters) ||
    pendingFilters.badgeFilter !== badgeFilter ||
    pendingFilters.priceRangeId !== priceRangeId;

  // Sync pending filters when modal closes or resets
  useEffect(() => {
    if (!expanded) {
      setPendingFilters({
        activeFilters,
        badgeFilter,
        priceRangeId,
      });
    }
  }, [expanded, activeFilters, badgeFilter, priceRangeId]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  // Handle filter value toggle in pending state
  const handlePendingToggleFilter = useCallback((key: string, value: string) => {
    setPendingFilters(prev => {
      const current = prev.activeFilters[key] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, activeFilters: { ...prev.activeFilters, [key]: next } };
    });
  }, []);

  // Handle badge filter change in pending state
  const handlePendingBadgeChange = useCallback((badge: BadgeFilter) => {
    setPendingFilters(prev => ({ ...prev, badgeFilter: badge }));
  }, []);

  // Handle price range change in pending state
  const handlePendingPriceRangeChange = useCallback((id: string) => {
    setPendingFilters(prev => ({ ...prev, priceRangeId: id }));
  }, []);

  // Apply pending filters
  const handleApplyFilters = useCallback(() => {
    // Apply all pending filters
    Object.entries(pendingFilters.activeFilters).forEach(([key, values]) => {
      // Reset the filter first
      const currentValues = activeFilters[key] || [];
      values.forEach(value => {
        if (!currentValues.includes(value)) {
          onToggleFilterValue(key, value);
        }
      });
      // Remove deselected values
      currentValues.forEach(value => {
        if (!values.includes(value)) {
          onToggleFilterValue(key, value);
        }
      });
    });
    
    if (pendingFilters.badgeFilter !== badgeFilter) {
      onBadgeFilterChange(pendingFilters.badgeFilter);
    }
    if (pendingFilters.priceRangeId !== priceRangeId) {
      onPriceRangeChange(pendingFilters.priceRangeId);
    }
    
    // Close the panel after applying
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(false);
  }, [pendingFilters, activeFilters, onToggleFilterValue, onBadgeFilterChange, onPriceRangeChange, badgeFilter, priceRangeId]);

  // Reset pending filters
  const handleResetPending = useCallback(() => {
    setPendingFilters({
      activeFilters: {},
      badgeFilter: 'all',
      priceRangeId: 'all',
    });
  }, []);

  // Get current displayed filters (pending if expanded, applied if collapsed)
  const displayedFilters = expanded ? pendingFilters : { activeFilters, badgeFilter, priceRangeId };
  const displayedFilterCount = 
    Object.values(displayedFilters.activeFilters).reduce((sum, arr) => sum + arr.length, 0) +
    (displayedFilters.badgeFilter !== 'all' ? 1 : 0) +
    (displayedFilters.priceRangeId !== 'all' ? 1 : 0);

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {/* Sort row */}
      <View style={styles.topRow}>
        <ChipRow>
          {SORT_OPTIONS.map(s => (
            <Chip
              key={s.id}
              label={s.label}
              selected={sortOption === s.id}
              onPress={() => onSortChange(s.id)}
              colors={colors}
            />
          ))}
        </ChipRow>
      </View>

      {/* Filter toggle row - ALWAYS VISIBLE */}
      <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterToggleButton,
            expanded || hasPendingChanges
              ? { backgroundColor: Palette.primary }
              : { backgroundColor: Palette.primary + '15', borderColor: Palette.primary, borderWidth: 2 },
          ]}
          onPress={toggleExpanded}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          <Text
            style={[
              styles.filterToggleText,
              { color: expanded || hasPendingChanges ? '#fff' : Palette.primary },
            ]}
          >
            Filters
            {displayedFilterCount > 0 ? ` (${displayedFilterCount})` : ''}
          </Text>
          <Text style={[
            styles.filterArrow,
            { color: expanded || hasPendingChanges ? '#fff' : Palette.primary },
          ]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </Pressable>
      </View>

      {/* Badge filter row */}
      <View style={[styles.badgeRow, { borderBottomColor: colors.border }]}>
        <ChipRow>
          {BADGE_FILTERS.map(f => (
            <Chip
              key={f.id}
              label={f.label}
              selected={displayedFilters.badgeFilter === f.id}
              onPress={expanded ? () => handlePendingBadgeChange(f.id) : () => onBadgeFilterChange(f.id)}
              colors={colors}
              accentColor={Palette.primary}
            />
          ))}
        </ChipRow>
      </View>

      {/* Expandable filter panel with confirm button - NOW SCROLLABLE */}
      {expanded && (
        <ScrollView 
          style={[styles.filterPanel, { backgroundColor: colors.surface }]}
          contentContainerStyle={styles.filterPanelContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Category Dropdown */}
          {onCategoryChange && (
            <CategoryDropdown
              selectedCategory={currentCategoryId}
              onSelectCategory={onCategoryChange}
              colors={colors}
            />
          )}

          {/* Reset + result count header */}
          <View style={styles.filterPanelHeader}>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {resultCount} product{resultCount !== 1 ? 'en' : ''} gevonden
            </Text>
            <Pressable onPress={handleResetPending} style={styles.resetBtn}>
              <Text style={[styles.resetText, { color: Palette.primary }]}>
                Reset
              </Text>
            </Pressable>
          </View>

          {/* Price range */}
          <FilterSection label="Prijs" colors={colors}>
            <ChipRow>
              {PRICE_RANGE_PRESETS.map(p => (
                <Chip
                  key={p.id}
                  label={p.label}
                  selected={displayedFilters.priceRangeId === p.id}
                  onPress={() => handlePendingPriceRangeChange(p.id)}
                  colors={colors}
                  accentColor={Palette.primary}
                />
              ))}
            </ChipRow>
          </FilterSection>

          {/* Dynamic spec filters */}
          {filterConfigs.map(config => {
            const selected = displayedFilters.activeFilters[config.key] || [];
            return (
              <FilterSection key={config.key} label={config.label} colors={colors}>
                <ChipRow>
                  {config.options.map(option => (
                    <Chip
                      key={option.value}
                      label={`${option.label} (${option.count})`}
                      selected={selected.includes(option.value)}
                      onPress={() => handlePendingToggleFilter(config.key, option.value)}
                      colors={colors}
                      accentColor={Palette.primary}
                    />
                  ))}
                </ChipRow>
              </FilterSection>
            );
          })}

          {filterConfigs.length === 0 && (
            <Text style={[styles.noFilters, { color: colors.textSecondary }]}>
              Geen extra filters beschikbaar voor deze categorie.
            </Text>
          )}

          {/* CONFIRM SHOW RESULTS BUTTON */}
          <View style={styles.confirmButtonContainer}>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: Palette.primary }]}
              onPress={handleApplyFilters}
            >
              <Text style={styles.confirmButtonText}>
                ✓ Toon {resultCount} resultaten
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {},
  filterRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  badgeRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  chipRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Filter toggle button - smaller
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    gap: 4,
  },
  filterIcon: {
    fontSize: 12,
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterArrow: {
    fontSize: 8,
    marginLeft: 2,
  },

  filterPanel: {
    maxHeight: 400,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  filterPanelContent: {
    paddingBottom: Spacing.md,
  },
  
  // Search input styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchPlaceholder: {
    fontSize: 14,
  },

  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  resetBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
  },

  filterSection: {
    marginTop: Spacing.sm,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: Spacing.md,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  noFilters: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  // Confirm button styles
  confirmButtonContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  confirmButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Category dropdown styles
  dropdownContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  dropdownEmoji: {
    fontSize: 18,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 10,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 20,
    fontWeight: '600',
    padding: Spacing.xs,
  },
  
  // Category search input styles
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  categorySearchIcon: {
    fontSize: 14,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  modalScroll: {
    paddingTop: Spacing.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  modalOptionEmoji: {
    fontSize: 20,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
  },
  modalCheck: {
    fontSize: 18,
    fontWeight: '700',
  },
});

