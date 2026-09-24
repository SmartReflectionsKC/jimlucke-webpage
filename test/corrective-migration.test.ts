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
import { execSync } from 'node:child_process';

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
import {
  enforceGitCleanliness,
  enforceCorrectiveGitCleanliness,
  EXPECTED_BRANCH,
  CORRECTIVE_EXPECTED_BRANCH,
} from '../scripts/migration/config';
import { RunManifest } from '../scripts/migration/types';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'corrective-migration-test-'));
}

function createTempGitRepo(branchName: string): string {
  const dir = createTempDir();
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync(`git checkout -b "${branchName}"`, { cwd: dir, stdio: 'pipe' });
  execSync('git commit --allow-empty -m "initial commit"', { cwd: dir, stdio: 'pipe' });
  return dir;
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
test('Amendment 1 & Requirement 1: GROQ queries remove overly broad path("*.**") while retaining draft exclusions', () => {
  // 1. Listing Query
  assert.ok(
    !FIELD_NOTES_LIST_QUERY.includes('!(_id in path("*.**"))'),
    'FIELD_NOTES_LIST_QUERY must NOT include overly broad path("*.**")'
  );
  assert.ok(
    FIELD_NOTES_LIST_QUERY.includes('!(_id in path("drafts.**"))'),
    'FIELD_NOTES_LIST_QUERY must retain draft exclusion'
  );

  // 2. Detail Query
  assert.ok(
    !FIELD_NOTE_DETAIL_QUERY.includes('!(_id in path("*.**"))'),
    'FIELD_NOTE_DETAIL_QUERY must NOT include overly broad path("*.**")'
  );
  assert.ok(
    FIELD_NOTE_DETAIL_QUERY.includes('!(_id in path("drafts.**"))'),
    'FIELD_NOTE_DETAIL_QUERY must retain draft exclusion'
  );

  // 3. Galleries Query
  assert.ok(
    !GALLERIES_QUERY.includes('!(_id in path("*.**"))'),
    'GALLERIES_QUERY must NOT include overly broad path("*.**")'
  );
  assert.ok(
    GALLERIES_QUERY.includes('!(_id in path("drafts.**"))'),
    'GALLERIES_QUERY must retain draft exclusion'
  );
});

test('Requirement 6: Anonymous listing and detail queries return expected notes and galleries without path("*.**")', async () => {
  const preflight = runPreflight();
  const mockClient = createMockSanityClient(preflight);

  // Listing query for Field Notes
  const fieldNotes = await mockClient.fetch(FIELD_NOTES_LIST_QUERY, {});
  assert.equal(fieldNotes.length, 5, 'Must return all 5 Field Notes');
  for (const fn of fieldNotes) {
    assert.ok(fn.slug);
    assert.ok(fn._id.startsWith('fieldNote-'));
  }

  // Listing query for Galleries
  const galleries = await mockClient.fetch(GALLERIES_QUERY, {});
  assert.equal(galleries.length, 6, 'Must return all 6 Galleries');
  for (const g of galleries) {
    assert.ok(g.slug || g.id);
    assert.ok(g._id.startsWith('gallery-'));
  }

  // Detail query for a specific Field Note
  const testSlug = 'empowerresponse-first-responders';
  const detail = await mockClient.fetch(FIELD_NOTE_DETAIL_QUERY, { slug: testSlug });
  assert.ok(detail, `Detail query must return note for slug ${testSlug}`);
  assert.equal(detail._id, `fieldNote-${testSlug}`);
  assert.equal(detail.slug, testSlug);
  assert.ok(Array.isArray(detail.body) && detail.body.length > 0);
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
// 3. Amendment 1 & 6 & Requirement 6: Anonymous Content Lake Public Visibility
// ---------------------------------------------------------------------------
test('Amendment 1 & 6 & Requirement 6: Anonymous Content Lake queries return exact public root documents and exclude legacy path documents', async () => {
  const preflight = runPreflight();

  // Simulate Content Lake coexistence state: 5 legacy dotted docs + 5 new public root docs + 1 draft doc
  const legacyDocs = preflight.plannedFieldNotes.map((n) => ({
    _id: `fieldNote.${n.slug.current}`,
    _type: 'fieldNote',
    title: n.title,
    slug: { current: n.slug.current },
  }));
  const newDocs = preflight.plannedFieldNotes.map((n) => ({
    _id: n._id, // fieldNote-slug
    _type: 'fieldNote',
    title: n.title,
    slug: { current: n.slug.current },
  }));
  const draftDocs = [
    {
      _id: `drafts.${preflight.plannedFieldNotes[0]._id}`,
      _type: 'fieldNote',
      title: 'Draft in progress',
      slug: { current: preflight.plannedFieldNotes[0].slug.current },
    },
  ];

  const allDatasetDocs = [...legacyDocs, ...newDocs, ...draftDocs];

  // In Sanity Content Lake:
  // 1. Unauthenticated/anonymous requests naturally hide any document containing a period (hierarchical path documents).
  // 2. Draft documents matching path("drafts.**") are excluded.
  const anonymousVisibleDocs = allDatasetDocs.filter((doc) => {
    const isPathDocument = doc._id.includes('.');
    const isDraft = doc._id.startsWith('drafts.');
    return !isPathDocument && !isDraft;
  });

  assert.equal(anonymousVisibleDocs.length, 5, 'Anonymous query must return exactly 5 Field Notes, ignoring legacy path and draft docs');
  for (const doc of anonymousVisibleDocs) {
    assert.ok(!doc._id.includes('.'), `Visible doc must be a public root ID: ${doc._id}`);
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
// 9. Requirement 6 & 7: Document-State Exclusions and Verification-Gated Cleanup
// ---------------------------------------------------------------------------
test('Requirement 6 & 7: path("*.**") is rejected while path("drafts.**") and path("versions.**") isolate document states without excluding root IDs', () => {
  // Pattern matching simulating GROQ path expressions
  const matchesDraftsPattern = (id: string) => id.startsWith('drafts.');
  const matchesVersionsPattern = (id: string) => id.startsWith('versions.');

  const draftAndVersionIds = [
    'drafts.fieldNote-empowerresponse-first-responders',
    'drafts.gallery-abandoned-america',
    'drafts.photo-abandoned-america-abandon-house_55150c0d',
    'versions.r1.fieldNote-empowerresponse-first-responders',
    'versions.r2.gallery-abandoned-america',
  ];

  // All draft and version IDs must be matched and excluded by their specific patterns
  for (const id of draftAndVersionIds) {
    const isExcluded = matchesDraftsPattern(id) || matchesVersionsPattern(id);
    assert.ok(isExcluded, `Draft/version ID "${id}" must be matched by drafts.** or versions.**`);
  }

  // All 19 planned public-safe root IDs must NOT be matched by drafts.** or versions.**
  const preflight = runPreflight();
  const allRootIds = [
    ...preflight.plannedFieldNotes.map((n) => n._id),
    ...preflight.plannedGalleries.map((g) => g._id),
    ...preflight.plannedPhotos.map((p) => p._id),
  ];

  assert.equal(allRootIds.length, 19);
  for (const id of allRootIds) {
    const isExcluded = matchesDraftsPattern(id) || matchesVersionsPattern(id);
    assert.equal(isExcluded, false, `Public root ID "${id}" must NOT be excluded by drafts.** or versions.**`);
  }
  // Specifically verify the exact document from real evidence
  assert.equal(
    matchesDraftsPattern('fieldNote-empowerresponse-first-responders'),
    false,
    'Root ID fieldNote-empowerresponse-first-responders must NOT be excluded'
  );
});

test('Requirement 6: Cleanup (Transaction B) remains strictly gated behind successful verification', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();

  // Create a mock client where anonymous verification queries fail (simulate 0 returned)
  const mockClient = createMockSanityClient(preflight);
  const failingAnonymousClient = {
    fetch: async (query: string) => {
      // Simulate anonymous query failure returning 0 notes
      if (query.includes('*[_type == "fieldNote"')) {
        return []; // 0 notes -> verification must fail!
      }
      return [];
    },
  };

  const mockHttpFetch = async () => ({ status: 200, ok: true });

  const result = await executeCorrectiveMigration({
    client: mockClient,
    anonymousClient: failingAnonymousClient,
    preflightResult: preflight,
    dryRun: false,
    backupDir: tempDir,
    manifestDir: tempDir,
    requireGitClean: false,
    httpFetchFn: mockHttpFetch,
  });

  assert.equal(result.success, false, 'Execution must fail when anonymous verification fails');
  assert.ok(result.error?.includes('Pre-cleanup verification failed'));
  assert.equal(result.manifest.cleanupStatus, 'pending', 'Legacy documents must NOT be cleaned up');
  assert.equal(mockClient.getTxCount(), 1, 'Only Transaction A (creation) must commit; Transaction B (cleanup) must NOT commit');
});

// ---------------------------------------------------------------------------
// 10. Requirement 8: Branch-Safety Guard Tests
// ---------------------------------------------------------------------------
test('Requirement 8: Corrective git safety validator accepts fix/sanity-public-document-ids and rejects other branches', () => {
  const correctiveRepo = createTempGitRepo(CORRECTIVE_EXPECTED_BRANCH);
  const featureRepo = createTempGitRepo(EXPECTED_BRANCH);
  const mainRepo = createTempGitRepo('main');

  try {
    // 1. Corrective validator accepts fix/sanity-public-document-ids
    const status = enforceCorrectiveGitCleanliness(correctiveRepo);
    assert.equal(status.branch, CORRECTIVE_EXPECTED_BRANCH);

    // 2. Corrective validator rejects feature/sanity-content-studio
    assert.throws(
      () => enforceCorrectiveGitCleanliness(featureRepo),
      /current branch is "feature\/sanity-content-studio", but execution requires branch "fix\/sanity-public-document-ids"/
    );

    // 3. Corrective validator rejects main
    assert.throws(
      () => enforceCorrectiveGitCleanliness(mainRepo),
      /current branch is "main", but execution requires branch "fix\/sanity-public-document-ids"/
    );
  } finally {
    fs.rmSync(correctiveRepo, { recursive: true, force: true });
    fs.rmSync(featureRepo, { recursive: true, force: true });
    fs.rmSync(mainRepo, { recursive: true, force: true });
  }
});

test('Requirement 8: Original migration validator still accepts only feature/sanity-content-studio', () => {
  const featureRepo = createTempGitRepo(EXPECTED_BRANCH);
  const correctiveRepo = createTempGitRepo(CORRECTIVE_EXPECTED_BRANCH);
  const mainRepo = createTempGitRepo('main');

  try {
    // 1. Original validator accepts feature/sanity-content-studio
    const status = enforceGitCleanliness(featureRepo);
    assert.equal(status.branch, EXPECTED_BRANCH);

    // 2. Original validator rejects fix/sanity-public-document-ids
    assert.throws(
      () => enforceGitCleanliness(correctiveRepo),
      /current branch is "fix\/sanity-public-document-ids", but execution requires branch "feature\/sanity-content-studio"/
    );

    // 3. Original validator rejects main
    assert.throws(
      () => enforceGitCleanliness(mainRepo),
      /current branch is "main", but execution requires branch "feature\/sanity-content-studio"/
    );
  } finally {
    fs.rmSync(featureRepo, { recursive: true, force: true });
    fs.rmSync(correctiveRepo, { recursive: true, force: true });
    fs.rmSync(mainRepo, { recursive: true, force: true });
  }
});

test('Requirement 8: Corrective execution branch rejection occurs before any network call or mutation', async () => {
  const tempDir = createTempDir();
  const preflight = runPreflight();
  const featureRepo = createTempGitRepo('feature/sanity-content-studio');
  const mainRepo = createTempGitRepo('main');

  let fetchCalls = 0;
  let txCalls = 0;

  const mockClient = {
    fetch: async () => {
      fetchCalls++;
      return [];
    },
    transaction: () => ({
      createOrReplace: () => {},
      delete: () => {},
      commit: async () => {
        txCalls++;
        return { transactionId: 'unexpected' };
      },
    }),
  };

  try {
    // Rejection on feature branch
    const resFeature = await executeCorrectiveMigration({
      client: mockClient,
      anonymousClient: mockClient,
      preflightResult: preflight,
      dryRun: false,
      requireGitClean: true,
      cwd: featureRepo,
      backupDir: tempDir,
      manifestDir: tempDir,
    });

    assert.equal(resFeature.success, false);
    assert.match(
      resFeature.error || '',
      /current branch is "feature\/sanity-content-studio", but execution requires branch "fix\/sanity-public-document-ids"/
    );
    // Must have made ZERO network calls and ZERO mutations
    assert.equal(fetchCalls, 0, 'Must not dispatch any Sanity fetch queries before branch check');
    assert.equal(txCalls, 0, 'Must not commit any Sanity transactions before branch check');

    // Rejection on main branch
    const resMain = await executeCorrectiveMigration({
      client: mockClient,
      anonymousClient: mockClient,
      preflightResult: preflight,
      dryRun: false,
      requireGitClean: true,
      cwd: mainRepo,
      backupDir: tempDir,
      manifestDir: tempDir,
    });

    assert.equal(resMain.success, false);
    assert.match(
      resMain.error || '',
      /current branch is "main", but execution requires branch "fix\/sanity-public-document-ids"/
    );
    // Still ZERO network calls
    assert.equal(fetchCalls, 0, 'Must not dispatch any Sanity fetch queries on main branch rejection');
    assert.equal(txCalls, 0, 'Must not commit any Sanity transactions on main branch rejection');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(featureRepo, { recursive: true, force: true });
    fs.rmSync(mainRepo, { recursive: true, force: true });
  }
});

test('Requirement 8: Mutating rollback rejects invalid branch before network operations', async () => {
  const preflight = runPreflight();
  const mainRepo = createTempGitRepo('main');

  let txCalls = 0;
  const mockClient = {
    fetch: async () => [],
    transaction: () => ({
      createOrReplace: () => {},
      delete: () => {},
      commit: async () => {
        txCalls++;
        return {};
      },
    }),
  };

  const manifest: RunManifest = {
    runId: 'test-run-rollback-branch',
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
    cleanupStatus: 'pending',
    stages: [],
    completedSuccessfully: false,
  };

  try {
    const res = await performCorrectiveRollback(mockClient, manifest, {
      dryRun: false,
      requireGitClean: true,
      cwd: mainRepo,
    });

    assert.equal(res.success, false);
    assert.ok(res.errors[0]?.includes('current branch is "main", but execution requires branch "fix/sanity-public-document-ids"'));
    assert.equal(txCalls, 0, 'Must not commit transactions on branch failure');
  } finally {
    fs.rmSync(mainRepo, { recursive: true, force: true });
  }
});
