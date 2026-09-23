/**
 * Asset deduplication and upload engine (Amendment 8).
 *
 * Implements strict sha1hash matching:
 * - Requires exact full 40-character SHA-1 match
 * - Verifies matching documents have _type == "sanity.imageAsset"
 * - Fails closed if multiple matching assets are returned
 * - Never matches based on filename alone
 * - Correctly marks existedBeforeRun: true / false
 */

import fs from 'node:fs';
import path from 'node:path';
import { PlannedAsset, AssetUploadResult } from './types';

export interface AssetUploadOptions {
  dryRun?: boolean;
}

export interface AssetProcessingSummary {
  results: AssetUploadResult[];
  reusedCount: number;
  uploadedCount: number;
  assetIdMap: Map<string, string>; // Maps sourcePath / canonicalPath to targetAssetId
}

export async function deduplicateAndUploadAssets(
  client: any,
  plannedAssets: PlannedAsset[],
  options: AssetUploadOptions = {}
): Promise<AssetProcessingSummary> {
  const { dryRun = false } = options;
  const results: AssetUploadResult[] = [];
  const assetIdMap = new Map<string, string>();
  let reusedCount = 0;
  let uploadedCount = 0;

  for (const asset of plannedAssets) {
    if (!asset.sha1 || asset.sha1.length !== 40) {
      throw new Error(
        `Invalid asset SHA-1 hash for "${asset.sourcePath}": expected 40-character hex string, got "${asset.sha1}".`
      );
    }

    // Query Sanity image assets matching this exact sha1hash
    let matches: any[];
    try {
      matches = await client.fetch(
        '*[_type == "sanity.imageAsset" && sha1hash == $sha1]{_id, _type, sha1hash, originalFilename, size}',
        { sha1: asset.sha1 }
      );
    } catch (err: any) {
      throw new Error(`Failed to query Sanity for asset with sha1hash "${asset.sha1}": ${err.message}`);
    }

    if (!Array.isArray(matches)) {
      throw new Error(`Expected array from sha1hash query, received ${typeof matches}`);
    }

    // Ambiguity protection (Amendment 8)
    if (matches.length > 1) {
      throw new Error(
        `Ambiguous asset match: ${matches.length} Sanity image assets found matching sha1hash "${asset.sha1}" for "${asset.sourcePath}". Aborting execution to prevent incorrect asset association.`
      );
    }

    let targetAssetId: string;
    let existedBeforeRun: boolean;

    if (matches.length === 1) {
      const match = matches[0];
      if (match._type !== 'sanity.imageAsset') {
        throw new Error(
          `Unexpected asset type: match for sha1hash "${asset.sha1}" has _type "${match._type}", expected "sanity.imageAsset".`
        );
      }
      targetAssetId = match._id;
      existedBeforeRun = true;
      reusedCount++;
    } else {
      // Zero matches: asset must be uploaded
      existedBeforeRun = false;
      uploadedCount++;

      if (dryRun) {
        targetAssetId = asset.targetAssetId;
      } else {
        if (!fs.existsSync(asset.canonicalPath)) {
          throw new Error(`Source image file not found for upload: "${asset.canonicalPath}"`);
        }
        const stream = fs.createReadStream(asset.canonicalPath);
        const filename = path.basename(asset.canonicalPath);

        let uploaded: any;
        try {
          uploaded = await client.assets.upload('image', stream, {
            filename,
            contentType: asset.mimeType,
          });
        } catch (err: any) {
          throw new Error(`Failed to upload asset "${asset.sourcePath}": ${err.message}`);
        }

        if (!uploaded || !uploaded._id) {
          throw new Error(`Sanity asset upload returned invalid response for "${asset.sourcePath}".`);
        }
        targetAssetId = uploaded._id;
      }
    }

    const uploadResult: AssetUploadResult = {
      sourcePath: asset.sourcePath,
      canonicalPath: asset.canonicalPath,
      sha256: asset.hash,
      sha1: asset.sha1,
      targetAssetId,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      existedBeforeRun,
      uploadTimestamp: new Date().toISOString(),
    };

    results.push(uploadResult);
    assetIdMap.set(asset.sourcePath, targetAssetId);
    assetIdMap.set(asset.canonicalPath, targetAssetId);
    assetIdMap.set(asset.targetAssetId, targetAssetId);
  }

  return {
    results,
    reusedCount,
    uploadedCount,
    assetIdMap,
  };
}
