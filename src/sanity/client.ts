/**
 * Unauthenticated, read-only Sanity client.
 * Tokens are strictly prohibited in the frontend bundle.
 */

import { createClient, type SanityClient } from '@sanity/client';
import { validateSanityConfig } from './config';
import { SanityConfig } from './types';

let cachedClient: SanityClient | null = null;
let lastConfigHash = '';

/**
 * Creates an unauthenticated, read-only Sanity client for the given config.
 */
export function createSanityClient(config: SanityConfig): SanityClient {
  return createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: config.apiVersion,
    useCdn: config.useCdn,
    // Explicitly unauthenticated: no token is ever supplied
  });
}

/**
 * Returns the singleton Sanity client instance based on active configuration.
 * Returns null if the configuration is invalid or mode is 'local'.
 */
export function getSanityClient(): SanityClient | null {
  const validation = validateSanityConfig();

  if (!validation.isValid || validation.mode === 'local') {
    return null;
  }

  const hash = `${validation.config.projectId}:${validation.config.dataset}:${validation.config.apiVersion}:${validation.config.useCdn}`;
  if (cachedClient && lastConfigHash === hash) {
    return cachedClient;
  }

  cachedClient = createSanityClient(validation.config);
  lastConfigHash = hash;
  return cachedClient;
}
