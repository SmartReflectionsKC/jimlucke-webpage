/**
 * Configuration and validation for Sanity Content Lake integration.
 */

import { ContentSourceMode, SanityConfig, ConfigValidationResult } from './types';

const DEFAULT_PROJECT_ID = 'wml93cow';
const DEFAULT_DATASET = 'production';
const DEFAULT_API_VERSION = '2026-09-01';

const PROJECT_ID_REGEX = /^[a-z0-9]+$/i;
const DATASET_REGEX = /^[a-z0-9~_.-]+$/i;
const API_VERSION_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates the provided environment variables or current import.meta.env.
 */
export function validateSanityConfig(env?: Record<string, any>): ConfigValidationResult {
  const metaEnv: Record<string, any> = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env as any) : {};
  const procEnv: Record<string, any> = typeof process !== 'undefined' && process.env ? (process.env as any) : {};
  const rawEnv: Record<string, any> = env || (Object.keys(metaEnv).length > 0 ? metaEnv : procEnv);

  const rawVal = rawEnv.VITE_CONTENT_SOURCE;
  const trimmed = typeof rawVal === 'string' ? rawVal.trim().toLowerCase() : '';
  let mode: ContentSourceMode = 'local';

  if (trimmed === 'hybrid') {
    mode = 'hybrid';
  } else if (trimmed === 'sanity') {
    mode = 'sanity';
  } else {
    // Missing, blank, 'local', or unrecognized values strictly default to local
    mode = 'local';
  }

  const projectId = String(rawEnv.VITE_SANITY_PROJECT_ID || DEFAULT_PROJECT_ID).trim();
  const dataset = String(rawEnv.VITE_SANITY_DATASET || DEFAULT_DATASET).trim();
  const apiVersion = String(rawEnv.VITE_SANITY_API_VERSION || DEFAULT_API_VERSION).trim();
  const useCdn = rawEnv.VITE_SANITY_USE_CDN !== 'false';

  const config: SanityConfig = {
    contentSource: mode,
    projectId,
    dataset,
    apiVersion,
    useCdn,
  };

  // In local mode, Sanity credentials are not needed
  if (mode === 'local') {
    return {
      isValid: true,
      mode,
      config,
    };
  }

  // In hybrid or sanity mode, credentials must be strictly valid
  if (!projectId || !PROJECT_ID_REGEX.test(projectId)) {
    return {
      isValid: false,
      mode,
      error: `Invalid or missing VITE_SANITY_PROJECT_ID: "${projectId}". Must contain only alphanumeric characters.`,
      config,
    };
  }

  if (!dataset || !DATASET_REGEX.test(dataset)) {
    return {
      isValid: false,
      mode,
      error: `Invalid or missing VITE_SANITY_DATASET: "${dataset}". Must be a valid dataset name.`,
      config,
    };
  }

  if (!apiVersion || !API_VERSION_REGEX.test(apiVersion)) {
    return {
      isValid: false,
      mode,
      error: `Invalid or missing VITE_SANITY_API_VERSION: "${apiVersion}". Must be formatted as YYYY-MM-DD.`,
      config,
    };
  }

  return {
    isValid: true,
    mode,
    config,
  };
}

/**
 * Convenience getter for active Sanity config.
 */
export function getSanityConfig(): SanityConfig {
  return validateSanityConfig().config;
}

/**
 * Convenience getter for active content source mode.
 */
export function getContentSourceMode(): ContentSourceMode {
  return validateSanityConfig().mode;
}
