/**
 * Strict public-safe root document ID validator (Amendment 2).
 *
 * Enforces Sanity public root document requirements:
 * 1. Must NOT contain any period ('.'). Periods turn documents into hierarchical
 *    paths/subpaths (path("*.**")) which Sanity hides from unauthenticated queries.
 * 2. Must NOT match any private/system namespace (e.g., 'drafts.*', '_.', or leading underscore).
 * 3. Must adhere to the strict root-ID character policy: only [a-zA-Z0-9_-], starting with letter or number.
 * 4. Must be non-empty and within Sanity's max ID length (128 characters).
 */

export interface IdValidationResult {
  valid: boolean;
  id: string;
  error?: string;
}

const PUBLIC_SAFE_ROOT_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const MAX_SANITY_ID_LENGTH = 128;

export function validatePublicSafeRootId(id: string): IdValidationResult {
  if (!id || typeof id !== 'string') {
    return { valid: false, id: String(id), error: 'Document ID must be a non-empty string.' };
  }

  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return { valid: false, id, error: 'Document ID must not be empty or whitespace.' };
  }

  if (trimmed.length > MAX_SANITY_ID_LENGTH) {
    return {
      valid: false,
      id,
      error: `Document ID length (${trimmed.length}) exceeds Sanity maximum of ${MAX_SANITY_ID_LENGTH} characters.`,
    };
  }

  if (trimmed.includes('.')) {
    return {
      valid: false,
      id,
      error: `Document ID "${trimmed}" contains a period ('.'), which classifies it as a path/subpath document hidden from anonymous queries.`,
    };
  }

  if (trimmed.startsWith('_') || trimmed.startsWith('drafts')) {
    return {
      valid: false,
      id,
      error: `Document ID "${trimmed}" matches a reserved or private system path prefix.`,
    };
  }

  if (!PUBLIC_SAFE_ROOT_ID_REGEX.test(trimmed)) {
    return {
      valid: false,
      id,
      error: `Document ID "${trimmed}" contains invalid characters. Only letters, numbers, hyphens, and underscores are permitted (must start with letter or number).`,
    };
  }

  return { valid: true, id: trimmed };
}

export function validateAllPublicSafeRootIds(ids: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const id of ids) {
    const res = validatePublicSafeRootId(id);
    if (!res.valid && res.error) {
      errors.push(res.error);
    }
  }
  return { valid: errors.length === 0, errors };
}
