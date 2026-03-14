/**
 * http-client.js — Axios wrapper met retry-logic en rate limiting
 *
 * - Exponential backoff bij fouten (429, 5xx, netwerk errors)
 * - Configureerbare vertraging tussen requests (rate limiting)
 * - Timeout per request
 */

import axios from 'axios';
import { error as logError, warn } from './logger.js';

const DEFAULT_TIMEOUT = 30_000;   // 30 seconden
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;          // 1 seconde startvertraging bij retry

/**
 * Wacht een bepaald aantal milliseconden
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Voer een GET-request uit met automatische retry en exponential backoff.
 *
 * @param {string} url - De URL om op te halen
 * @param {object} options - Opties
 * @param {object} options.params - Query parameters
 * @param {object} options.headers - Extra headers
 * @param {number} options.timeout - Timeout in ms (default 30s)
 * @param {number} options.maxRetries - Max pogingen (default 3)
 * @param {string} options.source - Bronnaam voor logging
 * @returns {Promise<any>} Response data
 */
export async function fetchWithRetry(url, options = {}) {
  const {
    params = {},
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    maxRetries = MAX_RETRIES,
    source = 'http',
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: {
          'User-Agent': 'TweaklyProductFetcher/1.0 (educational project)',
          'Accept': 'application/json',
          ...headers,
        },
        timeout,
      });
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      const isRetryable =
        !status ||                    // netwerk error
        status === 429 ||             // rate limited
        status >= 500;                // server error

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, ...
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);

        // Bij 429: gebruik Retry-After header als die er is
        const retryAfter = err.response?.headers?.['retry-after'];
        const actualDelay = retryAfter ? parseInt(retryAfter) * 1000 : delay;

        warn(source, `Request mislukt (poging ${attempt}/${maxRetries}), retry na ${actualDelay}ms: ${url}`, {
          status,
          message: err.message,
        });
        await sleep(actualDelay);
        continue;
      }

      // Niet herbruikbaar of max retries bereikt
      logError(source, `Request definitief mislukt: ${url}`, {
        status,
        message: err.message,
        data: err.response?.data?.toString?.()?.slice(0, 500),
      });
      throw err;
    }
  }
}
