import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSectionNavigation } from '../src/utils/navigation';

test('Navigation: calls preventDefault for internal section links (#projects)', () => {
  let prevented = false;
  const mockEvent = {
    preventDefault: () => {
      prevented = true;
    },
  };

  handleSectionNavigation(mockEvent, '#projects');
  assert.equal(prevented, true, 'preventDefault should be called for internal hash links');
});

test('Navigation: does NOT call preventDefault for external links', () => {
  let prevented = false;
  const mockEvent = {
    preventDefault: () => {
      prevented = true;
    },
  };

  handleSectionNavigation(mockEvent, 'https://example.com');
  assert.equal(prevented, false, 'preventDefault should NOT be called for external links');
});

test('Navigation: preserves query parameters when updating hash', () => {
  let prevented = false;
  const mockEvent = {
    preventDefault: () => {
      prevented = true;
    },
  };

  // Mock window and DOM
  const targetEl = {
    hasAttribute: () => false,
    setAttribute: (attr: string, val: string) => {},
    focus: () => {},
    scrollIntoView: () => {},
  };

  let pushedUrl = '';
  (global as any).window = {
    location: new URL('https://jimlucke.com/?note=soar-life-center-phase-one&ref=email'),
    history: {
      pushState: (_state: any, _title: string, url: string) => {
        pushedUrl = url;
      },
    },
    matchMedia: () => ({ matches: false }),
    scrollTo: () => {},
  };

  (global as any).document = {
    getElementById: (id: string) => (id === 'workshop' ? targetEl : null),
  };

  handleSectionNavigation(mockEvent, '#workshop');

  assert.equal(prevented, true);
  assert.ok(pushedUrl.includes('?note=soar-life-center-phase-one&ref=email'), 'Existing query parameters must be preserved');
  assert.ok(pushedUrl.endsWith('#workshop'), 'Hash must be appended to the preserved query string');
});

test('Navigation: Home link (#) scrolls to top and cleans hash while preserving query parameters', () => {
  let scrolledTop = false;
  let pushedUrl = '';

  (global as any).window = {
    location: new URL('https://jimlucke.com/?note=soar-life-center-phase-one#workshop'),
    history: {
      pushState: (_state: any, _title: string, url: string) => {
        pushedUrl = url;
      },
    },
    matchMedia: () => ({ matches: false }),
    scrollTo: (options: any) => {
      if (options.top === 0) scrolledTop = true;
    },
  };

  handleSectionNavigation({ preventDefault: () => {} }, '#');

  assert.equal(scrolledTop, true, 'Should scroll to top');
  assert.equal(pushedUrl, '/?note=soar-life-center-phase-one', 'Should remove hash but keep query params');
});

test('Navigation: respects prefers-reduced-motion', () => {
  let chosenBehavior = '';

  const targetEl = {
    hasAttribute: () => true,
    setAttribute: () => {},
    focus: () => {},
    scrollIntoView: (options: any) => {
      chosenBehavior = options.behavior;
    },
  };

  (global as any).window = {
    location: new URL('https://jimlucke.com/'),
    history: { pushState: () => {} },
    matchMedia: (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
    }),
  };

  (global as any).document = {
    getElementById: () => targetEl,
  };

  // When reduced motion is requested
  handleSectionNavigation({ preventDefault: () => {} }, '#projects', { prefersReducedMotion: true });
  assert.equal(chosenBehavior, 'auto', 'Reduced motion should use immediate "auto" scroll behavior');

  // When standard motion is requested
  handleSectionNavigation({ preventDefault: () => {} }, '#projects', { prefersReducedMotion: false });
  assert.equal(chosenBehavior, 'smooth', 'Normal motion should use "smooth" scroll behavior');
});
