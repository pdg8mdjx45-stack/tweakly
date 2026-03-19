/**
 * Supabase Edge Function: send-news-notifications
 *
 * Wordt elke 15 minuten aangeroepen via een pg_cron job.
 * - Haalt Tweakers RSS feeds op (nieuws + reviews)
 * - Vergelijkt met seen_articles tabel
 * - Stuurt Expo Push Notifications naar alle gebruikers die dat willen
 *
 * Deploy: supabase functions deploy send-news-notifications
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const RSS_FEEDS = [
  { url: 'https://feeds.feedburner.com/tweakers/nieuws', category: 'nieuws' as const },
  { url: 'https://feeds.feedburner.com/tweakers/reviews', category: 'reviews' as const },
];

interface RSSItem {
  id: string;
  title: string;
  description: string;
  category: 'nieuws' | 'reviews';
}

interface PushToken {
  token: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  push_enabled: boolean;
  notif_nieuws: boolean;
  notif_reviews: boolean;
}

// ─── RSS parsing ─────────────────────────────────────────────────────────────

function extractText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1]
    ?? xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`))?.[1]
    ?? '';
  return m.trim();
}

/** Dezelfde hash als generateItemId() in services/rss-parser.ts */
function hashId(base: string): string {
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = Math.imul(31, hash) + base.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseItems(xml: string, category: 'nieuws' | 'reviews'): RSSItem[] {
  const items: RSSItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const block = match[1];
    const link = extractText(block, 'link') || extractText(block, 'guid');
    const title = extractText(block, 'title');
    const description = extractText(block, 'description');

    if (!title) continue;

    // Zelfde logica als generateItemId() in de app: hash van link of title
    const base = link || title;
    const id = `${category}-${hashId(base)}`;
    items.push({ id, title, description: description.slice(0, 200), category });
  }

  return items;
}

async function fetchFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes('<rss') || text.includes('<feed') ? text : null;
  } catch {
    return null;
  }
}

// ─── Expo push ───────────────────────────────────────────────────────────────

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  sound?: string;
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  // Expo accepteert max 100 per request
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    } catch (err) {
      console.error('[push] batch mislukt:', err);
    }
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Accepteer GET (van cron) en POST (handmatig testen)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Haal alle RSS items op
    const allItems: RSSItem[] = [];
    for (const feed of RSS_FEEDS) {
      const xml = await fetchFeed(feed.url);
      if (!xml) {
        console.warn(`[rss] kon feed niet ophalen: ${feed.url}`);
        continue;
      }
      allItems.push(...parseItems(xml, feed.category));
    }

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no items fetched' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Filter op artikelen die we nog niet verstuurd hebben
    const itemIds = allItems.map(i => i.id);
    const { data: seenRows } = await supabase
      .from('seen_articles')
      .select('article_id')
      .in('article_id', itemIds);

    const seenSet = new Set((seenRows ?? []).map((r: { article_id: string }) => r.article_id));
    const newItems = allItems.filter(i => !seenSet.has(i.id));

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no new articles' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Markeer nieuwe artikelen als gezien (meteen, voor idempotentie bij herstart)
    await supabase.from('seen_articles').insert(
      newItems.map(i => ({ article_id: i.id, title: i.title, category: i.category })),
    );

    // 4. Haal alle push tokens op + bijbehorende profielen
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('token, user_id');

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no push tokens' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userIds = [...new Set((tokenRows as PushToken[]).map(t => t.user_id))];
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, push_enabled, notif_nieuws, notif_reviews')
      .in('id', userIds);

    const profileMap = new Map<string, UserProfile>();
    for (const p of (profileRows ?? []) as UserProfile[]) {
      profileMap.set(p.id, p);
    }

    // 5. Bouw push berichten: één per nieuw artikel × tokens die het willen ontvangen
    const messages: ExpoPushMessage[] = [];

    for (const item of newItems) {
      for (const { token, user_id } of tokenRows as PushToken[]) {
        const profile = profileMap.get(user_id);
        if (!profile?.push_enabled) continue;
        if (item.category === 'nieuws' && !profile.notif_nieuws) continue;
        if (item.category === 'reviews' && !profile.notif_reviews) continue;

        messages.push({
          to: token,
          title: item.title,
          body: item.description.slice(0, 120) + (item.description.length > 120 ? '...' : ''),
          data: { articleId: item.id, type: 'news' },
          channelId: 'nieuws',
          sound: 'default',
        });
      }
    }

    // 6. Verstuur via Expo Push API
    if (messages.length > 0) {
      await sendExpoPush(messages);
    }

    console.log(`[done] ${newItems.length} nieuwe artikelen, ${messages.length} push berichten verstuurd`);

    return new Response(
      JSON.stringify({ sent: messages.length, newArticles: newItems.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[error]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
