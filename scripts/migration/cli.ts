/**
 * CLI entrypoint for Sanity content migration (Phases 3A & 3B).
 *
 * Usage:
 *   npm run migrate:sanity:dry-run   (runs preflight without writes)
 *   npm run migrate:sanity:execute   (requires --execute and SANITY_AUTH_TOKEN; fails closed if preflight fails)
 *   npm run migrate:sanity:verify    (strictly read-only post-migration verification; zero writes/mutations)
 *   npm run migrate:sanity:rollback  (rolls back migration; requires --confirm for active rollback)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { runPreflight } from './preflight';
import { generateMigrationReport } from './report';
import {
  getMigrationConfig,
  validateExecutionCeremony,
  enforceGitCleanliness,
} from './config';
import { executeMigration } from './executor';
import { performRollback, loadManifestFromDisk } from './rollback';
import { verifyMigration } from './postVerification';
import { AssetUploadResult } from './types';

async function main() {
  const args = process.argv.slice(2);
  const isExecuteRequested = args.includes('--execute');
  const isRollbackRequested = args.includes('--rollback');
  const isVerifyRequested = args.includes('--verify');

  // =========================================================================
  // Command 0: Read-Only Verification Mode
  // =========================================================================
  if (isVerifyRequested) {
    console.log('🔍 Running Read-Only Post-Migration Verification...');
    console.log('Mode: READ-ONLY VERIFICATION (no writes, transactions, or uploads)\n');

    // Run preflight to obtain planned documents and assets
    const preflightResult = runPreflight();
    if (preflightResult.blockingCount > 0) {
      console.error(`❌ Preflight failed with ${preflightResult.blockingCount} blocking error(s). Cannot verify.`);
      process.exit(1);
    }

    // Safely load migration config (never prints secrets)
    const cfg = getMigrationConfig(false);

    const client = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      useCdn: false,
      token: cfg.authToken,
    });

    // Locate manifest if available to get asset upload records
    const manifestArg = args.find((a) => a.startsWith('--manifest='));
    let manifestPath = manifestArg ? manifestArg.split('=')[1].trim() : '';

    if (!manifestPath) {
      const manifestDir = path.resolve(process.cwd(), 'migration-manifests');
      if (fs.existsSync(manifestDir)) {
        const files = fs
          .readdirSync(manifestDir)
          .filter((f) => f.startsWith('manifest-') && f.endsWith('.json'))
          .sort()
          .reverse();
        if (files.length > 0) {
          manifestPath = path.join(manifestDir, files[0]);
        }
      }
    }

    let assetUploads: AssetUploadResult[] = [];
    if (manifestPath && fs.existsSync(manifestPath)) {
      try {
        const manifest = loadManifestFromDisk(manifestPath);
        if (Array.isArray(manifest.assetUploads) && manifest.assetUploads.length > 0) {
          assetUploads = manifest.assetUploads;
          console.log(`Using asset upload records from manifest: ${path.basename(manifestPath)}`);
        }
      } catch (err: any) {
        console.warn(`Warning: Could not read manifest at ${manifestPath}: ${err.message}`);
      }
    }

    if (assetUploads.length === 0) {
      assetUploads = preflightResult.plannedAssets.map((a) => ({
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
    }

    console.log(`Verifying target dataset "${cfg.dataset}" in project "${cfg.projectId}"...\n`);

    const verification = await verifyMigration({
      client,
      plannedFieldNotes: preflightResult.plannedFieldNotes,
      plannedGalleries: preflightResult.plannedGalleries,
      plannedPhotos: preflightResult.plannedPhotos,
      plannedAssets: preflightResult.plannedAssets,
      assetUploads,
      maxRetries: 3,
      retryDelayMs: 500,
    });

    console.log('📊 Post-Migration Verification Results:');
    for (const check of verification.checks) {
      const icon = check.passed ? '✅' : '❌';
      console.log(`   ${icon} ${check.name}`);
      console.log(`      ${check.details}`);
    }

    if (!verification.verified) {
      console.error('\n🛑 Verification failed: Mismatches found in Sanity dataset.');
      process.exit(1);
    }

    console.log('\n✅ All post-migration verification checks passed successfully!');
    process.exit(0);
  }

  // =========================================================================
  // Command 1: Rollback Mode
  // =========================================================================
  if (isRollbackRequested) {
    console.log('🔄 Running Sanity Migration Rollback Engine...');
    const isDryRun = !args.includes('--confirm');
    console.log(`Mode: ${isDryRun ? 'DRY-RUN PREVIEW (pass --confirm for real rollback)' : 'ACTIVE ROLLBACK'}\n`);

    // Locate manifest
    const manifestArg = args.find((a) => a.startsWith('--manifest='));
    let manifestPath = manifestArg ? manifestArg.split('=')[1].trim() : '';

    if (!manifestPath) {
      const manifestDir = path.resolve(process.cwd(), 'migration-manifests');
      if (fs.existsSync(manifestDir)) {
        const files = fs
          .readdirSync(manifestDir)
          .filter((f) => f.startsWith('manifest-') && f.endsWith('.json'))
          .sort()
          .reverse();
        if (files.length > 0) {
          manifestPath = path.join(manifestDir, files[0]);
          console.log(`Using latest manifest: ${manifestPath}`);
        }
      }
    }

    if (!manifestPath) {
      console.error('🛑 Rollback aborted: No manifest file specified or found in migration-manifests/. Specify with --manifest=<path>.');
      process.exit(1);
    }

    const manifest = loadManifestFromDisk(manifestPath);
    const cfg = getMigrationConfig(true); // requires token

    const client = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      useCdn: false,
      token: cfg.authToken,
    });

    const rollbackResult = await performRollback(client, manifest, { dryRun: isDryRun });

    console.log('\n📊 Rollback Results:');
    console.log(`   - Status:                  ${rollbackResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   - Restored Documents:      ${rollbackResult.restoredDocumentCount}`);
    console.log(`   - Deleted Documents:       ${rollbackResult.deletedDocumentCount}`);
    console.log(`   - Deleted Assets:          ${rollbackResult.deletedAssetCount}`);
    console.log(`   - Retained (Referenced):   ${rollbackResult.retainedAssetCount}`);
    console.log(`   - Retained (Reused/Prior): ${rollbackResult.retainedReusedAssetCount}`);

    if (rollbackResult.manualReviewAssets.length > 0) {
      console.log('\n⚠️  Assets Retained for Manual Review:');
      for (const assetId of rollbackResult.manualReviewAssets) {
        console.log(`   - ${assetId}`);
      }
    }

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
  // Command 2: Preflight (Always runs in-memory first)
  // =========================================================================
  console.log('🚀 Running Sanity Migration Preflight...');
  console.log(`Mode: ${isExecuteRequested ? 'EXECUTE (Requested)' : 'DRY-RUN (Safe Preflight)'}\n`);

  const preflightResult = runPreflight();
  const { markdownReportPath, jsonReportPath, reportData } =
    generateMigrationReport(preflightResult);

  console.log(`📄 Dry-run reports generated:`);
  console.log(`   - Markdown: ${markdownReportPath}`);
  console.log(`   - JSON:     ${jsonReportPath}\n`);

  console.log('📊 Summary of Planned Content:');
  console.log(`   - Field Notes:         ${reportData.summary.fieldNoteCount} documents`);
  console.log(`   - Photography:         ${reportData.summary.galleryCount} galleries`);
  console.log(`   - Photographs:         ${reportData.summary.photoCount} photos`);
  console.log(`   - Unique Image Assets: ${reportData.summary.uniqueAssetCount} assets`);
  console.log(`   - Warnings:            ${reportData.summary.warningCount}`);
  console.log(`   - Blocking Errors:     ${reportData.summary.blockingErrorCount}\n`);

  if (reportData.zeroByteFiles.length > 0) {
    console.log('⚠️  Zero-Byte Image Files Detected:');
    for (const z of reportData.zeroByteFiles) {
      console.log(`   - ${z.imagePath}: referenced by ${z.referencedBy.map((r) => `${r.documentId} (${r.role})`).join(', ')}`);
    }
    console.log('');
  }

  if (reportData.h1Findings.length > 0) {
    console.log('⚠️  Body-Level H1 Headings Detected:');
    for (const h of reportData.h1Findings) {
      console.log(`   - [${h.file}:${h.line}] "${h.headingText}"`);
      console.log(`     Resolution: ${h.recommendedResolution}`);
    }
    console.log('');
  }

  if (reportData.blockingErrors.length > 0) {
    console.error('❌ Blocking Preflight Errors:');
    reportData.blockingErrors.forEach((err, idx) => {
      console.error(`   ${idx + 1}. [${err.category}] in ${err.file}${err.line ? `:${err.line}` : ''}: ${err.message}`);
      if (err.recommendedResolution) {
        console.error(`      -> Resolution: ${err.recommendedResolution}`);
      }
    });
    console.error('\n🚫 Execution is NOT permitted until all blocking errors are resolved.');
    process.exit(1);
  }

  // =========================================================================
  // Command 3: Execution Request Handling
  // =========================================================================
  if (isExecuteRequested) {
    // 1. Ceremony verification
    validateExecutionCeremony(args);

    // 2. Git status verification
    enforceGitCleanliness(process.cwd());

    // 3. Credential verification (must fail closed if token is absent)
    const cfg = getMigrationConfig(true);

    const client = createClient({
      projectId: cfg.projectId,
      dataset: cfg.dataset,
      apiVersion: cfg.apiVersion,
      useCdn: false,
      token: cfg.authToken,
    });

    console.log('⚡ Starting Real Migration Execution (Phase 3B)...');
    const result = await executeMigration({
      client,
      preflightResult, // Amendment 6: exact in-memory plan
      requireGitClean: true,
      allowAnyBranch: false,
    });

    if (!result.success) {
      console.error(`\n🛑 EXECUTION FAILED: ${result.error}`);
      console.error(`Partial run manifest saved to: ${result.manifestPath}`);
      process.exit(1);
    }

    console.log(`\n✅ Migration executed and verified successfully!`);
    console.log(`Manifest saved to: ${result.manifestPath}`);
    process.exit(0);
  }

  // Dry-run mode completed cleanly
  console.log('✅ Dry-run preflight passed cleanly with zero blocking errors.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n🛑 Migration error:', err.message || err);
  process.exit(1);
});
