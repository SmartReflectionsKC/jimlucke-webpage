/**
 * Robust image dimension inspection and hashing for migration preflight.
 * Uses image-size to safely detect dimensions across JPEG, PNG, WebP, etc.
 * Enforces zero-byte protection: empty files are never parsed or hashed.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { imageSize } from 'image-size';

export interface ImageInspectionResult {
  exists: boolean;
  isZeroByte: boolean;
  sizeBytes: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  mimeType?: string;
  hash?: string;
  sha1?: string;
  error?: string;
}

const SUPPORTED_TYPES = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']);

/**
 * Inspects a local image file.
 * Returns dimensions, mimeType, and SHA-256 hash for valid non-empty files.
 */
export function inspectImageFile(absolutePath: string): ImageInspectionResult {
  if (!fs.existsSync(absolutePath)) {
    return {
      exists: false,
      isZeroByte: false,
      sizeBytes: 0,
      error: `File does not exist: "${absolutePath}"`,
    };
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(absolutePath);
  } catch (err: any) {
    return {
      exists: true,
      isZeroByte: false,
      sizeBytes: 0,
      error: `Unable to stat file: ${err.message}`,
    };
  }

  // Zero-byte protection: empty files are never parsed or hashed
  if (stat.size === 0) {
    return {
      exists: true,
      isZeroByte: true,
      sizeBytes: 0,
      error: `Image file is 0 bytes (empty file): "${absolutePath}"`,
    };
  }

  try {
    const buffer = fs.readFileSync(absolutePath);
    const parsed = imageSize(buffer);

    if (!parsed || !parsed.width || !parsed.height) {
      return {
        exists: true,
        isZeroByte: false,
        sizeBytes: stat.size,
        error: `Could not determine dimensions for image: "${absolutePath}"`,
      };
    }

    const type = (parsed.type || '').toLowerCase();
    if (type && !SUPPORTED_TYPES.has(type)) {
      return {
        exists: true,
        isZeroByte: false,
        sizeBytes: stat.size,
        error: `Unsupported image format "${type}": "${absolutePath}"`,
      };
    }

    const mimeType = type === 'jpg' ? 'image/jpeg' : `image/${type}`;
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const sha1 = crypto.createHash('sha1').update(buffer).digest('hex');

    return {
      exists: true,
      isZeroByte: false,
      sizeBytes: stat.size,
      width: parsed.width,
      height: parsed.height,
      aspectRatio: parsed.width / parsed.height,
      mimeType,
      hash,
      sha1,
    };
  } catch (err: any) {
    return {
      exists: true,
      isZeroByte: false,
      sizeBytes: stat.size,
      error: `Failed to inspect image: ${err.message}`,
    };
  }
}
