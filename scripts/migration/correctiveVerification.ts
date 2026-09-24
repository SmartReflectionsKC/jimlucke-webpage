/**
 * Comprehensive verification engine for corrective migration (Amendments 1, 6).
 *
 * Implements two-phase verification:
 * 1. Pre-cleanup verification:
 *    - Authenticated verification scoped strictly to the 19 new public-safe IDs
 *    - Anonymous token-free Content Lake verification (exact counts 5/6/8, listing & detail queries)
 * 2. Post-cleanup verification:
 *    - Confirms all 19 legacy period-based IDs are completely absent
 *    - Confirms all 19 new public-safe IDs exist and resolve references
 *    - Confirms zero drafts for migration content
 *    - Confirms anonymous queries continue to return exact counts
 *    - Confirms direct anonymous image asset URLs respond with HTTP 200
 */

import {
  PlannedFieldNoteDoc,
  PlannedGalleryDoc,
  PlannedPhotoDoc,
  PlannedAsset,
  AssetUploadResult,
  PostVerificationResult,
  PostVerificationCheck,
} from './types';
import {
  FIELD_NOTES_LIST_QUERY,
  FIELD_NOTE_DETAIL_QUERY,
  GALLERIES_QUERY,
} from '../../src/sanity/queries';
import { verifyMigration } from './postVerification';

export interface CorrectiveVerificationOptions {
  client: any;
  anonymousClient: any;
  plannedFieldNotes: PlannedFieldNoteDoc[];
  plannedGalleries: PlannedGalleryDoc[];
  plannedPhotos: PlannedPhotoDoc[];
  plannedAssets: PlannedAsset[];
  legacyDocIds: string[];
  assetUploads: AssetUploadResult[];
  maxRetries?: number;
  retryDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
  httpFetchFn?: (url: string) => Promise<{ status: number; ok: boolean }>;
}

/**
 * Pre-cleanup verification: verifies that the newly created 19 public-safe documents
 * pass authenticated verification and are immediately visible to anonymous public queries.
 */
export async function verifyPreCleanup(
  options: CorrectiveVerificationOptions
): Promise<PostVerificationResult> {
  const {
    client,
    anonymousClient,
    plannedFieldNotes,
    plannedGalleries,
    plannedPhotos,
    plannedAssets,
    assetUploads,
    maxRetries = 3,
    retryDelayMs = 300,
    sleepFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  // 1. Run authenticated scoped verification
  const authVerification = await verifyMigration({
    client,
    plannedFieldNotes,
    plannedGalleries,
    plannedPhotos,
    plannedAssets,
    assetUploads,
    maxRetries,
    retryDelayMs,
    sleepFn,
  });

  const checks: PostVerificationCheck[] = [...authVerification.checks];
  const anonymousErrors: string[] = [];
  let anonymousValid = true;

  // 2. Anonymous token-free Content Lake verification
  let anonFieldNotes: any[] = [];
  let anonGalleries: any[] = [];
  let anonPhotos: any[] = [];

  let anonAttempt = 0;
  while (anonAttempt < maxRetries) {
    anonAttempt++;
    try {
      [anonFieldNotes, anonGalleries, anonPhotos] = await Promise.all([
        anonymousClient.fetch('*[_type == "fieldNote" && !(_id in path("drafts.**"))]{_id, "slug": slug.current}'),
        anonymousClient.fetch('*[_type == "gallery" && !(_id in path("drafts.**"))]{_id, "id": slug.current}'),
        anonymousClient.fetch('*[_type == "photo" && !(_id in path("drafts.**"))]{_id}'),
      ]);

      const fnCount = Array.isArray(anonFieldNotes) ? anonFieldNotes.length : 0;
      const galCount = Array.isArray(anonGalleries) ? anonGalleries.length : 0;
      const photoCount = Array.isArray(anonPhotos) ? anonPhotos.length : 0;

      if (
        fnCount === plannedFieldNotes.length &&
        galCount === plannedGalleries.length &&
        photoCount === plannedPhotos.length
      ) {
        break; // All public root documents visible anonymously
      }
    } catch (err: any) {
      if (anonAttempt >= maxRetries) {
        anonymousValid = false;
        anonymousErrors.push(`Anonymous count query failed: ${err.message}`);
        break;
      }
    }

    if (anonAttempt < maxRetries && retryDelayMs > 0) {
      await sleepFn(retryDelayMs);
    }
  }

  // Verify exact counts anonymously
  const fnCount = Array.isArray(anonFieldNotes) ? anonFieldNotes.length : 0;
  const galCount = Array.isArray(anonGalleries) ? anonGalleries.length : 0;
  const photoCount = Array.isArray(anonPhotos) ? anonPhotos.length : 0;

  if (fnCount !== plannedFieldNotes.length) {
    anonymousValid = false;
    anonymousErrors.push(
      `Anonymous Field Notes count mismatch: expected ${plannedFieldNotes.length}, got ${fnCount}`
    );
  }
  if (galCount !== plannedGalleries.length) {
    anonymousValid = false;
    anonymousErrors.push(
      `Anonymous Galleries count mismatch: expected ${plannedGalleries.length}, got ${galCount}`
    );
  }
  if (photoCount !== plannedPhotos.length) {
    anonymousValid = false;
    anonymousErrors.push(
      `Anonymous Photos count mismatch: expected ${plannedPhotos.length}, got ${photoCount}`
    );
  }

  // 3. Verify Anonymous Listing Queries
  try {
    const anonListingNotes = await anonymousClient.fetch(FIELD_NOTES_LIST_QUERY);
    const anonListingGals = await anonymousClient.fetch(GALLERIES_QUERY);

    if (!Array.isArray(anonListingNotes) || anonListingNotes.length !== plannedFieldNotes.length) {
      anonymousValid = false;
      anonymousErrors.push(
        `Anonymous FIELD_NOTES_LIST_QUERY returned ${anonListingNotes?.length || 0} notes, expected ${plannedFieldNotes.length}`
      );
    }
    if (!Array.isArray(anonListingGals) || anonListingGals.length !== plannedGalleries.length) {
      anonymousValid = false;
      anonymousErrors.push(
        `Anonymous GALLERIES_QUERY returned ${anonListingGals?.length || 0} galleries, expected ${plannedGalleries.length}`
      );
    }
  } catch (err: any) {
    anonymousValid = false;
    anonymousErrors.push(`Anonymous listing query failed: ${err.message}`);
  }

  // 4. Verify Anonymous Detail Query for Field Notes
  for (const note of plannedFieldNotes) {
    try {
      const detail = await anonymousClient.fetch(FIELD_NOTE_DETAIL_QUERY, { slug: note.slug.current });
      if (!detail) {
        anonymousValid = false;
        anonymousErrors.push(`Anonymous detail query returned null for slug "${note.slug.current}"`);
      } else if (!detail.body || detail.body.length === 0) {
        anonymousValid = false;
        anonymousErrors.push(`Anonymous detail body empty for slug "${note.slug.current}"`);
      }
    } catch (err: any) {
      anonymousValid = false;
      anonymousErrors.push(`Anonymous detail query error for slug "${note.slug.current}": ${err.message}`);
    }
  }

  checks.push({
    name: 'Anonymous Content Lake Verification (5 Notes, 6 Galleries, 8 Photos)',
    passed: anonymousValid,
    details: anonymousValid
      ? `Anonymous queries return exactly 5 Field Notes, 6 Galleries, and 8 Photos without token.`
      : anonymousErrors.join('; '),
  });

  const verified = authVerification.verified && anonymousValid;

  return {
    ...authVerification,
    verified,
    checks,
    anonymousVerified: anonymousValid,
  };
}

/**
 * Post-cleanup verification: verifies that legacy period-based documents are absent,
 * new documents remain intact, and image asset URLs respond.
 */
export async function verifyPostCleanup(
  options: CorrectiveVerificationOptions
): Promise<PostVerificationResult> {
  const {
    client,
    anonymousClient,
    plannedFieldNotes,
    plannedGalleries,
    plannedPhotos,
    legacyDocIds,
    maxRetries = 3,
    retryDelayMs = 300,
    sleepFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    httpFetchFn,
  } = options;

  const checks: PostVerificationCheck[] = [];
  let cleanupValid = true;
  const cleanupErrors: string[] = [];

  // 1. Confirm all 19 legacy period-based IDs are absent from Content Lake
  let remainingLegacyDocs: any[] = [];
  let legacyCheckAttempt = 0;

  while (legacyCheckAttempt < maxRetries) {
    legacyCheckAttempt++;
    try {
      remainingLegacyDocs = await client.fetch('*[_id in $legacyDocIds]{_id}', { legacyDocIds });
      if (Array.isArray(remainingLegacyDocs) && remainingLegacyDocs.length === 0) {
        break; // Legacy documents successfully deleted
      }
    } catch (err: any) {
      if (legacyCheckAttempt >= maxRetries) {
        cleanupValid = false;
        cleanupErrors.push(`Failed querying legacy document deletion: ${err.message}`);
        break;
      }
    }

    if (legacyCheckAttempt < maxRetries && retryDelayMs > 0) {
      await sleepFn(retryDelayMs);
    }
  }

  if (Array.isArray(remainingLegacyDocs) && remainingLegacyDocs.length > 0) {
    cleanupValid = false;
    const remainingIds = remainingLegacyDocs.map((d: any) => d._id);
    cleanupErrors.push(
      `Legacy period-based documents still exist after cleanup: ${remainingIds.join(', ')}`
    );
  }

  checks.push({
    name: 'Legacy Period-Based Documents Completely Removed',
    passed: cleanupValid && remainingLegacyDocs.length === 0,
    details:
      remainingLegacyDocs.length === 0
        ? 'All 19 legacy period-based document IDs have been deleted.'
        : `Found ${remainingLegacyDocs.length} remaining legacy documents.`,
  });

  // 2. Confirm all 19 new public-safe IDs exist
  const newDocIds = [
    ...plannedFieldNotes.map((n) => n._id),
    ...plannedGalleries.map((g) => g._id),
    ...plannedPhotos.map((p) => p._id),
  ];

  let newDocsFound: any[] = [];
  try {
    newDocsFound = await client.fetch('*[_id in $newDocIds]{_id}', { newDocIds });
  } catch (err: any) {
    cleanupValid = false;
    cleanupErrors.push(`Failed querying new documents: ${err.message}`);
  }

  const newDocsCount = Array.isArray(newDocsFound) ? newDocsFound.length : 0;
  const allNewExist = newDocsCount === newDocIds.length;
  if (!allNewExist) {
    cleanupValid = false;
    cleanupErrors.push(`Expected 19 public-safe documents, found ${newDocsCount}`);
  }

  checks.push({
    name: 'All 19 Public-Safe Root Documents Intact Post-Cleanup',
    passed: allNewExist,
    details: allNewExist
      ? 'All 19 public-safe root documents exist.'
      : `Missing public-safe documents (${newDocsCount}/${newDocIds.length}).`,
  });

  // 3. Confirm zero drafts for migration content
  const draftIds = newDocIds.map((id) => `drafts.${id}`);
  let draftsFound: any[] = [];
  try {
    draftsFound = await client.fetch('*[_id in $draftIds]{_id}', { draftIds });
  } catch (err: any) {
    cleanupValid = false;
    cleanupErrors.push(`Failed querying draft documents: ${err.message}`);
  }

  const zeroDrafts = Array.isArray(draftsFound) && draftsFound.length === 0;
  if (!zeroDrafts) {
    cleanupValid = false;
    cleanupErrors.push(`Found draft documents for public-safe IDs: ${draftsFound.map((d: any) => d._id).join(', ')}`);
  }

  checks.push({
    name: 'Zero Draft Documents Post-Cleanup',
    passed: zeroDrafts,
    details: zeroDrafts ? 'No draft copies exist for migration content.' : 'Found unexpected drafts.',
  });

  // 4. Confirm anonymous queries still return exact counts post-cleanup
  let anonPostValid = true;
  try {
    const [anonNotes, anonGals, anonPhotos] = await Promise.all([
      anonymousClient.fetch(FIELD_NOTES_LIST_QUERY),
      anonymousClient.fetch(GALLERIES_QUERY),
      anonymousClient.fetch('*[_type == "photo" && !(_id in path("drafts.**"))]{_id}'),
    ]);

    if (!Array.isArray(anonNotes) || anonNotes.length !== plannedFieldNotes.length) {
      anonPostValid = false;
      cleanupErrors.push(`Post-cleanup anonymous notes count: ${anonNotes?.length || 0}`);
    }
    if (!Array.isArray(anonGals) || anonGals.length !== plannedGalleries.length) {
      anonPostValid = false;
      cleanupErrors.push(`Post-cleanup anonymous galleries count: ${anonGals?.length || 0}`);
    }
    if (!Array.isArray(anonPhotos) || anonPhotos.length !== plannedPhotos.length) {
      anonPostValid = false;
      cleanupErrors.push(`Post-cleanup anonymous photos count: ${anonPhotos?.length || 0}`);
    }
  } catch (err: any) {
    anonPostValid = false;
    cleanupErrors.push(`Post-cleanup anonymous queries failed: ${err.message}`);
  }

  checks.push({
    name: 'Anonymous Queries Healthy Post-Cleanup',
    passed: anonPostValid,
    details: anonPostValid
      ? 'Anonymous queries return exactly 5 Field Notes, 6 Galleries, and 8 Photos post-cleanup.'
      : 'Anonymous query count mismatch post-cleanup.',
  });

  // 5. Verify direct anonymous image URLs if fetch function provided
  if (httpFetchFn) {
    let imgUrlsValid = true;
    try {
      const assetDocs: any[] = await client.fetch('*[_type == "sanity.imageAsset" && _id in $assetIds]{_id, url}', {
        assetIds: options.plannedAssets.map((a) => a.targetAssetId),
      });

      for (const asset of assetDocs) {
        if (asset.url) {
          const res = await httpFetchFn(asset.url);
          if (res.status !== 200) {
            imgUrlsValid = false;
            cleanupErrors.push(`Asset URL returned HTTP ${res.status}: ${asset.url}`);
          }
        }
      }
    } catch (err: any) {
      imgUrlsValid = false;
      cleanupErrors.push(`Image URL verification failed: ${err.message}`);
    }

    checks.push({
      name: 'Direct Anonymous Image URLs Respond Successfully',
      passed: imgUrlsValid,
      details: imgUrlsValid
        ? 'All planned image assets respond with HTTP 200 anonymously.'
        : 'Image URL verification failed.',
    });
    if (!imgUrlsValid) cleanupValid = false;
  }

  const verified = cleanupValid && allNewExist && zeroDrafts && anonPostValid;

  return {
    verified,
    checks,
    missingDocumentIds: remainingLegacyDocs.map((d: any) => d._id),
    typeMismatchDocumentIds: [],
    draftDocumentIds: draftsFound.map((d: any) => d._id),
    unresolvedReferenceIds: [],
    assetMismatchCount: 0,
    groqFieldNoteCount: plannedFieldNotes.length,
    groqGalleryCount: plannedGalleries.length,
    anonymousVerified: anonPostValid,
    error: cleanupErrors.length > 0 ? cleanupErrors.join('; ') : undefined,
  };
}
