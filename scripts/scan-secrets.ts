/**
 * Post-build scanner to verify that no secret values, write tokens,
 * SANITY_AUTH_TOKEN, or unapproved VITE_ variables exist in dist/.
 *
 * CRITICAL: This script NEVER prints discovered secret values.
 */

import fs from 'node:fs';
import path from 'node:path';

interface Violation {
  file: string;
  rule: string;
}

const violations: Violation[] = [];

// Approved VITE_ variables that are allowed to exist in public bundles
const APPROVED_VITE_VARS = new Set([
  'VITE_CONTENT_SOURCE',
  'VITE_SANITY_PROJECT_ID',
  'VITE_SANITY_DATASET',
  'VITE_SANITY_API_VERSION',
  'VITE_SANITY_USE_CDN',
]);

// Forbidden literal tokens or variable identifiers
const FORBIDDEN_IDENTIFIERS = [
  'SANITY_AUTH_TOKEN',
  'SANITY_WRITE_TOKEN',
  'SANITY_API_TOKEN',
  'SANITY_TOKEN',
];

// Sanity secret / write token regex pattern: sk followed by 30+ alphanumeric characters (excluding code words starting with 'skip')
const SANITY_WRITE_TOKEN_REGEX = /\bsk(?![iI]p)[a-zA-Z0-9]{30,}\b/g;

/**
 * Recursively collects all file paths within a directory.
 */
function getAllDistFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllDistFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extracts configured secret values from .env files or environment to check for leakage.
 * Ignores public values, placeholders, and short identifiers.
 */
function getConfiguredSecrets(): string[] {
  const secrets: string[] = [];
  const envFiles = ['.env', '.env.local', '.env.production'];

  const placeholderValues = new Set([
    'MY_GEMINI_API_KEY',
    'MY_APP_URL',
    'undefined',
    'null',
    'true',
    'false',
    'production',
    'development',
    'test',
    'local',
    'hybrid',
    'sanity',
    'wml93cow',
  ]);

  for (const envFile of envFiles) {
    const filePath = path.join(process.cwd(), envFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;

        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        // Strip quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1).trim();
        }

        const isSecretKey = /(KEY|SECRET|TOKEN|AUTH|PASS|PRIVATE)/i.test(key);
        if (isSecretKey && value.length >= 8 && !placeholderValues.has(value)) {
          secrets.push(value);
        }
      }
    }
  }

  // Also check process.env for sensitive tokens
  for (const [key, value] of Object.entries(process.env)) {
    if (
      value &&
      value.length >= 8 &&
      /(SANITY_.*TOKEN|GEMINI_API_KEY|SECRET)/i.test(key) &&
      !placeholderValues.has(value)
    ) {
      secrets.push(value);
    }
  }

  return Array.from(new Set(secrets));
}

export function scanDistSecrets(distDir = path.join(process.cwd(), 'dist')): {
  valid: boolean;
  violations: Violation[];
} {
  violations.length = 0;

  if (!fs.existsSync(distDir)) {
    violations.push({
      file: 'dist',
      rule: 'Distribution directory (dist/) does not exist. Run build before scanning.',
    });
    return { valid: false, violations: [...violations] };
  }

  const files = getAllDistFiles(distDir);
  if (files.length === 0) {
    violations.push({
      file: 'dist',
      rule: 'Distribution directory (dist/) contains no files.',
    });
    return { valid: false, violations: [...violations] };
  }

  const configuredSecrets = getConfiguredSecrets();

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file);
    // Only inspect text/bundle assets
    if (!/\.(js|mjs|cjs|html|css|json|map|txt)$/i.test(file)) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');

    // 1. Check for forbidden literal identifiers
    for (const forbidden of FORBIDDEN_IDENTIFIERS) {
      if (content.includes(forbidden)) {
        violations.push({
          file: relPath,
          rule: `Forbidden token identifier detected: "${forbidden}"`,
        });
      }
    }

    // 2. Check for Sanity write token pattern (sk...)
    const writeTokenMatches = content.match(SANITY_WRITE_TOKEN_REGEX);
    if (writeTokenMatches && writeTokenMatches.length > 0) {
      violations.push({
        file: relPath,
        rule: 'Likely Sanity write-token pattern (sk...) detected.',
      });
    }

    // 3. Check for configured secret values (NEVER print value in violation message)
    for (const secret of configuredSecrets) {
      if (content.includes(secret)) {
        violations.push({
          file: relPath,
          rule: 'Configured secret value leaked into client bundle.',
        });
      }
    }

    // 4. Check for unapproved VITE_ variables
    const viteVarMatches = content.match(/VITE_[A-Z0-9_]+/g);
    if (viteVarMatches) {
      for (const v of viteVarMatches) {
        if (!APPROVED_VITE_VARS.has(v)) {
          violations.push({
            file: relPath,
            rule: `Unapproved VITE_ variable bundled into build: "${v}"`,
          });
        }
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations: [...violations],
  };
}

// When executed directly from CLI:
if (process.argv[1]?.endsWith('scan-secrets.ts')) {
  console.log('🔒 Scanning dist/ for exposed secrets, write tokens, and unapproved VITE_ variables...');
  const result = scanDistSecrets();

  if (!result.valid) {
    console.error('\n❌ Secret scan failed with violations:\n');
    for (const v of result.violations) {
      console.error(`  - [${v.file}]: ${v.rule}`);
    }
    console.error('\nEnsure no tokens or unapproved variables are present before deploying.');
    process.exit(1);
  }

  console.log('✅ Post-build secret scanner passed: No secrets, write tokens, or unapproved VITE_ variables found in dist/.\n');
}
