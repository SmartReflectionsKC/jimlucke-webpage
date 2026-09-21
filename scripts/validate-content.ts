import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../src/utils/frontmatter';

interface ValidationError {
  file: string;
  message: string;
}

const errors: ValidationError[] = [];

function addError(file: string, message: string) {
  errors.push({ file, message });
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsed = Date.parse(dateStr);
  return !isNaN(parsed);
}

function checkImageExists(imagePath: string, sourceFile: string, fieldName: string) {
  if (!imagePath || typeof imagePath !== 'string') {
    addError(sourceFile, `${fieldName} is missing or empty`);
    return;
  }

  // Handle local /images/... path
  if (imagePath.startsWith('/')) {
    const fullPath = path.join(process.cwd(), 'public', imagePath.slice(1));
    if (!fs.existsSync(fullPath)) {
      addError(
        sourceFile,
        `${fieldName} references missing file: "${imagePath}" (looked in ${fullPath})`
      );
    }
  } else if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    if (!fs.existsSync(fullPath)) {
      addError(
        sourceFile,
        `${fieldName} references missing file: "${imagePath}"`
      );
    }
  }
}

export function validateAllContent(): { valid: boolean; errors: ValidationError[] } {
  errors.length = 0; // reset

  const fieldNotesDir = path.join(process.cwd(), 'content', 'field-notes');
  const photographyDir = path.join(process.cwd(), 'content', 'photography');

  // 1. Validate Field Notes
  const seenSlugs = new Set<string>();

  if (fs.existsSync(fieldNotesDir)) {
    const files = fs.readdirSync(fieldNotesDir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      // Skip template or files starting with _
      if (file.startsWith('_')) {
        continue;
      }

      const filePath = path.join(fieldNotesDir, file);
      const slug = file.replace(/\.md$/, '');

      if (seenSlugs.has(slug)) {
        addError(file, `Duplicate Field Note slug detected: "${slug}"`);
      }
      seenSlugs.add(slug);

      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = parseFrontmatter(rawContent);

      // Required metadata fields
      if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
        addError(file, 'Missing or empty required field: "title"');
      }

      if (!data.summary || typeof data.summary !== 'string' || !data.summary.trim()) {
        addError(file, 'Missing or empty required field: "summary"');
      }

      if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
        addError(file, 'Missing or empty required field: "category"');
      }

      if (!data.date || !isValidDate(String(data.date))) {
        addError(file, `Invalid or missing date: "${data.date}". Must be a valid date string (e.g. YYYY-MM-DD)`);
      }

      if (typeof data.published !== 'boolean') {
        addError(file, `Field "published" must be a boolean (true or false), received: ${JSON.stringify(data.published)}`);
      }

      if (data.coverImage) {
        checkImageExists(String(data.coverImage), file, 'coverImage');
      }

      // Check inline Markdown images: ![alt](url)
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = imageRegex.exec(content)) !== null) {
        const imageSrc = match[2];
        checkImageExists(imageSrc, file, `Inline Markdown image "${imageSrc}"`);
      }
    }
  } else {
    addError('content/field-notes', 'Field Notes directory does not exist');
  }

  // 2. Validate Photography Manifests
  const seenGalleryIds = new Set<string>();

  if (fs.existsSync(photographyDir)) {
    const files = fs.readdirSync(photographyDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      if (file.startsWith('_')) continue;

      const filePath = path.join(photographyDir, file);
      let manifest: any;

      try {
        const rawJson = fs.readFileSync(filePath, 'utf-8');
        manifest = JSON.parse(rawJson);
      } catch (err: any) {
        addError(file, `Malformed JSON manifest: ${err.message}`);
        continue;
      }

      const expectedId = file.replace(/\.json$/, '');
      if (!manifest.id || manifest.id !== expectedId) {
        addError(file, `Gallery "id" must match filename without .json. Expected: "${expectedId}", found: "${manifest.id}"`);
      }

      if (seenGalleryIds.has(manifest.id)) {
        addError(file, `Duplicate gallery ID detected: "${manifest.id}"`);
      }
      seenGalleryIds.add(manifest.id);

      if (!manifest.title || typeof manifest.title !== 'string' || !manifest.title.trim()) {
        addError(file, 'Missing or empty required field: "title"');
      }

      if (!manifest.description || typeof manifest.description !== 'string' || !manifest.description.trim()) {
        addError(file, 'Missing or empty required field: "description"');
      }

      if (!manifest.date || !isValidDate(String(manifest.date))) {
        addError(file, `Invalid or missing date: "${manifest.date}"`);
      }

      if (typeof manifest.displayOrder !== 'number' || isNaN(manifest.displayOrder)) {
        addError(file, 'Field "displayOrder" must be a valid number');
      }

      if (typeof manifest.published !== 'boolean') {
        addError(file, `Field "published" must be a boolean (true or false), received: ${JSON.stringify(manifest.published)}`);
      }

      if (!manifest.coverImage) {
        addError(file, 'Missing required field: "coverImage"');
      } else {
        checkImageExists(manifest.coverImage, file, 'coverImage');
      }

      if (!Array.isArray(manifest.images) || manifest.images.length === 0) {
        addError(file, 'Field "images" must be a non-empty array of image objects');
      } else {
        manifest.images.forEach((img: any, idx: number) => {
          if (!img.src || typeof img.src !== 'string') {
            addError(file, `Image at index ${idx} is missing "src" string`);
          } else {
            checkImageExists(img.src, file, `images[${idx}].src`);
          }

          if (!img.alt || typeof img.alt !== 'string' || !img.alt.trim()) {
            addError(file, `Image at index ${idx} ("${img.src || 'unknown'}") is missing required accessible "alt" text`);
          }
        });
      }
    }
  } else {
    addError('content/photography', 'Photography directory does not exist');
  }

  return {
    valid: errors.length === 0,
    errors: [...errors],
  };
}

// When run directly as a script:
if (process.argv[1]?.endsWith('validate-content.ts')) {
  console.log('🔍 Validating content files (Field Notes & Photography)...');
  const result = validateAllContent();

  if (!result.valid) {
    console.error('\n❌ Content validation failed with the following errors:\n');
    for (const err of result.errors) {
      console.error(`  - [${err.file}]: ${err.message}`);
    }
    console.error('\nPlease resolve these errors before building.');
    process.exit(1);
  }

  console.log('✅ Content validation passed: All metadata, images, and manifests are valid.\n');
}
