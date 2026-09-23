/**
 * Configuration and credential safety for Sanity content migration (server-side only).
 */

import path from 'node:path';
import dotenv from 'dotenv';

// Explicitly load .env.migration from project root if it exists
dotenv.config({
  path: path.resolve(process.cwd(), '.env.migration'),
});

export interface MigrationConfig {
  projectId: string;
  dataset: string;
  apiVersion: string;
  hasAuthToken: boolean;
  authToken?: string;
}

const DEFAULT_PROJECT_ID = 'wml93cow';
const DEFAULT_DATASET = 'production';
const DEFAULT_API_VERSION = '2026-09-01';

/**
 * Resolves migration configuration safely.
 * In dry-run mode, SANITY_AUTH_TOKEN is optional.
 * In execute mode, SANITY_AUTH_TOKEN is strictly mandatory.
 */
export function getMigrationConfig(requireAuthToken = false): MigrationConfig {
  const projectId = (process.env.SANITY_PROJECT_ID || DEFAULT_PROJECT_ID).trim();
  const dataset = (process.env.SANITY_DATASET || DEFAULT_DATASET).trim();
  const apiVersion = (process.env.SANITY_API_VERSION || DEFAULT_API_VERSION).trim();
  const rawToken = process.env.SANITY_AUTH_TOKEN?.trim();

  // Fail closed if any VITE_ variable attempts to supply migration secrets
  if (process.env.VITE_SANITY_AUTH_TOKEN || process.env.VITE_SANITY_WRITE_TOKEN) {
    throw new Error(
      'Security violation: Sanity auth/write tokens must never be supplied via VITE_ environment variables.'
    );
  }

  const hasAuthToken = Boolean(rawToken && rawToken.length > 0);

  if (requireAuthToken && !hasAuthToken) {
    throw new Error(
      'Execution blocked: SANITY_AUTH_TOKEN is required in .env.migration for write execution.'
    );
  }

  return {
    projectId,
    dataset,
    apiVersion,
    hasAuthToken,
    authToken: rawToken,
  };
}

/**
 * Returns a sanitized configuration object safe for logging or including in reports.
 * Secrets are strictly omitted.
 */
export function getSanitizedReportConfig(): { projectId: string; dataset: string; apiVersion: string } {
  const cfg = getMigrationConfig(false);
  return {
    projectId: cfg.projectId,
    dataset: cfg.dataset,
    apiVersion: cfg.apiVersion,
  };
}
