# Affiliate Networks & Live Product APIs Guide

Getting real-time prices, full product specs, and functioning affiliate links requires you to use official platforms rather than relying on unreliable HTML scrapers.

Please follow these steps to register and obtain the required API keys to update this App.

## 1. Affiliate Networks (For Direct Links & Earn/Commission)

These platforms provide you with product feeds and the ability to register an "Affiliate Link" which ensures you get paid for redirecting users.

### Awin (Coolblue & more)
Awin is one of the largest networks in Europe. Coolblue's partner program runs entirely on Awin.
- **URL**: [https://www.awin.com/nl](https://www.awin.com/nl)
- **Goal**: Apply as a Publisher. Once approved by Coolblue, you will get access to their Product Feed API and link generators.

### TradeTracker or Daisycon (MediaMarkt / BCC)
Other Dutch electronics stores distribute their feeds here.
- **TradeTracker**: [https://tradetracker.com/nl/](https://tradetracker.com/nl/)
- **Daisycon**: [https://www.daisycon.com/nl/](https://www.daisycon.com/nl/)
- **Goal**: Apply as a Publisher. Find MediaMarkt/BCC campaigns, apply, and use their API to get product feeds.

### Bol.com Partnerprogramma
Bol.com has an excellent proprietary API to search products and generate affiliate links.
- **URL**: [https://partnerprogramma.bol.com/](https://partnerprogramma.bol.com/)
- **Goal**: Sign up for the Partner program. Generate an API Key to use the "Open API" for real-time bol.com prices and tracking links.

### Amazon Associates (Amazon.nl)
For fetching Amazon prices and links.
- **URL**: [https://partnernet.amazon.nl/](https://partnernet.amazon.nl/)
- **Goal**: Sign up for Amazon Associates to access the **Product Advertising API (PAAPI)**.

## 2. Product Specs APIs (For Detailed Specs)

In addition to prices, you wanted "all the specs". The affiliate feeds often have basic info, but not comprehensive hardware specs.

### Icecat (Free Open Catalog)
Icecat provides detailed product specifications for almost all consumer electronics.
- **URL**: [https://icecat.biz/](https://icecat.biz/)
- **Goal**: Register for a Free Open Icecat account. You can query their API with an `EAN` code or `Brand + MPN` to get extensive JSON specs for phones, TVs, laptops.

## 3. Alternative managed Scrapers (Fallback)
If you don't want to register for all of the above or get rejected, your only chance for live data is managed scraping APIs (which can still be fragile):
- **Apify** (You already started a template for Microcenter)
- **DataForSEO** - Has an ecommerce API that fetches live Amazon/Google Shopping prices.

## Next Step
Once you start securing these API accounts, we can modify the backend Firebase Functions to ingest these official product feeds instead of running manual headless scrapers.
