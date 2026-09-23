/**
 * Comprehensive test suite for Phase 3B Migration Execution, Safety, and Rollback:
 * - Amendment 1: Stable photo document IDs independent of gallery array index
 * - Amendment 2: Stable gallery reference keys tied to photo identity
 * - Amendment 3 & 11: Narrow verification targets (unrelated docs/assets do not fail verification)
 * - Amendment 4: Logical dataset backup and empty dataset verification
 * - Amendment 5: Dirty working-tree execution abort
 * - Amendment 5 & 6: Changed source hash execution abort
 * - Amendment 7: Atomic transaction failure and accurate partial-stage manifest
 * - Amendment 8: Ambiguous sha1hash lookup abort and exact SHA-1 asset reuse
 * - Amendment 9: Unexpected _type collision abort before target overwrite
 * - Amendment 10: Deterministic Portable Text keys across identical runs
 * - Amendment 12: Rollback document-first sequencing, reference check, and reused asset protection
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { runPreflight } from '../scripts/migration/preflight';
import { convertMarkdownToPortableText } from '../scripts/migration/markdownToPortableText';
import { performDatasetBackup } from '../scripts/migration/backup';
import { snapshotExistingTargets } from '../scripts/migration/snapshot';
import { deduplicateAndUploadAssets } from '../scripts/migration/assetUploader';
import { commitDocumentsAtomically } from '../scripts/migration/documentWriter';
import { verifyMigration } from '../scripts/migration/postVerification';
import { performRollback } from '../scripts/migration/rollback';
import { executeMigration } from '../scripts/migration/executor';
import { enforceGitCleanliness, getGitSafetyStatus } from '../scripts/migration/config';
import { RunManifest, PlannedAsset } from '../scripts/migration/types';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sanity-phase3b-test-'));
}

// ---------------------------------------------------------------------------
// 1. Stable Photo Document IDs (Amendment 1)
// ---------------------------------------------------------------------------
test('Amendment 1: Photo document IDs remain stable when gallery photos are reordered', () => {
  const tempDir = createTempDir();
  const contentDir = path.join(tempDir, 'content');
  const publicDir = path.join(tempDir, 'public');

  fs.mkdirSync(path.join(contentDir, 'photography'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'field-notes'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'images', 'photography'), { recursive: true });

  // Copy sample images from repo
  fs.copyFileSync(
    'public/images/photography/artist-c3.jpeg',
    path.join(publicDir, 'images', 'photography', 'artist-c3.jpeg')
  );
  fs.copyFileSync(
    'public/images/photography/1969c3.jpeg',
    path.join(publicDir, 'images', 'photography', '1969c3.jpeg')
  );
  fs.copyFileSync(
    'public/images/photography/bw-69-side.jpeg',
    path.join(publicDir, 'images', 'photography', 'bw-69-side.jpeg')
  );

  // Gallery Order 1: Photo A, Photo B, Photo C
  const galleryJsonA = {
    id: 'test-gallery',
    title: 'Test Gallery',
    description: 'Testing stable photo IDs.',
    date: '2026-06-10',
    coverImage: '/images/photography/artist-c3.jpeg',
    coverImageAlt: 'Cover image alt text',
    displayOrder: 1,
    published: true,
    images: [
      { src: '/images/photography/artist-c3.jpeg', alt: 'Photo A alt text' },
      { src: '/images/photography/1969c3.jpeg', alt: 'Photo B alt text' },
      { src: '/images/photography/bw-69-side.jpeg', alt: 'Photo C alt text' },
    ],
  };

  fs.writeFileSync(
    path.join(contentDir, 'photography', 'test-gallery.json'),
    JSON.stringify(galleryJsonA)
  );

  const preflight1 = runPreflight({ contentDir, publicDir });
  assert.equal(preflight1.valid, true);

  const photoIdA_1 = preflight1.plannedPhotos.find((p) => p.assetSourcePath.includes('artist-c3'))?._id;
  const photoIdB_1 = preflight1.plannedPhotos.find((p) => p.assetSourcePath.includes('1969c3'))?._id;
  const photoIdC_1 = preflight1.plannedPhotos.find((p) => p.assetSourcePath.includes('bw-69-side'))?._id;

  assert.ok(photoIdA_1);
  assert.ok(photoIdB_1);
  assert.ok(photoIdC_1);

  // Gallery Order 2: Reordered to C, A, B
  const galleryJsonB = {
    ...galleryJsonA,
    images: [
      { src: '/images/photography/bw-69-side.jpeg', alt: 'Photo C alt text' },
      { src: '/images/photography/artist-c3.jpeg', alt: 'Photo A alt text' },
      { src: '/images/photography/1969c3.jpeg', alt: 'Photo B alt text' },
    ],
  };

  fs.writeFileSync(
    path.join(contentDir, 'photography', 'test-gallery.json'),
    JSON.stringify(galleryJsonB)
  );

  const preflight2 = runPreflight({ contentDir, publicDir });
  assert.equal(preflight2.valid, true);

  const photoIdA_2 = preflight2.plannedPhotos.find((p) => p.assetSourcePath.includes('artist-c3'))?._id;
  const photoIdB_2 = preflight2.plannedPhotos.find((p) => p.assetSourcePath.includes('1969c3'))?._id;
  const photoIdC_2 = preflight2.plannedPhotos.find((p) => p.assetSourcePath.includes('bw-69-side'))?._id;

  // Photo document IDs must be identical despite reordering (not photo.test-gallery.0 vs photo.test-gallery.1)
  assert.equal(photoIdA_1, photoIdA_2, 'Photo A document ID must not change when reordered');
  assert.equal(photoIdB_1, photoIdB_2, 'Photo B document ID must not change when reordered');
  assert.equal(photoIdC_1, photoIdC_2, 'Photo C document ID must not change when reordered');

  // Scenario 3: Gallery insertion/removal (adding photo D does not alter A, B, or C)
  const galleryJsonC = {
    ...galleryJsonA,
    images: [
      { src: '/images/photography/artist-c3.jpeg', alt: 'Photo A alt text' },
      { src: '/images/photography/1969c3.jpeg', alt: 'Photo B alt text' },
      { src: '/images/photography/artist-c3.jpeg', alt: 'Photo A duplicate insertion' },
      { src: '/images/photography/bw-69-side.jpeg', alt: 'Photo C alt text' },
    ],
  };
  fs.writeFileSync(
    path.join(contentDir, 'photography', 'test-gallery.json'),
    JSON.stringify(galleryJsonC)
  );
  const preflight3 = runPreflight({ contentDir, publicDir });
  const photoIdB_3 = preflight3.plannedPhotos.find((p) => p.assetSourcePath.includes('1969c3'))?._id;
  const photoIdC_3 = preflight3.plannedPhotos.find((p) => p.assetSourcePath.includes('bw-69-side'))?._id;
  assert.equal(photoIdB_1, photoIdB_3, 'Photo B ID unaffected by gallery insertion/removal');
  assert.equal(photoIdC_1, photoIdC_3, 'Photo C ID unaffected by gallery insertion/removal');

  // Scenario 4: Replacement image at the same canonical source path
  // Overwriting the binary content of artist-c3.jpeg on disk must NOT change its photo document ID!
  const targetPhotoPath = path.join(publicDir, 'images', 'photography', 'artist-c3.jpeg');
  const originalAssetRef_A = preflight1.plannedPhotos.find((p) => p.assetSourcePath.includes('artist-c3'))?.targetAssetRef;

  // Append bytes to simulate an updated/replaced image file
  fs.appendFileSync(targetPhotoPath, Buffer.from([0x99, 0x88, 0x77]));

  fs.writeFileSync(
    path.join(contentDir, 'photography', 'test-gallery.json'),
    JSON.stringify(galleryJsonA)
  );
  const preflight4 = runPreflight({ contentDir, publicDir });
  assert.equal(preflight4.valid, true);

  const photoDocA_replaced = preflight4.plannedPhotos.find((p) => p.assetSourcePath.includes('artist-c3'));
  assert.equal(
    photoDocA_replaced?._id,
    photoIdA_1,
    'Photo document ID must remain unchanged when image at the same canonical source path is replaced'
  );
  assert.notEqual(
    photoDocA_replaced?.targetAssetRef,
    originalAssetRef_A,
    'Asset reference must change when binary image content is replaced'
  );

  // Scenario 5: Same filename in different galleries/paths produces distinct IDs
  fs.writeFileSync(
    path.join(contentDir, 'photography', 'other-gallery.json'),
    JSON.stringify({
      id: 'other-gallery',
      title: 'Other Gallery',
      description: 'Gallery in different namespace.',
      date: '2026-06-10',
      coverImage: '/images/photography/artist-c3.jpeg',
      coverImageAlt: 'Cover alt',
      displayOrder: 2,
      published: true,
      images: [{ src: '/images/photography/artist-c3.jpeg', alt: 'Same file in other gallery' }],
    })
  );

  // Also create a second directory with the same filename
  fs.mkdirSync(path.join(publicDir, 'images', 'special'), { recursive: true });
  fs.copyFileSync(targetPhotoPath, path.join(publicDir, 'images', 'special', 'artist-c3.jpeg'));

  fs.writeFileSync(
    path.join(contentDir, 'photography', 'special-gallery.json'),
    JSON.stringify({
      id: 'test-gallery-2',
      title: 'Special Gallery',
      description: 'Gallery with different directory path.',
      date: '2026-06-10',
      coverImage: '/images/special/artist-c3.jpeg',
      coverImageAlt: 'Cover alt',
      displayOrder: 3,
      published: true,
      images: [{ src: '/images/special/artist-c3.jpeg', alt: 'Same filename in different directory' }],
    })
  );

  const preflight5 = runPreflight({ contentDir, publicDir });
  const otherGalPhotoId = preflight5.plannedPhotos.find((p) => p._id.startsWith('photo.other-gallery.'))?._id;
  const specialPathPhotoId = preflight5.plannedPhotos.find((p) => p._id.startsWith('photo.test-gallery-2.'))?._id;

  assert.notEqual(otherGalPhotoId, photoIdA_1, 'Same image in different galleries must have distinct IDs');
  assert.notEqual(specialPathPhotoId, photoIdA_1, 'Same filename in different paths must have distinct IDs');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 2. Stable Gallery Reference Keys (Amendment 2)
// ---------------------------------------------------------------------------
test('Amendment 2: Gallery reference keys stay tied to photos after reordering and use safe characters', () => {
  const tempDir = createTempDir();
  const contentDir = path.join(tempDir, 'content');
  const publicDir = path.join(tempDir, 'public');

  fs.mkdirSync(path.join(contentDir, 'photography'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'field-notes'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'images', 'photography'), { recursive: true });

  fs.copyFileSync(
    'public/images/photography/artist-c3.jpeg',
    path.join(publicDir, 'images', 'photography', 'artist-c3.jpeg')
  );
  fs.copyFileSync(
    'public/images/photography/1969c3.jpeg',
    path.join(publicDir, 'images', 'photography', '1969c3.jpeg')
  );

  const galleryJson1 = {
    id: 'keys-gallery',
    title: 'Keys Gallery',
    description: 'Testing reference keys.',
    date: '2026-06-10',
    coverImage: '/images/photography/artist-c3.jpeg',
    coverImageAlt: 'Cover image alt text',
    displayOrder: 1,
    published: true,
    images: [
      { src: '/images/photography/artist-c3.jpeg', alt: 'Photo 1 alt text' },
      { src: '/images/photography/1969c3.jpeg', alt: 'Photo 2 alt text' },
    ],
  };

  fs.writeFileSync(
    path.join(contentDir, 'photography', 'keys-gallery.json'),
    JSON.stringify(galleryJson1)
  );

  const p1 = runPreflight({ contentDir, publicDir });
  const gallery1 = p1.plannedGalleries[0];
  const keyPhoto1_run1 = gallery1.photos[0]._key;
  const keyPhoto2_run1 = gallery1.photos[1]._key;

  // Sanity safe character validation
  assert.match(keyPhoto1_run1, /^[a-zA-Z0-9_-]+$/, 'Key must contain only Sanity-safe characters');
  assert.match(keyPhoto2_run1, /^[a-zA-Z0-9_-]+$/, 'Key must contain only Sanity-safe characters');

  // Reorder photos: 1969c3 first, artist-c3 second
  const galleryJson2 = {
    ...galleryJson1,
    images: [
      { src: '/images/photography/1969c3.jpeg', alt: 'Photo 2 alt text' },
      { src: '/images/photography/artist-c3.jpeg', alt: 'Photo 1 alt text' },
    ],
  };

  fs.writeFileSync(
    path.join(contentDir, 'photography', 'keys-gallery.json'),
    JSON.stringify(galleryJson2)
  );

  const p2 = runPreflight({ contentDir, publicDir });
  const gallery2 = p2.plannedGalleries[0];
  const keyPhoto2_run2 = gallery2.photos[0]._key; // 1969c3 is now index 0
  const keyPhoto1_run2 = gallery2.photos[1]._key; // artist-c3 is now index 1

  // Keys must stay attached to the photo, not the index
  assert.equal(keyPhoto1_run1, keyPhoto1_run2, 'Photo 1 key must follow photo 1 when position changes');
  assert.equal(keyPhoto2_run1, keyPhoto2_run2, 'Photo 2 key must follow photo 2 when position changes');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 3. Portable Text Stability (Amendment 10)
// ---------------------------------------------------------------------------
test('Amendment 10: Portable Text block, span, and mark keys are strictly deterministic across runs', () => {
  const md = `
# Ignored Header
A standard paragraph with **bold words** and a [link](https://example.com).

- List item one
- List item two

> Blockquote reflection.
`;

  const run1 = convertMarkdownToPortableText(md, { sourceFile: 'example.md' });
  const run2 = convertMarkdownToPortableText(md, { sourceFile: 'example.md' });

  assert.equal(run1.blocks.length, run2.blocks.length);

  // Compare every block _key and child span/markDef keys
  for (let i = 0; i < run1.blocks.length; i++) {
    const b1 = run1.blocks[i];
    const b2 = run2.blocks[i];
    assert.equal(b1._key, b2._key, `Block ${i} key must match across runs`);

    if (b1.children && b2.children) {
      for (let j = 0; j < b1.children.length; j++) {
        assert.equal(b1.children[j]._key, b2.children[j]._key, `Span ${j} key must match`);
      }
    }

    if (b1.markDefs && b2.markDefs) {
      for (let k = 0; k < b1.markDefs.length; k++) {
        assert.equal(b1.markDefs[k]._key, b2.markDefs[k]._key, `MarkDef ${k} key must match`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 4. Dirty Working Tree Abort (Amendment 5)
// ---------------------------------------------------------------------------
test('Amendment 5: Execution fails closed if git working tree is dirty', () => {
  // Test enforceGitCleanliness directly with mock or inspection
  const status = getGitSafetyStatus(process.cwd());
  assert.equal(typeof status.isClean, 'boolean');
  assert.equal(typeof status.branch, 'string');
  assert.equal(typeof status.commit, 'string');

  // If we simulate dirty tree in a temporary git directory:
  const tempGitDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempGitDir, 'dirty.txt'), 'uncommitted changes');
    // Calling enforceGitCleanliness on non-git or dirty dir will throw
    assert.throws(
      () => enforceGitCleanliness(tempGitDir),
      /Git safety check failed/
    );
  } finally {
    fs.rmSync(tempGitDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 5. Changed Source Hash Abort (Amendments 5 & 6)
// ---------------------------------------------------------------------------
test('Amendment 5 & 6: Execution aborts if source file hash changes after preflight', async () => {
  const tempDir = createTempDir();
  const contentDir = path.join(tempDir, 'content');
  const publicDir = path.join(tempDir, 'public');

  fs.mkdirSync(path.join(contentDir, 'photography'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'field-notes'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'images', 'photography'), { recursive: true });

  const imgPath = path.join(publicDir, 'images', 'photography', 'artist-c3.jpeg');
  fs.copyFileSync('public/images/photography/artist-c3.jpeg', imgPath);

  fs.writeFileSync(
    path.join(contentDir, 'photography', 'gal.json'),
    JSON.stringify({
      id: 'gal',
      title: 'Gal',
      description: 'Gal desc.',
      date: '2026-06-10',
      coverImage: '/images/photography/artist-c3.jpeg',
      coverImageAlt: 'Cover alt text',
      displayOrder: 1,
      published: true,
      images: [{ src: '/images/photography/artist-c3.jpeg', alt: 'Alt text' }],
    })
  );

  const preflight = runPreflight({ contentDir, publicDir });
  assert.equal(preflight.valid, true);

  // Now mutate the image file after preflight was generated!
  fs.appendFileSync(imgPath, Buffer.from([0x01, 0x02, 0x03]));

  // Attempt execution with the preflight in-memory plan
  const result = await executeMigration({
    preflightResult: preflight,
    contentDir,
    publicDir,
    requireGitClean: false,
    backupDir: tempDir,
    manifestDir: tempDir,
  });

  assert.equal(result.success, false);
  assert.match(result.error || '', /Source hash changed for image/);
  assert.equal(result.manifest.completedSuccessfully, false);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 6. Logical Dataset Backup & Empty Dataset Verification (Amendment 4)
// ---------------------------------------------------------------------------
test('Amendment 4: Dataset backup writes non-empty record for verified empty dataset', async () => {
  const tempDir = createTempDir();
  const mockClient = {
    fetch: async (query: string) => {
      if (query === '*[]') return []; // Empty dataset
      return [];
    },
  };

  const backupManifest = await performDatasetBackup(mockClient, {
    runId: 'test_empty_backup',
    projectId: 'wml93cow',
    dataset: 'production',
    apiVersion: '2026-09-01',
    backupDir: tempDir,
  });

  assert.equal(backupManifest.verifiedEmpty, true);
  assert.equal(backupManifest.documentCount, 0);
  assert.ok(fs.existsSync(backupManifest.snapshotFilePath));

  // Verify file on disk is non-empty and parsable
  const fileContent = fs.readFileSync(backupManifest.snapshotFilePath, 'utf-8');
  assert.ok(fileContent.length > 50, 'Snapshot record must be non-empty');
  const parsed = JSON.parse(fileContent);
  assert.equal(parsed.verifiedEmpty, true);
  assert.equal(parsed.backupType, 'logical-json-document-snapshot');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 7. Ambiguous sha1hash Lookup Abort (Amendment 8)
// ---------------------------------------------------------------------------
test('Amendment 8: Asset deduplication fails closed if multiple assets match sha1hash', async () => {
  const mockClient = {
    fetch: async () => [
      { _id: 'image-1', _type: 'sanity.imageAsset', sha1hash: '1234567890123456789012345678901234567890' },
      { _id: 'image-2', _type: 'sanity.imageAsset', sha1hash: '1234567890123456789012345678901234567890' },
    ],
  };

  const plannedAssets: PlannedAsset[] = [
    {
      sourcePath: '/images/photo.jpg',
      canonicalPath: '/path/photo.jpg',
      hash: 'sha256-hash',
      sha1: '1234567890123456789012345678901234567890',
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      aspectRatio: 1.33,
      sizeBytes: 1024,
      targetAssetId: 'image-sha1-800x600-jpg',
    },
  ];

  await assert.rejects(
    async () => deduplicateAndUploadAssets(mockClient, plannedAssets),
    /Ambiguous asset match: 2 Sanity image assets found/
  );
});

// ---------------------------------------------------------------------------
// 8. Unexpected _type Collision Abort (Amendment 9)
// ---------------------------------------------------------------------------
test('Amendment 9: Snapshot aborts immediately on unexpected _type collision', async () => {
  const mockClient = {
    fetch: async () => [
      {
        _id: 'fieldNote.my-article',
        _type: 'gallery', // COLLISION: expected fieldNote!
        title: 'Colliding doc',
      },
    ],
  };

  const plannedDocs = [
    {
      _id: 'fieldNote.my-article',
      _type: 'fieldNote',
      title: 'Planned field note',
    },
  ];

  await assert.rejects(
    async () =>
      snapshotExistingTargets(mockClient, plannedDocs, {
        runId: 'test_collision',
      }),
    /Unexpected document type collision: Target document "fieldNote.my-article" already exists with type "gallery"/
  );
});

// ---------------------------------------------------------------------------
// 9. Narrow Post-Write Verification Scope (Amendments 3 & 11)
// ---------------------------------------------------------------------------
test('Amendments 3 & 11: Verification passes with unrelated documents and assets in dataset', async () => {
  const preflight = runPreflight();
  assert.equal(preflight.valid, true);

  const expectedDocIds = [
    ...preflight.plannedFieldNotes.map((n) => n._id),
    ...preflight.plannedGalleries.map((g) => g._id),
    ...preflight.plannedPhotos.map((p) => p._id),
  ];

  const plannedDocsMap = new Map<string, any>();
  for (const n of preflight.plannedFieldNotes) plannedDocsMap.set(n._id, n);
  for (const g of preflight.plannedGalleries) plannedDocsMap.set(g._id, g);
  for (const p of preflight.plannedPhotos) plannedDocsMap.set(p._id, p);

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const mockClient = {
    fetch: async (query: string, params: any) => {
      // 1. Target docs query
      if (query.includes('*[_id in $expectedDocIds]')) {
        const returned = params.expectedDocIds.map((id: string) => plannedDocsMap.get(id));
        return returned;
      }
      // 2. Drafts query
      if (query.includes('*[_id in $draftIds]')) {
        return [];
      }
      // 3. Asset check
      if (query.includes('*[_type == "sanity.imageAsset" && _id in $assetIds]')) {
        // Return matching assets PLUS unrelated assets
        const matched = assetUploads.map((u) => ({
          _id: u.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: u.sha1,
          size: u.sizeBytes,
        }));
        // Unrelated asset in dataset should NOT cause failure
        matched.push({
          _id: 'image-unrelated-asset',
          _type: 'sanity.imageAsset',
          sha1hash: 'unrelatedhash',
          size: 5000,
        });
        return matched;
      }
      // 4. GROQ Field Note Detail Query
      if (query.includes('slug.current == $slug')) {
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params.slug);
        if (!note) return null;
        return {
          _id: note._id,
          title: note.title,
          slug: note.slug.current,
          date: note.publicationDate,
          summary: note.excerpt,
          category: note.category,
          tags: note.tags,
          featuredImage: note.featuredImage
            ? {
                asset: {
                  _id: note.featuredImage.asset._ref,
                  url: 'https://cdn.sanity.io/images/...',
                  metadata: {
                    dimensions: {
                      width: 1200,
                      height: 800,
                      aspectRatio: 1.5,
                    },
                  },
                },
              }
            : undefined,
          featuredImageAlt: note.featuredImageAlt,
          body: note.body,
        };
      }
      // 5. GROQ Field Notes List
      if (query.includes('FIELD_NOTES_LIST_QUERY') || query.includes('order(publicationDate desc)')) {
        const notes = preflight.plannedFieldNotes.map((n) => ({
          _id: n._id,
          title: n.title,
          slug: n.slug.current,
        }));
        // Add an unrelated note
        notes.push({ _id: 'fieldNote.future-unrelated', title: 'Future', slug: 'future-unrelated' });
        return notes;
      }
      // 6. GROQ Galleries
      if (query.includes('GALLERIES_QUERY') || query.includes('*[_type == "gallery"')) {
        const gals = preflight.plannedGalleries.map((g) => ({
          _id: g._id,
          title: g.title,
          slug: g.slug.current,
        }));
        // Add an unrelated gallery
        gals.push({ _id: 'gallery.future-unrelated', title: 'Future', slug: 'future-unrelated' });
        return gals;
      }
      return [];
    },
  };

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    retryDelayMs: 0,
  });

  assert.equal(result.verified, true, 'Narrow verification must pass even when unrelated documents exist');
});

// ---------------------------------------------------------------------------
// 10. Atomic Document Transaction Failure & Partial-Stage Manifest (Amendment 7)
// ---------------------------------------------------------------------------
test('Amendment 7: Transaction failure leaves an accurate partial-stage manifest', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();

  const mockClient = {
    fetch: async (query: string) => {
      if (query === '*[]') return [];
      if (query.includes('*[_id in $plannedIds]')) return [];
      if (query.includes('sha1hash')) return [];
      return [];
    },
    assets: {
      upload: async () => ({ _id: 'image-uploaded-asset-id' }),
    },
    transaction: () => ({
      createOrReplace: () => {},
      commit: async () => {
        throw new Error('Database transaction lock timeout');
      },
    }),
  };

  const result = await executeMigration({
    client: mockClient,
    preflightResult: preflight,
    requireGitClean: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    dryRun: false,
  });

  assert.equal(result.success, false);
  assert.match(result.error || '', /Database transaction lock timeout/);

  // Manifest must record the exact stage failure
  const manifest = result.manifest;
  assert.equal(manifest.completedSuccessfully, false);
  const txStage = manifest.stages.find((s) => s.stage === 'atomic-document-transaction');
  assert.ok(txStage);
  assert.equal(txStage?.status, 'failed');

  const assetStage = manifest.stages.find((s) => s.stage === 'asset-deduplication-and-upload');
  assert.ok(assetStage);
  assert.equal(assetStage?.status, 'completed');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 11. Rollback Sequencing, Asset Reference Re-query & Reused Asset Safeguards (Amendment 12)
// ---------------------------------------------------------------------------
test('Amendment 12: Rollback processes documents first, never deletes reused assets, and checks references', async () => {
  const callSequence: string[] = [];

  const manifest: RunManifest = {
    runId: 'test_rollback_run',
    timestamp: new Date().toISOString(),
    gitCommit: 'abc123',
    gitBranch: 'feature/sanity-content-studio',
    projectId: 'wml93cow',
    dataset: 'production',
    apiVersion: '2026-09-01',
    sourceContentHashes: {},
    plannedDocumentIds: ['fieldNote.doc-1', 'fieldNote.doc-2'],
    plannedAssetIds: ['image-reused', 'image-new-unreferenced', 'image-new-referenced'],
    replacedDocumentSnapshots: [
      {
        _id: 'fieldNote.doc-1',
        _type: 'fieldNote',
        doc: { _id: 'fieldNote.doc-1', title: 'Original Doc 1' },
      },
    ],
    newlyCreatedDocumentIds: ['fieldNote.doc-2'],
    assetUploads: [
      {
        sourcePath: '/images/reused.jpg',
        canonicalPath: '/reused.jpg',
        sha256: 'h1',
        sha1: 's1',
        targetAssetId: 'image-reused',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        existedBeforeRun: true, // REUSED: must NEVER be deleted
        uploadTimestamp: new Date().toISOString(),
      },
      {
        sourcePath: '/images/new-unreferenced.jpg',
        canonicalPath: '/new1.jpg',
        sha256: 'h2',
        sha1: 's2',
        targetAssetId: 'image-new-unreferenced',
        mimeType: 'image/jpeg',
        sizeBytes: 200,
        existedBeforeRun: false, // NEW: unreferenced, should be deleted
        uploadTimestamp: new Date().toISOString(),
      },
      {
        sourcePath: '/images/new-referenced.jpg',
        canonicalPath: '/new2.jpg',
        sha256: 'h3',
        sha1: 's3',
        targetAssetId: 'image-new-referenced',
        mimeType: 'image/jpeg',
        sizeBytes: 300,
        existedBeforeRun: false, // NEW: still referenced elsewhere, must NOT be deleted
        uploadTimestamp: new Date().toISOString(),
      },
    ],
    stages: [],
    completedSuccessfully: true,
  };

  const deletedAssets: string[] = [];

  const mockClient = {
    transaction: () => ({
      createOrReplace: () => {
        callSequence.push('tx.createOrReplace');
      },
      delete: () => {
        callSequence.push('tx.delete');
      },
      commit: async () => {
        callSequence.push('tx.commit');
      },
    }),
    fetch: async (query: string, params: any) => {
      callSequence.push(`fetch:${params?.assetId}`);
      if (params?.assetId === 'image-new-unreferenced') {
        return 0; // 0 references
      }
      if (params?.assetId === 'image-new-referenced') {
        return 2; // 2 active references
      }
      return 0;
    },
    delete: async (assetId: string) => {
      callSequence.push(`deleteAsset:${assetId}`);
      deletedAssets.push(assetId);
    },
  };

  // 1. Dry run preview first
  const dryRunResult = await performRollback(mockClient, manifest, { dryRun: true });
  assert.equal(dryRunResult.dryRun, true);
  assert.equal(dryRunResult.restoredDocumentCount, 1);
  assert.equal(dryRunResult.deletedDocumentCount, 1);
  assert.equal(dryRunResult.deletedAssetCount, 1);
  assert.equal(dryRunResult.retainedReusedAssetCount, 1);
  assert.equal(deletedAssets.length, 0, 'Dry-run must not mutate or delete anything');

  // 2. Real rollback
  callSequence.length = 0;
  const realResult = await performRollback(mockClient, manifest, { dryRun: false });

  assert.equal(realResult.success, true);
  assert.equal(realResult.restoredDocumentCount, 1);
  assert.equal(realResult.deletedDocumentCount, 1);
  assert.equal(realResult.deletedAssetCount, 1);
  assert.equal(realResult.retainedAssetCount, 1);
  assert.equal(realResult.retainedReusedAssetCount, 1);

  // Check sequence: Document transaction commit happens BEFORE asset reference queries
  const txCommitIndex = callSequence.indexOf('tx.commit');
  const firstAssetFetchIndex = callSequence.findIndex((c) => c.startsWith('fetch:'));
  assert.ok(txCommitIndex !== -1, 'tx.commit must have occurred');
  assert.ok(firstAssetFetchIndex !== -1, 'Asset fetch must have occurred');
  assert.ok(
    txCommitIndex < firstAssetFetchIndex,
    'Document rollback must occur strictly BEFORE asset reference queries'
  );

  // Reused asset must NEVER be deleted
  assert.equal(deletedAssets.includes('image-reused'), false, 'Reused asset must never be deleted');

  // Unreferenced asset was deleted
  assert.equal(deletedAssets.includes('image-new-unreferenced'), true);

  // Referenced asset was NOT deleted
  assert.equal(deletedAssets.includes('image-new-referenced'), false);
  assert.ok(realResult.manualReviewAssets.some((m) => m.includes('image-new-referenced')));
});

// ---------------------------------------------------------------------------
// 12. Field Note Detail Query Verification (Item 2)
// ---------------------------------------------------------------------------
test('Post-Verification: Missing Field Note detail result fails post-verification', async () => {
  const preflight = runPreflight();
  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        // Return null/missing for one of the slugs
        if (params?.slug === 'soar-life-center-phase-one') {
          return null;
        }
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params?.slug);
        return note ? { ...note, slug: note.slug.current } : null;
      }
      if (query.includes('order(publicationDate desc)')) {
        return preflight.plannedFieldNotes.map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        return preflight.plannedGalleries.map((g) => ({ ...g, slug: g.slug.current }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    retryDelayMs: 0,
  });

  assert.equal(result.verified, false, 'Missing detail result must fail post-verification');
  const detailCheck = result.checks.find((c) => c.name.includes('Field Note Detail Queries'));
  assert.equal(detailCheck?.passed, false);
});

test('Post-Verification: Empty or mismatched body blocks in detail result fails post-verification', async () => {
  const preflight = runPreflight();
  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params?.slug);
        if (!note) return null;
        // Corrupt body blocks: empty body!
        return {
          _id: note._id,
          title: note.title,
          slug: note.slug.current,
          date: note.publicationDate,
          featuredImage: note.featuredImage ? { asset: { _id: note.featuredImage.asset._ref, metadata: { dimensions: { width: 800, height: 600 } } } } : undefined,
          featuredImageAlt: note.featuredImageAlt,
          body: [], // EMPTY BODY
        };
      }
      if (query.includes('order(publicationDate desc)')) {
        return preflight.plannedFieldNotes.map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        return preflight.plannedGalleries.map((g) => ({ ...g, slug: g.slug.current }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    retryDelayMs: 0,
  });

  assert.equal(result.verified, false, 'Empty detail body must fail post-verification');
  const detailCheck = result.checks.find((c) => c.name.includes('Field Note Detail Queries'));
  assert.equal(detailCheck?.passed, false);
});

test('Post-Verification: Mismatched featuredImageAlt fails post-verification', async () => {
  const preflight = runPreflight();
  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params?.slug);
        if (!note) return null;
        return {
          _id: note._id,
          title: note.title,
          slug: note.slug.current,
          date: note.publicationDate,
          featuredImage: note.featuredImage ? { asset: { _id: note.featuredImage.asset._ref, metadata: { dimensions: { width: 800, height: 600 } } } } : undefined,
          featuredImageAlt: 'Wrong alt text injected', // MISMATCH
          body: note.body,
        };
      }
      if (query.includes('order(publicationDate desc)')) {
        return preflight.plannedFieldNotes.map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        return preflight.plannedGalleries.map((g) => ({ ...g, slug: g.slug.current }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    retryDelayMs: 0,
  });

  assert.equal(result.verified, false, 'Mismatched featuredImageAlt must fail post-verification');
});

// ---------------------------------------------------------------------------
// 13. Read-After-Write Consistency (Item 3)
// ---------------------------------------------------------------------------
test('Read-After-Write: Transient replication delay recovers via bounded retry without infinite loop', async () => {
  const preflight = runPreflight();
  let queryAttempts = 0;
  let sleepCalls = 0;

  const mockSleep = async () => {
    sleepCalls++;
  };

  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        queryAttempts++;
        // Simulate replication lag: null on first attempt, valid on second attempt!
        if (queryAttempts === 1) {
          return null;
        }
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params?.slug);
        return note
          ? {
              _id: note._id,
              title: note.title,
              slug: note.slug.current,
              date: note.publicationDate,
              featuredImage: note.featuredImage ? { asset: { _id: note.featuredImage.asset._ref, metadata: { dimensions: { width: 800, height: 600 } } } } : undefined,
              featuredImageAlt: note.featuredImageAlt,
              body: note.body,
            }
          : null;
      }
      if (query.includes('order(publicationDate desc)')) {
        return preflight.plannedFieldNotes.map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        return preflight.plannedGalleries.map((g) => ({ ...g, slug: g.slug.current }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    maxRetries: 3,
    retryDelayMs: 1, // trigger sleepFn
    sleepFn: mockSleep,
  });

  assert.equal(result.verified, true, 'Transient replication lag must recover via bounded retry');
  assert.equal(sleepCalls, 1, 'Must have slept exactly once before recovering on attempt 2');
});

test('Read-After-Write: Content/schema mismatch does not retry and fails immediately', async () => {
  const preflight = runPreflight();
  let sleepCalls = 0;

  const mockSleep = async () => {
    sleepCalls++;
  };

  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        // Return a doc with wrong _id immediately
        return {
          _id: 'corrupt-wrong-id',
          slug: params?.slug,
          body: [],
        };
      }
      if (query.includes('order(publicationDate desc)')) {
        return preflight.plannedFieldNotes.map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        return preflight.plannedGalleries.map((g) => ({ ...g, slug: g.slug.current }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    maxRetries: 3,
    retryDelayMs: 10,
    sleepFn: mockSleep,
  });

  assert.equal(result.verified, false);
  assert.equal(sleepCalls, 0, 'Must NOT retry on schema/content mismatches');
});

// ---------------------------------------------------------------------------
// 14. Phase 3B Post-Write Verification Regression Tests
// ---------------------------------------------------------------------------
test('Regression: GALLERIES_QUERY projection matching succeeds when galleries return "id" instead of "slug"', async () => {
  const preflight = runPreflight();

  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params?.slug);
        return note
          ? {
              _id: note._id,
              title: note.title,
              slug: note.slug.current,
              date: note.publicationDate,
              featuredImage: note.featuredImage
                ? {
                    asset: {
                      _id: note.featuredImage.asset._ref,
                      metadata: { dimensions: { width: 800, height: 600 } },
                    },
                  }
                : undefined,
              featuredImageAlt: note.featuredImageAlt,
              body: note.body,
            }
          : null;
      }
      if (query.includes('order(publicationDate desc)')) {
        return preflight.plannedFieldNotes.map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        // Return EXACT projection shape produced by GALLERIES_QUERY ("id": slug.current, NO slug field)
        return preflight.plannedGalleries.map((g) => ({
          _id: g._id,
          id: g.slug.current, // "id": slug.current as projected by GALLERIES_QUERY
          title: g.title,
          description: g.description,
          date: g.publicationDate,
          displayOrder: g.displayOrder,
        }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    maxRetries: 3,
    retryDelayMs: 0,
  });

  const listingCheck = result.checks.find((c) =>
    c.name.includes('Frontend GROQ Listing Queries Return All 5 Field Notes and 6 Galleries')
  );

  assert.equal(result.verified, true, 'Verification must pass when GALLERIES_QUERY returns "id" projection');
  assert.equal(listingCheck?.passed, true, 'Listing check must pass');
  assert.equal(result.groqGalleryCount, 6, 'Must detect all 6 galleries');
  assert.equal(result.groqFieldNoteCount, 5, 'Must detect all 5 field notes');
});

test('Read-After-Write Listing Queries: Transient replication lag in listing queries recovers via bounded retry', async () => {
  const preflight = runPreflight();
  let fnListCalls = 0;
  let galleryListCalls = 0;
  let sleepCalls = 0;

  const mockSleep = async () => {
    sleepCalls++;
  };

  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params?.slug);
        return note
          ? {
              _id: note._id,
              title: note.title,
              slug: note.slug.current,
              date: note.publicationDate,
              featuredImage: note.featuredImage
                ? {
                    asset: {
                      _id: note.featuredImage.asset._ref,
                      metadata: { dimensions: { width: 800, height: 600 } },
                    },
                  }
                : undefined,
              featuredImageAlt: note.featuredImageAlt,
              body: note.body,
            }
          : null;
      }
      if (query.includes('order(publicationDate desc)')) {
        fnListCalls++;
        // Attempt 1: simulate transient index lag returning empty array
        if (fnListCalls === 1) {
          return [];
        }
        // Attempt 2: index caught up, return all 5 field notes
        return preflight.plannedFieldNotes.map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        galleryListCalls++;
        // Attempt 1: simulate transient index lag returning only 3 galleries
        if (galleryListCalls === 1) {
          return preflight.plannedGalleries.slice(0, 3).map((g) => ({
            _id: g._id,
            id: g.slug.current,
          }));
        }
        // Attempt 2: index caught up, return all 6 galleries
        return preflight.plannedGalleries.map((g) => ({
          _id: g._id,
          id: g.slug.current,
        }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    maxRetries: 3,
    retryDelayMs: 10,
    sleepFn: mockSleep,
  });

  const listingCheck = result.checks.find((c) =>
    c.name.includes('Frontend GROQ Listing Queries Return All 5 Field Notes and 6 Galleries')
  );

  assert.equal(result.verified, true, 'Transient replication lag must recover via bounded retry');
  assert.equal(listingCheck?.passed, true);
  assert.equal(sleepCalls, 2, 'Should sleep once for field notes lag and once for galleries lag');
  assert.equal(fnListCalls, 2, 'Field note listing query should succeed on attempt 2');
  assert.equal(galleryListCalls, 2, 'Gallery listing query should succeed on attempt 2');
});

test('Read-After-Write Listing Queries: Persistent missing listing items fail after bounded maxRetries without infinite loop', async () => {
  const preflight = runPreflight();
  let fnListCalls = 0;
  let sleepCalls = 0;

  const mockSleep = async () => {
    sleepCalls++;
  };

  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $expectedDocIds]')) {
        return [
          ...preflight.plannedFieldNotes,
          ...preflight.plannedGalleries,
          ...preflight.plannedPhotos,
        ];
      }
      if (query.includes('*[_id in $draftIds]')) return [];
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
        }));
      }
      if (query.includes('slug.current == $slug')) {
        const note = preflight.plannedFieldNotes.find((n) => n.slug.current === params?.slug);
        return note
          ? {
              _id: note._id,
              title: note.title,
              slug: note.slug.current,
              date: note.publicationDate,
              featuredImage: note.featuredImage
                ? {
                    asset: {
                      _id: note.featuredImage.asset._ref,
                      metadata: { dimensions: { width: 800, height: 600 } },
                    },
                  }
                : undefined,
              featuredImageAlt: note.featuredImageAlt,
              body: note.body,
            }
          : null;
      }
      if (query.includes('order(publicationDate desc)')) {
        fnListCalls++;
        // Always missing the last field note
        return preflight.plannedFieldNotes.slice(0, 4).map((n) => ({ ...n, slug: n.slug.current }));
      }
      if (query.includes('*[_type == "gallery"')) {
        return preflight.plannedGalleries.map((g) => ({
          _id: g._id,
          id: g.slug.current,
        }));
      }
      return [];
    },
  };

  const assetUploads = preflight.plannedAssets.map((a) => ({
    sourcePath: a.sourcePath,
    canonicalPath: a.canonicalPath,
    sha256: a.hash,
    sha1: a.sha1,
    targetAssetId: a.targetAssetId,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    existedBeforeRun: false,
    uploadTimestamp: new Date().toISOString(),
  }));

  const result = await verifyMigration({
    client: mockClient,
    plannedFieldNotes: preflight.plannedFieldNotes,
    plannedGalleries: preflight.plannedGalleries,
    plannedPhotos: preflight.plannedPhotos,
    plannedAssets: preflight.plannedAssets,
    assetUploads,
    maxRetries: 3,
    retryDelayMs: 10,
    sleepFn: mockSleep,
  });

  const listingCheck = result.checks.find((c) =>
    c.name.includes('Frontend GROQ Listing Queries Return All 5 Field Notes and 6 Galleries')
  );

  assert.equal(result.verified, false, 'Persistent missing listing items must fail verification');
  assert.equal(listingCheck?.passed, false);
  assert.equal(fnListCalls, 3, 'Must attempt exactly maxRetries (3) times');
  assert.equal(sleepCalls, 2, 'Must sleep exactly maxRetries - 1 (2) times before final attempt');
});

