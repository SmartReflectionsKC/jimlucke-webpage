/**
 * Content-source orchestration for local, hybrid, and sanity modes.
 *
 * - local: uses bundled Markdown/JSON exclusively and makes zero Sanity requests.
 * - hybrid: queries Sanity first; successful results (including []) are authoritative.
 *   Falls back to local content only on configuration, network, or query failure.
 * - sanity: queries Sanity exclusively; published [] renders empty state;
 *   failures render recoverable errors and never fall back to local content.
 * - Local and Sanity arrays are never merged.
 */

import { validateSanityConfig } from './config';
import { ContentSourceMode } from './types';
import {
  getFieldNotes,
  getFieldNoteBySlug,
  getPhotographyGalleries,
  FieldNoteItem,
  PhotographyGallery,
} from '../utils/contentLoader';
import { fetchSanityFieldNotesList, fetchSanityFieldNoteDetail } from './fieldNotes';
import { fetchSanityGalleries } from './galleries';

export interface OrchestrationResult<T> {
  data: T;
  source: 'local' | 'sanity';
  error: string | null;
}

export interface OrchestrationOptions {
  modeOverride?: ContentSourceMode;
  clientOverride?: any;
}

/**
 * Resolves Field Notes according to the active content source mode.
 */
export async function loadFieldNotes(
  options: OrchestrationOptions = {}
): Promise<OrchestrationResult<FieldNoteItem[]>> {
  const validation = validateSanityConfig();
  const mode = options.modeOverride || validation.mode;

  // 1. Local mode: zero Sanity requests, immediate local content
  if (mode === 'local') {
    return {
      data: getFieldNotes(),
      source: 'local',
      error: null,
    };
  }

  // Check config validity for hybrid / sanity
  if (!validation.isValid && !options.clientOverride) {
    if (mode === 'hybrid') {
      return {
        data: getFieldNotes(),
        source: 'local',
        error: validation.error || 'Invalid Sanity configuration',
      };
    }
    // Sanity mode: never falls back
    return {
      data: [],
      source: 'sanity',
      error: validation.error || 'Invalid Sanity configuration',
    };
  }

  // 2. Hybrid mode
  if (mode === 'hybrid') {
    try {
      const sanityNotes = await fetchSanityFieldNotesList(options.clientOverride);
      // Successful result (including empty array []) is authoritative!
      return {
        data: sanityNotes,
        source: 'sanity',
        error: null,
      };
    } catch (err: any) {
      // Hybrid fallback only on failure
      return {
        data: getFieldNotes(),
        source: 'local',
        error: err?.message || 'Sanity query failed, using local fallback',
      };
    }
  }

  // 3. Sanity mode: exclusive, never fall back
  try {
    const sanityNotes = await fetchSanityFieldNotesList(options.clientOverride);
    return {
      data: sanityNotes,
      source: 'sanity',
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      source: 'sanity',
      error: err?.message || 'Failed to fetch field notes from Sanity',
    };
  }
}

/**
 * Resolves a single Field Note's detail (including full body).
 */
export async function loadFieldNoteDetail(
  slug: string,
  options: OrchestrationOptions = {}
): Promise<OrchestrationResult<FieldNoteItem | null>> {
  const validation = validateSanityConfig();
  const mode = options.modeOverride || validation.mode;

  if (mode === 'local') {
    const localNote = getFieldNoteBySlug(slug) || null;
    return {
      data: localNote,
      source: 'local',
      error: null,
    };
  }

  if (!validation.isValid && !options.clientOverride) {
    if (mode === 'hybrid') {
      return {
        data: getFieldNoteBySlug(slug) || null,
        source: 'local',
        error: validation.error || 'Invalid Sanity configuration',
      };
    }
    return {
      data: null,
      source: 'sanity',
      error: validation.error || 'Invalid Sanity configuration',
    };
  }

  if (mode === 'hybrid') {
    try {
      const sanityNote = await fetchSanityFieldNoteDetail(slug, options.clientOverride);
      return {
        data: sanityNote,
        source: 'sanity',
        error: null,
      };
    } catch (err: any) {
      return {
        data: getFieldNoteBySlug(slug) || null,
        source: 'local',
        error: err?.message || 'Sanity query failed, using local fallback',
      };
    }
  }

  // Sanity mode
  try {
    const sanityNote = await fetchSanityFieldNoteDetail(slug, options.clientOverride);
    return {
      data: sanityNote,
      source: 'sanity',
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      source: 'sanity',
      error: err?.message || 'Failed to fetch field note detail from Sanity',
    };
  }
}

/**
 * Resolves Photography Galleries according to the active content source mode.
 */
export async function loadPhotographyGalleries(
  options: OrchestrationOptions = {}
): Promise<OrchestrationResult<PhotographyGallery[]>> {
  const validation = validateSanityConfig();
  const mode = options.modeOverride || validation.mode;

  if (mode === 'local') {
    return {
      data: getPhotographyGalleries(),
      source: 'local',
      error: null,
    };
  }

  if (!validation.isValid && !options.clientOverride) {
    if (mode === 'hybrid') {
      return {
        data: getPhotographyGalleries(),
        source: 'local',
        error: validation.error || 'Invalid Sanity configuration',
      };
    }
    return {
      data: [],
      source: 'sanity',
      error: validation.error || 'Invalid Sanity configuration',
    };
  }

  if (mode === 'hybrid') {
    try {
      const sanityGalleries = await fetchSanityGalleries(options.clientOverride);
      return {
        data: sanityGalleries,
        source: 'sanity',
        error: null,
      };
    } catch (err: any) {
      return {
        data: getPhotographyGalleries(),
        source: 'local',
        error: err?.message || 'Sanity query failed, using local fallback',
      };
    }
  }

  // Sanity mode
  try {
    const sanityGalleries = await fetchSanityGalleries(options.clientOverride);
    return {
      data: sanityGalleries,
      source: 'sanity',
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      source: 'sanity',
      error: err?.message || 'Failed to fetch photography galleries from Sanity',
    };
  }
}
