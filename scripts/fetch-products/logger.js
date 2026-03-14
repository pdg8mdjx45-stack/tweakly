/**
 * logger.js — Logging utility
 *
 * Logt naar zowel de console als een error.log bestand.
 * Gebruikt voor alle bronnen in het fetch-products script.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'output', 'error.log');

// Zorg dat output dir bestaat
await fs.ensureDir(path.dirname(LOG_FILE));

/**
 * Schrijf een regel naar het logbestand en de console
 */
export function log(level, source, message, data = null) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}`;

  if (level === 'error') {
    console.error(line);
    if (data) console.error(data);
  } else {
    console.log(line);
  }

  // Schrijf alles naar het logbestand (fouten + info)
  const logEntry = data
    ? `${line}\n  ${JSON.stringify(data, null, 2)}\n`
    : `${line}\n`;

  fs.appendFileSync(LOG_FILE, logEntry);
}

export const info = (source, msg, data) => log('info', source, msg, data);
export const warn = (source, msg, data) => log('warn', source, msg, data);
export const error = (source, msg, data) => log('error', source, msg, data);
