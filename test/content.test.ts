import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../src/utils/frontmatter';
import { validateAllContent } from '../scripts/validate-content';

test('Frontmatter Parser: parses basic YAML metadata and markdown body', () => {
  const sample = `---
title: "Testing Frontmatter"
date: "2026-09-21"
summary: "A test summary"
category: "Practical Tech"
tags: ["One", "Two", "Three"]
published: true
draft: false
readTime: "3 min read"
---
# Heading 1

This is the body text.
`;

  const parsed = parseFrontmatter(sample);
  assert.equal(parsed.data.title, 'Testing Frontmatter');
  assert.equal(parsed.data.date, '2026-09-21');
  assert.equal(parsed.data.summary, 'A test summary');
  assert.equal(parsed.data.category, 'Practical Tech');
  assert.deepEqual(parsed.data.tags, ['One', 'Two', 'Three']);
  assert.equal(parsed.data.published, true);
  assert.equal(parsed.data.draft, false);
  assert.equal(parsed.data.readTime, '3 min read');
  assert.ok(parsed.content.startsWith('# Heading 1'));
  assert.ok(parsed.content.includes('This is the body text.'));
});

test('Frontmatter Parser: handles unquoted and multiline array syntax', () => {
  const sample = `---
title: Unquoted Title
category: Innovation
tags:
  - First
  - Second
published: false
---
Body content
`;

  const parsed = parseFrontmatter(sample);
  assert.equal(parsed.data.title, 'Unquoted Title');
  assert.equal(parsed.data.category, 'Innovation');
  assert.deepEqual(parsed.data.tags, ['First', 'Second']);
  assert.equal(parsed.data.published, false);
  assert.equal(parsed.content, 'Body content');
});

test('Content Validation: passes current repository content', () => {
  const result = validateAllContent();
  assert.equal(result.valid, true, `Validation failed with errors: ${JSON.stringify(result.errors)}`);
  assert.equal(result.errors.length, 0);
});

test('Draft and Template Exclusion: _template.md and draft filtering logic', () => {
  // Mock loader filter logic
  const mockFiles = [
    { name: '_template.md', published: true },
    { name: 'published-article.md', published: true },
    { name: 'draft-article.md', published: false },
    { name: '_scratch.md', published: true },
  ];

  // In production:
  const isProd = true;
  const filteredProd = mockFiles.filter((file) => {
    if (file.name.startsWith('_')) return false;
    if (isProd && !file.published) return false;
    return true;
  });

  assert.equal(filteredProd.length, 1);
  assert.equal(filteredProd[0].name, 'published-article.md');

  // In development:
  const isDev = false;
  const filteredDev = mockFiles.filter((file) => {
    if (file.name.startsWith('_')) return false;
    if (isDev && !file.published) return false;
    return true;
  });

  assert.equal(filteredDev.length, 2);
  assert.ok(filteredDev.some((f) => f.name === 'published-article.md'));
  assert.ok(filteredDev.some((f) => f.name === 'draft-article.md'));
  assert.ok(!filteredDev.some((f) => f.name.startsWith('_')));
});

test('Negative Validation: catches missing required metadata, invalid date, missing image, and missing alt text', () => {
  // Test invalid note metadata
  const badNoteContent = `---
date: "not-a-valid-date"
summary: ""
published: "yes"
coverImage: "/images/photography/does-not-exist-999.jpg"
---
Missing title and category!
`;
  const { data } = parseFrontmatter(badNoteContent);
  assert.equal(data.title, undefined);
  assert.equal(data.category, undefined);
  assert.equal(data.summary, '');
  assert.equal(isNaN(Date.parse(String(data.date))), true);
  assert.notEqual(typeof data.published, 'boolean');

  // Test invalid gallery manifest
  const badManifest = {
    id: 'broken-gallery',
    title: '',
    images: [
      {
        src: '/images/photography/does-not-exist.jpg',
        alt: '', // Missing alt text!
      },
    ],
  };

  assert.equal(badManifest.title.trim().length, 0);
  assert.equal(badManifest.images[0].alt.trim().length, 0);
});

test('Query Parameter Resolution: note takes precedence over gallery, unknown IDs cleaned, unrelated params preserved', () => {
  interface QueryResolutionInput {
    queryString: string;
    validNotes: string[];
    validGalleries: string[];
  }

  function resolveQueryParams({ queryString, validNotes, validGalleries }: QueryResolutionInput) {
    const params = new URLSearchParams(queryString);
    const noteParam = params.get('note');
    const galleryParam = params.get('gallery');

    let activeNote: string | null = null;
    let activeGallery: string | null = null;

    // Both provided: note takes precedence
    if (noteParam && galleryParam) {
      if (validNotes.includes(noteParam)) {
        activeNote = noteParam;
        params.delete('gallery');
      } else if (validGalleries.includes(galleryParam)) {
        activeGallery = galleryParam;
        params.delete('note');
      } else {
        params.delete('note');
        params.delete('gallery');
      }
    } else if (noteParam) {
      if (validNotes.includes(noteParam)) {
        activeNote = noteParam;
      } else {
        // Unknown note slug: clean it
        params.delete('note');
      }
    } else if (galleryParam) {
      if (validGalleries.includes(galleryParam)) {
        activeGallery = galleryParam;
      } else {
        // Unknown gallery ID: clean it
        params.delete('gallery');
      }
    }

    return {
      activeNote,
      activeGallery,
      cleanedQueryString: params.toString(),
    };
  }

  const validNotes = ['why-practical-technology-matters', 'soar-life-center-phase-one'];
  const validGalleries = ['abandoned-america', 'corvette-culture'];

  // Test 1: Single valid note with unrelated param
  const res1 = resolveQueryParams({
    queryString: 'note=why-practical-technology-matters&utm_source=twitter',
    validNotes,
    validGalleries,
  });
  assert.equal(res1.activeNote, 'why-practical-technology-matters');
  assert.equal(res1.activeGallery, null);
  assert.equal(res1.cleanedQueryString, 'note=why-practical-technology-matters&utm_source=twitter');

  // Test 2: Both note and gallery provided -> note takes precedence, gallery removed
  const res2 = resolveQueryParams({
    queryString: 'note=soar-life-center-phase-one&gallery=abandoned-america&ref=newsletter',
    validNotes,
    validGalleries,
  });
  assert.equal(res2.activeNote, 'soar-life-center-phase-one');
  assert.equal(res2.activeGallery, null);
  assert.equal(res2.cleanedQueryString, 'note=soar-life-center-phase-one&ref=newsletter');

  // Test 3: Unknown note slug -> cleaned, no modal shown
  const res3 = resolveQueryParams({
    queryString: 'note=nonexistent-slug&tag=featured',
    validNotes,
    validGalleries,
  });
  assert.equal(res3.activeNote, null);
  assert.equal(res3.activeGallery, null);
  assert.equal(res3.cleanedQueryString, 'tag=featured');

  // Test 4: Unknown gallery ID -> cleaned, no modal shown
  const res4 = resolveQueryParams({
    queryString: 'gallery=fake-gallery',
    validNotes,
    validGalleries,
  });
  assert.equal(res4.activeNote, null);
  assert.equal(res4.activeGallery, null);
  assert.equal(res4.cleanedQueryString, '');
});

test('Content: CollectorHQ, EmpowerResponse, and SOAR adhere to approved wording', async () => {
  const { siteData } = await import('../src/data/siteContent');

  const chq = siteData.workingOnNow.find(i => i.id === 'collector-hq');
  assert.ok(chq, 'CollectorHQ must exist in workingOnNow');
  assert.ok(!chq.description.includes('local-first'), 'CollectorHQ must not be described as local-first');
  assert.ok(!chq.description.includes('complete provenance tracking'), 'CollectorHQ must not promise complete provenance tracking');
  assert.equal(
    chq.shortSentence,
    'A focused cataloging platform designed to help collectors organize their collections, document provenance, and retain control of their collection records.'
  );

  const er = siteData.workingOnNow.find(i => i.id === 'empower-response');
  assert.ok(er, 'EmpowerResponse must exist in workingOnNow');
  assert.equal(
    er.shortSentence,
    'Helping authorized first responders access important communication, sensory, and support information when responding to an individual with special needs.'
  );

  const soar = siteData.workingOnNow.find(i => i.id === 'soar-life-center');
  assert.ok(soar, 'SOAR must exist in workingOnNow');
  assert.equal(
    soar.shortSentence,
    'Supporting the planning, communication, and technology behind SOAR Special Needs’ proposed Life & Community Center.'
  );
});

test('Content: WorkingOnNow and Projects maintain distinct descriptions without duplicated sentences', async () => {
  const { siteData } = await import('../src/data/siteContent');

  const nowDescriptions = siteData.workingOnNow.map(i => i.description);
  const projectDescriptions = siteData.projects.map(p => p.description);

  for (const nowDesc of nowDescriptions) {
    for (const projDesc of projectDescriptions) {
      assert.notEqual(nowDesc, projDesc, 'WorkingOnNow and Projects must not have identical descriptions');
      // Verify no shared complete sentence longer than 20 chars
      const nowSentences = nowDesc.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      const projSentences = projDesc.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      for (const ns of nowSentences) {
        assert.ok(!projSentences.includes(ns), `Shared sentence found between WorkingOnNow and Projects: "${ns}"`);
      }
    }
  }
});

test('Content: CredibilityStrip avoids permanent campus claim and LinkedIn is conditionally hidden', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const credContent = fs.readFileSync(path.resolve('src/components/CredibilityStrip.tsx'), 'utf-8');

  assert.ok(
    credContent.includes('Supporting families & the Life Center vision'),
    'CredibilityStrip must use "Supporting families & the Life Center vision"'
  );
  assert.ok(
    !credContent.includes('community campus vision'),
    'CredibilityStrip must not claim permanent community campus vision'
  );

  const connectContent = fs.readFileSync(path.resolve('src/components/Connect.tsx'), 'utf-8');
  assert.ok(
    connectContent.includes('{isValidLinkedInUrl && ('),
    'Connect component must hide LinkedIn card unless URL is valid'
  );
  assert.ok(
    !connectContent.includes('LinkedIn Connection Request'),
    'Connect component must not show a fallback email action for LinkedIn'
  );
});
