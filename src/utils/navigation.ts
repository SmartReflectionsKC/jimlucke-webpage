import React from 'react';

export interface SectionNavigationOptions {
  onNavigate?: () => void;
  prefersReducedMotion?: boolean;
}

/**
 * Handles internal section navigation (#projects, #workshop, #, etc.)
 * - Calls preventDefault ONLY for internal hash links
 * - Safely locates the target element
 * - Smooth scrolls or immediately scrolls depending on prefers-reduced-motion
 * - Strictly preserves existing query parameters (?note=..., ?gallery=...)
 * - Updates the URL hash via window.history.pushState without triggering a reload
 * - Manages focus for keyboard accessibility
 */
export function handleSectionNavigation(
  e: { preventDefault: () => void },
  href: string,
  options: SectionNavigationOptions = {}
): void {
  // Only intercept internal section links
  if (!href || !href.startsWith('#')) {
    return;
  }

  e.preventDefault();
  options.onNavigate?.();

  if (typeof window === 'undefined') return;

  const isReducedMotion =
    options.prefersReducedMotion ??
    (window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);

  const behavior: ScrollBehavior = isReducedMotion ? 'auto' : 'smooth';

  const currentUrl = new URL(window.location.href);

  // Home navigation (# or #top)
  if (href === '#' || href === '#top') {
    window.scrollTo({ top: 0, behavior });
    currentUrl.hash = '';
    const newUrl = currentUrl.pathname + currentUrl.search;
    window.history.pushState({}, '', newUrl);
    return;
  }

  const targetId = href.slice(1);
  const targetElement = document.getElementById(targetId);

  if (targetElement) {
    targetElement.scrollIntoView({ behavior, block: 'start' });

    // Keyboard accessibility: ensure target can receive focus
    if (!targetElement.hasAttribute('tabindex')) {
      targetElement.setAttribute('tabindex', '-1');
    }
    targetElement.focus({ preventScroll: true });

    // Update URL hash without triggering a reload while preserving query params
    currentUrl.hash = targetId;
    window.history.pushState({}, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
  }
}
