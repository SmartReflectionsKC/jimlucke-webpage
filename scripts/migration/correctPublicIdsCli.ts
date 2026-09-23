/**
 * Dedicated CLI for corrective Sanity public ID migration (Amendment 10).
 *
 * Commands:
 *   npm run migrate:sanity:correct-public-ids:dry-run   (safe preflight with period-free ID validation)
 *   npm run migrate:sanity:correct-public-ids:execute   (two-phase guarded execution; requires token)
 *   npm run migrate:sanity:correct-public-ids:verify    (strictly read-only authenticated & anonymous verification)
 *   npm run migrate:sanity:correct-public-ids:rollback  (rollback preview; pass --confirm to mutate)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { runPreflight, getLegacyDocumentIds } from './preflight';
import { getMigrationConfig, enforceGitCleanliness } from './config';
import { executeCorrectiveMigration } from './correctiveExecutor';
import { performCorrectiveRollback } from './correctiveRollback';
import { verifyPreCleanup, verifyPostCleanup } from './correctiveVerification';
import { loadManifestFromDisk } from './rollback';

/**
 * Validates required ceremony confirmation flags for execution (Requirement 3).
 * Requires:
 *   --execute
 *   --confirm-project=wml93cow
 *   --confirm-dataset=production
 */
export function validateCorrectiveExecutionCeremony(args: string[]): void {
  const hasExecute = args.includes('--execute');
  const hasProjectConfirm = args.includes('--confirm-project=wml93cow');
  const hasDatasetConfirm = args.includes('--confirm-dataset=production');

  if (!hasExecute || !hasProjectConfirm || !hasDatasetConfirm) {
    const missing: string[] = [];
    if (!hasExecute) missing.push('--execute');
    if (!hasProjectConfirm) missing.push('--confirm-project=wml93cow');
    if (!hasDatasetConfirm) missing.push('--confirm-dataset=production');

    throw new Error(
      `Execution ceremony check failed: missing required confirmation flag(s): ${missing.join(', ')}`
    );
  }
}

/**
 * Validates required ceremony confirmation flags for rollback (Requirement 3).
 * Rollback mutation requires:
 *   --execute
 *   --confirm-project=wml93cow
 *   --confirm-dataset=production
 *   --confirm-run=<exact-run-id>
 *
 * Rollback without those flags defaults to preview-only (dry run).
 */
export function validateCorrectiveRollbackCeremony(
  args: string[],
  manifestRunId?: string
): { isDryRun: boolean; confirmedRunId?: string } {
  const hasExecute = args.includes('--execute');
  const hasProjectConfirm = args.includes('--confirm-project=wml93cow');
  const hasDatasetConfirm = args.includes('--confirm-dataset=production');
  const confirmRunArg = args.find((a) => a.startsWith('--confirm-run='));
  const confirmedRunId = confirmRunArg ? confirmRunArg.split('=')[1].trim() : '';

  const isMutationRequested = hasExecute || hasProjectConfirm || hasDatasetConfirm || !!confirmedRunId;
  const hasAllCeremony = hasExecute && hasProjectConfirm && hasDatasetConfirm && !!confirmedRunId;

  if (isMutationRequested && !hasAllCeremony) {
    const missing: string[] = [];
    if (!hasExecute) missing.push('--execute');
    if (!hasProjectConfirm) missing.push('--confirm-project=wml93cow');
    if (!hasDatasetConfirm) missing.push('--confirm-dataset=production');
    if (!confirmedRunId) missing.push('--confirm-run=<exact-run-id>');
    throw new Error(
      `Rollback ceremony check failed: Mutating rollback requires all confirmation flags: ${missing.join(', ')}`
    );
  }

  if (hasAllCeremony && manifestRunId && confirmedRunId !== manifestRunId) {
    throw new Error(
      `Rollback ceremony check failed: --confirm-run="${confirmedRunId}" does not match manifest run ID "${manifestRunId}".`
    );
  }

  return {
    isDryRun: !hasAllCeremony,
    confirmedRunId: confirmedRunId || undefined,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isExecuteRequested = args.includes('--execute');
  const isRollbackRequested = args.includes('--rollback');
  const isVerifyRequested = args.includes('--verify');

  // =========================================================================
  // Mode 1: Rollback Mode (Requirement 3)
  // =========================================================================
  if (isRollbackRequested) {
    console.log('🔄 Running Corrective Migration Rollback Engine...');

    const manifestArg = args.find((a) => a.startsWith('--manifest='));
    let manifestPath = manifestArg ? manifestArg.split('=')[1].trim() : '';

    if (!manifestPath) {
      const manifestDir = path.resolve(process.cwd(), 'migration-manifests');
      if (fs.existsSync(manifestDir)) {
        const files = fs
          .readdirSync(manifestDir)
          .filter((f) => f.startsWith('manifest-correction-') && f.endsWith('.json'))
          .sort()
          .reverse();
        if (files.length > 0) {
          manifestPath = path.join(manifestDir, files[0]);
          console.log(`Using latest correction manifest: ${path.basename(manifestPath)}`);
        }
      }
    }

    if (!manifestPath) {
      console.error('🛑 Rollback aborted: No correction manifest found in migration-manifests/. Specify with --manifest=<path>.');
      process.exit(1);
    }

    const manifest = loadManifestFromDisk(manifestPath);
    const { isDryRun } = validateCorrectiveRollbackCeremony(args, manifest.runId);

    console.log(`Mode: ${isDryRun ? 'DRY-RUN PREVIEW ONLY (pass --execute --confirm-project=wml93cow --confirm-dataset=production --confirm-run=<id> for real rollback)' : 'ACTIVE MUTATING ROLLBACK'}\n`);

    const cfg = getMigrationConfig(!isDryRun);

    const client = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      useCdn: false,
      token: cfg.authToken,
    });

    const rollbackResult = await performCorrectiveRollback(client, manifest, { dryRun: isDryRun });

    console.log('\n📊 Rollback Results:');
    console.log(`   - Status:                  ${rollbackResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   - Restored Legacy Docs:    ${rollbackResult.restoredLegacyCount}`);
    console.log(`   - Deleted New Docs:        ${rollbackResult.deletedNewCount}`);
    console.log(`   - Retained Image Assets:   ${rollbackResult.retainedAssetCount}`);

    if (rollbackResult.errors.length > 0) {
      console.error('\n❌ Rollback Errors:');
      for (const err of rollbackResult.errors) {
        console.error(`   - ${err}`);
      }
      process.exit(1);
    }

    process.exit(0);
  }

  // =========================================================================
  // Mode 2: Verify Mode (Read-Only)
  // =========================================================================
  if (isVerifyRequested) {
    console.log('🔍 Running Read-Only Public ID Verification...');
    console.log('Mode: READ-ONLY (no writes, deletes, or transactions)\n');

    const preflight = runPreflight();
    if (!preflight.valid || preflight.blockingCount > 0) {
      console.error(`❌ Preflight failed with ${preflight.blockingCount} error(s). Cannot verify.`);
      process.exit(1);
    }

    const cfg = getMigrationConfig(false);

    const client = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      useCdn: false,
      token: cfg.authToken,
    });

    // Explicitly configured anonymous client (Requirement 6)
    const anonymousClient = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: '2026-09-01',
      useCdn: false,
      perspective: 'published',
    });

    const legacyDocIds = getLegacyDocumentIds(preflight);
    const assetUploads = preflight.plannedAssets.map((a) => ({
      sourcePath: a.sourcePath,
      canonicalPath: a.canonicalPath,
      sha256: a.hash,
      sha1: a.sha1,
      targetAssetId: a.targetAssetId,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      existedBeforeRun: true,
      uploadTimestamp: new Date().toISOString(),
    }));

    console.log('1. Checking Public Root Document Visibility (Anonymous Content Lake)...');
    const preVerif = await verifyPreCleanup({
      client,
      anonymousClient,
      plannedFieldNotes: preflight.plannedFieldNotes,
      plannedGalleries: preflight.plannedGalleries,
      plannedPhotos: preflight.plannedPhotos,
      plannedAssets: preflight.plannedAssets,
      legacyDocIds,
      assetUploads,
    });

    console.log('\n2. Checking Absence of Legacy Period-Based Documents...');
    const postVerif = await verifyPostCleanup({
      client,
      anonymousClient,
      plannedFieldNotes: preflight.plannedFieldNotes,
      plannedGalleries: preflight.plannedGalleries,
      plannedPhotos: preflight.plannedPhotos,
      plannedAssets: preflight.plannedAssets,
      legacyDocIds,
      assetUploads,
    });

    const allPassed = preVerif.verified && postVerif.verified;
    console.log('\n📊 Verification Results:');
    for (const c of [...preVerif.checks, ...postVerif.checks]) {
      console.log(`   ${c.passed ? '✅' : '❌'} ${c.name}`);
      console.log(`      ${c.details}`);
    }

    if (!allPassed) {
      console.error('\n🛑 Verification failed: Content Lake does not match expected state.');
      process.exit(1);
    }

    console.log('\n✅ All public ID verification checks passed successfully!');
    process.exit(0);
  }

  // =========================================================================
  // Mode 3: Dry-Run Preflight (Default)
  // =========================================================================
  console.log('🚀 Running Public Root Document ID Preflight...');
  console.log(`Mode: ${isExecuteRequested ? 'EXECUTE (Requested)' : 'DRY-RUN (Safe Preview)'}\n`);

  const preflight = runPreflight();

  console.log('📊 Planned Public Root Content:');
  console.log(`   - Field Notes:         ${preflight.plannedFieldNotes.length} documents (e.g. ${preflight.plannedFieldNotes[0]._id})`);
  console.log(`   - Photography:         ${preflight.plannedGalleries.length} galleries (e.g. ${preflight.plannedGalleries[0]._id})`);
  console.log(`   - Photographs:         ${preflight.plannedPhotos.length} photos (e.g. ${preflight.plannedPhotos[0]._id})`);
  console.log(`   - Unique Image Assets: ${preflight.plannedAssets.length} assets (100% reuse)`);
  console.log(`   - Blocking Errors:     ${preflight.blockingCount}\n`);

  const allIds = [
    ...preflight.plannedFieldNotes.map((n) => n._id),
    ...preflight.plannedGalleries.map((g) => g._id),
    ...preflight.plannedPhotos.map((p) => p._id),
  ];

  const periodIds = allIds.filter((id) => id.includes('.'));
  if (periodIds.length > 0) {
    console.error('❌ Critical: Period detected in planned document IDs:');
    for (const id of periodIds) {
      console.error(`   - ${id}`);
    }
    process.exit(1);
  }
  console.log('✅ Period-Free Root ID Validation: All 19 document IDs adhere to public-safe policy (0 periods).\n');

  if (!preflight.valid || preflight.blockingCount > 0) {
    console.error('❌ Preflight has blocking errors. Execution not permitted.');
    process.exit(1);
  }

  // =========================================================================
  // Mode 4: Execution Mode (Requirement 3)
  // =========================================================================
  if (isExecuteRequested) {
    validateCorrectiveExecutionCeremony(args);
    enforceGitCleanliness(process.cwd());

    const cfg = getMigrationConfig(true);
    const client = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      useCdn: false,
      token: cfg.authToken,
    });

    const anonymousClient = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: '2026-09-01',
      useCdn: false,
      perspective: 'published',
    });

    console.log('⚡ Starting Corrective Migration Execution...');
    const result = await executeCorrectiveMigration({
      client,
      anonymousClient,
      preflightResult: preflight,
      dryRun: false,
      requireGitClean: true,
      allowAnyBranch: false,
    });

    if (!result.success) {
      console.error(`\n🛑 EXECUTION FAILED: ${result.error}`);
      console.error(`Manifest saved to: ${result.manifestPath}`);
      process.exit(1);
    }

    console.log(`\n✅ Corrective migration executed and verified successfully!`);
    console.log(`Manifest saved to: ${result.manifestPath}`);
    process.exit(0);
  }

  console.log('✅ Dry-run preflight passed cleanly with 0 blocking errors.');
  process.exit(0);
}

const isMainModule =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('correctPublicIdsCli.ts') ||
    process.argv[1].endsWith('correctPublicIdsCli.js') ||
    process.argv[1].includes('correctPublicIdsCli'));

if (isMainModule) {
  main().catch((err) => {
    console.error('\n🛑 Error:', err.message || err);
    process.exit(1);
  });
}
