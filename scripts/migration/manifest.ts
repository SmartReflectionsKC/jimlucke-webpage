/**
 * Migration manifest manager (Amendment 7).
 *
 * Saves comprehensive run manifests recording all stages, git metadata,
 * source hashes, replaced target snapshots, and asset upload records.
 * Automatically scrubs secrets before writing to disk.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RunManifest } from './types';
import { redactSecrets } from './config';

export function saveRunManifest(
  manifest: RunManifest,
  manifestDir?: string
): string {
  const dir = manifestDir || path.resolve(process.cwd(), 'migration-manifests');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const manifestFileName = `manifest-${manifest.runId}.json`;
  const manifestFilePath = path.join(dir, manifestFileName);

  const rawJson = JSON.stringify(manifest, null, 2);
  const sanitizedJson = redactSecrets(rawJson);

  fs.writeFileSync(manifestFilePath, sanitizedJson, 'utf-8');
  return manifestFilePath;
}
