/**
 * Corrective migration executor for public root document visibility (Amendments 1-8).
 *
 * Implements:
 * - Pre-network public-safe root ID validation
 * - Target collision protection with resumable run recognition
 * - Two separate atomic transactions:
 *     A. Atomic creation of 19 public-safe documents
 *     B. Atomic deletion of 19 legacy period-based documents
 * - Pre-cleanup verification (authenticated scoped + anonymous public queries)
 * - External-reference cleanup guard before deleting legacy documents
 * - Post-cleanup verification (absence of legacy docs, presence of new docs, anonymous queries, image URLs)
 * - Full manifest completeness and rollback snapshots
 * - Zero asset uploads or deletions (100% asset reuse)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PreflightResult,
  RunManifest,
  StageExecutionRecord,
  MigrationStageName,
  DocumentSnapshotRecord,
  AssetUploadResult,
} from './types';
import { getMigrationConfig, enforceGitCleanliness, getGitSafetyStatus } from './config';
import { performDatasetBackup } from './backup';
import { deduplicateAndUploadAssets } from './assetUploader';
import { commitDocumentsAtomically } from './documentWriter';
import { validateAllPublicSafeRootIds } from './idValidator';
import { verifyPreCleanup, verifyPostCleanup } from './correctiveVerification';
import { compareCanonicalDocuments } from './canonicalDocument';

function computeFileSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export interface CorrectiveExecutionOptions {
  client: any;
  anonymousClient: any;
  preflightResult: PreflightResult;
  dryRun?: boolean;
  backupDir?: string;
  manifestDir?: string;
  requireGitClean?: boolean;
  allowAnyBranch?: boolean;
  httpFetchFn?: (url: string) => Promise<{ status: number; ok: boolean }>;
}

export interface CorrectiveExecutionResult {
  success: boolean;
  runId: string;
  manifest: RunManifest;
  manifestPath: string;
  error?: string;
}

export async function executeCorrectiveMigration(
  options: CorrectiveExecutionOptions
): Promise<CorrectiveExecutionResult> {
  const { client, anonymousClient, preflightResult: preflight, dryRun = false } = options;
  const timestamp = new Date().toISOString();
  const runId = `correction_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const cfg = getMigrationConfig(false);

  let gitCommit = 'HEAD';
  let gitBranch = 'fix/sanity-public-document-ids';
  try {
    const gitSafety = getGitSafetyStatus(process.cwd());
    if (gitSafety.commit) gitCommit = gitSafety.commit;
    if (gitSafety.branch) gitBranch = gitSafety.branch;
  } catch {
    // Fallback if not git repository in temp test dirs
  }

  // Compute all 19 planned public-safe document IDs
  const allPlannedDocs = [
    ...preflight.plannedFieldNotes,
    ...preflight.plannedGalleries,
    ...preflight.plannedPhotos,
  ];
  const plannedDocIds = allPlannedDocs.map((d) => d._id);
  const plannedAssetIds = preflight.plannedAssets.map((a) => a.targetAssetId);

  // Compute the 19 legacy period-based document IDs
  const legacyFieldNotes = preflight.plannedFieldNotes.map(
    (n) => n.legacyDocId || `fieldNote.${n.slug.current}`
  );
  const legacyGalleries = preflight.plannedGalleries.map(
    (g) => g.legacyDocId || `gallery.${g.slug.current}`
  );
  const legacyPhotos = preflight.plannedPhotos.map((p) => p.legacyDocId || p._id);
  const legacyDocIds = [...legacyFieldNotes, ...legacyGalleries, ...legacyPhotos];

  // =========================================================================
  // Amendment 2: Pre-Network Public-Safe Root ID Validation
  // =========================================================================
  const idValidation = validateAllPublicSafeRootIds(plannedDocIds);
  if (!idValidation.valid) {
    throw new Error(
      `Pre-network validation failed: Non-public document ID detected:\n${idValidation.errors.join('\n')}`
    );
  }

  const stages: StageExecutionRecord[] = [];
  const startStage = (stage: MigrationStageName): StageExecutionRecord => {
    const record: StageExecutionRecord = {
      stage,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
    };
    stages.push(record);
    return record;
  };

  const completeStage = (record: StageExecutionRecord, details?: Record<string, any>) => {
    record.status = 'completed';
    record.completedAt = new Date().toISOString();
    if (details) record.details = details;
  };

  const failStage = (record: StageExecutionRecord, error: string) => {
    record.status = 'failed';
    record.completedAt = new Date().toISOString();
    record.error = error;
  };

  let backupManifest;
  let legacySnapshots: DocumentSnapshotRecord[] = [];
  let assetUploads: AssetUploadResult[] = [];
  let creationTxId: string | undefined;
  let cleanupTxId: string | undefined;
  let cleanupStatus: 'pending' | 'completed' | 'skipped' = 'pending';
  let preCleanupVerif;
  let postCleanupVerif;
  let canonicalFingerprints: Array<{
    docId: string;
    expectedFingerprint: string;
    observedFingerprint: string;
    matched: boolean;
    differences?: string[];
  }> = [];

  try {
    // Stage 1: Preflight Check
    const preflightStage = startStage('preflight-check');
    if (!preflight.valid || preflight.blockingCount > 0) {
      const err = `Corrective migration blocked: Preflight failed with ${preflight.blockingCount} blocking error(s).`;
      failStage(preflightStage, err);
      throw new Error(err);
    }
    completeStage(preflightStage, {
      fieldNotes: preflight.plannedFieldNotes.length,
      galleries: preflight.plannedGalleries.length,
      photos: preflight.plannedPhotos.length,
      assets: preflight.plannedAssets.length,
    });

    // Stage 2: Git Safety Check
    const gitStage = startStage('git-safety-check');
    if (options.requireGitClean !== false && !dryRun) {
      try {
        enforceGitCleanliness(process.cwd());
      } catch (err: any) {
        failStage(gitStage, err.message);
        throw err;
      }
    }
    completeStage(gitStage, { dryRun });

    // Stage 3: Source Hash Check
    const hashStage = startStage('source-hash-check');
    for (const asset of preflight.plannedAssets) {
      if (!fs.existsSync(asset.canonicalPath)) {
        const errMsg = `Source image file missing: "${asset.canonicalPath}". Aborting execution.`;
        failStage(hashStage, errMsg);
        throw new Error(errMsg);
      }
      const currentHash = computeFileSha256(asset.canonicalPath);
      if (currentHash !== asset.hash) {
        const errMsg = `Source hash changed for image "${asset.sourcePath}". Preflight hash "${asset.hash}" does not match current disk hash "${currentHash}". Aborting execution.`;
        failStage(hashStage, errMsg);
        throw new Error(errMsg);
      }
    }
    completeStage(hashStage, { verifiedCount: preflight.plannedAssets.length });

    // Stage 4: Logical Dataset Backup (Requirement 5)
    const backupStage = startStage('dataset-backup');
    try {
      backupManifest = await performDatasetBackup(client, {
        runId,
        projectId: cfg.projectId,
        dataset: cfg.dataset,
        apiVersion: cfg.apiVersion,
        gitCommit,
        backupDir: options.backupDir,
      });
      completeStage(backupStage, {
        documentCount: backupManifest.documentCount,
        verifiedEmpty: backupManifest.verifiedEmpty,
        snapshotSha256: backupManifest.snapshotSha256,
      });
    } catch (err: any) {
      failStage(backupStage, err.message);
      throw err;
    }

    // Stage 5: Asset Deduplication & 100% Reuse Check
    const assetStage = startStage('asset-deduplication-and-upload');
    let assetProcessing;
    try {
      assetProcessing = await deduplicateAndUploadAssets(client, preflight.plannedAssets, {
        dryRun,
      });
      assetUploads = assetProcessing.results;

      // In corrective migration, 100% of the 8 assets must be reused (0 uploads)
      if (!dryRun && assetProcessing.uploadedCount > 0) {
        throw new Error(
          `Unexpected asset upload in corrective migration: ${assetProcessing.uploadedCount} assets were uploaded instead of reused.`
        );
      }

      completeStage(assetStage, {
        reusedCount: assetProcessing.reusedCount,
        uploadedCount: assetProcessing.uploadedCount,
      });
    } catch (err: any) {
      failStage(assetStage, err.message);
      throw err;
    }

    // Finalize planned documents with resolved asset IDs
    const finalizedDocs = allPlannedDocs.map((doc: any) => {
      const cloned = JSON.parse(JSON.stringify(doc));
      delete cloned.legacyDocId;
      if (cloned._type === 'fieldNote' && cloned.featuredImage?.asset?._ref) {
        const resolved = assetProcessing.assetIdMap.get(cloned.featuredImage.asset._ref);
        if (resolved) cloned.featuredImage.asset._ref = resolved;
      }
      if (cloned._type === 'gallery' && cloned.coverImage?.asset?._ref) {
        const resolved = assetProcessing.assetIdMap.get(cloned.coverImage.asset._ref);
        if (resolved) cloned.coverImage.asset._ref = resolved;
      }
      if (cloned._type === 'photo' && cloned.targetAssetRef) {
        const resolved = assetProcessing.assetIdMap.get(cloned.targetAssetRef);
        if (resolved) cloned.image = { _type: 'image', asset: { _type: 'reference', _ref: resolved } };
        delete cloned.targetAssetRef;
        delete cloned.assetSourcePath;
      }
      return cloned;
    });

    // Stage 6: Target Collision Check & Legacy Document Snapshotting (Requirements 1 & 2)
    const snapshotStage = startStage('target-snapshot');
    try {
      // 6A: Collision Protection & Canonical Content Resumability Check on proposed public-safe IDs
      let existingTargetDocs: any[] = [];
      try {
        existingTargetDocs = await client.fetch('*[_id in $plannedDocIds]', {
          plannedDocIds,
        });
      } catch (err: any) {
        throw new Error(`Failed querying target documents for collision check: ${err.message}`);
      }

      if (Array.isArray(existingTargetDocs) && existingTargetDocs.length > 0) {
        for (const existing of existingTargetDocs) {
          const planned = finalizedDocs.find((d: any) => d._id === existing._id);
          if (!planned) {
            throw new Error(`Unexpected document collision: Target document "${existing._id}" already exists.`);
          }

          // Exact canonical authored comparison across all document types (Field Notes, Galleries, Photos)
          const comparison = compareCanonicalDocuments(planned, existing);
          canonicalFingerprints.push({
            docId: existing._id,
            expectedFingerprint: comparison.expectedFingerprint,
            observedFingerprint: comparison.observedFingerprint,
            matched: comparison.match,
            differences: comparison.differences,
          });

          if (!comparison.match) {
            const diffSummary = comparison.differences.join('; ');
            throw new Error(
              `Collision abort: Document "${existing._id}" already exists but does not match planned canonical authored document (expected ${comparison.expectedFingerprint}, observed ${comparison.observedFingerprint}). Differences: ${diffSummary}. Overwriting or continuing is strictly forbidden.`
            );
          }
        }
      }

      // 6B: Snapshot existing legacy period-based documents for rollback safety
      let existingLegacyDocs: any[] = [];
      try {
        existingLegacyDocs = await client.fetch('*[_id in $legacyDocIds]', { legacyDocIds });
      } catch (err: any) {
        throw new Error(`Failed fetching legacy documents for snapshot: ${err.message}`);
      }

      if (Array.isArray(existingLegacyDocs)) {
        for (const doc of existingLegacyDocs) {
          legacySnapshots.push({
            _id: doc._id,
            _type: doc._type,
            doc,
          });
        }
      }

      const backupDir = options.backupDir || path.resolve(process.cwd(), 'migration-backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const legacySnapshotPath = path.join(backupDir, `legacy-snapshot-${runId}.json`);
      fs.writeFileSync(
        legacySnapshotPath,
        JSON.stringify({ runId, timestamp, count: legacySnapshots.length, documents: legacySnapshots }, null, 2),
        'utf-8'
      );

      completeStage(snapshotStage, {
        existingTargetCount: existingTargetDocs.length,
        legacySnapshotsCount: legacySnapshots.length,
        canonicalMatchesCount: canonicalFingerprints.filter((f) => f.matched).length,
      });
    } catch (err: any) {
      failStage(snapshotStage, err.message);
      throw err;
    }

    // Stage 7: Transaction A — Atomic Document Creation (Amendment 5)
    const txAStage = startStage('atomic-document-transaction');
    try {
      // Recheck local source hashes immediately before Transaction A (Requirement 4)
      for (const asset of preflight.plannedAssets) {
        if (!fs.existsSync(asset.canonicalPath)) {
          throw new Error(
            `Source image file missing immediately before Transaction A: "${asset.canonicalPath}". Aborting execution.`
          );
        }
        const currentHash = computeFileSha256(asset.canonicalPath);
        if (currentHash !== asset.hash) {
          throw new Error(
            `Source hash changed for image "${asset.sourcePath}" immediately before Transaction A. Expected "${asset.hash}", found "${currentHash}". Aborting execution.`
          );
        }
      }

      const commitResult = await commitDocumentsAtomically(client, finalizedDocs, { dryRun });
      creationTxId = commitResult.transactionId;
      completeStage(txAStage, {
        committedCount: commitResult.committedCount,
        transactionId: creationTxId,
      });
    } catch (err: any) {
      failStage(txAStage, err.message);
      throw err;
    }

    // Stage 8: Pre-Cleanup Verification (Amendment 6)
    const preVerifStage = startStage('pre-cleanup-verification');
    try {
      preCleanupVerif = await verifyPreCleanup({
        client,
        anonymousClient,
        plannedFieldNotes: preflight.plannedFieldNotes,
        plannedGalleries: preflight.plannedGalleries,
        plannedPhotos: preflight.plannedPhotos,
        plannedAssets: preflight.plannedAssets,
        legacyDocIds,
        assetUploads,
      });

      if (!preCleanupVerif.verified) {
        const failed = preCleanupVerif.checks.filter((c) => !c.passed).map((c) => c.name);
        const errMsg = `Pre-cleanup verification failed: ${failed.join(', ')}`;
        failStage(preVerifStage, errMsg);
        throw new Error(errMsg);
      }
      completeStage(preVerifStage, { verified: true });
    } catch (err: any) {
      failStage(preVerifStage, err.message);
      throw err;
    }

    // Stage 9: Legacy Reference Check before Cleanup (Amendment 4)
    const refCheckStage = startStage('legacy-reference-check');
    try {
      const legacyIdSet = new Set(legacyDocIds);

      // Query any document in Sanity referencing any legacy ID
      let referencingDocs: any[] = [];
      try {
        referencingDocs = await client.fetch('*[references($legacyDocIds)]{_id, _type}', { legacyDocIds });
      } catch (err: any) {
        throw new Error(`Failed querying legacy references: ${err.message}`);
      }

      if (Array.isArray(referencingDocs)) {
        for (const doc of referencingDocs) {
          // If referencing doc is outside the 19 legacy documents, abort cleanup!
          if (!legacyIdSet.has(doc._id)) {
            throw new Error(
              `Cleanup aborted: Legacy document is referenced by external document "${doc._id}" (_type: "${doc._type}").`
            );
          }
        }
      }

      // Confirm all new galleries point only to new public-safe photo IDs
      for (const gal of preflight.plannedGalleries) {
        for (const ref of gal.photos) {
          if (legacyIdSet.has(ref._ref)) {
            throw new Error(
              `Cleanup aborted: New gallery "${gal._id}" references legacy photo ID "${ref._ref}".`
            );
          }
          if (ref._ref.includes('.')) {
            throw new Error(
              `Cleanup aborted: New gallery "${gal._id}" references non-public-safe photo ID "${ref._ref}".`
            );
          }
        }
      }

      completeStage(refCheckStage, { verifiedSafe: true });
    } catch (err: any) {
      failStage(refCheckStage, err.message);
      throw err;
    }

    // Stage 10: Transaction B — Atomic Deletion of Legacy Period Documents (Amendment 5)
    const cleanupStage = startStage('legacy-document-cleanup');
    try {
      if (dryRun) {
        cleanupStatus = 'completed';
        completeStage(cleanupStage, { dryRun: true, plannedDeletions: legacyDocIds.length });
      } else {
        const txB = client.transaction();
        for (const id of legacyDocIds) {
          txB.delete(id);
        }
        const cleanupCommit = await txB.commit({ visibility: 'sync' });
        cleanupTxId = cleanupCommit.transactionId;
        cleanupStatus = 'completed';
        completeStage(cleanupStage, {
          deletedCount: legacyDocIds.length,
          transactionId: cleanupTxId,
        });
      }
    } catch (err: any) {
      cleanupStatus = 'skipped';
      failStage(cleanupStage, err.message);
      throw err;
    }

    // Stage 11: Post-Cleanup Verification (Amendment 6)
    const postVerifStage = startStage('post-cleanup-verification');
    try {
      postCleanupVerif = await verifyPostCleanup({
        client,
        anonymousClient,
        plannedFieldNotes: preflight.plannedFieldNotes,
        plannedGalleries: preflight.plannedGalleries,
        plannedPhotos: preflight.plannedPhotos,
        plannedAssets: preflight.plannedAssets,
        legacyDocIds,
        assetUploads,
        httpFetchFn: options.httpFetchFn,
      });

      if (!postCleanupVerif.verified && !dryRun) {
        const failed = postCleanupVerif.checks.filter((c) => !c.passed).map((c) => c.name);
        const errMsg = `Post-cleanup verification failed: ${failed.join(', ')}`;
        failStage(postVerifStage, errMsg);
        throw new Error(errMsg);
      }
      completeStage(postVerifStage, { verified: true });
    } catch (err: any) {
      failStage(postVerifStage, err.message);
      throw err;
    }

    // Stage 12: Manifest Finalization (Amendment 8)
    const manifestStage = startStage('manifest-finalization');
    const manifest: RunManifest = {
      runId,
      timestamp,
      gitCommit,
      gitBranch,
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      sourceContentHashes: preflight.plannedAssets.reduce((acc, a) => {
        acc[a.sourcePath] = a.hash;
        return acc;
      }, {} as Record<string, string>),
      plannedDocumentIds: plannedDocIds,
      plannedAssetIds,
      legacyDocumentIds: legacyDocIds,
      newDocumentIds: plannedDocIds,
      reusedAssetIds: plannedAssetIds,
      canonicalFingerprints,
      creationTransactionId: creationTxId,
      cleanupTransactionId: cleanupTxId,
      cleanupStatus,
      backupManifest,
      replacedDocumentSnapshots: legacySnapshots,
      legacyDocumentSnapshots: legacySnapshots,
      newlyCreatedDocumentIds: plannedDocIds,
      assetUploads,
      stages,
      preCleanupVerification: preCleanupVerif,
      postCleanupVerification: postCleanupVerif,
      completedSuccessfully: true,
    };

    const manifestDir = options.manifestDir || path.resolve(process.cwd(), 'migration-manifests');
    if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }
    const manifestPath = path.join(manifestDir, `manifest-${runId}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    completeStage(manifestStage, { manifestPath });

    return {
      success: true,
      runId,
      manifest,
      manifestPath,
    };
  } catch (err: any) {
    // Record failed manifest with complete planned IDs (Amendment 8)
    const failedManifest: RunManifest = {
      runId,
      timestamp,
      gitCommit,
      gitBranch,
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      sourceContentHashes: {},
      plannedDocumentIds: plannedDocIds,
      plannedAssetIds,
      legacyDocumentIds: legacyDocIds,
      newDocumentIds: plannedDocIds,
      reusedAssetIds: plannedAssetIds,
      canonicalFingerprints,
      creationTransactionId: creationTxId,
      cleanupTransactionId: cleanupTxId,
      cleanupStatus,
      backupManifest,
      replacedDocumentSnapshots: legacySnapshots,
      legacyDocumentSnapshots: legacySnapshots,
      newlyCreatedDocumentIds: creationTxId ? plannedDocIds : [],
      assetUploads,
      stages,
      preCleanupVerification: preCleanupVerif,
      postCleanupVerification: postCleanupVerif,
      completedSuccessfully: false,
      error: err.message,
    };

    const manifestDir = options.manifestDir || path.resolve(process.cwd(), 'migration-manifests');
    if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }
    const manifestPath = path.join(manifestDir, `manifest-${runId}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(failedManifest, null, 2), 'utf-8');

    return {
      success: false,
      runId,
      manifest: failedManifest,
      manifestPath,
      error: err.message,
    };
  }
}
