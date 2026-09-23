/**
 * Main migration execution engine (Phase 3B).
 *
 * Implements the full end-to-end execution pipeline with strict safety gates:
 * 1. Preflight check (in-memory plan)
 * 2. Git safety check (clean working tree on feature branch)
 * 3. Source hash consistency check immediately before writes
 * 4. Logical dataset backup and empty dataset verification
 * 5. Target document snapshotting and type-collision abort
 * 6. Asset deduplication by full SHA-1 hash with ambiguity protection
 * 7. Single atomic 19-document transaction commit
 * 8. Post-write verification (narrow targeting + GROQ queries)
 * 9. Sanitized run manifest generation with partial-stage tracking
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PreflightResult,
  RunManifest,
  StageExecutionRecord,
  MigrationStageName,
  PlannedFieldNoteDoc,
  PlannedGalleryDoc,
  PlannedPhotoDoc,
  PlannedAsset,
  AssetUploadResult,
  DocumentSnapshotRecord,
  DatasetBackupManifest,
} from './types';
import { runPreflight } from './preflight';
import {
  getMigrationConfig,
  enforceGitCleanliness,
  getGitSafetyStatus,
  EXPECTED_BRANCH,
} from './config';
import { performDatasetBackup } from './backup';
import { snapshotExistingTargets } from './snapshot';
import { deduplicateAndUploadAssets } from './assetUploader';
import { commitDocumentsAtomically } from './documentWriter';
import { verifyMigration } from './postVerification';
import { saveRunManifest } from './manifest';

export interface ExecuteMigrationOptions {
  client?: any;
  preflightResult?: PreflightResult;
  dryRun?: boolean;
  requireGitClean?: boolean;
  allowAnyBranch?: boolean;
  contentDir?: string;
  publicDir?: string;
  backupDir?: string;
  manifestDir?: string;
  runId?: string;
}

export interface ExecutionResult {
  success: boolean;
  runId: string;
  manifest: RunManifest;
  manifestPath: string;
  error?: string;
}

/**
 * Computes the SHA-256 hash of a file on disk.
 */
function computeFileSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function executeMigration(
  options: ExecuteMigrationOptions = {}
): Promise<ExecutionResult> {
  const dryRun = options.dryRun !== false && !options.client;
  const requireGitClean = options.requireGitClean !== false;
  const allowAnyBranch = Boolean(options.allowAnyBranch);
  const runId = options.runId || `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const timestamp = new Date().toISOString();

  const cfg = getMigrationConfig(false);
  const client = options.client;

  const stages: StageExecutionRecord[] = [];
  function startStage(stage: MigrationStageName): StageExecutionRecord {
    const record: StageExecutionRecord = {
      stage,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
    };
    stages.push(record);
    return record;
  }

  function completeStage(record: StageExecutionRecord, details?: Record<string, any>) {
    record.status = 'completed';
    record.completedAt = new Date().toISOString();
    if (details) record.details = details;
  }

  function failStage(record: StageExecutionRecord, error: string) {
    record.status = 'failed';
    record.completedAt = new Date().toISOString();
    record.error = error;
  }

  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  let backupManifest: DatasetBackupManifest | undefined;
  let replacedSnapshots: DocumentSnapshotRecord[] = [];
  let newlyCreatedIds: string[] = [];
  let assetUploads: AssetUploadResult[] = [];
  const sourceHashes: Record<string, string> = {};

  try {
    // =========================================================================
    // Stage 1: Preflight Check (Amendment 6: Exact in-memory plan)
    // =========================================================================
    const preflightStage = startStage('preflight-check');
    const preflight: PreflightResult =
      options.preflightResult ||
      runPreflight({
        contentDir: options.contentDir,
        publicDir: options.publicDir,
      });

    if (!preflight.valid || preflight.blockingCount > 0) {
      const errMsg = `Preflight failed with ${preflight.blockingCount} blocking error(s). Execution aborted.`;
      failStage(preflightStage, errMsg);
      throw new Error(errMsg);
    }
    completeStage(preflightStage, {
      fieldNotes: preflight.plannedFieldNotes.length,
      galleries: preflight.plannedGalleries.length,
      photos: preflight.plannedPhotos.length,
      assets: preflight.plannedAssets.length,
    });

    // =========================================================================
    // Stage 2: Git Safety Check (Amendment 5)
    // =========================================================================
    const gitStage = startStage('git-safety-check');
    if (requireGitClean) {
      try {
        const gitInfo = enforceGitCleanliness(process.cwd(), allowAnyBranch);
        gitBranch = gitInfo.branch;
        gitCommit = gitInfo.commit;
        completeStage(gitStage, { branch: gitBranch, commit: gitCommit });
      } catch (err: any) {
        failStage(gitStage, err.message);
        throw err;
      }
    } else {
      const status = getGitSafetyStatus(process.cwd());
      gitBranch = status.branch;
      gitCommit = status.commit;
      completeStage(gitStage, {
        branch: gitBranch,
        commit: gitCommit,
        bypassedCleanRequirement: true,
      });
    }

    // =========================================================================
    // Stage 3: Source Hash Check (Amendment 5 & 6)
    // =========================================================================
    const sourceHashStage = startStage('source-hash-check');
    // Compute current hashes for all planned source assets
    for (const asset of preflight.plannedAssets) {
      if (!fs.existsSync(asset.canonicalPath)) {
        const errMsg = `Source image file missing: "${asset.canonicalPath}". Aborting execution.`;
        failStage(sourceHashStage, errMsg);
        throw new Error(errMsg);
      }
      const currentHash = computeFileSha256(asset.canonicalPath);
      if (currentHash !== asset.hash) {
        const errMsg = `Source hash changed for image "${asset.sourcePath}". Preflight hash "${asset.hash}" does not match current disk hash "${currentHash}". Aborting execution.`;
        failStage(sourceHashStage, errMsg);
        throw new Error(errMsg);
      }
      sourceHashes[asset.sourcePath] = currentHash;
    }
    completeStage(sourceHashStage, { verifiedSourceCount: Object.keys(sourceHashes).length });

    // In pure dry-run without client, we can conclude here or run mocked stages
    if (!client) {
      const manifest: RunManifest = {
        runId,
        timestamp,
        gitCommit,
        gitBranch,
        projectId: cfg.projectId,
        dataset: cfg.dataset,
        apiVersion: cfg.apiVersion,
        sourceContentHashes: sourceHashes,
        plannedDocumentIds: [
          ...preflight.plannedFieldNotes.map((n) => n._id),
          ...preflight.plannedGalleries.map((g) => g._id),
          ...preflight.plannedPhotos.map((p) => p._id),
        ],
        plannedAssetIds: preflight.plannedAssets.map((a) => a.targetAssetId),
        replacedDocumentSnapshots: [],
        newlyCreatedDocumentIds: [
          ...preflight.plannedFieldNotes.map((n) => n._id),
          ...preflight.plannedGalleries.map((g) => g._id),
          ...preflight.plannedPhotos.map((p) => p._id),
        ],
        assetUploads: preflight.plannedAssets.map((a) => ({
          sourcePath: a.sourcePath,
          canonicalPath: a.canonicalPath,
          sha256: a.hash,
          sha1: a.sha1,
          targetAssetId: a.targetAssetId,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          existedBeforeRun: false,
          uploadTimestamp: timestamp,
        })),
        stages,
        completedSuccessfully: true,
      };

      const manifestPath = saveRunManifest(manifest, options.manifestDir);
      return {
        success: true,
        runId,
        manifest,
        manifestPath,
      };
    }

    // =========================================================================
    // Stage 4: Dataset Backup (Amendment 4)
    // =========================================================================
    const backupStage = startStage('dataset-backup');
    try {
      backupManifest = await performDatasetBackup(client, {
        runId,
        projectId: cfg.projectId,
        dataset: cfg.dataset,
        apiVersion: cfg.apiVersion,
        backupDir: options.backupDir,
      });
      completeStage(backupStage, {
        documentCount: backupManifest.documentCount,
        verifiedEmpty: backupManifest.verifiedEmpty,
      });
    } catch (err: any) {
      failStage(backupStage, err.message);
      throw err;
    }

    // =========================================================================
    // Stage 5: Target Snapshot & Overwrite Protection (Amendment 9)
    // =========================================================================
    const snapshotStage = startStage('target-snapshot');
    const allPlannedDocs = [
      ...preflight.plannedFieldNotes,
      ...preflight.plannedGalleries,
      ...preflight.plannedPhotos,
    ];

    try {
      const snapshotResult = await snapshotExistingTargets(client, allPlannedDocs, {
        runId,
        snapshotDir: options.backupDir,
      });
      replacedSnapshots = snapshotResult.replacedSnapshots;
      newlyCreatedIds = snapshotResult.newlyCreatedIds;
      completeStage(snapshotStage, {
        replacedCount: replacedSnapshots.length,
        newlyCreatedCount: newlyCreatedIds.length,
      });
    } catch (err: any) {
      failStage(snapshotStage, err.message);
      throw err;
    }

    // =========================================================================
    // Stage 6: Asset Deduplication & Upload (Amendment 8)
    // =========================================================================
    const assetStage = startStage('asset-deduplication-and-upload');
    let assetProcessing;
    try {
      assetProcessing = await deduplicateAndUploadAssets(client, preflight.plannedAssets, {
        dryRun,
      });
      assetUploads = assetProcessing.results;
      completeStage(assetStage, {
        reusedCount: assetProcessing.reusedCount,
        uploadedCount: assetProcessing.uploadedCount,
      });
    } catch (err: any) {
      failStage(assetStage, err.message);
      throw err;
    }

    // =========================================================================
    // Stage 7: Atomic Document Transaction (Amendment 7)
    // =========================================================================
    const txStage = startStage('atomic-document-transaction');
    // Map asset IDs in planned documents if real asset IDs differ from preliminary
    const finalizedDocs = allPlannedDocs.map((doc: any) => {
      const cloned = JSON.parse(JSON.stringify(doc));
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

    try {
      const commitResult = await commitDocumentsAtomically(client, finalizedDocs, { dryRun });
      completeStage(txStage, {
        committedCount: commitResult.committedCount,
        transactionId: commitResult.transactionId,
      });
    } catch (err: any) {
      failStage(txStage, err.message);
      throw err;
    }

    // =========================================================================
    // Stage 8: Post-Write Verification (Amendments 3 & 11)
    // =========================================================================
    const verifyStage = startStage('post-write-verification');
    let postVerification;
    try {
      postVerification = await verifyMigration({
        client,
        plannedFieldNotes: preflight.plannedFieldNotes,
        plannedGalleries: preflight.plannedGalleries,
        plannedPhotos: preflight.plannedPhotos,
        plannedAssets: preflight.plannedAssets,
        assetUploads,
      });

      if (!postVerification.verified) {
        const failedChecks = postVerification.checks.filter((c) => !c.passed).map((c) => c.name);
        const errMsg = `Post-write verification failed: ${failedChecks.join(', ')}`;
        failStage(verifyStage, errMsg);
        throw new Error(errMsg);
      }
      completeStage(verifyStage, { verified: true });
    } catch (err: any) {
      failStage(verifyStage, err.message);
      throw err;
    }

    // =========================================================================
    // Stage 9: Manifest Finalization
    // =========================================================================
    const manifestStage = startStage('manifest-finalization');
    const manifest: RunManifest = {
      runId,
      timestamp,
      gitCommit,
      gitBranch,
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      sourceContentHashes: sourceHashes,
      plannedDocumentIds: allPlannedDocs.map((d) => d._id),
      plannedAssetIds: preflight.plannedAssets.map((a) => a.targetAssetId),
      backupManifest,
      replacedDocumentSnapshots: replacedSnapshots,
      newlyCreatedDocumentIds: newlyCreatedIds,
      assetUploads,
      stages,
      postVerification,
      completedSuccessfully: true,
    };

    const manifestPath = saveRunManifest(manifest, options.manifestDir);
    completeStage(manifestStage, { manifestPath });

    return {
      success: true,
      runId,
      manifest,
      manifestPath,
    };
  } catch (err: any) {
    // Ensure manifest is finalized and written even on partial failure (Amendment 7)
    const failedManifest: RunManifest = {
      runId,
      timestamp,
      gitCommit,
      gitBranch,
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      sourceContentHashes: sourceHashes,
      plannedDocumentIds: [],
      plannedAssetIds: [],
      backupManifest,
      replacedDocumentSnapshots: replacedSnapshots,
      newlyCreatedDocumentIds: newlyCreatedIds,
      assetUploads,
      stages,
      completedSuccessfully: false,
      error: err.message,
    };

    const manifestPath = saveRunManifest(failedManifest, options.manifestDir);
    return {
      success: false,
      runId,
      manifest: failedManifest,
      manifestPath,
      error: err.message,
    };
  }
}
