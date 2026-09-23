/**
 * Logical dataset snapshot and verification (Amendment 4).
 *
 * NOTE: This tool creates a logical JSON document snapshot of all documents
 * present in the target Sanity dataset prior to migration mutation. It does
 * NOT contain raw asset binaries.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatasetBackupManifest } from './types';

export interface BackupOptions {
  backupDir?: string;
  runId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
}

export async function performDatasetBackup(
  client: any,
  options: BackupOptions
): Promise<DatasetBackupManifest> {
  const { runId, projectId, dataset, apiVersion } = options;
  const backupDir = options.backupDir || path.resolve(process.cwd(), 'migration-backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const backupId = `backup-${runId}`;

  // 1. Fetch all existing documents from dataset
  let existingDocs: any[];
  try {
    existingDocs = await client.fetch('*[]');
  } catch (err: any) {
    throw new Error(`Dataset backup failed: unable to query dataset documents: ${err.message}`);
  }

  if (!Array.isArray(existingDocs)) {
    throw new Error(
      `Dataset backup validation failed: expected array of documents, received ${typeof existingDocs}`
    );
  }

  const documentCount = existingDocs.length;
  const verifiedEmpty = documentCount === 0;

  // 2. Build snapshot payload
  const snapshotPayload = {
    backupId,
    timestamp,
    runId,
    projectId,
    dataset,
    apiVersion,
    verifiedEmpty,
    documentCount,
    backupType: 'logical-json-document-snapshot',
    integrityStatus: 'checksummed',
    documentation:
      'This is an integrity-checksummed logical JSON document snapshot of all dataset documents. It does not contain raw asset binaries.',
    documents: existingDocs,
  };

  const snapshotJson = JSON.stringify(snapshotPayload, null, 2);
  const snapshotSha256 = crypto.createHash('sha256').update(snapshotJson).digest('hex');

  const snapshotFileName = `snapshot-${runId}.json`;
  const snapshotFilePath = path.join(backupDir, snapshotFileName);

  // 3. Write snapshot file to disk
  try {
    fs.writeFileSync(snapshotFilePath, snapshotJson, 'utf-8');
  } catch (err: any) {
    throw new Error(`Dataset backup failed: unable to write snapshot file to disk: ${err.message}`);
  }

  // 4. Verify snapshot file on disk (read back and validate non-empty and parsable)
  try {
    const readBack = fs.readFileSync(snapshotFilePath, 'utf-8');
    if (!readBack || readBack.trim().length === 0) {
      throw new Error('Snapshot file on disk is empty (0 bytes).');
    }
    const parsed = JSON.parse(readBack);
    if (!parsed || parsed.backupId !== backupId) {
      throw new Error('Snapshot file verification failed: content corrupt or mismatched backupId.');
    }
  } catch (err: any) {
    throw new Error(`Dataset backup validation failed before mutation: ${err.message}`);
  }

  // 5. Construct and write backup manifest
  const manifest: DatasetBackupManifest = {
    backupId,
    timestamp,
    projectId,
    dataset,
    apiVersion,
    runId,
    documentCount,
    verifiedEmpty,
    snapshotFilePath,
    snapshotSha256,
  };

  const manifestPath = path.join(backupDir, `backup-manifest-${runId}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return manifest;
}
