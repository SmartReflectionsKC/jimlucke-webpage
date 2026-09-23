/**
 * Field Notes retrieval with in-flight deduplication and in-memory caching.
 */

import { getSanityClient } from './client';
import { FIELD_NOTES_LIST_QUERY, FIELD_NOTE_DETAIL_QUERY } from './queries';
import { SanityFieldNoteListDoc, SanityFieldNoteDetailDoc } from './types';
import { FieldNoteItem } from '../utils/contentLoader';
import { adaptSanityFieldNoteList, adaptSanityFieldNoteDetail } from './adapters';

// In-memory cache for completed requests
const completedListCache: { data: FieldNoteItem[] | null } = { data: null };
const completedDetailCache = new Map<string, FieldNoteItem>();

// In-flight promises to deduplicate concurrent requests
let inFlightListPromise: Promise<FieldNoteItem[]> | null = null;
const inFlightDetailPromises = new Map<string, Promise<FieldNoteItem | null>>();

/**
 * Fetches Field Note card metadata list from Sanity.
 * Portable Text bodies are excluded from this query.
 */
export async function fetchSanityFieldNotesList(clientOverride?: any): Promise<FieldNoteItem[]> {
  if (completedListCache.data !== null) {
    return completedListCache.data;
  }

  if (inFlightListPromise) {
    return inFlightListPromise;
  }

  const client = clientOverride || getSanityClient();
  if (!client) {
    throw new Error('Sanity client is not configured or unavailable');
  }

  inFlightListPromise = (async () => {
    try {
      const rawDocs = (await client.fetch(FIELD_NOTES_LIST_QUERY)) as SanityFieldNoteListDoc[];
      const adapted = Array.isArray(rawDocs) ? rawDocs.map(adaptSanityFieldNoteList) : [];
      completedListCache.data = adapted;
      return adapted;
    } finally {
      inFlightListPromise = null;
    }
  })();

  return inFlightListPromise;
}

/**
 * Fetches the complete Field Note document by slug (including Portable Text body).
 * Deduplicates in-flight requests and caches completed results in memory.
 */
export async function fetchSanityFieldNoteDetail(
  slug: string,
  clientOverride?: any
): Promise<FieldNoteItem | null> {
  if (!slug) return null;

  // Return cached detail if available
  if (completedDetailCache.has(slug)) {
    return completedDetailCache.get(slug)!;
  }

  // Deduplicate in-flight promises
  if (inFlightDetailPromises.has(slug)) {
    return inFlightDetailPromises.get(slug)!;
  }

  const client = clientOverride || getSanityClient();
  if (!client) {
    throw new Error('Sanity client is not configured or unavailable');
  }

  const promise = (async () => {
    try {
      const rawDoc = (await client.fetch(
        FIELD_NOTE_DETAIL_QUERY,
        { slug }
      )) as SanityFieldNoteDetailDoc | null;

      if (!rawDoc) {
        return null;
      }

      const adapted = adaptSanityFieldNoteDetail(rawDoc);
      completedDetailCache.set(slug, adapted);
      return adapted;
    } finally {
      inFlightDetailPromises.delete(slug);
    }
  })();

  inFlightDetailPromises.set(slug, promise);
  return promise;
}

/**
 * Clears all in-memory caches and in-flight promises.
 * Useful for testing and forced invalidation.
 */
export function clearFieldNotesCache(): void {
  completedListCache.data = null;
  completedDetailCache.clear();
  inFlightListPromise = null;
  inFlightDetailPromises.clear();
}
