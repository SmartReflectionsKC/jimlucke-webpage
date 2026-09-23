/**
 * CLI entrypoint for Sanity content migration (Phase 3A: dry-run preflight).
 *
 * Usage:
 *   npm run migrate:sanity:dry-run   (runs preflight without writes)
 *   npm run migrate:sanity:execute   (requires --execute and SANITY_AUTH_TOKEN; fails closed if preflight fails)
 */

import { runPreflight } from './preflight';
import { generateMigrationReport } from './report';
import { getMigrationConfig } from './config';

async function main() {
  const args = process.argv.slice(2);
  const isExecuteRequested = args.includes('--execute');

  console.log('🚀 Running Sanity Migration Preflight (Phase 3A)...');
  console.log(`Mode: ${isExecuteRequested ? 'EXECUTE (Requested)' : 'DRY-RUN (Safe Preflight)'}\n`);

  // Run full preflight
  const preflightResult = runPreflight();

  // Generate Markdown and JSON reports
  const { markdownReportPath, jsonReportPath, reportData } =
    generateMigrationReport(preflightResult);

  console.log(`📄 Dry-run reports generated:`);
  console.log(`   - Markdown: ${markdownReportPath}`);
  console.log(`   - JSON:     ${jsonReportPath}\n`);

  // Print Summary
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
  }

  // Handle execution request safety
  if (isExecuteRequested) {
    if (!preflightResult.valid) {
      console.error('\n🛑 EXECUTION ABORTED: Preflight failed with blocking errors. Migration will not proceed.');
      process.exit(1);
    }

    try {
      getMigrationConfig(true);
    } catch (err: any) {
      console.error(`\n🛑 EXECUTION ABORTED: ${err.message}`);
      process.exit(1);
    }

    // Strict boundary for Phase 3A: No execution permitted
    console.error('\n🛑 EXECUTION ABORTED: Phase 3A is strictly restricted to dry-run preflight. Write execution is prohibited in this phase.');
    process.exit(1);
  }

  // Dry-run mode: exit nonzero if blocking errors exist
  if (!preflightResult.valid) {
    console.log('\n❌ Dry-run preflight finished with blocking errors (exit code 1).');
    process.exit(1);
  }

  console.log('\n✅ Dry-run preflight passed cleanly with zero blocking errors.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected migration preflight error:', err);
  process.exit(1);
});
