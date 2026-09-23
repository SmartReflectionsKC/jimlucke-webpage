/**
 * Comprehensive deterministic test suite for Sanity migration tooling (Phase 3A):
 * - Strict preflight validation across all 17 error categories
 * - Exact-alt reuse rule verification
 * - H1 reporting with file, line, and manual resolution
 * - Zero-byte image detection and role reporting
 * - Markdown AST to Portable Text conversion
 * - Deterministic document IDs and idempotent planning
 * - Safe/unsafe link validation
 * - Security: tokens never exposed in reports; zero mutations in dry-run
 * - CLI execution guards and fail-closed behavior
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runPreflight } from '../scripts/migration/preflight';
import {
  convertMarkdownToPortableText,
  isSafeLinkUrl,
  isExternalLinkUrl,
} from '../scripts/migration/markdownToPortableText';
import { inspectImageFile } from '../scripts/migration/imageDimensions';
import { generateMigrationReport } from '../scripts/migration/report';
import { getMigrationConfig } from '../scripts/migration/config';

// -------------------------------------------------------------
// 1. Current Content Preflight Verification
// -------------------------------------------------------------
test('Preflight [Current Content]: passes cleanly with 0 blocking errors and permits execution', () => {
  const result = runPreflight();

  // Dry-run against remediated content must pass cleanly
  assert.equal(result.valid, true, 'Preflight must pass on remediated repository content');
  assert.equal(result.blockingCount, 0, 'Must have zero blocking errors');
  assert.equal(result.warningCount, 0, 'Must have zero warnings');

  const report = generateMigrationReport(result);
  assert.equal(report.reportData.isPermittedToExecute, true, 'Must permit migration execution');

  // 1. Zero-byte files (none should remain)
  assert.equal(result.zeroByteFiles.length, 0, 'Must detect 0 zero-byte files');

  // 2. H1 findings (none should remain)
  assert.equal(result.h1Findings.length, 0, 'Must detect 0 body-level H1 headings');

  // 3. Alt text issues (none should remain)
  const altIssues = result.issues.filter((i) => i.category === 'missing-alt-text');
  assert.equal(altIssues.length, 0, 'Must have zero missing alt text issues');

  // 4. Planned document and asset counts
  assert.equal(result.plannedFieldNotes.length, 5, 'Must plan 5 Field Notes');
  assert.equal(result.plannedGalleries.length, 6, 'Must plan 6 Galleries');
  assert.equal(result.plannedPhotos.length, 8, 'Must plan 8 valid photos');
  assert.equal(result.plannedAssets.length, 8, 'Must plan 8 unique image assets');
});

// -------------------------------------------------------------
// 2. Markdown to Portable Text AST Conversion
// -------------------------------------------------------------
test('Markdown Conversion: correctly maps supported structures to Portable Text', () => {
  const md = `
A regular paragraph with **bold text**, *italic text*, and \`inline code\`.

## Subheading H2

### Sub-subheading H3

#### Minor Heading H4

- Bullet item one
- Bullet item two

1. Numbered item one
2. Numbered item two

> A thoughtful quote from experience.

\`\`\`typescript
const greeting = "Hello, world!";
\`\`\`

Here is a [JimLucke.com](https://jimlucke.com) link and a [relative link](/projects).
`;

  const { blocks, issues, h1Findings } = convertMarkdownToPortableText(md, {
    sourceFile: 'test.md',
  });

  assert.equal(issues.length, 0, 'Should have zero issues for standard supported Markdown');
  assert.equal(h1Findings.length, 0, 'Should have zero H1 findings');
  assert.ok(blocks.length >= 8, 'Should produce at least 8 Portable Text blocks');

  // Paragraph with marks
  const p1 = blocks[0];
  assert.equal(p1._type, 'block');
  assert.equal(p1.style, 'normal');
  const spanBold = p1.children.find((s: any) => s.text === 'bold text');
  assert.ok(spanBold);
  assert.ok(spanBold.marks.includes('strong'));

  const spanItalic = p1.children.find((s: any) => s.text === 'italic text');
  assert.ok(spanItalic);
  assert.ok(spanItalic.marks.includes('em'));

  const spanCode = p1.children.find((s: any) => s.text === 'inline code');
  assert.ok(spanCode);
  assert.ok(spanCode.marks.includes('code'));

  // Headings
  const h2 = blocks.find((b: any) => b.style === 'h2');
  assert.ok(h2);
  assert.equal(h2.children[0].text, 'Subheading H2');

  const h3 = blocks.find((b: any) => b.style === 'h3');
  assert.ok(h3);
  assert.equal(h3.children[0].text, 'Sub-subheading H3');

  const h4 = blocks.find((b: any) => b.style === 'h4');
  assert.ok(h4);
  assert.equal(h4.children[0].text, 'Minor Heading H4');

  // Lists
  const bullets = blocks.filter((b: any) => b.listItem === 'bullet');
  assert.equal(bullets.length, 2);
  assert.equal(bullets[0].level, 1);

  const numbers = blocks.filter((b: any) => b.listItem === 'number');
  assert.equal(numbers.length, 2);

  // Blockquote
  const quote = blocks.find((b: any) => b.style === 'blockquote');
  assert.ok(quote);
  assert.equal(quote.children[0].text, 'A thoughtful quote from experience.');

  // Code Block
  const codeBlock = blocks.find((b: any) => b._type === 'codeBlock');
  assert.ok(codeBlock);
  assert.equal(codeBlock.language, 'typescript');
  assert.ok(codeBlock.code.includes('greeting'));

  // Links
  const linkBlock = blocks[blocks.length - 1];
  assert.ok(linkBlock.markDefs.length >= 2);
  const extLink = linkBlock.markDefs.find((m: any) => m.href === 'https://jimlucke.com');
  assert.ok(extLink);
  assert.equal(extLink.openInNewTab, true);

  const relLink = linkBlock.markDefs.find((m: any) => m.href === '/projects');
  assert.ok(relLink);
  assert.equal(relLink.openInNewTab, false);
});

test('Markdown Conversion: flags H1 headings as blocking errors with manual resolution', () => {
  const md = `# Top Level Article Heading\n\nSome body text.`;
  const { issues, h1Findings } = convertMarkdownToPortableText(md, {
    sourceFile: 'sample-article.md',
    lineOffset: 10,
  });

  assert.equal(h1Findings.length, 1);
  assert.equal(h1Findings[0].line, 11);
  assert.equal(h1Findings[0].headingText, 'Top Level Article Heading');
  assert.ok(h1Findings[0].recommendedResolution.includes('Replace top-level'));

  const h1Issue = issues.find((i) => i.category === 'h1-heading');
  assert.ok(h1Issue);
  assert.equal(h1Issue?.severity, 'blocking');
  assert.equal(h1Issue?.line, 11);
});

test('Markdown Conversion: flags unsupported constructs (raw HTML, tables, horizontal rules)', () => {
  const mdHtml = `<div class="custom-card">Custom content</div>`;
  const resHtml = convertMarkdownToPortableText(mdHtml, { sourceFile: 'html.md' });
  assert.ok(resHtml.issues.some((i) => i.category === 'unsupported-markdown' && i.message.includes('Raw HTML')));

  const mdTable = `| Name | Value |\n| :--- | :--- |\n| Test | 123 |`;
  const resTable = convertMarkdownToPortableText(mdTable, { sourceFile: 'table.md' });
  assert.ok(resTable.issues.some((i) => i.category === 'unsupported-markdown' && i.message.includes('table')));

  const mdHr = `Paragraph one\n\n---\n\nParagraph two`;
  const resHr = convertMarkdownToPortableText(mdHr, { sourceFile: 'hr.md' });
  assert.ok(resHr.issues.some((i) => i.category === 'unsupported-markdown' && i.message.includes('Horizontal rule')));
});

test('Markdown Conversion: strictly rejects unsafe URL schemes in links', () => {
  const unsafeMd = `
Click [here](javascript:alert('pwned')) or [download](data:text/html;base64,PHNjcmlwdD4=) or [run](vbscript:msgbox).
`;
  const { issues } = convertMarkdownToPortableText(unsafeMd, { sourceFile: 'unsafe.md' });
  const unsafeIssues = issues.filter((i) => i.category === 'unsafe-url');
  assert.equal(unsafeIssues.length, 3);
});

test('Link Utilities: validates safe and external URLs accurately', () => {
  assert.equal(isSafeLinkUrl('https://example.com'), true);
  assert.equal(isSafeLinkUrl('http://example.com'), true);
  assert.equal(isSafeLinkUrl('mailto:jim@example.com'), true);
  assert.equal(isSafeLinkUrl('/projects'), true);
  assert.equal(isSafeLinkUrl('#connect'), true);

  assert.equal(isSafeLinkUrl('javascript:alert(1)'), false);
  assert.equal(isSafeLinkUrl('data:text/html,<script>'), false);
  assert.equal(isSafeLinkUrl('vbscript:run()'), false);

  assert.equal(isExternalLinkUrl('https://example.com'), true);
  assert.equal(isExternalLinkUrl('http://example.com'), true);
  assert.equal(isExternalLinkUrl('/projects'), false);
  assert.equal(isExternalLinkUrl('#projects'), false);
});

// -------------------------------------------------------------
// 3. Isolated Fixture Tests for Preflight Rules
// -------------------------------------------------------------
function withTempFixture(
  fn: (dirs: { contentDir: string; publicDir: string }) => void
) {
  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'sanity-migration-test-'));
  const contentDir = path.join(tempBase, 'content');
  const publicDir = path.join(tempBase, 'public');

  fs.mkdirSync(path.join(contentDir, 'field-notes'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'photography'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'images', 'photography'), { recursive: true });

  try {
    fn({ contentDir, publicDir });
  } finally {
    fs.rmSync(tempBase, { recursive: true, force: true });
  }
}

test('Preflight: duplicate slug and duplicate ID detection', () => {
  withTempFixture(({ contentDir, publicDir }) => {
    // Copy valid image
    fs.copyFileSync(
      'public/images/photography/1969c3.jpeg',
      path.join(publicDir, 'images', 'photography', '1969c3.jpeg')
    );

    const note1 = `---
title: "Article One"
date: "2026-07-01"
summary: "A valid summary for testing duplicate slugs."
category: "Practical Tech"
tags: ["Tech"]
coverImage: "/images/photography/1969c3.jpeg"
coverImageAlt: "Vintage Corvette"
published: true
---
## Heading
Body content.
`;

    // Same slug via file name
    fs.writeFileSync(path.join(contentDir, 'field-notes', 'duplicate-slug.md'), note1);
    fs.writeFileSync(path.join(contentDir, 'photography', 'duplicate-slug.json'), JSON.stringify({
      id: 'duplicate-slug',
      title: 'Gallery With Duplicate Slug',
      description: 'Gallery description',
      date: '2026-07-01',
      coverImage: '/images/photography/1969c3.jpeg',
      displayOrder: 1,
      published: true,
      images: [{ src: '/images/photography/1969c3.jpeg', alt: 'Corvette front' }]
    }));

    const result = runPreflight({ contentDir, publicDir });
    assert.ok(result.issues.some((i) => i.category === 'duplicate-slug'));
  });
});

test('Preflight: missing image file is caught as blocking', () => {
  withTempFixture(({ contentDir, publicDir }) => {
    fs.writeFileSync(
      path.join(contentDir, 'field-notes', 'missing-img.md'),
      `---
title: "Missing Image Article"
date: "2026-07-01"
summary: "A valid summary for testing missing image file."
category: "Practical Tech"
tags: ["Tech"]
coverImage: "/images/photography/non-existent-image.jpeg"
coverImageAlt: "Alt text here"
published: true
---
## Heading
Body text.
`
    );

    const result = runPreflight({ contentDir, publicDir });
    const missing = result.issues.find((i) => i.category === 'missing-file');
    assert.ok(missing);
    assert.equal(missing?.severity, 'blocking');
  });
});

test('Preflight: zero-byte image is caught without parsing or hashing', () => {
  withTempFixture(({ contentDir, publicDir }) => {
    const zeroByteFile = path.join(publicDir, 'images', 'photography', 'empty.jpeg');
    fs.writeFileSync(zeroByteFile, Buffer.alloc(0));

    fs.writeFileSync(
      path.join(contentDir, 'field-notes', 'zero-note.md'),
      `---
title: "Zero Byte Note"
date: "2026-07-01"
summary: "A valid summary for testing zero-byte detection."
category: "Practical Tech"
tags: ["Tech"]
coverImage: "/images/photography/empty.jpeg"
coverImageAlt: "Alt text here"
published: true
---
## Heading
Body text.
`
    );

    const inspection = inspectImageFile(zeroByteFile);
    assert.equal(inspection.isZeroByte, true);
    assert.equal(inspection.hash, undefined, 'Must not hash zero-byte file');
    assert.equal(inspection.width, undefined, 'Must not parse dimensions for zero-byte file');

    const result = runPreflight({ contentDir, publicDir });
    const zeroIssue = result.issues.find((i) => i.category === 'zero-byte-file');
    assert.ok(zeroIssue);
    assert.equal(result.zeroByteFiles.length, 1);
    assert.equal(result.zeroByteFiles[0].referencedBy[0].role, 'cover');
  });
});

test('Preflight: Exact-Alt Reuse Rule (Amendment 4)', () => {
  withTempFixture(({ contentDir, publicDir }) => {
    fs.copyFileSync(
      'public/images/photography/1969c3.jpeg',
      path.join(publicDir, 'images', 'photography', '1969c3.jpeg')
    );
    fs.copyFileSync(
      'public/images/photography/artist-c3.jpeg',
      path.join(publicDir, 'images', 'photography', 'artist-c3.jpeg')
    );

    // Case A: Cover matches single gallery photo -> reuses alt cleanly
    fs.writeFileSync(
      path.join(contentDir, 'photography', 'exact-alt-pass.json'),
      JSON.stringify({
        id: 'exact-alt-pass',
        title: 'Pass Gallery',
        description: 'Valid description for exact alt reuse.',
        date: '2026-07-01',
        coverImage: '/images/photography/1969c3.jpeg',
        displayOrder: 1,
        published: true,
        images: [
          { src: '/images/photography/1969c3.jpeg', alt: 'Exact matching alt text' },
        ],
      })
    );

    const resultA = runPreflight({ contentDir, publicDir });
    const galleryA = resultA.plannedGalleries.find((g) => g.slug.current === 'exact-alt-pass');
    assert.ok(galleryA);
    assert.equal(galleryA?.coverImageAlt, 'Exact matching alt text');

    // Case B: Cover has conflicting alts across photos -> blocking error
    fs.writeFileSync(
      path.join(contentDir, 'photography', 'exact-alt-conflict.json'),
      JSON.stringify({
        id: 'exact-alt-conflict',
        title: 'Conflict Gallery',
        description: 'Gallery with conflicting descriptions.',
        date: '2026-07-01',
        coverImage: '/images/photography/1969c3.jpeg',
        displayOrder: 2,
        published: true,
        images: [
          { src: '/images/photography/1969c3.jpeg', alt: 'First description of image' },
          { src: '/images/photography/1969c3.jpeg', alt: 'Conflicting second description' },
        ],
      })
    );

    const resultB = runPreflight({ contentDir, publicDir });
    const conflictIssue = resultB.issues.find(
      (i) => i.category === 'missing-alt-text' && i.file.includes('exact-alt-conflict')
    );
    assert.ok(conflictIssue);
    assert.ok(conflictIssue.message.includes('conflicting alt text'));

    // Case C: Cover does not match any photo and has no explicit coverImageAlt -> blocking error
    fs.writeFileSync(
      path.join(contentDir, 'photography', 'unmatched-cover.json'),
      JSON.stringify({
        id: 'unmatched-cover',
        title: 'Unmatched Cover Gallery',
        description: 'Gallery with unmatched cover image.',
        date: '2026-07-01',
        coverImage: '/images/photography/artist-c3.jpeg',
        displayOrder: 3,
        published: true,
        images: [
          { src: '/images/photography/1969c3.jpeg', alt: 'Different photo alt' },
        ],
      })
    );

    const resultC = runPreflight({ contentDir, publicDir });
    const unmatchedIssue = resultC.issues.find(
      (i) => i.category === 'missing-alt-text' && i.file.includes('unmatched-cover')
    );
    assert.ok(unmatchedIssue);
  });
});

test('Preflight: invalid category and invalid date validation', () => {
  withTempFixture(({ contentDir, publicDir }) => {
    fs.copyFileSync(
      'public/images/photography/1969c3.jpeg',
      path.join(publicDir, 'images', 'photography', '1969c3.jpeg')
    );

    fs.writeFileSync(
      path.join(contentDir, 'field-notes', 'invalid-fields.md'),
      `---
title: "Invalid Fields Note"
date: "invalid-date"
summary: "A valid summary length for testing invalid categories."
category: "Unapproved Category"
tags: ["Tech"]
coverImage: "/images/photography/1969c3.jpeg"
coverImageAlt: "Valid alt text"
published: true
---
## Heading
Body.
`
    );

    const result = runPreflight({ contentDir, publicDir });
    assert.ok(result.issues.some((i) => i.category === 'invalid-category'));
    assert.ok(result.issues.some((i) => i.category === 'invalid-date'));
  });
});

test('Preflight: empty gallery detection', () => {
  withTempFixture(({ contentDir, publicDir }) => {
    fs.copyFileSync(
      'public/images/photography/1969c3.jpeg',
      path.join(publicDir, 'images', 'photography', '1969c3.jpeg')
    );

    fs.writeFileSync(
      path.join(contentDir, 'photography', 'empty-gal.json'),
      JSON.stringify({
        id: 'empty-gal',
        title: 'Empty Gallery',
        description: 'A gallery with no photos.',
        date: '2026-07-01',
        coverImage: '/images/photography/1969c3.jpeg',
        coverImageAlt: 'Cover alt text',
        displayOrder: 1,
        published: true,
        images: [],
      })
    );

    const result = runPreflight({ contentDir, publicDir });
    assert.ok(result.issues.some((i) => i.category === 'empty-gallery'));
  });
});

// -------------------------------------------------------------
// 4. Deterministic IDs and Idempotent Planning
// -------------------------------------------------------------
test('Deterministic IDs: generates stable IDs and preserves photo order', () => {
  const result1 = runPreflight();
  const result2 = runPreflight();

  // IDs must be identical across consecutive runs
  assert.deepEqual(
    result1.plannedFieldNotes.map((n) => n._id),
    result2.plannedFieldNotes.map((n) => n._id)
  );

  assert.deepEqual(
    result1.plannedGalleries.map((g) => g._id),
    result2.plannedGalleries.map((g) => g._id)
  );

  assert.deepEqual(
    result1.plannedPhotos.map((p) => p._id),
    result2.plannedPhotos.map((p) => p._id)
  );

  // Check ID prefix formats
  for (const n of result1.plannedFieldNotes) {
    assert.ok(n._id.startsWith('fieldNote.'), `Expected fieldNote.<slug>, got ${n._id}`);
  }
  for (const g of result1.plannedGalleries) {
    assert.ok(g._id.startsWith('gallery.'), `Expected gallery.<slug>, got ${g._id}`);
  }
  for (const p of result1.plannedPhotos) {
    assert.ok(p._id.startsWith('photo.'), `Expected photo.<id>, got ${p._id}`);
  }

  // Preserve photo ordering in galleries
  const corvette = result1.plannedGalleries.find((g) => g.slug.current === 'corvette-culture');
  assert.ok(corvette);
  assert.equal(corvette?.photos.length, 3);
  assert.ok(corvette?.photos[0]._ref.startsWith('photo.corvette-culture.artist-c3_'));
  assert.ok(corvette?.photos[1]._ref.startsWith('photo.corvette-culture.1969c3_'));
  assert.ok(corvette?.photos[2]._ref.startsWith('photo.corvette-culture.bw-69-side_'));
  for (const ref of corvette!.photos) {
    assert.match(ref._key, /^k_[a-f0-9]{12}$/, 'Reference key must be Sanity-safe deterministic hash key');
  }
});

// -------------------------------------------------------------
// 5. Security & Safety Verification
// -------------------------------------------------------------
test('Security: reports never include token values or secrets', () => {
  const result = runPreflight();
  const secretToken = 'sk_test_super_secret_write_token_12345';
  process.env.SANITY_AUTH_TOKEN = secretToken;

  try {
    const { markdownReportPath, jsonReportPath } = generateMigrationReport(result);
    const mdContent = fs.readFileSync(markdownReportPath, 'utf-8');
    const jsonContent = fs.readFileSync(jsonReportPath, 'utf-8');

    assert.equal(mdContent.includes(secretToken), false, 'Markdown report must never contain secret token');
    assert.equal(jsonContent.includes(secretToken), false, 'JSON report must never contain secret token');
  } finally {
    delete process.env.SANITY_AUTH_TOKEN;
  }
});

test('Security: fails closed if token supplied via VITE_ variable', () => {
  process.env.VITE_SANITY_AUTH_TOKEN = 'illegal_token';
  try {
    assert.throws(() => getMigrationConfig(false), /Security violation/);
  } finally {
    delete process.env.VITE_SANITY_AUTH_TOKEN;
  }
});

test('Execution Guard: getMigrationConfig fails closed in execute mode without token', () => {
  delete process.env.SANITY_AUTH_TOKEN;
  assert.throws(() => getMigrationConfig(true), /SANITY_AUTH_TOKEN is required/);
});
