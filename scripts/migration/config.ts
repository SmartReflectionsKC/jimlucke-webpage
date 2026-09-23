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

import { execSync } from 'node:child_process';

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

/**
 * Redacts any detected secrets (e.g. Sanity auth tokens or generic secret keys) from text.
 */
export function redactSecrets(text: string, customTokens: string[] = []): string {
  if (!text) return text;
  let redacted = text;

  // Redact known token from environment if present
  if (process.env.SANITY_AUTH_TOKEN) {
    redacted = redacted.split(process.env.SANITY_AUTH_TOKEN).join('[REDACTED_SANITY_TOKEN]');
  }

  // Redact custom tokens passed in
  for (const token of customTokens) {
    if (token && token.length > 5) {
      redacted = redacted.split(token).join('[REDACTED_TOKEN]');
    }
  }

  // Redact regex pattern matching Sanity tokens (e.g. sk...)
  redacted = redacted.replace(/sk[a-zA-Z0-9]{30,}/g, '[REDACTED_SANITY_TOKEN]');

  return redacted;
}

export interface GitSafetyCheckResult {
  isClean: boolean;
  branch: string;
  commit: string;
  statusOutput: string;
}

/**
 * Checks Git status for clean working tree, expected branch, and HEAD commit (Amendment 5).
 */
export function getGitSafetyStatus(cwd: string = process.cwd()): GitSafetyCheckResult {
  let statusOutput = '';
  let branch = '';
  let commit = '';

  try {
    statusOutput = execSync('git status --porcelain', { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
    commit = execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (err: any) {
    throw new Error(`Git safety check failed: ${err.message}`);
  }

  return {
    isClean: statusOutput.length === 0,
    branch,
    commit,
    statusOutput,
  };
}

export const EXPECTED_BRANCH = 'feature/sanity-content-studio';

/**
 * Validates that git working tree is clean and on the required branch.
 * Throws an explicit error if working tree is dirty or branch is incorrect.
 */
export function enforceGitCleanliness(cwd: string = process.cwd(), allowAnyBranch = false): { branch: string; commit: string } {
  const status = getGitSafetyStatus(cwd);

  if (!allowAnyBranch && status.branch !== EXPECTED_BRANCH) {
    throw new Error(
      `Git safety check failed: current branch is "${status.branch}", but execution requires branch "${EXPECTED_BRANCH}".`
    );
  }

  if (!status.isClean) {
    throw new Error(
      `Git safety check failed: working tree is dirty. Real execution requires clean committed source (git status --porcelain must be empty).\nDirty files:\n${status.statusOutput}`
    );
  }

  return {
    branch: status.branch,
    commit: status.commit,
  };
}

/**
 * Validates required ceremony flags for execution.
 * Requires --confirm-project=wml93cow and --confirm-dataset=production.
 */
export function validateExecutionCeremony(args: string[], expectedProjectId = DEFAULT_PROJECT_ID, expectedDataset = DEFAULT_DATASET): void {
  const hasProjectConfirm = args.includes(`--confirm-project=${expectedProjectId}`);
  const hasDatasetConfirm = args.includes(`--confirm-dataset=${expectedDataset}`);

  if (!hasProjectConfirm || !hasDatasetConfirm) {
    const missing: string[] = [];
    if (!hasProjectConfirm) missing.push(`--confirm-project=${expectedProjectId}`);
    if (!hasDatasetConfirm) missing.push(`--confirm-dataset=${expectedDataset}`);

    throw new Error(
      `Execution ceremony check failed: missing required confirmation flag(s): ${missing.join(', ')}`
    );
  }
}
