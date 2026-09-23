/**
 * Rollback engine with strict sequencing and asset safeguards (Amendment 12).
 *
 * Enforces:
 * 1. Document rollback strictly happens BEFORE asset considerations.
 *    - Replaced documents are restored from their snapshots.
 *    - Newly created documents are deleted by exact manifest ID.
 * 2. Re-queries Sanity for active references to assets AFTER document rollback.
 * 3. Newly uploaded assets are deleted ONLY if reference count is exactly 0.
 * 4. Pre-existing/reused assets (existedBeforeRun: true) are NEVER deleted.
 * 5. Assets with remaining references (> 0) are retained and flagged for manual review.
 * 6. Defaults to dry-run preview mode.
 */

import fs from 'node:fs';
import { RunManifest, RollbackResult } from './types';

export interface RollbackExecutionOptions {
  dryRun?: boolean;
}

export async function performRollback(
  client: any,
  manifest: RunManifest,
  options: RollbackExecutionOptions = {}
): Promise<RollbackResult> {
  const dryRun = options.dryRun !== false; // Defaults to dry-run (true)
  const errors: string[] = [];
  const manualReviewAssets: string[] = [];

  let restoredDocumentCount = 0;
  let deletedDocumentCount = 0;
  let deletedAssetCount = 0;
  let retainedAssetCount = 0;
  let retainedReusedAssetCount = 0;

  const replacedSnapshots = manifest.replacedDocumentSnapshots || [];
  const newlyCreatedIds = manifest.newlyCreatedDocumentIds || [];
  const assetUploads = manifest.assetUploads || [];

  // =========================================================================
  // Step 1: Process Documents FIRST (Amendment 12)
  // =========================================================================
  if (dryRun) {
    restoredDocumentCount = replacedSnapshots.length;
    deletedDocumentCount = newlyCreatedIds.length;
  } else {
    try {
      const tx = client.transaction();

      // Restore replaced documents from snapshot
      for (const snapshot of replacedSnapshots) {
        tx.createOrReplace(snapshot.doc);
        restoredDocumentCount++;
      }

      // Delete exact manifest-listed newly created documents
      for (const id of newlyCreatedIds) {
        tx.delete(id);
        deletedDocumentCount++;
      }

      if (restoredDocumentCount > 0 || deletedDocumentCount > 0) {
        try {
          await tx.commit({ visibility: 'sync' });
        } catch {
          await tx.commit();
        }
      }
    } catch (err: any) {
      errors.push(`Document rollback transaction failed: ${err.message}`);
      return {
        success: false,
        dryRun,
        restoredDocumentCount,
        deletedDocumentCount,
        deletedAssetCount,
        retainedAssetCount,
        retainedReusedAssetCount,
        manualReviewAssets,
        errors,
      };
    }
  }

  // =========================================================================
  // Step 2: Re-query Asset References AFTER Document Rollback (Amendment 12)
  // =========================================================================
  for (const upload of assetUploads) {
    // Rule: Rollback must NEVER delete a reused or pre-existing asset
    if (upload.existedBeforeRun) {
      retainedReusedAssetCount++;
      continue;
    }

    const assetId = upload.targetAssetId;
    let refCount = 0;

    try {
      // Re-query reference count in Sanity Content Lake
      const countResult = await client.fetch('count(*[references($assetId)])', {
        assetId,
      });
      refCount = typeof countResult === 'number' ? countResult : 0;
    } catch (err: any) {
      errors.push(`Failed to query references for asset "${assetId}": ${err.message}`);
      manualReviewAssets.push(assetId);
      retainedAssetCount++;
      continue;
    }

    // Rule: Delete newly uploaded asset ONLY if reference count is exactly zero
    if (refCount === 0) {
      if (dryRun) {
        deletedAssetCount++;
      } else {
        try {
          await client.delete(assetId);
          deletedAssetCount++;
        } catch (err: any) {
          errors.push(`Failed to delete unreferenced asset "${assetId}": ${err.message}`);
          manualReviewAssets.push(assetId);
          retainedAssetCount++;
        }
      }
    } else {
      // Asset is still referenced: retain and report for manual review
      retainedAssetCount++;
      manualReviewAssets.push(
        `${assetId} (has ${refCount} active reference(s); retained for safety)`
      );
    }
  }

  return {
    success: errors.length === 0,
    dryRun,
    restoredDocumentCount,
    deletedDocumentCount,
    deletedAssetCount,
    retainedAssetCount,
    retainedReusedAssetCount,
    manualReviewAssets,
    errors,
  };
}

/**
 * Loads a manifest file from disk safely.
 */
export function loadManifestFromDisk(manifestPath: string): RunManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file does not exist: "${manifestPath}"`);
  }

  let content: string;
  try {
    content = fs.readFileSync(manifestPath, 'utf-8');
  } catch (err: any) {
    throw new Error(`Failed to read manifest file: ${err.message}`);
  }

  let manifest: RunManifest;
  try {
    manifest = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`Malformed JSON in manifest file: ${err.message}`);
  }

  if (!manifest || !manifest.runId || !Array.isArray(manifest.plannedDocumentIds)) {
    throw new Error(`Invalid migration manifest format in "${manifestPath}".`);
  }

  return manifest;
}
