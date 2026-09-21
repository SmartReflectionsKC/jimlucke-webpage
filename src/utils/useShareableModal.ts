import { useState, useEffect, useRef, useCallback } from 'react';
import { getFieldNotes, getPhotographyGalleries, FieldNoteItem, PhotographyGallery } from './contentLoader';

export interface ShareableModalState {
  activeNote: FieldNoteItem | null;
  activeGallery: PhotographyGallery | null;
  openNote: (slug: string, triggerEl?: HTMLElement | null) => void;
  openGallery: (id: string, triggerEl?: HTMLElement | null) => void;
  closeModal: () => void;
}

export function useShareableModal(): ShareableModalState {
  const [activeNote, setActiveNote] = useState<FieldNoteItem | null>(null);
  const [activeGallery, setActiveGallery] = useState<PhotographyGallery | null>(null);

  // Store trigger element for focus restoration
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Helper to update URL while strictly preserving unrelated query params
  const updateUrlParam = useCallback((param: 'note' | 'gallery' | null, value: string | null) => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    if (param === 'note') {
      if (value) {
        searchParams.set('note', value);
        searchParams.delete('gallery');
      } else {
        searchParams.delete('note');
      }
    } else if (param === 'gallery') {
      if (value) {
        searchParams.set('gallery', value);
        searchParams.delete('note');
      } else {
        searchParams.delete('gallery');
      }
    } else {
      searchParams.delete('note');
      searchParams.delete('gallery');
    }

    const newQuery = searchParams.toString();
    const newRelativePath = url.pathname + (newQuery ? `?${newQuery}` : '') + url.hash;
    window.history.pushState({}, '', newRelativePath);
  }, []);

  const replaceUrlParamClean = useCallback((cleanNote = true, cleanGallery = true) => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    let changed = false;

    if (cleanNote && url.searchParams.has('note')) {
      url.searchParams.delete('note');
      changed = true;
    }
    if (cleanGallery && url.searchParams.has('gallery')) {
      url.searchParams.delete('gallery');
      changed = true;
    }

    if (changed) {
      const newQuery = url.searchParams.toString();
      const newRelativePath = url.pathname + (newQuery ? `?${newQuery}` : '') + url.hash;
      window.history.replaceState({}, '', newRelativePath);
    }
  }, []);

  // Sync state from current URL query parameters
  const syncFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const noteSlug = params.get('note');
    const galleryId = params.get('gallery');

    const allNotes = getFieldNotes();
    const allGalleries = getPhotographyGalleries();

    // If both supplied, note takes precedence
    if (noteSlug && galleryId) {
      const matchedNote = allNotes.find((n) => n.slug === noteSlug);
      if (matchedNote) {
        setActiveNote(matchedNote);
        setActiveGallery(null);
        // Clean the secondary gallery param from the URL
        replaceUrlParamClean(false, true);
        return;
      }
      // If note slug was invalid, fall through to check galleryId
      replaceUrlParamClean(true, false);
    }

    if (noteSlug) {
      const matchedNote = allNotes.find((n) => n.slug === noteSlug);
      if (matchedNote) {
        setActiveNote(matchedNote);
        setActiveGallery(null);
      } else {
        // Unknown note slug: do not show broken modal, clean invalid param
        setActiveNote(null);
        replaceUrlParamClean(true, false);
      }
      return;
    }

    if (galleryId) {
      const matchedGallery = allGalleries.find((g) => g.id === galleryId);
      if (matchedGallery) {
        setActiveGallery(matchedGallery);
        setActiveNote(null);
      } else {
        // Unknown gallery ID: do not show broken modal, clean invalid param
        setActiveGallery(null);
        replaceUrlParamClean(false, true);
      }
      return;
    }

    // Neither param exists
    setActiveNote(null);
    setActiveGallery(null);
  }, [replaceUrlParamClean]);

  // Initial mount: check URL
  useEffect(() => {
    syncFromUrl();

    // Listen to browser Back / Forward buttons
    const handlePopState = () => {
      syncFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [syncFromUrl]);

  // Body scroll lock and focus management
  useEffect(() => {
    const isModalOpen = Boolean(activeNote || activeGallery);

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Focus restoration
      if (triggerElementRef.current && document.contains(triggerElementRef.current)) {
        triggerElementRef.current.focus();
        triggerElementRef.current = null;
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [activeNote, activeGallery]);

  // Handle ESC key globally
  useEffect(() => {
    const isModalOpen = Boolean(activeNote || activeGallery);
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeNote, activeGallery]);

  const openNote = useCallback((slug: string, triggerEl?: HTMLElement | null) => {
    const note = getFieldNotes().find((n) => n.slug === slug);
    if (note) {
      triggerElementRef.current = triggerEl || (document.activeElement as HTMLElement) || null;
      setActiveNote(note);
      setActiveGallery(null);
      updateUrlParam('note', slug);
    }
  }, [updateUrlParam]);

  const openGallery = useCallback((id: string, triggerEl?: HTMLElement | null) => {
    const gallery = getPhotographyGalleries().find((g) => g.id === id);
    if (gallery) {
      triggerElementRef.current = triggerEl || (document.activeElement as HTMLElement) || null;
      setActiveGallery(gallery);
      setActiveNote(null);
      updateUrlParam('gallery', id);
    }
  }, [updateUrlParam]);

  const closeModal = useCallback(() => {
    setActiveNote(null);
    setActiveGallery(null);
    updateUrlParam(null, null);
  }, [updateUrlParam]);

  return {
    activeNote,
    activeGallery,
    openNote,
    openGallery,
    closeModal,
  };
}

/**
 * Custom hook to trap focus within an active dialog modal element.
 */
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const elements = container.querySelectorAll<HTMLElement>(focusableSelectors);
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, containerRef]);
}
