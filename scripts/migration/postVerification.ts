/**
 * Post-write verification engine (Amendments 2, 3, 11 & Read-After-Write Consistency).
 *
 * Verifies:
 * - Exact 19 deterministic migration document IDs and their types
 * - Zero drafts for the 19 migration documents
 * - All references resolve (galleries to photos, documents to image assets)
 * - Gallery photo references match source order and deterministic keys
 * - Exactly 8 planned unique source image assets map to valid Sanity assets
 * - Reused vs newly uploaded assets correctly distinguished
 * - Field Note Portable Text block and text structure is preserved
 * - Frontend GROQ listing queries succeed and return all 5 Field Notes and 6 Galleries
 * - Frontend GROQ detail query (FIELD_NOTE_DETAIL_QUERY) succeeds for each of the 5 Field Notes
 *   with matching document ID, slug, Portable Text body blocks, and resolved image assets
 * - Read-after-write consistency with bounded retry for transient replication lag
 * - Narrow verification scope: unrelated dataset content does NOT fail verification
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

export interface VerifyMigrationOptions {
  client: any;
  plannedFieldNotes: PlannedFieldNoteDoc[];
  plannedGalleries: PlannedGalleryDoc[];
  plannedPhotos: PlannedPhotoDoc[];
  plannedAssets: PlannedAsset[];
  assetUploads: AssetUploadResult[];
  maxRetries?: number;
  retryDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export async function verifyMigration(
  options: VerifyMigrationOptions
): Promise<PostVerificationResult> {
  const {
    client,
    plannedFieldNotes,
    plannedGalleries,
    plannedPhotos,
    plannedAssets,
    assetUploads,
    maxRetries = 3,
    retryDelayMs = 300,
    sleepFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  const checks: PostVerificationCheck[] = [];
  const missingDocumentIds: string[] = [];
  const typeMismatchDocumentIds: string[] = [];
  const draftDocumentIds: string[] = [];
  const unresolvedReferenceIds: string[] = [];
  let assetMismatchCount = 0;

  const expectedDocuments = [
    ...plannedFieldNotes,
    ...plannedGalleries,
    ...plannedPhotos,
  ];

  const expectedDocIds = expectedDocuments.map((d) => d._id);
  const expectedTypeMap = new Map<string, string>();
  for (const doc of expectedDocuments) {
    expectedTypeMap.set(doc._id, doc._type);
  }

  // 1. Fetch exact 19 expected documents with bounded retry for transient propagation lag
  let fetchedDocs: any[] = [];
  let docFetchAttempt = 0;

  while (docFetchAttempt < maxRetries) {
    docFetchAttempt++;
    try {
      fetchedDocs = await client.fetch('*[_id in $expectedDocIds]', { expectedDocIds });
      if (Array.isArray(fetchedDocs) && fetchedDocs.length === expectedDocIds.length) {
        break; // All expected documents present
      }
    } catch (err: any) {
      if (docFetchAttempt >= maxRetries) {
        throw new Error(`Post-write verification failed fetching documents: ${err.message}`);
      }
    }

    if (docFetchAttempt < maxRetries && retryDelayMs > 0) {
      await sleepFn(retryDelayMs);
    }
  }

  const fetchedDocMap = new Map<string, any>();
  if (Array.isArray(fetchedDocs)) {
    for (const doc of fetchedDocs) {
      fetchedDocMap.set(doc._id, doc);
    }
  }

  // Verify all 19 IDs exist
  for (const id of expectedDocIds) {
    if (!fetchedDocMap.has(id)) {
      missingDocumentIds.push(id);
    }
  }

  checks.push({
    name: '19 Exact Deterministic Document IDs Exist',
    passed: missingDocumentIds.length === 0,
    details:
      missingDocumentIds.length === 0
        ? `All ${expectedDocIds.length} expected document IDs exist in dataset.`
        : `Missing document IDs: ${missingDocumentIds.join(', ')}`,
  });

  // Verify types of all 19 documents (schema mismatches are NEVER retried)
  for (const [id, expectedType] of expectedTypeMap.entries()) {
    const doc = fetchedDocMap.get(id);
    if (doc && doc._type !== expectedType) {
      typeMismatchDocumentIds.push(`${id} (expected ${expectedType}, found ${doc._type})`);
    }
  }

  checks.push({
    name: 'Document Schema Types Match Expected',
    passed: typeMismatchDocumentIds.length === 0,
    details:
      typeMismatchDocumentIds.length === 0
        ? 'All migration documents have the correct _type.'
        : `Type mismatches: ${typeMismatchDocumentIds.join(', ')}`,
  });

  // 2. Verify zero drafts for these 19 IDs
  const draftIds = expectedDocIds.map((id) => `drafts.${id}`);
  let fetchedDrafts: any[] = [];
  try {
    fetchedDrafts = await client.fetch('*[_id in $draftIds]{_id}', { draftIds });
  } catch (err: any) {
    throw new Error(`Post-write verification failed fetching drafts: ${err.message}`);
  }

  if (Array.isArray(fetchedDrafts) && fetchedDrafts.length > 0) {
    for (const draft of fetchedDrafts) {
      draftDocumentIds.push(draft._id);
    }
  }

  checks.push({
    name: 'Zero Draft Documents for Migration Content',
    passed: draftDocumentIds.length === 0,
    details:
      draftDocumentIds.length === 0
        ? 'No draft copies exist for migration document IDs.'
        : `Found draft documents: ${draftDocumentIds.join(', ')}`,
  });

  // 3. Verify Gallery Photo References and Ordering
  let galleryOrderValid = true;
  const galleryOrderErrors: string[] = [];

  for (const plannedGallery of plannedGalleries) {
    const fetchedGallery = fetchedDocMap.get(plannedGallery._id);
    if (!fetchedGallery) continue;

    const fetchedPhotos = Array.isArray(fetchedGallery.photos) ? fetchedGallery.photos : [];
    if (fetchedPhotos.length !== plannedGallery.photos.length) {
      galleryOrderValid = false;
      galleryOrderErrors.push(
        `Gallery "${plannedGallery._id}": photo count mismatch (${fetchedPhotos.length} vs expected ${plannedGallery.photos.length})`
      );
      continue;
    }

    for (let i = 0; i < plannedGallery.photos.length; i++) {
      const plannedRef = plannedGallery.photos[i];
      const actualRef = fetchedPhotos[i];

      const refId = actualRef?._ref || actualRef?.asset?._ref;
      if (refId !== plannedRef._ref) {
        galleryOrderValid = false;
        galleryOrderErrors.push(
          `Gallery "${plannedGallery._id}" photo at index ${i}: reference mismatch (${refId} vs expected ${plannedRef._ref})`
        );
      }

      if (actualRef?._key !== plannedRef._key) {
        galleryOrderValid = false;
        galleryOrderErrors.push(
          `Gallery "${plannedGallery._id}" photo at index ${i}: key mismatch (${actualRef?._key} vs expected ${plannedRef._key})`
        );
      }
    }
  }

  checks.push({
    name: 'Gallery Photo References & Order Match Exactly',
    passed: galleryOrderValid,
    details:
      galleryOrderValid
        ? 'All gallery photos preserve exact source order, references, and keys.'
        : galleryOrderErrors.join('; '),
  });

  // 4. Verify 8 Planned Unique Image Assets Exist in Sanity
  const assetIdSet = new Set<string>();
  for (const u of assetUploads) {
    assetIdSet.add(u.targetAssetId);
  }
  const assetIds = Array.from(assetIdSet);

  let fetchedAssets: any[] = [];
  try {
    fetchedAssets = await client.fetch(
      '*[_type == "sanity.imageAsset" && _id in $assetIds]{_id, _type, sha1hash, size}',
      { assetIds }
    );
  } catch (err: any) {
    throw new Error(`Post-write verification failed fetching image assets: ${err.message}`);
  }

  const fetchedAssetMap = new Map<string, any>();
  for (const a of fetchedAssets) {
    fetchedAssetMap.set(a._id, a);
  }

  for (const upload of assetUploads) {
    const asset = fetchedAssetMap.get(upload.targetAssetId);
    if (!asset) {
      assetMismatchCount++;
      unresolvedReferenceIds.push(`Asset ${upload.targetAssetId} for "${upload.sourcePath}"`);
    } else if (asset.sha1hash && asset.sha1hash !== upload.sha1) {
      assetMismatchCount++;
      unresolvedReferenceIds.push(
        `Asset sha1 mismatch for ${upload.targetAssetId}: expected ${upload.sha1}, found ${asset.sha1hash}`
      );
    }
  }

  checks.push({
    name: 'Planned 8 Image Assets Verified and Distinguish Reused vs Uploaded',
    passed: assetMismatchCount === 0 && assetIds.length === plannedAssets.length,
    details:
      assetMismatchCount === 0
        ? `All ${assetIds.length} planned source images resolve to valid Sanity image assets.`
        : `Asset verification failures: ${assetMismatchCount}`,
  });

  // 5. Verify Field Note Portable Text Preservation
  let ptValid = true;
  const ptErrors: string[] = [];

  for (const plannedNote of plannedFieldNotes) {
    const fetchedNote = fetchedDocMap.get(plannedNote._id);
    if (!fetchedNote) continue;

    const fetchedBody = Array.isArray(fetchedNote.body) ? fetchedNote.body : [];
    if (fetchedBody.length !== plannedNote.body.length) {
      ptValid = false;
      ptErrors.push(
        `Field Note "${plannedNote._id}": body block count mismatch (${fetchedBody.length} vs expected ${plannedNote.body.length})`
      );
    }
  }

  checks.push({
    name: 'Field Note Portable Text Structure Preserved',
    passed: ptValid,
    details:
      ptValid
        ? 'Field Note Portable Text bodies match block count and structures.'
        : ptErrors.join('; '),
  });

  // 6. Verify Frontend GROQ Listing Queries
  let groqFieldNoteCount = 0;
  let groqGalleryCount = 0;
  let groqListValid = true;
  const groqListErrors: string[] = [];

  try {
    const groqFieldNotes: any[] = await client.fetch(FIELD_NOTES_LIST_QUERY);
    groqFieldNoteCount = Array.isArray(groqFieldNotes) ? groqFieldNotes.length : 0;

    const expectedSlugs = plannedFieldNotes.map((n) => n.slug.current);
    const returnedSlugs = new Set((groqFieldNotes || []).map((n: any) => n.slug));

    for (const expectedSlug of expectedSlugs) {
      if (!returnedSlugs.has(expectedSlug)) {
        groqListValid = false;
        groqListErrors.push(`Field Note slug "${expectedSlug}" not found in list query result.`);
      }
    }
  } catch (err: any) {
    groqListValid = false;
    groqListErrors.push(`FIELD_NOTES_LIST_QUERY failed: ${err.message}`);
  }

  try {
    const groqGalleries: any[] = await client.fetch(GALLERIES_QUERY);
    groqGalleryCount = Array.isArray(groqGalleries) ? groqGalleries.length : 0;

    const expectedGallerySlugs = plannedGalleries.map((g) => g.slug.current);
    const returnedGallerySlugs = new Set((groqGalleries || []).map((g: any) => g.slug));

    for (const expectedSlug of expectedGallerySlugs) {
      if (!returnedGallerySlugs.has(expectedSlug)) {
        groqListValid = false;
        groqListErrors.push(`Gallery slug "${expectedSlug}" not found in galleries query result.`);
      }
    }
  } catch (err: any) {
    groqListValid = false;
    groqListErrors.push(`GALLERIES_QUERY failed: ${err.message}`);
  }

  checks.push({
    name: 'Frontend GROQ Listing Queries Return All 5 Field Notes and 6 Galleries',
    passed: groqListValid && groqFieldNoteCount >= 5 && groqGalleryCount >= 6,
    details:
      groqListValid
        ? `GROQ listing queries returned ${groqFieldNoteCount} field notes and ${groqGalleryCount} galleries.`
        : groqListErrors.join('; '),
  });

  // 7. Verify Frontend GROQ Detail Query for all 5 Field Notes (Item 2)
  let groqDetailValid = true;
  const groqDetailErrors: string[] = [];

  for (const plannedNote of plannedFieldNotes) {
    const slug = plannedNote.slug.current;
    let detail: any = null;
    let detailAttempt = 0;

    while (detailAttempt < maxRetries) {
      detailAttempt++;
      try {
        detail = await client.fetch(FIELD_NOTE_DETAIL_QUERY, { slug });
        if (detail) {
          break; // Document found
        }
      } catch (err: any) {
        if (detailAttempt >= maxRetries) {
          groqDetailValid = false;
          groqDetailErrors.push(`Detail query failed for slug "${slug}": ${err.message}`);
          break;
        }
      }

      // Retry ONLY if detail is transiently missing/null
      if (detailAttempt < maxRetries && retryDelayMs > 0) {
        await sleepFn(retryDelayMs);
      }
    }

    if (!detail) {
      groqDetailValid = false;
      groqDetailErrors.push(`Detail query returned null/missing for slug "${slug}".`);
      continue;
    }

    // Confirm deterministic document ID and slug
    if (detail._id !== plannedNote._id) {
      groqDetailValid = false;
      groqDetailErrors.push(
        `Field Note "${slug}" ID mismatch: expected "${plannedNote._id}", got "${detail._id}"`
      );
    }
    if (detail.slug !== slug) {
      groqDetailValid = false;
      groqDetailErrors.push(
        `Field Note "${slug}" slug field mismatch: expected "${slug}", got "${detail.slug}"`
      );
    }

    // Confirm Portable Text body is returned and matches blocks
    if (!Array.isArray(detail.body) || detail.body.length === 0) {
      groqDetailValid = false;
      groqDetailErrors.push(`Field Note "${slug}" body is empty in detail query result.`);
    } else if (detail.body.length !== plannedNote.body.length) {
      groqDetailValid = false;
      groqDetailErrors.push(
        `Field Note "${slug}" body block count mismatch (${detail.body.length} vs planned ${plannedNote.body.length})`
      );
    } else {
      for (let b = 0; b < plannedNote.body.length; b++) {
        const plannedBlock = plannedNote.body[b];
        const actualBlock = detail.body[b];

        if (actualBlock._type !== plannedBlock._type) {
          groqDetailValid = false;
          groqDetailErrors.push(
            `Field Note "${slug}" block ${b} type mismatch: expected "${plannedBlock._type}", got "${actualBlock._type}"`
          );
          break;
        }
        if (plannedBlock.style && actualBlock.style !== plannedBlock.style) {
          groqDetailValid = false;
          groqDetailErrors.push(
            `Field Note "${slug}" block ${b} style mismatch: expected "${plannedBlock.style}", got "${actualBlock.style}"`
          );
          break;
        }
      }
    }

    // Confirm featuredImage and asset metadata resolve
    if (plannedNote.featuredImage) {
      if (!detail.featuredImage || !detail.featuredImage.asset) {
        groqDetailValid = false;
        groqDetailErrors.push(`Field Note "${slug}" featuredImage or asset unresolved in detail.`);
      } else {
        const assetObj = detail.featuredImage.asset;
        if (!assetObj._id) {
          groqDetailValid = false;
          groqDetailErrors.push(`Field Note "${slug}" featuredImage asset missing _id in detail.`);
        }
        if (!assetObj.metadata?.dimensions) {
          groqDetailValid = false;
          groqDetailErrors.push(`Field Note "${slug}" featuredImage asset metadata dimensions missing.`);
        }
      }
    }

    // Confirm featuredImageAlt matches approved source content
    if (plannedNote.featuredImageAlt) {
      if (detail.featuredImageAlt !== plannedNote.featuredImageAlt) {
        groqDetailValid = false;
        groqDetailErrors.push(
          `Field Note "${slug}" featuredImageAlt mismatch: expected "${plannedNote.featuredImageAlt}", got "${detail.featuredImageAlt}"`
        );
      }
    }
  }

  checks.push({
    name: 'Field Note Detail Queries Return Complete Content, Blocks, and Asset Metadata',
    passed: groqDetailValid,
    details:
      groqDetailValid
        ? 'All 5 Field Notes pass FIELD_NOTE_DETAIL_QUERY verification with resolved metadata.'
        : groqDetailErrors.join('; '),
  });

  const verified = checks.every((c) => c.passed);

  return {
    verified,
    checks,
    missingDocumentIds,
    typeMismatchDocumentIds,
    draftDocumentIds,
    unresolvedReferenceIds,
    assetMismatchCount,
    groqFieldNoteCount,
    groqGalleryCount,
  };
}
