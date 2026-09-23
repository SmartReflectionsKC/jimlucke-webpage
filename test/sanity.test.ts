/**
 * Deterministic test suite for Sanity integration:
 * - Content source modes (local, hybrid, sanity)
 * - Local mode zero-request dispatch guarantee
 * - Hybrid [] authoritativeness and failure fallback
 * - Sanity mode error isolation (no local fallback)
 * - Config validation
 * - GROQ query projection and draft exclusion
 * - In-flight detail request deduplication and in-memory caching
 * - Image width clamping, deduplication, and responsive srcSet
 * - Safe and unsafe link validation
 * - Secret scanner verification
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSanityConfig } from '../src/sanity/config';
import {
  FIELD_NOTES_LIST_QUERY,
  FIELD_NOTE_DETAIL_QUERY,
  GALLERIES_QUERY,
} from '../src/sanity/queries';
import {
  isSanityImage,
  getClampedWidths,
  buildResponsiveImage,
  getImageDimensions,
  RESPONSIVE_WIDTHS,
} from '../src/sanity/image';
import {
  adaptSanityFieldNoteList,
  adaptSanityFieldNoteDetail,
  adaptSanityGallery,
} from '../src/sanity/adapters';
import {
  fetchSanityFieldNotesList,
  fetchSanityFieldNoteDetail,
  clearFieldNotesCache,
} from '../src/sanity/fieldNotes';
import {
  loadFieldNotes,
  loadFieldNoteDetail,
  loadPhotographyGalleries,
} from '../src/sanity/orchestrator';
import { isSafeUrl, isExternalUrl } from '../src/components/PortableTextRenderer';
import { scanDistSecrets } from '../scripts/scan-secrets';
import { getFieldNotes, getPhotographyGalleries } from '../src/utils/contentLoader';

// -------------------------------------------------------------
// 1. Config Validation Tests
// -------------------------------------------------------------
test('Sanity Config: local mode is valid without requiring Sanity credentials', () => {
  const result = validateSanityConfig({ VITE_CONTENT_SOURCE: 'local' });
  assert.equal(result.isValid, true);
  assert.equal(result.mode, 'local');
  assert.equal(result.error, undefined);
});

test('Sanity Config: missing VITE_CONTENT_SOURCE defaults to local', () => {
  const result = validateSanityConfig({});
  assert.equal(result.mode, 'local');
  assert.equal(result.isValid, true);
  assert.equal(result.error, undefined);
});

test('Sanity Config: blank VITE_CONTENT_SOURCE defaults to local', () => {
  // Empty string
  const emptyResult = validateSanityConfig({ VITE_CONTENT_SOURCE: '' });
  assert.equal(emptyResult.mode, 'local');
  assert.equal(emptyResult.isValid, true);

  // Whitespace string
  const whitespaceResult = validateSanityConfig({ VITE_CONTENT_SOURCE: '   ' });
  assert.equal(whitespaceResult.mode, 'local');
  assert.equal(whitespaceResult.isValid, true);

  // Unrecognized string
  const unrecognizedResult = validateSanityConfig({ VITE_CONTENT_SOURCE: 'unknown_mode' });
  assert.equal(unrecognizedResult.mode, 'local');
  assert.equal(unrecognizedResult.isValid, true);
});

test('Regression: default local mode returns non-empty repository content', () => {
  // Confirm repository local content is non-empty
  const notes = getFieldNotes();
  assert.ok(notes.length > 0, `Expected non-empty Field Notes in local mode, found ${notes.length}`);
  assert.ok(notes.some(n => n.slug === 'why-practical-technology-matters'));
  assert.equal(notes.filter(n => n.published).length >= 5, true);

  const galleries = getPhotographyGalleries();
  assert.ok(galleries.length > 0, `Expected non-empty Photography Galleries in local mode, found ${galleries.length}`);
  assert.ok(galleries.some(g => g.id === 'abandoned-america'));
  assert.equal(galleries.filter(g => g.published).length >= 6, true);
});

test('Regression: default local mode makes zero Sanity requests', async () => {
  const { getSanityClient } = await import('../src/sanity/client');

  // 1. Confirm getSanityClient() returns null in local mode
  const client = getSanityClient();
  assert.equal(client, null, 'Local mode must never create or return a Sanity client');

  // 2. Confirm loadFieldNotes with default mode dispatches zero Sanity requests
  let sanityRequestCount = 0;
  const mockClient = {
    fetch: async () => {
      sanityRequestCount++;
      return [];
    },
  };

  const fieldNotesResult = await loadFieldNotes({ clientOverride: mockClient });
  assert.equal(sanityRequestCount, 0, 'Default mode must dispatch zero Sanity requests for notes');
  assert.equal(fieldNotesResult.source, 'local');
  assert.ok(fieldNotesResult.data.length > 0);

  const detailResult = await loadFieldNoteDetail('why-practical-technology-matters', { clientOverride: mockClient });
  assert.equal(sanityRequestCount, 0, 'Default mode must dispatch zero Sanity requests for note detail');
  assert.equal(detailResult.source, 'local');
  assert.ok(detailResult.data !== null);

  const galleriesResult = await loadPhotographyGalleries({ clientOverride: mockClient });
  assert.equal(sanityRequestCount, 0, 'Default mode must dispatch zero Sanity requests for galleries');
  assert.equal(galleriesResult.source, 'local');
  assert.ok(galleriesResult.data.length > 0);
});

test('Sanity Config: hybrid and sanity modes require valid project ID, dataset, and apiVersion', () => {
  const validEnv = {
    VITE_CONTENT_SOURCE: 'hybrid',
    VITE_SANITY_PROJECT_ID: 'wml93cow',
    VITE_SANITY_DATASET: 'production',
    VITE_SANITY_API_VERSION: '2026-09-01',
  };
  const validResult = validateSanityConfig(validEnv);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.mode, 'hybrid');

  // Invalid project ID (non-alphanumeric)
  const badProject = validateSanityConfig({ ...validEnv, VITE_SANITY_PROJECT_ID: 'bad_id!' });
  assert.equal(badProject.isValid, false);
  assert.ok(badProject.error?.includes('VITE_SANITY_PROJECT_ID'));

  // Invalid apiVersion format
  const badDate = validateSanityConfig({ ...validEnv, VITE_SANITY_API_VERSION: '09-01-2026' });
  assert.equal(badDate.isValid, false);
  assert.ok(badDate.error?.includes('VITE_SANITY_API_VERSION'));
});

// -------------------------------------------------------------
// 2. Query Projection & Draft Exclusion Tests
// -------------------------------------------------------------
test('GROQ Queries: list query strictly excludes body and filters drafts', () => {
  assert.ok(
    FIELD_NOTES_LIST_QUERY.includes('!(_id in path("drafts.**"))'),
    'List query must exclude drafts'
  );
  assert.ok(
    !FIELD_NOTES_LIST_QUERY.includes('body'),
    'List query must not fetch Portable Text body'
  );
  assert.ok(
    FIELD_NOTES_LIST_QUERY.includes('featuredImage'),
    'List query must use actual Studio schema field featuredImage'
  );
});

test('GROQ Queries: detail query fetches complete body and filters drafts', () => {
  assert.ok(
    FIELD_NOTE_DETAIL_QUERY.includes('!(_id in path("drafts.**"))'),
    'Detail query must exclude drafts'
  );
  assert.ok(
    FIELD_NOTE_DETAIL_QUERY.includes('body[]'),
    'Detail query must fetch Portable Text body'
  );
  assert.ok(
    FIELD_NOTE_DETAIL_QUERY.includes('slug.current == $slug'),
    'Detail query must filter by slug'
  );
});

test('GROQ Queries: galleries query orders by displayOrder asc and excludes drafts', () => {
  assert.ok(
    GALLERIES_QUERY.includes('order(displayOrder asc)'),
    'Galleries query must order by displayOrder ascending'
  );
  assert.ok(
    GALLERIES_QUERY.includes('!(_id in path("drafts.**"))'),
    'Galleries query must exclude drafts'
  );
  assert.ok(
    GALLERIES_QUERY.includes('photos[]->'),
    'Galleries query must dereference photos'
  );
});

// -------------------------------------------------------------
// 3. Image Clamping, Deduplication & srcSet Tests
// -------------------------------------------------------------
test('Image Utilities: clamps candidate widths to not exceed original asset width and deduplicates', () => {
  // Case 1: Large image (3000px) -> all standard widths preserved
  const largeWidths = getClampedWidths(3000);
  assert.deepEqual(largeWidths, [400, 800, 1200, 1600, 2000]);

  // Case 2: Intermediate image (1000px) -> clamped and deduplicated
  const midWidths = getClampedWidths(1000);
  assert.deepEqual(midWidths, [400, 800, 1000]);

  // Case 3: Small image (320px) -> single clamped width
  const smallWidths = getClampedWidths(320);
  assert.deepEqual(smallWidths, [320]);

  // Case 4: Zero / undefined width -> fallback to standard widths
  const fallbackWidths = getClampedWidths(undefined);
  assert.deepEqual(fallbackWidths, [...RESPONSIVE_WIDTHS]);
});

test('Image Utilities: extracts dimensions from Sanity asset metadata or asset ID', () => {
  const directMeta = {
    _type: 'image' as const,
    asset: {
      _id: 'image-123-1920x1080-jpg',
      metadata: { dimensions: { width: 1920, height: 1080, aspectRatio: 1920 / 1080 } },
    },
  };
  const dims1 = getImageDimensions(directMeta);
  assert.equal(dims1?.width, 1920);
  assert.equal(dims1?.height, 1080);

  // Asset ID fallback
  const idFallback = {
    _type: 'image' as const,
    asset: { _ref: 'image-abc-1200x800-png' },
  };
  const dims2 = getImageDimensions(idFallback);
  assert.equal(dims2?.width, 1200);
  assert.equal(dims2?.height, 800);
});

test('Image Utilities: processes only Sanity images through image builder', () => {
  assert.equal(isSanityImage('/images/photography/local.jpg'), false);
  assert.equal(isSanityImage('https://example.com/photo.jpg'), false);
  assert.equal(isSanityImage({ _type: 'image', asset: { _ref: 'image-123' } }), true);

  // Non-Sanity source returns direct string
  const nonSanityResult = buildResponsiveImage('/images/photography/abandoned-1.jpg', {
    fallbackAlt: 'Local car',
  });
  assert.equal(nonSanityResult.src, '/images/photography/abandoned-1.jpg');
  assert.equal(nonSanityResult.srcSet, '');
  assert.equal(nonSanityResult.alt, 'Local car');
});

test('Image Utilities: generates valid srcSet with auto format and width clamping for Sanity image', () => {
  const sanitySource = {
    _type: 'image' as const,
    asset: {
      _id: 'image-test-1000x500-jpg',
      metadata: { dimensions: { width: 1000, height: 500, aspectRatio: 2 } },
    },
    alt: 'Testing Sanity image',
  };

  const img = buildResponsiveImage(sanitySource);
  assert.ok(img.src.includes('auto=format'));
  assert.ok(img.srcSet.includes('400w'));
  assert.ok(img.srcSet.includes('800w'));
  assert.ok(img.srcSet.includes('1000w'));
  // Never requests width > 1000
  assert.ok(!img.srcSet.includes('1200w'));
  assert.ok(!img.srcSet.includes('1600w'));
  assert.equal(img.alt, 'Testing Sanity image');
});

// -------------------------------------------------------------
// 4. Safe & Unsafe Links Tests
// -------------------------------------------------------------
test('Link Validation: accepts safe protocols and relative URLs', () => {
  assert.equal(isSafeUrl('https://example.com'), true);
  assert.equal(isSafeUrl('http://example.com'), true);
  assert.equal(isSafeUrl('mailto:jim@example.com'), true);
  assert.equal(isSafeUrl('/field-notes/test'), true);
  assert.equal(isSafeUrl('#field-notes'), true);
});

test('Link Validation: strictly rejects unsafe protocols (javascript:, data:, vbscript:)', () => {
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('JAVASCRIPT:malicious()'), false);
  assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeUrl('vbscript:msgbox'), false);
});

test('Link Validation: accurately classifies external vs internal links', () => {
  assert.equal(isExternalUrl('https://github.com/'), true);
  assert.equal(isExternalUrl('/projects'), false);
  assert.equal(isExternalUrl('#workshop'), false);
  assert.equal(isExternalUrl('https://jimlucke.com/field-notes'), false);
  assert.equal(isExternalUrl('https://www.jimlucke.com/contact'), false);
});

// -------------------------------------------------------------
// 5. Data Adapters Tests
// -------------------------------------------------------------
test('Data Adapters: maps Sanity Field Note list document correctly', () => {
  const doc = {
    _id: 'fn-1',
    title: 'Sanity Article',
    slug: 'sanity-article',
    date: '2026-09-22',
    summary: 'An excerpt',
    category: 'Practical Tech',
    tags: ['Sanity', 'React'],
    readTime: '4 min read',
    featured: true,
  };

  const adapted = adaptSanityFieldNoteList(doc);
  assert.equal(adapted.slug, 'sanity-article');
  assert.equal(adapted.title, 'Sanity Article');
  assert.equal(adapted.summary, 'An excerpt');
  assert.equal(adapted.published, true);
  assert.equal(adapted.featured, true);
  assert.equal(adapted.content, ''); // Listing has no body
  assert.equal(adapted.body, undefined);
  assert.equal(adapted.isSanity, true);
});

test('Data Adapters: maps Sanity Field Note detail document with Portable Text body', () => {
  const doc = {
    _id: 'fn-2',
    title: 'Detailed Article',
    slug: 'detailed-article',
    date: '2026-09-22',
    summary: 'Detailed excerpt',
    category: 'Innovation Lab',
    body: [
      { _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Hello Sanity' }] },
    ],
  };

  const adapted = adaptSanityFieldNoteDetail(doc);
  assert.equal(adapted.slug, 'detailed-article');
  assert.ok(Array.isArray(adapted.body));
  assert.equal(adapted.body?.length, 1);
  assert.equal(adapted.isSanity, true);
});

// -------------------------------------------------------------
// 6. In-Memory Detail Caching & In-Flight Deduplication Tests
// -------------------------------------------------------------
test('Detail Caching: deduplicates concurrent in-flight requests and caches result', async () => {
  clearFieldNotesCache();

  let fetchCallCount = 0;
  const mockClient = {
    fetch: async () => {
      fetchCallCount++;
      // Simulate slight network delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        _id: 'doc-cached',
        title: 'Cached Note',
        slug: 'cached-note',
        date: '2026-09-22',
        summary: 'Cached summary',
        category: 'Practical Tech',
        body: [{ _type: 'block', children: [] }],
      };
    },
  };

  // Dispatch 3 concurrent requests for the exact same slug
  const [res1, res2, res3] = await Promise.all([
    fetchSanityFieldNoteDetail('cached-note', mockClient),
    fetchSanityFieldNoteDetail('cached-note', mockClient),
    fetchSanityFieldNoteDetail('cached-note', mockClient),
  ]);

  // In-flight deduplication: exactly 1 network call occurred
  assert.equal(fetchCallCount, 1);
  assert.equal(res1?.slug, 'cached-note');
  assert.equal(res2?.slug, 'cached-note');
  assert.equal(res3?.slug, 'cached-note');

  // Subsequent call: served from memory cache without new network call
  const res4 = await fetchSanityFieldNoteDetail('cached-note', mockClient);
  assert.equal(fetchCallCount, 1);
  assert.equal(res4?.slug, 'cached-note');
});

// -------------------------------------------------------------
// 7. Orchestration Modes: local, hybrid, sanity
// -------------------------------------------------------------
test('Orchestration [local]: dispatches zero Sanity requests and uses local content', async () => {
  let sanityRequestMade = false;
  const mockClient = {
    fetch: async () => {
      sanityRequestMade = true;
      return [];
    },
  };

  const result = await loadFieldNotes({ modeOverride: 'local', clientOverride: mockClient });
  assert.equal(sanityRequestMade, false, 'Local mode must make ZERO requests to Sanity');
  assert.equal(result.source, 'local');
  assert.ok(result.data.length > 0, 'Local mode returns local content');

  const detailResult = await loadFieldNoteDetail('why-practical-technology-matters', {
    modeOverride: 'local',
    clientOverride: mockClient,
  });
  assert.equal(sanityRequestMade, false);
  assert.equal(detailResult.source, 'local');
  assert.ok(detailResult.data?.content.length! > 0);
});

test('Orchestration [hybrid]: published [] from Sanity is authoritative and does NOT fall back', async () => {
  clearFieldNotesCache();

  let sanityRequestMade = false;
  const mockClient = {
    fetch: async () => {
      sanityRequestMade = true;
      return []; // Published empty array from Sanity
    },
  };

  const result = await loadFieldNotes({ modeOverride: 'hybrid', clientOverride: mockClient });
  assert.equal(sanityRequestMade, true);
  assert.equal(result.source, 'sanity');
  // Authoritative empty state: MUST NOT fall back to local notes!
  assert.deepEqual(result.data, []);
  assert.equal(result.error, null);
});

test('Orchestration [hybrid]: falls back to local content only on network/query failure', async () => {
  clearFieldNotesCache();

  const failingClient = {
    fetch: async () => {
      throw new Error('Network connection timeout');
    },
  };

  const result = await loadFieldNotes({ modeOverride: 'hybrid', clientOverride: failingClient });
  assert.equal(result.source, 'local');
  assert.ok(result.data.length > 0, 'Falls back to local bundled notes');
  assert.ok(result.error?.includes('Network connection timeout'));
});

test('Orchestration [sanity]: exclusive mode never falls back to local content', async () => {
  clearFieldNotesCache();

  // Failure scenario
  const failingClient = {
    fetch: async () => {
      throw new Error('Sanity API error 500');
    },
  };

  const errorResult = await loadFieldNotes({ modeOverride: 'sanity', clientOverride: failingClient });
  assert.equal(errorResult.source, 'sanity');
  assert.deepEqual(errorResult.data, [], 'Sanity mode must NEVER return local notes on error');
  assert.ok(errorResult.error?.includes('Sanity API error 500'));

  // Empty state scenario
  clearFieldNotesCache();
  const emptyClient = {
    fetch: async () => [],
  };
  const emptyResult = await loadFieldNotes({ modeOverride: 'sanity', clientOverride: emptyClient });
  assert.equal(emptyResult.source, 'sanity');
  assert.deepEqual(emptyResult.data, []);
  assert.equal(emptyResult.error, null);
});

test('Orchestration: local and Sanity arrays are never merged', async () => {
  clearFieldNotesCache();

  const mockClient = {
    fetch: async () => [
      {
        _id: 'sanity-note-1',
        title: 'Only Sanity Item',
        slug: 'only-sanity-item',
        date: '2026-09-22',
        summary: 'Summary',
        category: 'Practical Tech',
      },
    ],
  };

  const result = await loadFieldNotes({ modeOverride: 'hybrid', clientOverride: mockClient });
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].slug, 'only-sanity-item');
  // Local notes (which has 2 articles) were NOT concatenated!
  const localNotes = getFieldNotes();
  assert.notEqual(result.data.length, localNotes.length + 1);
});

// -------------------------------------------------------------
// 8. Secret Scanner Tests
// -------------------------------------------------------------
test('Secret Scanner: verifies dist/ is clean of tokens and unapproved VITE_ variables', () => {
  const result = scanDistSecrets();
  assert.equal(
    result.valid,
    true,
    `Scanner found unexpected violations: ${JSON.stringify(result.violations)}`
  );
  assert.equal(result.violations.length, 0);
});

// -------------------------------------------------------------
// 9. Component State & Portable Text Rendering Tests
// -------------------------------------------------------------
test('Component: PortableTextRenderer renders blocks, marks, safe external/internal links', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { PortableTextRenderer } = await import('../src/components/PortableTextRenderer');
  const React = await import('react');

  const blocks = [
    {
      _type: 'block',
      _key: 'b1',
      style: 'h2',
      children: [{ _type: 'span', text: 'Section Heading' }],
    },
    {
      _type: 'block',
      _key: 'b2',
      style: 'normal',
      children: [
        { _type: 'span', text: 'Here is ' },
        { _type: 'span', text: 'strong text', marks: ['strong'] },
        { _type: 'span', text: ' and ' },
        { _type: 'span', text: 'inline code', marks: ['code'] },
        { _type: 'span', text: ' and an ' },
        {
          _type: 'span',
          text: 'external link',
          marks: ['link1'],
        },
        { _type: 'span', text: ' and an ' },
        {
          _type: 'span',
          text: 'internal link',
          marks: ['link2'],
        },
      ],
      markDefs: [
        { _key: 'link1', _type: 'link', href: 'https://example.com' },
        { _key: 'link2', _type: 'link', href: '/field-notes' },
      ],
    },
    {
      _type: 'codeBlock',
      _key: 'b3',
      language: 'typescript',
      code: 'const answer = 42;',
    },
  ];

  const html = renderToStaticMarkup(React.createElement(PortableTextRenderer, { value: blocks }));

  // H2 heading rendered
  assert.ok(html.includes('<h2'), 'Should render H2');
  assert.ok(html.includes('Section Heading'));

  // Strong and code marks rendered
  assert.ok(html.includes('<strong'), 'Should render strong');
  assert.ok(html.includes('<code'), 'Should render code');

  // External link with rel="noopener noreferrer" and target="_blank"
  assert.ok(html.includes('href="https://example.com"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));

  // Internal link without target="_blank"
  assert.ok(html.includes('href="/field-notes"'));
  assert.ok(!html.includes('href="/field-notes" target="_blank"'));

  // Code block rendered
  assert.ok(html.includes('const answer = 42;'));
  assert.ok(html.includes('typescript'));
});

test('Component: PortableTextRenderer rejects unsafe links and reports unsupported block types', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { PortableTextRenderer } = await import('../src/components/PortableTextRenderer');
  const React = await import('react');

  const blocks = [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          text: 'Click here for free bitcoin',
          marks: ['badLink'],
        },
      ],
      markDefs: [
        { _key: 'badLink', _type: 'link', href: 'javascript:stealCredentials()' },
      ],
    },
    {
      _type: 'unsupported3DWidget',
      _key: 'b2',
      data: 'xyz',
    },
  ];

  const html = renderToStaticMarkup(React.createElement(PortableTextRenderer, { value: blocks }));

  // Unsafe link must NOT render an <a> tag
  assert.ok(!html.includes('<a href="javascript:'), 'Must never render javascript: href');
  assert.ok(html.includes('Unsafe link removed'));

  // Unsupported block must visibly report its presence
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('Unsupported content block: [unsupported3DWidget]'));
});

test('Component: FieldNotes renders loading, empty, and error states deterministically', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { FieldNotes } = await import('../src/components/FieldNotes');
  const React = await import('react');

  // 1. Loading state
  const loadingHtml = renderToStaticMarkup(
    React.createElement(FieldNotes, {
      notes: [],
      loading: true,
      activeNote: null,
      onOpenNote: () => {},
      onCloseNote: () => {},
    })
  );
  assert.ok(loadingHtml.includes('aria-label="Loading articles"'));
  assert.ok(loadingHtml.includes('animate-pulse'));

  // 2. Empty state
  const emptyHtml = renderToStaticMarkup(
    React.createElement(FieldNotes, {
      notes: [],
      loading: false,
      activeNote: null,
      onOpenNote: () => {},
      onCloseNote: () => {},
    })
  );
  assert.ok(emptyHtml.includes('No Field Notes Found'));

  // 3. Error state with retry
  const errorHtml = renderToStaticMarkup(
    React.createElement(FieldNotes, {
      notes: [],
      loading: false,
      error: 'Unable to reach Sanity Content Lake',
      retry: () => {},
      activeNote: null,
      onOpenNote: () => {},
      onCloseNote: () => {},
    })
  );
  assert.ok(errorHtml.includes('Unable to reach Sanity Content Lake'));
  assert.ok(errorHtml.includes('Retry Loading'));
});

test('Component: Photography renders loading, empty, and error states deterministically', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { Photography } = await import('../src/components/Photography');
  const React = await import('react');

  // 1. Loading state
  const loadingHtml = renderToStaticMarkup(
    React.createElement(Photography, {
      galleries: [],
      loading: true,
      activeGallery: null,
      onOpenGallery: () => {},
      onCloseGallery: () => {},
    })
  );
  assert.ok(loadingHtml.includes('aria-label="Loading photography galleries"'));

  // 2. Empty state
  const emptyHtml = renderToStaticMarkup(
    React.createElement(Photography, {
      galleries: [],
      loading: false,
      activeGallery: null,
      onOpenGallery: () => {},
      onCloseGallery: () => {},
    })
  );
  assert.ok(emptyHtml.includes('No Galleries Found'));

  // 3. Error state with retry
  const errorHtml = renderToStaticMarkup(
    React.createElement(Photography, {
      galleries: [],
      loading: false,
      error: 'Photography fetch failed',
      retry: () => {},
      activeGallery: null,
      onOpenGallery: () => {},
      onCloseGallery: () => {},
    })
  );
  assert.ok(errorHtml.includes('Photography fetch failed'));
  assert.ok(errorHtml.includes('Retry Loading'));
});

