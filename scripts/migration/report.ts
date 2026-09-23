/**
 * Migration report generator for Sanity Content Lake dry-run preflight.
 * Generates human-readable Markdown and structured JSON reports under migration-reports/.
 * Strictly ensures no tokens, secrets, or write credentials are ever serialized.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PreflightResult, MigrationReportData } from './types';
import { getSanitizedReportConfig } from './config';

export interface GenerateReportOptions {
  outputDir?: string;
  timestamp?: string;
}

export function generateMigrationReport(
  result: PreflightResult,
  options: GenerateReportOptions = {}
): {
  markdownReportPath: string;
  jsonReportPath: string;
  reportData: MigrationReportData;
} {
  const rootDir = process.cwd();
  const outputDir = options.outputDir || path.join(rootDir, 'migration-reports');
  const now = options.timestamp || new Date().toISOString();
  const fileTimestamp = now.replace(/[:.]/g, '-');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const config = getSanitizedReportConfig();

  const blockingErrors = result.issues.filter((i) => i.severity === 'blocking');
  const warnings = result.issues.filter((i) => i.severity === 'warning');

  const plannedDocIds = [
    ...result.plannedFieldNotes.map((n) => n._id),
    ...result.plannedGalleries.map((g) => g._id),
    ...result.plannedPhotos.map((p) => p._id),
  ];

  const plannedSlugs = [
    ...result.plannedFieldNotes.map((n) => n.slug.current),
    ...result.plannedGalleries.map((g) => g.slug.current),
  ];

  const sourceImagePaths = result.plannedAssets.map((a) => a.sourcePath);

  const reportData: MigrationReportData = {
    mode: 'dry-run',
    timestamp: now,
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: config.apiVersion,
    isPermittedToExecute: result.valid,
    summary: {
      fieldNoteCount: result.plannedFieldNotes.length,
      galleryCount: result.plannedGalleries.length,
      photoCount: result.plannedPhotos.length,
      uniqueAssetCount: result.plannedAssets.length,
      blockingErrorCount: result.blockingCount,
      warningCount: result.warningCount,
    },
    plannedDocumentIds: plannedDocIds,
    plannedSlugs,
    sourceImagePaths,
    zeroByteFiles: result.zeroByteFiles,
    h1Findings: result.h1Findings,
    blockingErrors,
    warnings,
    schemaMappings: result.schemaMappings,
  };

  // Generate Human-Readable Markdown Report
  let md = `# Sanity Migration Dry-Run Preflight Report

**Mode:** \`dry-run\`  
**Timestamp:** ${now}  
**Sanity Project ID:** \`${config.projectId}\`  
**Dataset:** \`${config.dataset}\`  
**API Version:** \`${config.apiVersion}\`  
**Execution Permitted:** **${result.valid ? 'YES' : 'NO (Blocked by preflight findings)'}**

---

## 1. Summary of Planned Counts

| Item | Planned Count |
| :--- | :--- |
| **Field Notes** | ${result.plannedFieldNotes.length} documents |
| **Photography Galleries** | ${result.plannedGalleries.length} collections |
| **Photographs** | ${result.plannedPhotos.length} photo documents |
| **Unique Image Assets** | ${result.plannedAssets.length} assets |
| **Blocking Errors** | **${result.blockingCount}** |
| **Warnings** | ${result.warningCount} |

---

## 2. Zero-Byte Image File Findings

${
  result.zeroByteFiles.length === 0
    ? '_No zero-byte image files detected._'
    : result.zeroByteFiles
        .map((z) => {
          const refs = z.referencedBy
            .map((r) => `- **${r.documentType}** \`${r.documentId}\` (used as: \`${r.role}\`)`)
            .join('\n');
          return `### ⚠️ Zero-Byte File: \`${z.imagePath}\`
- **File Status:** 0 bytes (empty file on disk).
- **Dimension Parsing / Upload:** Strictly skipped (not hashed, not parsed).
- **Referenced By:**
${refs}`;
        })
        .join('\n\n')
}

---

## 3. Body-Level H1 Heading Findings

${
  result.h1Findings.length === 0
    ? '_No body-level H1 headings detected._'
    : result.h1Findings
        .map(
          (h) => `### ⚠️ H1 Heading in \`${h.file}\` (Line ${h.line})
- **Heading Text:** \`# ${h.headingText}\`
- **Violation:** Studio \`blockContent\` schema supports H2, H3, and H4 only. Top-level H1 is reserved for article titles.
- **Recommended Resolution:** ${h.recommendedResolution}`
        )
        .join('\n\n')
}

---

## 4. Blocking Preflight Errors (${result.blockingCount})

${
  blockingErrors.length === 0
    ? '✅ **Zero blocking errors found.** Migration execution preflight passed!'
    : blockingErrors
        .map(
          (err, idx) => `### Error ${idx + 1}: [${err.category}] in \`${err.file}\`${err.line ? ` (Line ${err.line})` : ''}
- **Message:** ${err.message}
${err.recommendedResolution ? `- **Recommended Resolution:** ${err.recommendedResolution}\n` : ''}`
        )
        .join('\n')
}

---

## 5. Direct Source-to-Target Schema Mappings

${result.schemaMappings
  .map(
    (m) => `### Document: \`${m.documentId}\` (${m.documentType})
| Source Field | Target Schema Field | Source Value | Target Value |
| :--- | :--- | :--- | :--- |
${m.mappings
  .map(
    (f) =>
      `| \`${f.sourceField}\` | \`${f.targetField}\` | \`${typeof f.sourceValue === 'object' ? JSON.stringify(f.sourceValue) : String(f.sourceValue ?? 'N/A')}\` | \`${typeof f.targetValue === 'object' ? JSON.stringify(f.targetValue) : String(f.targetValue ?? 'N/A')}\` |`
  )
  .join('\n')}`
  )
  .join('\n\n')}

---

## 6. Planned Document Identifiers & Slugs

### Field Notes:
${result.plannedFieldNotes.map((n) => `- **ID:** \`${n._id}\` (Slug: \`${n.slug.current}\`) - _"${n.title}"_`).join('\n')}

### Galleries:
${result.plannedGalleries.map((g) => `- **ID:** \`${g._id}\` (Slug: \`${g.slug.current}\`, Order: ${g.displayOrder}) - _"${g.title}"_`).join('\n')}

---

## 7. Security & Safety Verification

- **Write Execution:** Strictly prohibited in Phase 3A dry-run mode.
- **Sanity API Mutations:** Exactly **0** mutations performed.
- **Asset Uploads:** Exactly **0** uploads performed.
- **Token Security:** \`SANITY_AUTH_TOKEN\` was not required, read, or serialized in this report.
`;

  const markdownReportPath = path.join(
    outputDir,
    `dry-run-${fileTimestamp}.md`
  );
  const jsonReportPath = path.join(
    outputDir,
    `dry-run-${fileTimestamp}.json`
  );

  fs.writeFileSync(markdownReportPath, md, 'utf-8');
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2), 'utf-8');

  return {
    markdownReportPath,
    jsonReportPath,
    reportData,
  };
}
