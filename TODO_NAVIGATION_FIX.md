# Navigation Fix Plan

## Issue
The call stack error originates from BottomTabNavigator in app/(tabs)/_layout.tsx when trying to render tabs.

## Root Causes
1. Mismatch between QUICK_ACTIONS links in index.tsx and actual tab definitions in _layout.tsx
2. `zoeken` has `href: null` (hidden) but is linked to in QUICK_ACTIONS

## Fix Plan

### Step 1: Fix app/(tabs)/_layout.tsx
- Ensure all tab screens are properly registered
- Add any missing tab definitions
- Keep hidden tabs with href: null only for screens that won't be linked from visible UI

### Step 2: Fix app/(tabs)/index.tsx
- Update QUICK_ACTIONS to only link to valid tab screens
- For hidden screens like "zoeken", use proper programmatic navigation or remove from quick actions
