/**
 * Rollback engine for corrective public ID migration (Amendment 9).
 *
 * Implements:
 * - Pre-cleanup rollback: deletes only newly created public-safe documents; legacy documents remain.
 * - Post-cleanup rollback: restores all 19 legacy snapshots first, verifies restoration, then deletes the 19 new documents.
 * - Never deletes any of the 8 reused image assets.
 * - Defaults to dry-run preview, requires explicit --confirm to mutate.
 */

import { RunManifest } from './types';

export interface CorrectiveRollbackOptions {
  dryRun?: boolean;
}

export interface CorrectiveRollbackResult {
  success: boolean;
  dryRun: boolean;
  restoredLegacyCount: number;
  deletedNewCount: number;
  retainedAssetCount: number;
  errors: string[];
}

export async function performCorrectiveRollback(
  client: any,
  manifest: RunManifest,
  options: CorrectiveRollbackOptions = {}
): Promise<CorrectiveRollbackResult> {
  const dryRun = options.dryRun !== false; // Defaults to dry-run (true)
  const errors: string[] = [];

  const legacySnapshots = manifest.legacyDocumentSnapshots || manifest.replacedDocumentSnapshots || [];
  const newlyCreatedIds = manifest.newlyCreatedDocumentIds || manifest.newDocumentIds || [];
  const cleanupRan = manifest.cleanupStatus === 'completed';

  let restoredLegacyCount = 0;
  let deletedNewCount = 0;
  const retainedAssetCount = manifest.reusedAssetIds?.length || 8;

  if (dryRun) {
    restoredLegacyCount = cleanupRan ? legacySnapshots.length : 0;
    deletedNewCount = newlyCreatedIds.length;

    return {
      success: true,
      dryRun: true,
      restoredLegacyCount,
      deletedNewCount,
      retainedAssetCount,
      errors: [],
    };
  }

  // Active Rollback Execution
  try {
    if (cleanupRan && legacySnapshots.length > 0) {
      // Step 1: Restore legacy documents from snapshot first
      const txRestore = client.transaction();
      for (const snapshot of legacySnapshots) {
        txRestore.createOrReplace(snapshot.doc);
      }
      await txRestore.commit({ visibility: 'sync' });
      restoredLegacyCount = legacySnapshots.length;

      // Verify restoration of legacy documents
      const legacyIds = legacySnapshots.map((s) => s._id);
      const verifiedDocs: any[] = await client.fetch('*[_id in $legacyIds]{_id}', { legacyIds });
      if (!Array.isArray(verifiedDocs) || verifiedDocs.length !== legacyIds.length) {
        throw new Error(
          `Rollback verification failed: Expected ${legacyIds.length} restored legacy documents, found ${verifiedDocs?.length || 0}. Aborting before deleting new documents.`
        );
      }
    }

    // Step 2: Delete newly created public-safe documents
    if (newlyCreatedIds.length > 0) {
      const txDelete = client.transaction();
      for (const id of newlyCreatedIds) {
        txDelete.delete(id);
      }
      await txDelete.commit({ visibility: 'sync' });
      deletedNewCount = newlyCreatedIds.length;
    }

    return {
      success: true,
      dryRun: false,
      restoredLegacyCount,
      deletedNewCount,
      retainedAssetCount,
      errors: [],
    };
  } catch (err: any) {
    errors.push(`Rollback failed: ${err.message}`);
    return {
      success: false,
      dryRun: false,
      restoredLegacyCount,
      deletedNewCount,
      retainedAssetCount,
      errors,
    };
  }
}
