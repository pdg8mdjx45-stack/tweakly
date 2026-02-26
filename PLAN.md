# Tweakly Verbeterplan: Kloppende Info, Gratis, Handiger dan Tweakers

## Strategie
In plaats van alles tegelijk te doen, bouwen we stap voor stap met **echte, gratis databronnen**.
De app wordt handiger dan Tweakers door: snellere UX, slimmere zoeklinks, en alles in één app.

---

## Stap 1: Echte webshop-zoeklinks (shops)
**Nu:** Shops hebben random nepprijzen en placeholder URLs
**Straks:** Elke shop-knop opent de echte zoekpagina van die winkel voor dat product

- Verwijder nep-prijzen uit shop-links
- Toon "Bekijk bij [shop]" in plaats van een nepprijs
- Shops: Coolblue, Bol.com, MediaMarkt, Amazon.nl, Alternate, Azerty
- Link opent WebBrowser naar de zoekresultaten van die shop
- **Geen nep data meer** — eerlijk: "bekijk prijs bij winkel"

## Stap 2: Productdata via Icecat Open Catalog (gratis)
**Nu:** 12 hardcoded mock-producten met verzonnen specs
**Straks:** Echte specs en afbeeldingen van 500+ merken via Icecat

- Nieuwe service: `services/icecat-api.ts`
  - Query by EAN/GTIN of Brand+ProductCode
  - Parse specs (FeaturesGroups), images (Gallery), beschrijvingen
  - Cache responses in AsyncStorage (1 product per API call)
- Icecat gratis account vereist (registratie op icecat.biz)
- Toon "Specs Icecat" attributie op productpagina (vereist)
- Product type uitbreiden met `ean?: string` en `icecatId?: number`

## Stap 3: Curated productlijst met echte EANs
**Nu:** 12 mock producten met verzonnen data
**Straks:** ~50-100 populaire producten met echte EAN-codes

- Update `constants/mock-data.ts` met echte EAN-codes voor populaire producten
- Producten gesorteerd per categorie (smartphones, laptops, audio, etc.)
- Echte huidige prijsindicaties (handmatig bijgewerkt, met disclaimer)
- Specs worden live opgehaald via Icecat
- Disclaimer: "Prijzen zijn indicatief, klik op de winkel voor de actuele prijs"

## Stap 4: Google Shopping zoekintegratie
**Nu:** Zoeken werkt alleen op mock data
**Straks:** Zoeken doorzoekt curated producten + biedt "Zoek op Google Shopping" optie

- Voeg "Bekijk op Google Shopping" knop toe aan zoekresultaten
- URL: `https://www.google.com/search?tbm=shop&q={productnaam}`
- Gratis, geen API key nodig (opent in browser)
- Gebruiker kan altijd actuele prijzen vinden

## Stap 5: Prijsalerts verbeteren
**Nu:** Alleen mock alerts, geen echte functionaliteit
**Straks:** Alerts opslaan in AsyncStorage, handmatige check

- Alerts opslaan in AsyncStorage met target prijs
- "Check nu" knop die Google Shopping opent voor dat product
- Notificatie-reminder: "Controleer je prijsalerts" (lokale notificatie)
- Eerlijk: geen automatische prijstracking (dat vereist een backend)

## Stap 6: UI verbeteringen voor "handiger dan Tweakers"
- **Snellere navigatie:** Product vergelijken in 1 tap
- **Slimmere zoeklinks:** Direct naar de juiste winkelpagina
- **Offline modus:** Gecachte artikelen en producten zijn offline beschikbaar
- **Disclaimer banner:** "Prijzen zijn indicatief — klik voor actuele prijs"

---

## Wat we NIET doen (en waarom)
- ❌ Prijzen scrapen van webshops (illegaal/ToS-schending)
- ❌ Automatische real-time prijsupdates (vereist backend + kosten)
- ❌ Tweakers data kopiëren (databankrecht)
- ❌ Betaalde APIs (budget = €0)

## Volgorde van implementatie
1. Stap 1 — Echte shop-links (30 min)
2. Stap 3 — Curated producten met EANs (60 min)
3. Stap 2 — Icecat integratie (60 min)
4. Stap 4 — Google Shopping zoek (20 min)
5. Stap 5 — Prijsalerts verbeteren (30 min)
6. Stap 6 — UI polish (30 min)
