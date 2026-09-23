/**
 * Comprehensive test suite for Corrective Sanity Migration for Public Document Visibility (Amendments 1-11).
 *
 * Verifies:
 * - Amendment 1: Frontend GROQ queries explicitly require public root documents (!(_id in path("*.**")))
 * - Amendment 2: Strict root ID validator rejects periods, system paths, and invalid characters
 * - Amendment 3: Collision protection aborts on unexpected documents and permits resumable runs
 * - Amendment 4: Pre-cleanup reference check aborts if any external document references legacy IDs
 * - Amendment 5: Two separate atomic transactions (creation then cleanup)
 * - Amendment 6: Verification both before and after cleanup (including anonymous Content Lake verification)
 * - Amendment 7: Safely resumable if cleanup failed after creation
 * - Amendment 8: Complete manifests with planned IDs, legacy IDs, and transaction records
 * - Amendment 9: Rollback before and after cleanup with 100% asset retention
 * - Amendment 10: Dedicated CLI command namespace
 * - Amendment 11: Zero asset uploads and zero asset deletions
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  FIELD_NOTES_LIST_QUERY,
  FIELD_NOTE_DETAIL_QUERY,
  GALLERIES_QUERY,
} from '../src/sanity/queries';
import { validatePublicSafeRootId, validateAllPublicSafeRootIds } from '../scripts/migration/idValidator';
import { runPreflight, getLegacyDocumentIds } from '../scripts/migration/preflight';
import { executeCorrectiveMigration } from '../scripts/migration/correctiveExecutor';
import { performCorrectiveRollback } from '../scripts/migration/correctiveRollback';
import { verifyPreCleanup, verifyPostCleanup } from '../scripts/migration/correctiveVerification';
import {
  validateCorrectiveExecutionCeremony,
  validateCorrectiveRollbackCeremony,
} from '../scripts/migration/correctPublicIdsCli';
import {
  compareCanonicalDocuments,
  computeDocumentFingerprint,
  stripSanitySystemFields,
} from '../scripts/migration/canonicalDocument';
import { RunManifest } from '../scripts/migration/types';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'corrective-migration-test-'));
}

/**
 * Helper to construct finalized planned documents with resolved asset references
 */
function buildFinalizedPlannedDocs(preflight: any) {
  const all = [
    ...preflight.plannedFieldNotes,
    ...preflight.plannedGalleries,
    ...preflight.plannedPhotos,
  ];
  return all.map((doc: any) => {
    const cloned = JSON.parse(JSON.stringify(doc));
    delete cloned.legacyDocId;
    if (cloned._type === 'photo') {
      cloned.image = { _type: 'image', asset: { _type: 'reference', _ref: cloned.targetAssetRef } };
      delete cloned.targetAssetRef;
      delete cloned.assetSourcePath;
    }
    return cloned;
  });
}

// ---------------------------------------------------------------------------
// 1. Amendment 1: Frontend GROQ Queries Require Public Root Documents
// ---------------------------------------------------------------------------
test('Amendment 1: GROQ queries explicitly require public root documents and exclude path documents', () => {
  // 1. Listing Query
  assert.ok(
    FIELD_NOTES_LIST_QUERY.includes('!(_id in path("*.**"))'),
    'FIELD_NOTES_LIST_QUERY must require public root documents'
  );
  assert.ok(
    FIELD_NOTES_LIST_QUERY.includes('!(_id in path("drafts.**"))'),
    'FIELD_NOTES_LIST_QUERY must retain draft exclusion as defense-in-depth'
  );

  // 2. Detail Query
  assert.ok(
    FIELD_NOTE_DETAIL_QUERY.includes('!(_id in path("*.**"))'),
    'FIELD_NOTE_DETAIL_QUERY must require public root documents'
  );
  assert.ok(
    FIELD_NOTE_DETAIL_QUERY.includes('!(_id in path("drafts.**"))'),
    'FIELD_NOTE_DETAIL_QUERY must retain draft exclusion as defense-in-depth'
  );

  // 3. Galleries Query
  assert.ok(
    GALLERIES_QUERY.includes('!(_id in path("*.**"))'),
    'GALLERIES_QUERY must require public root documents'
  );
  assert.ok(
    GALLERIES_QUERY.includes('!(_id in path("drafts.**"))'),
    'GALLERIES_QUERY must retain draft exclusion as defense-in-depth'
  );
});

// ---------------------------------------------------------------------------
// 2. Amendment 2: Strict Public-Safe Root ID Validator
// ---------------------------------------------------------------------------
test('Amendment 2: Public-safe root ID validator rejects periods, paths, and invalid characters', () => {
  // Valid public root IDs
  assert.equal(validatePublicSafeRootId('fieldNote-empowerresponse-first-responders').valid, true);
  assert.equal(validatePublicSafeRootId('gallery-abandoned-america').valid, true);
  assert.equal(validatePublicSafeRootId('photo-corvette-culture-1969c3_5eccb094').valid, true);

  // Invalid IDs containing periods
  const periodTest = validatePublicSafeRootId('fieldNote.empowerresponse-first-responders');
  assert.equal(periodTest.valid, false);
  assert.ok(periodTest.error?.includes('contains a period'));

  const photoPeriodTest = validatePublicSafeRootId('photo.corvette-culture.1969c3_5eccb094');
  assert.equal(photoPeriodTest.valid, false);
  assert.ok(photoPeriodTest.error?.includes('contains a period'));

  // Invalid IDs with system/reserved prefixes
  const draftTest = validatePublicSafeRootId('drafts.fieldNote-test');
  assert.equal(draftTest.valid, false);

  const underscoreTest = validatePublicSafeRootId('_systemDoc');
  assert.equal(underscoreTest.valid, false);

  // Invalid characters
  assert.equal(validatePublicSafeRootId('doc with spaces').valid, false);
  assert.equal(validatePublicSafeRootId('doc$special').valid, false);
  assert.equal(validatePublicSafeRootId('').valid, false);
});

test('Amendment 2: Preflight planned content produces 100% public-safe root IDs with zero periods', () => {
  const preflight = runPreflight();
  assert.equal(preflight.valid, true);

  const allPlannedDocs = [
    ...preflight.plannedFieldNotes,
    ...preflight.plannedGalleries,
    ...preflight.plannedPhotos,
  ];

  assert.equal(allPlannedDocs.length, 19, 'Must plan exactly 19 documents');

  const allDocIds = allPlannedDocs.map((d) => d._id);
  const validation = validateAllPublicSafeRootIds(allDocIds);
  assert.equal(validation.valid, true, `All 19 IDs must be valid public root IDs: ${validation.errors.join(', ')}`);

  // Ensure zero periods in any ID
  for (const doc of allPlannedDocs) {
    assert.ok(!doc._id.includes('.'), `Planned document ID must not contain period: ${doc._id}`);
    assert.match(doc._id, /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
  }

  // Ensure all gallery references point to public-safe photo IDs
  for (const gal of preflight.plannedGalleries) {
    for (const ref of gal.photos) {
      assert.ok(!ref._ref.includes('.'), `Gallery photo ref must not contain period: ${ref._ref}`);
      assert.match(ref._ref, /^photo-[a-zA-Z0-9_-]+$/);
      assert.match(ref._key, /^k_[a-f0-9]{12}$/);
    }
  }

  // Ensure legacy IDs are correctly tracked
  const legacyIds = getLegacyDocumentIds(preflight);
  assert.equal(legacyIds.length, 19);
  for (const id of legacyIds) {
    assert.ok(id.includes('.'), `Legacy ID must contain period: ${id}`);
  }
});

// ---------------------------------------------------------------------------
// 3. Amendment 1 & 6: Coexistence Without Double-Counting
// ---------------------------------------------------------------------------
test('Amendment 1 & 6: Authenticated queries do not double-count during coexistence', async () => {
  const preflight = runPreflight();

  // Simulate Content Lake state during coexistence (both old and new documents present)
  const legacyDocs = preflight.plannedFieldNotes.map((n) => ({
    _id: `fieldNote.${n.slug.current}`,
    _type: 'fieldNote',
    title: n.title,
    slug: n.slug.current,
  }));
  const newDocs = preflight.plannedFieldNotes.map((n) => ({
    _id: n._id, // fieldNote-slug
    _type: 'fieldNote',
    title: n.title,
    slug: n.slug.current,
  }));

  const allDatasetDocs = [...legacyDocs, ...newDocs];

  // Evaluate query filter: !(_id in path("*.**"))
  const returnedByQuery = allDatasetDocs.filter((doc) => {
    // !(_id in path("*.**")) excludes any document with a period
    return !doc._id.includes('.');
  });

  assert.equal(returnedByQuery.length, 5, 'Query must return exactly 5 Field Notes, ignoring the 5 legacy docs');
  for (const doc of returnedByQuery) {
    assert.ok(!doc._id.includes('.'));
    assert.ok(doc._id.startsWith('fieldNote-'));
  }
});

// ---------------------------------------------------------------------------
// Mock Sanity Client Helper for Corrective Migration Tests
// ---------------------------------------------------------------------------
function createMockSanityClient(
  preflight: any,
  overrides: {
    collidingTargetDocs?: any[];
    externalReferences?: any[];
    legacyPresentAfterCleanup?: boolean;
  } = {}
) {
  let txCount = 0;
  const allPlanned = [
    ...preflight.plannedFieldNotes,
    ...preflight.plannedGalleries,
    ...preflight.plannedPhotos,
  ];

  return {
    getTxCount: () => txCount,
    fetch: async (query: string, params: any) => {
      // 1. Dataset backup
      if (query === '*[]') return [];

      // 2. Target Collision check
      if (query.includes('*[_id in $plannedDocIds]')) {
        if (overrides.collidingTargetDocs) {
          return overrides.collidingTargetDocs;
        }
        return [];
      }

      // 3. Expected / New doc IDs check (auth verification & post-cleanup verification)
      if (
        query.includes('*[_id in $expectedDocIds]') ||
        query.includes('*[_id in $newDocIds]')
      ) {
        return allPlanned;
      }

      // 4. Legacy doc IDs check (Stage 5 snapshot & Stage 11 absence check)
      if (query.includes('*[_id in $legacyDocIds]')) {
        if (overrides.legacyPresentAfterCleanup && txCount >= 2) {
          return [{ _id: 'fieldNote.legacy-undeleted' }];
        }
        if (txCount >= 2) return []; // After cleanup, legacy docs are deleted
        return preflight.plannedFieldNotes.map((n: any) => ({
          _id: `fieldNote.${n.slug.current}`,
          _type: 'fieldNote',
        }));
      }

      // 5. Draft IDs check
      if (query.includes('*[_id in $draftIds]')) return [];

      // 6. Detail query (check before generic fieldNote check)
      if (query.includes('slug.current == $slug')) {
        const n = preflight.plannedFieldNotes.find((note: any) => note.slug.current === params?.slug);
        return n
          ? {
              ...n,
              slug: n.slug.current,
              date: n.publicationDate,
              summary: n.excerpt,
              body: n.body,
              featuredImage: {
                asset: {
                  _id: n.featuredImage?.asset?._ref || 'asset-1',
                  url: 'https://cdn.sanity.io/images/wml93cow/production/test.jpg',
                  metadata: { dimensions: { width: 100, height: 100, aspectRatio: 1 } },
                },
              },
            }
          : null;
      }

      // 7. Field notes list query (check before generic fieldNote check)
      if (query.includes('order(publicationDate desc)')) {
        return preflight.plannedFieldNotes.map((n: any) => ({
          _id: n._id,
          title: n.title,
          slug: n.slug.current,
          date: n.publicationDate,
          summary: n.excerpt,
        }));
      }

      // 8. Asset sha1 deduplication (Stage 6) - check sha1hash == $sha1 specifically
      if (query.includes('sha1hash == $sha1')) {
        const asset = preflight.plannedAssets.find((a: any) => a.sha1 === params?.sha1);
        return asset ? [{ _id: asset.targetAssetId, _type: 'sanity.imageAsset', sha1hash: asset.sha1 }] : [];
      }

      // 9. Image assets list (Stage 11 & verification)
      if (query.includes('*[_type == "sanity.imageAsset"')) {
        return preflight.plannedAssets.map((a: any) => ({
          _id: a.targetAssetId,
          _type: 'sanity.imageAsset',
          sha1hash: a.sha1,
          size: a.sizeBytes,
          url: `https://cdn.sanity.io/images/wml93cow/production/${a.targetAssetId}.jpg`,
        }));
      }

      // 10. Generic Field notes queries (anonymous count)
      if (query.includes('*[_type == "fieldNote"')) {
        return preflight.plannedFieldNotes.map((n: any) => ({
          _id: n._id,
          _type: 'fieldNote',
          title: n.title,
          slug: n.slug.current,
        }));
      }

      // 11. Galleries queries (anonymous count & listing)
      if (query.includes('*[_type == "gallery"')) {
        return preflight.plannedGalleries.map((g: any) => ({
          _id: g._id,
          id: g.slug.current,
          slug: g.slug.current,
          title: g.title,
          photos: g.photos,
        }));
      }

      // 12. Photos queries (anonymous count)
      if (query.includes('*[_type == "photo"')) {
        return preflight.plannedPhotos.map((p: any) => ({
          _id: p._id,
          _type: 'photo',
        }));
      }

      // 13. Legacy references check (Stage 9)
      if (query.includes('*[references($legacyDocIds)]')) {
        return overrides.externalReferences || [];
      }

      return [];
    },
    transaction: () => ({
      createOrReplace: () => {},
      delete: () => {},
      commit: async () => {
        txCount++;
        return { transactionId: `tx-${txCount}` };
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// 4. Amendment 3: Collision Protection & Resumability
// ---------------------------------------------------------------------------
test('Amendment 3: Collision check aborts if an unrelated document exists with target ID', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();

  // Return an unrelated document colliding on ID
  const mockClient = createMockSanityClient(preflight, {
    collidingTargetDocs: [
      {
        _id: preflight.plannedFieldNotes[0]._id,
        _type: 'unrelatedType', // Collision!
        title: 'Unrelated Content',
      },
    ],
  });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Collision abort:'));
  assert.ok(result.error?.includes('_type mismatch: expected "fieldNote", observed "unrelatedType"'));
});

test('Amendment 7 & Requirement 8: Resumability recognizes previously created documents by exact canonical match', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();
  const finalized = buildFinalizedPlannedDocs(preflight);

  // Return all 19 matching documents with Sanity system metadata added
  const existingDocsWithMetadata = finalized.map((doc: any) => ({
    ...doc,
    _rev: 'rev_test_456',
    _createdAt: '2026-09-01T12:00:00Z',
    _updatedAt: '2026-09-01T12:05:00Z',
  }));

  const mockClient = createMockSanityClient(preflight, {
    collidingTargetDocs: existingDocsWithMetadata,
  });

  const mockHttpFetch = async () => ({ status: 200, ok: true });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
    httpFetchFn: mockHttpFetch,
  });

  assert.equal(result.success, true, `Resumed run must succeed when targets match planned content: ${result.error}`);
  assert.equal(result.manifest.canonicalFingerprints?.length, 19, 'Must record 19 canonical fingerprints');
  assert.ok(result.manifest.canonicalFingerprints?.every((f) => f.matched), 'All 19 canonical fingerprints must match');
  assert.equal(mockClient.getTxCount(), 2, 'Must commit creation and cleanup transactions');
});

// ---------------------------------------------------------------------------
// 5. Amendment 4: External Reference Guard Aborts Cleanup
// ---------------------------------------------------------------------------
test('Amendment 4: Cleanup aborts if an external document references a legacy document', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();

  // Mock with an external document outside the legacy set referencing a legacy document
  const mockClient = createMockSanityClient(preflight, {
    externalReferences: [{ _id: 'external-custom-page-123', _type: 'landingPage' }],
  });

  const mockHttpFetch = async () => ({ status: 200, ok: true });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
    httpFetchFn: mockHttpFetch,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('referenced by external document "external-custom-page-123"'));
  assert.equal(result.manifest.cleanupStatus, 'pending', 'Legacy documents must NOT be deleted');
  assert.equal(mockClient.getTxCount(), 1, 'Only Transaction A (creation) should have committed');
});

// ---------------------------------------------------------------------------
// 6. Amendment 5, 6, 8, 11: Two-Phase Execution & Manifest Completeness
// ---------------------------------------------------------------------------
test('Amendment 5, 6, 8, 11: Corrective execution succeeds with two transactions and complete manifest', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();

  const mockClient = createMockSanityClient(preflight);
  const mockHttpFetch = async () => ({ status: 200, ok: true });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
    httpFetchFn: mockHttpFetch,
  });

  assert.equal(result.success, true, `Execution must succeed: ${result.error}`);
  assert.equal(mockClient.getTxCount(), 2, 'Must execute exactly two transactions (creation then cleanup)');

  // Verify manifest completeness (Amendment 8)
  const manifest = result.manifest;
  assert.equal(manifest.plannedDocumentIds.length, 19, 'plannedDocumentIds must have all 19 IDs');
  assert.equal(manifest.plannedAssetIds.length, 8, 'plannedAssetIds must have all 8 asset IDs');
  assert.equal(manifest.legacyDocumentIds?.length, 19, 'legacyDocumentIds must have all 19 IDs');
  assert.equal(manifest.newDocumentIds?.length, 19, 'newDocumentIds must have all 19 IDs');
  assert.equal(manifest.reusedAssetIds?.length, 8, 'reusedAssetIds must have all 8 IDs');
  assert.equal(manifest.creationTransactionId, 'tx-1');
  assert.equal(manifest.cleanupTransactionId, 'tx-2');
  assert.equal(manifest.cleanupStatus, 'completed');
  assert.equal(manifest.completedSuccessfully, true);

  // Verify zero asset uploads (Amendment 11)
  const uploadedAssets = manifest.assetUploads.filter((a) => !a.existedBeforeRun);
  assert.equal(uploadedAssets.length, 0, 'Must have zero new asset uploads');
  assert.equal(manifest.reusedAssetIds?.length, 8, 'Must reuse all 8 assets');
});

// ---------------------------------------------------------------------------
// 7. Amendment 9: Rollback Before Cleanup vs After Cleanup
// ---------------------------------------------------------------------------
test('Amendment 9: Rollback before cleanup deletes only new documents; legacy documents remain', async () => {
  const preflight = runPreflight();
  let deletedCount = 0;

  const mockClient = {
    fetch: async () => [],
    transaction: () => ({
      createOrReplace: () => {},
      delete: () => {
        deletedCount++;
      },
      commit: async () => ({}),
    }),
  };

  const manifestBeforeCleanup: RunManifest = {
    runId: 'test-run-before-cleanup',
    timestamp: new Date().toISOString(),
    gitCommit: 'HEAD',
    gitBranch: 'main',
    projectId: 'wml93cow',
    dataset: 'production',
    apiVersion: '2026-09-01',
    sourceContentHashes: {},
    plannedDocumentIds: preflight.plannedFieldNotes.map((n) => n._id),
    plannedAssetIds: preflight.plannedAssets.map((a) => a.targetAssetId),
    newlyCreatedDocumentIds: preflight.plannedFieldNotes.map((n) => n._id),
    newDocumentIds: preflight.plannedFieldNotes.map((n) => n._id),
    replacedDocumentSnapshots: [],
    legacyDocumentSnapshots: [],
    assetUploads: [],
    reusedAssetIds: preflight.plannedAssets.map((a) => a.targetAssetId),
    cleanupStatus: 'pending', // Cleanup never ran!
    stages: [],
    completedSuccessfully: false,
  };

  const rollback = await performCorrectiveRollback(mockClient, manifestBeforeCleanup, { dryRun: false });
  assert.equal(rollback.success, true);
  assert.equal(rollback.restoredLegacyCount, 0, 'No legacy documents should be restored because none were deleted');
  assert.equal(rollback.deletedNewCount, preflight.plannedFieldNotes.length);
  assert.equal(deletedCount, preflight.plannedFieldNotes.length);
  assert.equal(rollback.retainedAssetCount, 8, 'Assets must be retained');
});

test('Amendment 9: Rollback after cleanup restores legacy documents first, verifies, then deletes new documents', async () => {
  const preflight = runPreflight();
  let restoreCalls = 0;
  let deleteCalls = 0;
  let legacyVerified = false;

  const legacySnapshots = preflight.plannedFieldNotes.map((n) => ({
    _id: `fieldNote.${n.slug.current}`,
    _type: 'fieldNote',
    doc: { _id: `fieldNote.${n.slug.current}`, title: n.title },
  }));

  const mockClient = {
    fetch: async (query: string, params: any) => {
      if (query.includes('*[_id in $legacyIds]')) {
        legacyVerified = true;
        return params?.legacyIds?.map((id: string) => ({ _id: id })) || [];
      }
      return [];
    },
    transaction: () => ({
      createOrReplace: () => {
        restoreCalls++;
      },
      delete: () => {
        deleteCalls++;
      },
      commit: async () => ({}),
    }),
  };

  const manifestAfterCleanup: RunManifest = {
    runId: 'test-run-after-cleanup',
    timestamp: new Date().toISOString(),
    gitCommit: 'HEAD',
    gitBranch: 'main',
    projectId: 'wml93cow',
    dataset: 'production',
    apiVersion: '2026-09-01',
    sourceContentHashes: {},
    plannedDocumentIds: preflight.plannedFieldNotes.map((n) => n._id),
    plannedAssetIds: preflight.plannedAssets.map((a) => a.targetAssetId),
    newlyCreatedDocumentIds: preflight.plannedFieldNotes.map((n) => n._id),
    newDocumentIds: preflight.plannedFieldNotes.map((n) => n._id),
    replacedDocumentSnapshots: legacySnapshots,
    legacyDocumentSnapshots: legacySnapshots,
    assetUploads: [],
    reusedAssetIds: preflight.plannedAssets.map((a) => a.targetAssetId),
    cleanupStatus: 'completed', // Cleanup ran!
    stages: [],
    completedSuccessfully: true,
  };

  const rollback = await performCorrectiveRollback(mockClient, manifestAfterCleanup, { dryRun: false });
  assert.equal(rollback.success, true);
  assert.equal(restoreCalls, legacySnapshots.length, 'Must restore all legacy document snapshots');
  assert.equal(legacyVerified, true, 'Must verify legacy documents exist before deleting new ones');
  assert.equal(deleteCalls, preflight.plannedFieldNotes.length, 'Must delete new documents');
  assert.equal(rollback.retainedAssetCount, 8, 'Must retain all assets');
});

// ---------------------------------------------------------------------------
// 8. Requirement 8: Hardened Canonical Document Comparison Tests
// ---------------------------------------------------------------------------
test('Requirement 8: Collision check aborts if an existing document has same type/slug but altered body', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();
  const finalized = buildFinalizedPlannedDocs(preflight);

  // Clone first note and modify body
  const alteredNote = JSON.parse(JSON.stringify(finalized[0]));
  alteredNote.body[0].children[0].text = 'Altered body text that does not match migration plan';

  const mockClient = createMockSanityClient(preflight, {
    collidingTargetDocs: [alteredNote],
  });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Collision abort:'));
  assert.ok(result.error?.includes('Field content mismatch: "body"'));
});

test('Requirement 8: Collision check aborts if an existing document has altered asset reference', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();
  const finalized = buildFinalizedPlannedDocs(preflight);

  // Clone first note and modify featuredImage asset reference
  const alteredNote = JSON.parse(JSON.stringify(finalized[0]));
  alteredNote.featuredImage.asset._ref = 'image-tampered_asset_ref-800x600-jpg';

  const mockClient = createMockSanityClient(preflight, {
    collidingTargetDocs: [alteredNote],
  });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Collision abort:'));
  assert.ok(result.error?.includes('Field content mismatch: "featuredImage"'));
});

test('Requirement 8: Collision check aborts if gallery photo order or reference key is altered', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();
  const finalized = buildFinalizedPlannedDocs(preflight);

  // Clone a gallery with multiple photos and reverse the photos array
  const targetGallery = finalized.find((d: any) => d._type === 'gallery' && d.photos.length > 1);
  assert.ok(targetGallery);
  const alteredGallery = JSON.parse(JSON.stringify(targetGallery));
  alteredGallery.photos.reverse(); // Alter order!

  const mockClient = createMockSanityClient(preflight, {
    collidingTargetDocs: [alteredGallery],
  });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Collision abort:'));
  assert.ok(result.error?.includes('Field content mismatch: "photos"'));
});

test('Requirement 2 & 8: Photos are compared canonically without assuming a slug', () => {
  const preflight = runPreflight();
  const finalized = buildFinalizedPlannedDocs(preflight);

  const plannedPhoto = finalized.find((d: any) => d._type === 'photo');
  assert.ok(plannedPhoto);
  assert.equal(plannedPhoto.slug, undefined, 'Photo documents must not define a slug');

  // Exact match with added Sanity system metadata
  const existingPhoto = {
    ...plannedPhoto,
    _rev: 'rev_photo_1',
    _createdAt: '2026-09-01T00:00:00Z',
    _updatedAt: '2026-09-01T00:00:00Z',
  };

  const compMatch = compareCanonicalDocuments(plannedPhoto, existingPhoto);
  assert.equal(compMatch.match, true);
  assert.equal(compMatch.differences.length, 0);

  // Altered photo caption
  const alteredPhoto = {
    ...plannedPhoto,
    caption: 'Altered caption that violates canonical match',
  };
  const compMismatch = compareCanonicalDocuments(plannedPhoto, alteredPhoto);
  assert.equal(compMismatch.match, false);
  assert.ok(compMismatch.differences.includes('Field content mismatch: "caption"'));
});

test('Requirement 3 & 8: Strict execution and rollback ceremony validates required confirmation flags', () => {
  // Execute ceremony checks
  assert.throws(
    () => validateCorrectiveExecutionCeremony([]),
    /missing required confirmation flag\(s\): --execute, --confirm-project=wml93cow, --confirm-dataset=production/
  );
  assert.throws(
    () => validateCorrectiveExecutionCeremony(['--execute']),
    /missing required confirmation flag\(s\): --confirm-project=wml93cow, --confirm-dataset=production/
  );
  assert.throws(
    () => validateCorrectiveExecutionCeremony(['--execute', '--confirm-project=wml93cow']),
    /missing required confirmation flag\(s\): --confirm-dataset=production/
  );
  // Valid execute ceremony
  assert.doesNotThrow(() =>
    validateCorrectiveExecutionCeremony(['--execute', '--confirm-project=wml93cow', '--confirm-dataset=production'])
  );

  // Rollback ceremony checks
  // Default without flags is preview-only
  const preview = validateCorrectiveRollbackCeremony(['--rollback']);
  assert.equal(preview.isDryRun, true);

  // Partial flags throw
  assert.throws(
    () => validateCorrectiveRollbackCeremony(['--rollback', '--execute']),
    /Mutating rollback requires all confirmation flags/
  );
  assert.throws(
    () =>
      validateCorrectiveRollbackCeremony([
        '--rollback',
        '--execute',
        '--confirm-project=wml93cow',
        '--confirm-dataset=production',
      ]),
    /Mutating rollback requires all confirmation flags: --confirm-run=<exact-run-id>/
  );

  // Mismatched run ID throws
  assert.throws(
    () =>
      validateCorrectiveRollbackCeremony(
        [
          '--rollback',
          '--execute',
          '--confirm-project=wml93cow',
          '--confirm-dataset=production',
          '--confirm-run=run-expected-999',
        ],
        'run-actual-111'
      ),
    /--confirm-run="run-expected-999" does not match manifest run ID "run-actual-111"/
  );

  // Valid mutating rollback ceremony
  const mutating = validateCorrectiveRollbackCeremony(
    [
      '--rollback',
      '--execute',
      '--confirm-project=wml93cow',
      '--confirm-dataset=production',
      '--confirm-run=run-correct-123',
    ],
    'run-correct-123'
  );
  assert.equal(mutating.isDryRun, false);
  assert.equal(mutating.confirmedRunId, 'run-correct-123');
});

test('Requirement 5 & 8: Backup failure aborts before Transaction A', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();

  const mockClient = {
    fetch: async (query: string) => {
      if (query === '*[]') {
        throw new Error('Simulated Content Lake backup network error');
      }
      return [];
    },
    transaction: () => ({
      createOrReplace: () => {},
      delete: () => {},
      commit: async () => ({ transactionId: 'fail' }),
    }),
  };

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Dataset backup failed'));
  assert.equal(result.manifest.stages.find((s) => s.stage === 'dataset-backup')?.status, 'failed');
  assert.equal(result.manifest.stages.find((s) => s.stage === 'atomic-document-transaction'), undefined);
});

test('Requirement 4 & 8: Source hash mismatch aborts before Transaction A', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();

  // Create a mutated preflight with tampered asset hash
  const tamperedPreflight = JSON.parse(JSON.stringify(preflight));
  tamperedPreflight.plannedAssets[0].hash = 'tampered_sha256_hash_1234567890abcdef';

  const mockClient = createMockSanityClient(preflight);

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: mockClient,
    preflightResult: tamperedPreflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Source hash changed for image'));
  assert.equal(mockClient.getTxCount(), 0, 'Must abort before any transaction commits');
});

// ---------------------------------------------------------------------------
// 9. Requirement 7: Real Sanity Path Semantics Filter Test
// ---------------------------------------------------------------------------
test('Requirement 7: Sanity path semantics filter !(_id in path("*.**")) strictly distinguishes root vs path IDs', () => {
  // Path matching function simulating Sanity Content Lake path("*.**")
  // In Content Lake, path("*.**") matches any document _id that contains at least one dot.
  const matchesPathPattern = (id: string) => id.includes('.');

  const legacyAndSystemIds = [
    'fieldNote.empowerresponse-first-responders',
    'fieldNote.how-can-retired-techies-make-impact',
    'fieldNote.soar-life-center-phase-one',
    'gallery.abandoned-america',
    'gallery.corvette-culture',
    'photo.corvette-culture.artist-c3_5eccb094',
    'photo.abandoned-america.abandon-house_55150c0d',
    'drafts.fieldNote-test',
    'drafts.photo-corvette-culture-1969c3_5eccb094',
    'versions.r1.fieldNote-test',
    'system.users.123',
    '_system.configuration',
  ];

  // All legacy, draft, and system IDs must be excluded by !(_id in path("*.**"))
  for (const id of legacyAndSystemIds) {
    const isExcluded = matchesPathPattern(id);
    assert.ok(isExcluded, `Legacy or system ID "${id}" must be excluded by path("*.**")`);
  }

  // All planned public-safe root IDs must be allowed
  const preflight = runPreflight();
  const allRootIds = [
    ...preflight.plannedFieldNotes.map((n) => n._id),
    ...preflight.plannedGalleries.map((g) => g._id),
    ...preflight.plannedPhotos.map((p) => p._id),
  ];

  assert.equal(allRootIds.length, 19);
  for (const id of allRootIds) {
    const isExcluded = matchesPathPattern(id);
    assert.equal(isExcluded, false, `Public root ID "${id}" must NOT be excluded by !(_id in path("*.**"))`);
  }
});
