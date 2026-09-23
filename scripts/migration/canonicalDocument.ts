/**
 * Canonical document comparison and fingerprinting utility for Sanity migration resumability.
 *
 * Implements deterministic canonicalization and SHA-256 fingerprinting:
 * - Excludes only Sanity-managed metadata (_rev, _createdAt, _updatedAt, _system)
 * - Retains all authored fields: _id, _type, title, slug/id, dates, excerpts,
 *   category, tags, Portable Text bodies and keys, image asset references,
 *   alt text, gallery order, photo references, reference keys, captions, featured flags.
 * - Deeply sorts object keys recursively for deterministic serialization.
 * - Compares documents across Field Notes, Galleries, and Photos (without assuming slug on Photos).
 */

import crypto from 'node:crypto';

const SANITY_MANAGED_FIELDS = new Set([
  '_rev',
  '_createdAt',
  '_updatedAt',
  '_system',
  'legacyDocId', // Migration internal tracking field
]);

/**
 * Strips Sanity-managed system fields and migration-internal fields from a document.
 */
export function stripSanitySystemFields(doc: any): any {
  if (doc === null || typeof doc !== 'object') {
    return doc;
  }

  if (Array.isArray(doc)) {
    return doc.map(stripSanitySystemFields);
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (SANITY_MANAGED_FIELDS.has(key)) {
      continue;
    }
    result[key] = stripSanitySystemFields(value);
  }

  return result;
}

/**
 * Deeply sorts object keys recursively to produce deterministic JSON.
 */
export function sortObjectRecursively(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectRecursively);
  }

  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = sortObjectRecursively(obj[key]);
  }

  return result;
}

/**
 * Generates a deterministic canonical JSON string for a document.
 */
export function canonicalDocumentJson(doc: any): string {
  const stripped = stripSanitySystemFields(doc);
  const sorted = sortObjectRecursively(stripped);
  return JSON.stringify(sorted);
}

/**
 * Computes a deterministic SHA-256 fingerprint for a document.
 */
export function computeDocumentFingerprint(doc: any): string {
  const canonicalJson = canonicalDocumentJson(doc);
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

export interface CanonicalComparisonResult {
  match: boolean;
  expectedFingerprint: string;
  observedFingerprint: string;
  differences: string[];
}

/**
 * Compares an expected planned document against an observed existing document.
 * Returns match status, canonical fingerprints, and a sanitized summary of differences.
 */
export function compareCanonicalDocuments(
  expectedDoc: any,
  observedDoc: any
): CanonicalComparisonResult {
  const expectedClean = sortObjectRecursively(stripSanitySystemFields(expectedDoc));
  const observedClean = sortObjectRecursively(stripSanitySystemFields(observedDoc));

  const expectedFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(expectedClean))
    .digest('hex');
  const observedFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(observedClean))
    .digest('hex');

  const differences: string[] = [];

  if (expectedClean._type !== observedClean._type) {
    differences.push(`_type mismatch: expected "${expectedClean._type}", observed "${observedClean._type}"`);
  }

  // Compare authored fields
  const allKeys = new Set([...Object.keys(expectedClean), ...Object.keys(observedClean)]);
  for (const key of allKeys) {
    const expVal = JSON.stringify(expectedClean[key]);
    const obsVal = JSON.stringify(observedClean[key]);
    if (expVal !== obsVal) {
      if (expectedClean[key] === undefined) {
        differences.push(`Unexpected field in observed document: "${key}"`);
      } else if (observedClean[key] === undefined) {
        differences.push(`Missing field in observed document: "${key}"`);
      } else {
        differences.push(`Field content mismatch: "${key}"`);
      }
    }
  }

  return {
    match: expectedFingerprint === observedFingerprint,
    expectedFingerprint,
    observedFingerprint,
    differences,
  };
}
