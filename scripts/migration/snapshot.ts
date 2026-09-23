/**
 * Target document snapshotting and overwrite protection (Amendment 9).
 *
 * Before overwriting or creating deterministic migration targets:
 * - Queries existing documents matching target IDs
 * - Strictly verifies that existing _type matches planned _type
 * - Aborts execution if an unexpected _type is found (fails closed on ID collision)
 * - Captures full restorable document snapshot of existing targets
 */

import fs from 'node:fs';
import path from 'node:path';
import { DocumentSnapshotRecord } from './types';

export interface SnapshotTargetsOptions {
  runId: string;
  snapshotDir?: string;
}

export interface SnapshotTargetsResult {
  replacedSnapshots: DocumentSnapshotRecord[];
  newlyCreatedIds: string[];
  snapshotFilePath?: string;
}

export async function snapshotExistingTargets(
  client: any,
  plannedDocs: Array<{ _id: string; _type: string; [key: string]: any }>,
  options: SnapshotTargetsOptions
): Promise<SnapshotTargetsResult> {
  const { runId } = options;
  const snapshotDir = options.snapshotDir || path.resolve(process.cwd(), 'migration-backups');

  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const plannedMap = new Map<string, { _id: string; _type: string }>();
  for (const doc of plannedDocs) {
    plannedMap.set(doc._id, doc);
  }

  const plannedIds = Array.from(plannedMap.keys());

  // Query existing documents with these IDs
  let existingDocs: any[];
  try {
    existingDocs = await client.fetch('*[_id in $plannedIds]', { plannedIds });
  } catch (err: any) {
    throw new Error(`Failed to query existing target documents: ${err.message}`);
  }

  const replacedSnapshots: DocumentSnapshotRecord[] = [];
  const existingIdSet = new Set<string>();

  for (const existing of existingDocs) {
    existingIdSet.add(existing._id);
    const planned = plannedMap.get(existing._id);

    if (!planned) {
      continue;
    }

    // Amendment 9: Abort if ID exists with an unexpected _type
    if (existing._type !== planned._type) {
      throw new Error(
        `Unexpected document type collision: Target document "${existing._id}" already exists with type "${existing._type}", but migration planned type is "${planned._type}". Aborting to prevent overwriting mismatched schema document.`
      );
    }

    replacedSnapshots.push({
      _id: existing._id,
      _type: existing._type,
      doc: existing,
    });
  }

  const newlyCreatedIds = plannedIds.filter((id) => !existingIdSet.has(id));

  let snapshotFilePath: string | undefined;
  if (replacedSnapshots.length > 0) {
    snapshotFilePath = path.join(snapshotDir, `targets-snapshot-${runId}.json`);
    fs.writeFileSync(
      snapshotFilePath,
      JSON.stringify(
        {
          runId,
          timestamp: new Date().toISOString(),
          replacedCount: replacedSnapshots.length,
          snapshots: replacedSnapshots,
        },
        null,
        2
      ),
      'utf-8'
    );
  }

  return {
    replacedSnapshots,
    newlyCreatedIds,
    snapshotFilePath,
  };
}
