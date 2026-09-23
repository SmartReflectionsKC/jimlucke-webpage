/**
 * React hooks for consuming orchestrated Sanity and local content.
 * Provides loading, error, empty states, and in-flight deduplicated detail loading.
 */

import { useState, useEffect, useCallback } from 'react';
import { getContentSourceMode } from './config';
import {
  loadFieldNotes,
  loadFieldNoteDetail,
  loadPhotographyGalleries,
} from './orchestrator';
import {
  getFieldNotes,
  getFieldNoteBySlug,
  getPhotographyGalleries,
  FieldNoteItem,
  PhotographyGallery,
} from '../utils/contentLoader';

export interface FieldNotesContentState {
  notes: FieldNoteItem[];
  loading: boolean;
  error: string | null;
  source: 'local' | 'sanity';
  retry: () => void;
}

export function useFieldNotesContent(): FieldNotesContentState {
  const mode = getContentSourceMode();
  const [notes, setNotes] = useState<FieldNoteItem[]>(() => {
    return mode === 'local' ? getFieldNotes() : [];
  });
  const [loading, setLoading] = useState<boolean>(() => mode !== 'local');
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'sanity'>('local');

  const fetchNotes = useCallback(async () => {
    const currentMode = getContentSourceMode();
    if (currentMode === 'local') {
      setNotes(getFieldNotes());
      setLoading(false);
      setError(null);
      setSource('local');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await loadFieldNotes();
      setNotes(result.data);
      setSource(result.source);
      setError(result.error);
    } catch (err: any) {
      setError(err?.message || 'Failed to load field notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, source, retry: fetchNotes };
}

export interface FieldNoteDetailState {
  detail: FieldNoteItem | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useFieldNoteDetail(
  slug: string | null | undefined,
  initialItem?: FieldNoteItem | null
): FieldNoteDetailState {
  const [detail, setDetail] = useState<FieldNoteItem | null>(() => {
    if (!slug) return null;
    if (initialItem && (initialItem.body || (initialItem.content && initialItem.content.trim().length > 0))) {
      return initialItem;
    }
    const mode = getContentSourceMode();
    if (mode === 'local') {
      return getFieldNoteBySlug(slug) || null;
    }
    return initialItem || null;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (slugToFetch: string) => {
    const currentMode = getContentSourceMode();
    if (currentMode === 'local') {
      const local = getFieldNoteBySlug(slugToFetch) || null;
      setDetail(local);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await loadFieldNoteDetail(slugToFetch);
      setDetail(result.data);
      if (!result.data && result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load note content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!slug) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    // If detail already contains loaded body (Portable Text) or local content (Markdown),
    // use it immediately without unnecessary network request
    if (
      detail &&
      detail.slug === slug &&
      (detail.body || (detail.content && detail.content.trim().length > 0))
    ) {
      return;
    }

    fetchDetail(slug);
  }, [slug, fetchDetail]);

  const retry = useCallback(() => {
    if (slug) {
      fetchDetail(slug);
    }
  }, [slug, fetchDetail]);

  return { detail, loading, error, retry };
}

export interface PhotographyContentState {
  galleries: PhotographyGallery[];
  loading: boolean;
  error: string | null;
  source: 'local' | 'sanity';
  retry: () => void;
}

export function usePhotographyContent(): PhotographyContentState {
  const mode = getContentSourceMode();
  const [galleries, setGalleries] = useState<PhotographyGallery[]>(() => {
    return mode === 'local' ? getPhotographyGalleries() : [];
  });
  const [loading, setLoading] = useState<boolean>(() => mode !== 'local');
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'sanity'>('local');

  const fetchGalleries = useCallback(async () => {
    const currentMode = getContentSourceMode();
    if (currentMode === 'local') {
      setGalleries(getPhotographyGalleries());
      setLoading(false);
      setError(null);
      setSource('local');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await loadPhotographyGalleries();
      setGalleries(result.data);
      setSource(result.source);
      setError(result.error);
    } catch (err: any) {
      setError(err?.message || 'Failed to load photography galleries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  return { galleries, loading, error, source, retry: fetchGalleries };
}
