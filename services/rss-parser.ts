/**
 * RSS Parser — uses fast-xml-parser (v5) for robust XML handling
 */

import { XMLParser } from 'fast-xml-parser';
import type { ParsedRSSItem } from '@/types/rss';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: true,
  // Always treat these as arrays even when a single element exists
  isArray: (name) => ['item', 'category'].includes(name),
});

/**
 * Parse an RSS 2.0 XML string into structured items
 */
export function parseRSS(xml: string): ParsedRSSItem[] {
  try {
    const doc = parser.parse(xml);
    const channel = doc?.rss?.channel;
    if (!channel) {
      console.warn('[RSS] No channel found in feed');
      return [];
    }

    const rawItems: any[] = Array.isArray(channel.item) ? channel.item : [];
    return rawItems
      .filter(Boolean)
      .map(processItem)
      .filter((item) => !!item.title);
  } catch (err) {
    console.error('[RSS] Parse error:', err);
    return [];
  }
}

function processItem(item: any): ParsedRSSItem {
  const title = extractText(item.title);
  const description = extractText(item.description);
  const contentEncoded = extractText(item['content:encoded']);
  const link = extractLink(item.link);
  const pubDate = typeof item.pubDate === 'string' ? item.pubDate : '';

  // --- Image extraction (priority order) ---
  let imageUrl: string | null = null;

  // 1. media:content attribute
  const media = item['media:content'];
  if (media) {
    imageUrl = media['@_url'] ?? null;
  }

  // 2. media:thumbnail
  if (!imageUrl && item['media:thumbnail']) {
    imageUrl = item['media:thumbnail']['@_url'] ?? null;
  }

  // 3. enclosure tag (image/* MIME type)
  if (!imageUrl && item.enclosure) {
    const mime: string = item.enclosure['@_type'] ?? '';
    if (mime.startsWith('image')) {
      imageUrl = item.enclosure['@_url'] ?? null;
    }
  }

  // 4. First <img> src in description HTML
  if (!imageUrl && description) {
    const m = description.match(/<img[^>]+src="([^"]+)"/i);
    if (m) imageUrl = m[1];
  }

  // 5. First <img> src in content:encoded
  if (!imageUrl && contentEncoded) {
    const m = contentEncoded.match(/<img[^>]+src="([^"]+)"/i);
    if (m) imageUrl = m[1];
  }

  // --- Author ---
  const author = extractText(item.author) || extractText(item['dc:creator']) || '';

  // --- Categories ---
  const categories: string[] = [];
  if (Array.isArray(item.category)) {
    categories.push(...item.category.map(extractText).filter(Boolean));
  } else if (item.category) {
    categories.push(extractText(item.category));
  }

  const cleanDesc = stripHtml(description ?? '');

  return {
    title: stripHtml(title ?? ''),
    description: cleanDesc.substring(0, 250),
    link,
    pubDate: pubDate || new Date().toISOString(),
    imageUrl,
    content: contentEncoded || (description ?? ''),
    categories,
    author: author.trim(),
  };
}

/** Pull plain text out of a fast-xml-parser value (string, CDATA, or object) */
function extractText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.__cdata === 'string') return obj.__cdata;
    if (typeof obj['#text'] === 'string') return obj['#text'];
  }
  return '';
}

/** Extract href/text from a link element (plain string or object) */
function extractLink(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.__cdata === 'string') return obj.__cdata;
    if (typeof obj['#text'] === 'string') return obj['#text'];
    if (typeof obj['@_href'] === 'string') return obj['@_href'];
  }
  return '';
}

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Format a date string for display ("3u geleden", "2d geleden", …) */
export function formatRSSDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (mins < 60) return `${mins}m geleden`;
    if (hours < 24) return `${hours}u geleden`;
    if (days < 7) return `${days}d geleden`;
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  } catch {
    return dateString;
  }
}

/** Generate a stable ID from a parsed RSS item */
export function generateItemId(item: ParsedRSSItem): string {
  const base = item.link || item.title;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = Math.imul(31, hash) + base.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
