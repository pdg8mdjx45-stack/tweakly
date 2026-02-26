# Scraper Fix Plan

## Current Categories in App (PRICE_CATEGORIES)
1. Grafische kaarten
2. Smartphones
3. Monitoren
4. Processors
5. Laptops
6. Televisies
7. Audio
8. Wearables
9. Geheugen
10. Huishoudelijk

## Missing Categories to Add
- Voedingen (PSU)
- Moerborden (Motherboards)
- Behuizingen (Cases)
- Opslag (SSD/HDD)
- Gaming laptops
- Tablets
- Desktops
- Netwerk
- Fotografie
- Gameconsoles

## Issues to Fix

### Tweakers Scraper
1. Wrong URL slugs (404 errors):
   - gaming-laptops → needs verification
   - moerborden → needs verification
   
2. Selector changes (returning 0 products):
   - geheugen-intern
   - interne-ssds
   - televisies
   - hoofdtelefoons
   - consoles
   - gaming-headsets
   - modems-en-routers
   - systeemcameras
   - robotstofzuigers
   - smartwatches

### Alternate Scraper
1. Complete redesign - selectors no longer work
2. Need to run with --debug to see new structure

## Implementation Steps
1. Fix Tweakers scraper with correct slugs and robust selectors
2. Add all missing categories
3. Run scraper to populate data
4. Update PRICE_CATEGORIES in app
