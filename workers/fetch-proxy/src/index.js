/**
 * tracr-fetch-proxy — Cloudflare Worker
 *
 * Fetches a product page URL on behalf of the Supabase Edge Function,
 * bypassing datacenter IP blocks (Bol.com, etc.) because Cloudflare edge
 * nodes use a broad, trusted IP range.
 *
 * POST /fetch  { "url": "https://www.bol.com/..." }
 * → { "html": "...", "status": 200 }
 *
 * Security: only allows bol.com and known shop domains to prevent abuse.
 */

const ALLOWED_DOMAINS = [
  'bol.com',
  'coolblue.nl',
  'mediamarkt.nl',
  'alternate.nl',
  'amazon.nl',
  'amazon.com',
  'zalando.nl',
  'wehkamp.nl',
];

const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function isAllowed(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    const targetUrl = body?.url?.trim();
    if (!targetUrl) return json({ error: 'missing_url' }, 400);
    if (!isAllowed(targetUrl)) return json({ error: 'domain_not_allowed' }, 403);

    // Use Googlebot UA for bol.com (whitelisted at application level)
    const isBol = targetUrl.includes('bol.com');
    const ua = isBol ? BOT_UA : BROWSER_UA;

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
        cf: {
          cacheEverything: false,
          cacheTtl: 0,
        },
      });

      const html = await res.text();
      return json({ html, status: res.status, url: res.url });
    } catch (e) {
      return json({ error: 'fetch_failed', detail: e.message }, 502);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
