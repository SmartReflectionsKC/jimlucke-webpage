/**
 * Photography galleries retrieval with in-flight deduplication and in-memory caching.
 */

import { getSanityClient } from './client';
import { GALLERIES_QUERY } from './queries';
import { SanityGalleryDoc } from './types';
import { PhotographyGallery } from '../utils/contentLoader';
import { adaptSanityGallery } from './adapters';

const completedGalleriesCache: { data: PhotographyGallery[] | null } = { data: null };
let inFlightGalleriesPromise: Promise<PhotographyGallery[]> | null = null;

/**
 * Fetches photography collections with ordered photo references from Sanity.
 */
export async function fetchSanityGalleries(clientOverride?: any): Promise<PhotographyGallery[]> {
  if (completedGalleriesCache.data !== null) {
    return completedGalleriesCache.data;
  }

  if (inFlightGalleriesPromise) {
    return inFlightGalleriesPromise;
  }

  const client = clientOverride || getSanityClient();
  if (!client) {
    throw new Error('Sanity client is not configured or unavailable');
  }

  inFlightGalleriesPromise = (async () => {
    try {
      const rawDocs = (await client.fetch(GALLERIES_QUERY)) as SanityGalleryDoc[];
      const adapted = Array.isArray(rawDocs) ? rawDocs.map(adaptSanityGallery) : [];
      completedGalleriesCache.data = adapted;
      return adapted;
    } finally {
      inFlightGalleriesPromise = null;
    }
  })();

  return inFlightGalleriesPromise;
}

/**
 * Clears galleries in-memory cache and in-flight promise.
 */
export function clearGalleriesCache(): void {
  completedGalleriesCache.data = null;
  inFlightGalleriesPromise = null;
}
