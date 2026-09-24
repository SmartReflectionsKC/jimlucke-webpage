/**
 * Comprehensive preflight validation and planning engine for Sanity content migration (Phase 3A).
 *
 * Implements strict, repeatable dry-run analysis across Field Notes, Photography manifests,
 * and referenced images without creating or mutating Sanity documents or assets.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseFrontmatter } from '../../src/utils/frontmatter';
import {
  PreflightResult,
  PreflightIssue,
  ZeroByteImageReference,
  H1Finding,
  PlannedFieldNoteDoc,
  PlannedGalleryDoc,
  PlannedPhotoDoc,
  PlannedAsset,
  SchemaMappingDetail,
} from './types';
import { inspectImageFile } from './imageDimensions';
import { convertMarkdownToPortableText } from './markdownToPortableText';
import { validatePublicSafeRootId } from './idValidator';

const CONTROLLED_CATEGORIES = new Set([
  'Practical Tech',
  'Nonprofit Systems',
  'Innovation Lab',
]);

export interface RunPreflightOptions {
  contentDir?: string;
  publicDir?: string;
}

/**
 * Checks for exact case match on disk to prevent Linux/Hostinger deployment failures.
 */
function verifyDiskCasing(
  baseDir: string,
  relativePath: string
): { matches: boolean; diskName?: string; diskPath?: string } {
  const parts = relativePath.split('/').filter(Boolean);
  let currentDir = baseDir;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!fs.existsSync(currentDir)) {
      return { matches: false };
    }

    let entries: string[] = [];
    try {
      entries = fs.readdirSync(currentDir);
    } catch {
      return { matches: false };
    }

    const exactMatch = entries.find((e) => e === part);
    if (!exactMatch) {
      const caseInsensitiveMatch = entries.find(
        (e) => e.toLowerCase() === part.toLowerCase()
      );
      if (caseInsensitiveMatch) {
        return {
          matches: false,
          diskName: caseInsensitiveMatch,
          diskPath: path.join(currentDir, caseInsensitiveMatch),
        };
      }
      return { matches: false };
    }

    currentDir = path.join(currentDir, exactMatch);
  }

  return { matches: true };
}

function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return false;
  const parsed = Date.parse(dateStr.trim());
  return !isNaN(parsed);
}

export function runPreflight(options: RunPreflightOptions = {}): PreflightResult {
  const rootDir = process.cwd();
  const contentDir = options.contentDir || path.join(rootDir, 'content');
  const publicDir = options.publicDir || path.join(rootDir, 'public');

  const fieldNotesDir = path.join(contentDir, 'field-notes');
  const photographyDir = path.join(contentDir, 'photography');

  const issues: PreflightIssue[] = [];
  const zeroByteMap = new Map<string, ZeroByteImageReference>();
  const h1Findings: H1Finding[] = [];
  const plannedFieldNotes: PlannedFieldNoteDoc[] = [];
  const plannedGalleries: PlannedGalleryDoc[] = [];
  const plannedPhotos: PlannedPhotoDoc[] = [];
  const plannedAssetsMap = new Map<string, PlannedAsset>();
  const schemaMappings: SchemaMappingDetail[] = [];

  const seenSlugs = new Set<string>();
  const seenDocIds = new Set<string>();

  function registerZeroByte(
    imageRelPath: string,
    documentType: 'fieldNote' | 'gallery',
    documentId: string,
    role: 'cover' | 'gallery-image' | 'both'
  ) {
    if (!zeroByteMap.has(imageRelPath)) {
      zeroByteMap.set(imageRelPath, {
        imagePath: imageRelPath,
        referencedBy: [],
      });
    }
    const entry = zeroByteMap.get(imageRelPath)!;
    const existing = entry.referencedBy.find(
      (r) => r.documentType === documentType && r.documentId === documentId
    );
    if (existing) {
      if (existing.role !== role) {
        existing.role = 'both';
      }
    } else {
      entry.referencedBy.push({ documentType, documentId, role });
    }
  }

  function resolveLocalImagePath(imageRef: string): {
    absolutePath: string;
    relativePath: string;
    exists: boolean;
  } {
    const cleanRef = imageRef.startsWith('/') ? imageRef.slice(1) : imageRef;
    const absolutePath = path.join(publicDir, cleanRef);
    const exists = fs.existsSync(absolutePath);
    return { absolutePath, relativePath: `/${cleanRef}`, exists };
  }

  function inspectAndPlanAsset(
    imageRef: string,
    sourceFile: string,
    fieldContext: string
  ): { asset?: PlannedAsset; isZeroByte?: boolean } {
    const { absolutePath, relativePath, exists } = resolveLocalImagePath(imageRef);

    if (!exists) {
      issues.push({
        severity: 'blocking',
        category: 'missing-file',
        file: sourceFile,
        message: `${fieldContext} references non-existent file: "${imageRef}" (looked at ${absolutePath})`,
      });
      return {};
    }

    // Check disk casing
    const casing = verifyDiskCasing(publicDir, imageRef.startsWith('/') ? imageRef.slice(1) : imageRef);
    if (!casing.matches && casing.diskName) {
      issues.push({
        severity: 'blocking',
        category: 'filename-case-mismatch',
        file: sourceFile,
        message: `Filename case mismatch for "${imageRef}": disk entry is "${casing.diskName}". This will fail on case-sensitive filesystems.`,
        recommendedResolution: `Rename source path in ${sourceFile} to match disk casing exactly.`,
      });
    }

    const inspection = inspectImageFile(absolutePath);
    if (inspection.isZeroByte) {
      return { isZeroByte: true };
    }

    if (!inspection.width || !inspection.height || !inspection.hash) {
      issues.push({
        severity: 'blocking',
        category: 'image-dimension',
        file: sourceFile,
        message: `${fieldContext} image inspection failed: ${inspection.error || 'Unable to determine dimensions or hash'}`,
      });
      return {};
    }

    const format = inspection.mimeType === 'image/jpeg' ? 'jpg' : inspection.mimeType?.replace('image/', '') || 'jpg';
    const targetAssetId = `image-${inspection.sha1 || inspection.hash}-${inspection.width}x${inspection.height}-${format}`;

    if (!plannedAssetsMap.has(relativePath)) {
      plannedAssetsMap.set(relativePath, {
        sourcePath: relativePath,
        canonicalPath: absolutePath,
        hash: inspection.hash,
        sha1: inspection.sha1 || '',
        mimeType: inspection.mimeType || 'image/jpeg',
        width: inspection.width,
        height: inspection.height,
        aspectRatio: inspection.aspectRatio || inspection.width / inspection.height,
        sizeBytes: inspection.sizeBytes,
        targetAssetId,
      });
    }

    return { asset: plannedAssetsMap.get(relativePath) };
  }

  // =========================================================================
  // 1. Preflight Field Notes
  // =========================================================================
  if (!fs.existsSync(fieldNotesDir)) {
    issues.push({
      severity: 'blocking',
      category: 'missing-file',
      file: 'content/field-notes',
      message: 'Field Notes directory does not exist.',
    });
  } else {
    const files = fs.readdirSync(fieldNotesDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      // Exclude template or draft marker files starting with _
      if (file.startsWith('_')) {
        continue;
      }

      const filePath = path.join(fieldNotesDir, file);
      const slug = file.replace(/\.md$/, '');
      const docId = `fieldNote-${slug}`;
      const legacyDocId = `fieldNote.${slug}`;

      const idValidation = validatePublicSafeRootId(docId);
      if (!idValidation.valid) {
        issues.push({
          severity: 'blocking',
          category: 'invalid-id',
          file,
          message: idValidation.error || `Invalid public root document ID "${docId}".`,
        });
      }

      // Duplicate slug check
      if (seenSlugs.has(slug)) {
        issues.push({
          severity: 'blocking',
          category: 'duplicate-slug',
          file,
          message: `Duplicate Field Note slug detected: "${slug}".`,
        });
      }
      seenSlugs.add(slug);

      // Duplicate doc ID check
      if (seenDocIds.has(docId)) {
        issues.push({
          severity: 'blocking',
          category: 'duplicate-id',
          file,
          message: `Duplicate deterministic document ID: "${docId}".`,
        });
      }
      seenDocIds.add(docId);

      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = parseFrontmatter(rawContent);

      // Schema Constraints: title
      const title = typeof data.title === 'string' ? data.title.trim() : '';
      if (!title) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: 'Missing required field: "title".',
        });
      } else if (title.length > 120) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: `Title exceeds max length of 120 characters (${title.length} chars): "${title}".`,
        });
      }

      // Schema Constraints: publicationDate
      const dateStr = data.date ? String(data.date).trim() : '';
      if (!isValidDateString(dateStr)) {
        issues.push({
          severity: 'blocking',
          category: 'invalid-date',
          file,
          message: `Invalid or missing publication date: "${dateStr}". Must be formatted as YYYY-MM-DD.`,
        });
      }

      // Schema Constraints: excerpt / summary
      const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
      if (!summary) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: 'Missing required field: "summary".',
        });
      } else if (summary.length < 20 || summary.length > 400) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: `Summary length (${summary.length} chars) violates Studio schema constraint (must be 20–400 chars).`,
        });
      }

      // Schema Constraints: category
      const category = typeof data.category === 'string' ? data.category.trim() : '';
      if (!CONTROLLED_CATEGORIES.has(category)) {
        issues.push({
          severity: 'blocking',
          category: 'invalid-category',
          file,
          message: `Category "${category}" is not in the controlled list: [${Array.from(CONTROLLED_CATEGORIES).join(', ')}].`,
          recommendedResolution: 'Change category in frontmatter to one of the approved controlled values.',
        });
      }

      // Schema Constraints: tags (unique)
      const tags = Array.isArray(data.tags) ? data.tags.map((t: any) => String(t).trim()) : [];
      const uniqueTags = Array.from(new Set(tags));
      if (tags.length !== uniqueTags.length) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: 'Field Note tags array contains duplicate values.',
        });
      }

      // Schema Constraints: externalLink
      if (data.externalLink) {
        const link = String(data.externalLink).trim();
        if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
          issues.push({
            severity: 'blocking',
            category: 'unsafe-url',
            file,
            message: `External link must use http or https scheme: "${link}".`,
          });
        }
      }

      // Featured / Cover image and alt text
      let plannedFeaturedImage: { _type: 'image'; asset: { _type: 'reference'; _ref: string } } | undefined;
      const coverImageRel = data.coverImage ? String(data.coverImage).trim() : '';
      const coverAlt = typeof data.coverImageAlt === 'string' ? data.coverImageAlt.trim() : '';

      if (coverImageRel) {
        const assetResult = inspectAndPlanAsset(coverImageRel, file, 'coverImage');
        if (assetResult.isZeroByte) {
          registerZeroByte(coverImageRel, 'fieldNote', slug, 'cover');
          issues.push({
            severity: 'blocking',
            category: 'zero-byte-file',
            file,
            message: `Field Note cover image references zero-byte file "${coverImageRel}".`,
            recommendedResolution: 'Replace zero-byte image with valid image file before migration.',
          });
        } else if (assetResult.asset) {
          plannedFeaturedImage = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: assetResult.asset.targetAssetId,
            },
          };
        }

        // Schema requires alt text whenever a cover image is provided
        if (!coverAlt) {
          issues.push({
            severity: 'blocking',
            category: 'missing-alt-text',
            file,
            message: `Field Note cover image "${coverImageRel}" is missing required accessible alt text ("coverImageAlt" in frontmatter).`,
            recommendedResolution: 'Add explicit "coverImageAlt" field with at least 5 characters to frontmatter.',
          });
        } else if (coverAlt.length < 5) {
          issues.push({
            severity: 'blocking',
            category: 'missing-alt-text',
            file,
            message: `Field Note cover image alt text is too short ("${coverAlt}"). Minimum 5 characters required.`,
          });
        }
      }

      // Convert Markdown body to Portable Text and check AST constructs
      const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      const lineOffset = frontmatterMatch ? frontmatterMatch[0].split('\n').length : 0;
      const conversion = convertMarkdownToPortableText(content, {
        sourceFile: file,
        lineOffset,
      });
      issues.push(...conversion.issues);
      h1Findings.push(...conversion.h1Findings);

      // Check inline images in body
      for (const block of conversion.blocks) {
        if (block._type === 'image' && block._localSourcePath) {
          const inlineAsset = inspectAndPlanAsset(
            block._localSourcePath,
            file,
            `Inline Markdown image "${block._localSourcePath}"`
          );
          if (inlineAsset.isZeroByte) {
            registerZeroByte(block._localSourcePath, 'fieldNote', slug, 'gallery-image');
            issues.push({
              severity: 'blocking',
              category: 'zero-byte-file',
              file,
              message: `Inline Markdown image references zero-byte file "${block._localSourcePath}".`,
            });
          } else if (inlineAsset.asset) {
            block.asset = {
              _type: 'reference',
              _ref: inlineAsset.asset.targetAssetId,
            };
          }
          delete block._localSourcePath;
        }
      }

      const plannedDoc: PlannedFieldNoteDoc = {
        _id: docId,
        _type: 'fieldNote',
        title,
        slug: { current: slug },
        publicationDate: dateStr,
        excerpt: summary,
        category,
        tags: uniqueTags,
        featuredImage: plannedFeaturedImage,
        featuredImageAlt: coverAlt || undefined,
        readTime: data.readTime ? String(data.readTime).trim() : undefined,
        externalLink: data.externalLink ? String(data.externalLink).trim() : undefined,
        featured: Boolean(data.featured),
        body: conversion.blocks,
        sourceFile: file,
        legacyDocId,
      };

      plannedFieldNotes.push(plannedDoc);

      // Record schema mapping
      schemaMappings.push({
        documentId: docId,
        documentType: 'fieldNote',
        mappings: [
          { sourceField: 'title', targetField: 'title', sourceValue: title, targetValue: title },
          { sourceField: 'slug', targetField: 'slug.current', sourceValue: slug, targetValue: slug },
          { sourceField: 'date', targetField: 'publicationDate', sourceValue: dateStr, targetValue: dateStr },
          { sourceField: 'summary', targetField: 'excerpt', sourceValue: summary, targetValue: summary },
          { sourceField: 'category', targetField: 'category', sourceValue: category, targetValue: category },
          { sourceField: 'tags', targetField: 'tags', sourceValue: uniqueTags, targetValue: uniqueTags },
          {
            sourceField: 'coverImage',
            targetField: 'featuredImage',
            sourceValue: coverImageRel || undefined,
            targetValue: plannedFeaturedImage,
          },
          {
            sourceField: 'coverImageAlt',
            targetField: 'featuredImageAlt',
            sourceValue: coverAlt || undefined,
            targetValue: coverAlt || undefined,
          },
          { sourceField: 'body (markdown)', targetField: 'body (portableText)', sourceValue: `${content.trim().length} chars`, targetValue: `${conversion.blocks.length} blocks` },
        ],
      });
    }
  }

  // =========================================================================
  // 2. Preflight Photography Manifests
  // =========================================================================
  if (!fs.existsSync(photographyDir)) {
    issues.push({
      severity: 'blocking',
      category: 'missing-file',
      file: 'content/photography',
      message: 'Photography directory does not exist.',
    });
  } else {
    const files = fs.readdirSync(photographyDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      if (file.startsWith('_')) {
        continue;
      }

      const filePath = path.join(photographyDir, file);
      let manifest: any;

      try {
        const rawJson = fs.readFileSync(filePath, 'utf-8');
        manifest = JSON.parse(rawJson);
      } catch (err: any) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: `Malformed JSON manifest: ${err.message}`,
        });
        continue;
      }

      const slug = (manifest.id || file.replace(/\.json$/, '')).trim();
      const docId = `gallery-${slug}`;
      const legacyDocId = `gallery.${slug}`;

      const idValidation = validatePublicSafeRootId(docId);
      if (!idValidation.valid) {
        issues.push({
          severity: 'blocking',
          category: 'invalid-id',
          file,
          message: idValidation.error || `Invalid public root document ID "${docId}".`,
        });
      }

      // Duplicate slug check
      if (seenSlugs.has(slug)) {
        issues.push({
          severity: 'blocking',
          category: 'duplicate-slug',
          file,
          message: `Duplicate gallery slug detected: "${slug}".`,
        });
      }
      seenSlugs.add(slug);

      // Duplicate doc ID check
      if (seenDocIds.has(docId)) {
        issues.push({
          severity: 'blocking',
          category: 'duplicate-id',
          file,
          message: `Duplicate deterministic document ID: "${docId}".`,
        });
      }
      seenDocIds.add(docId);

      // Validate title
      const title = typeof manifest.title === 'string' ? manifest.title.trim() : '';
      if (!title) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: 'Missing required field: "title".',
        });
      } else if (title.length > 100) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: `Gallery title exceeds max length of 100 characters: "${title}".`,
        });
      }

      // Validate description
      const description = typeof manifest.description === 'string' ? manifest.description.trim() : '';
      if (!description) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: 'Missing required field: "description".',
        });
      } else if (description.length > 500) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: `Gallery description exceeds max length of 500 characters: "${description}".`,
        });
      }

      // Validate date
      const dateStr = manifest.date ? String(manifest.date).trim() : '';
      if (!isValidDateString(dateStr)) {
        issues.push({
          severity: 'blocking',
          category: 'invalid-date',
          file,
          message: `Invalid or missing publication date: "${dateStr}". Must be formatted as YYYY-MM-DD.`,
        });
      }

      // Validate displayOrder
      const displayOrder = manifest.displayOrder;
      if (typeof displayOrder !== 'number' || isNaN(displayOrder) || displayOrder <= 0 || !Number.isInteger(displayOrder)) {
        issues.push({
          severity: 'blocking',
          category: 'schema-constraint',
          file,
          message: `Field "displayOrder" must be a positive integer, found: ${JSON.stringify(displayOrder)}.`,
        });
      }

      // Validate images array
      const rawImages: any[] = Array.isArray(manifest.images) ? manifest.images : [];
      if (rawImages.length === 0) {
        issues.push({
          severity: 'blocking',
          category: 'empty-gallery',
          file,
          message: 'Gallery "images" must be a non-empty array of photo objects.',
        });
      }

      // Process photos and validate exact-alt reuse rule
      const plannedPhotoRefs: Array<{ _type: 'reference'; _ref: string; _key: string }> = [];
      const imageAltMap = new Map<string, string[]>();

      rawImages.forEach((img: any, idx: number) => {
        const imgSrc = typeof img?.src === 'string' ? img.src.trim() : '';
        const imgAlt = typeof img?.alt === 'string' ? img.alt.trim() : '';
        const imgCaption = typeof img?.caption === 'string' ? img.caption.trim() : undefined;

        if (!imgSrc) {
          issues.push({
            severity: 'blocking',
            category: 'missing-file',
            file,
            message: `Photo at index ${idx} is missing required "src" path.`,
          });
          return;
        }

        // Track alt texts for exact-alt reuse rule
        if (!imageAltMap.has(imgSrc)) {
          imageAltMap.set(imgSrc, []);
        }
        if (imgAlt) {
          imageAltMap.get(imgSrc)!.push(imgAlt);
        }

        // Alt text requirement (min 5 chars)
        if (!imgAlt || imgAlt.length < 5) {
          issues.push({
            severity: 'blocking',
            category: 'missing-alt-text',
            file,
            message: `Photo at index ${idx} ("${imgSrc}") is missing required accessible alt text (min 5 chars).`,
          });
        }

        // Check image asset
        const assetResult = inspectAndPlanAsset(imgSrc, file, `images[${idx}].src`);
        if (assetResult.isZeroByte) {
          registerZeroByte(imgSrc, 'gallery', slug, 'gallery-image');
          issues.push({
            severity: 'blocking',
            category: 'zero-byte-file',
            file,
            message: `Photo at index ${idx} references zero-byte file "${imgSrc}".`,
            recommendedResolution: 'Replace zero-byte image with valid image file before migration.',
          });
          return;
        }

        if (assetResult.asset) {
          const rawFilename = path.basename(imgSrc).trim();
          const normalizedFilename = rawFilename
            .replace(/\.[^/.]+$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '-');
          const normalizedSlug = slug.trim().toLowerCase();
          const normalizedSourcePath = (imgSrc.startsWith('/') ? imgSrc : `/${imgSrc}`)
            .trim()
            .toLowerCase()
            .replace(/\\/g, '/');
          const sourceIdentity = `${normalizedSlug}:${normalizedSourcePath}`;
          const shortHash = crypto
            .createHash('sha256')
            .update(sourceIdentity)
            .digest('hex')
            .slice(0, 8);
          const photoDocId = `photo-${normalizedSlug}-${normalizedFilename}_${shortHash}`;
          const legacyPhotoDocId = `photo.${normalizedSlug}.${normalizedFilename}_${shortHash}`;

          const photoIdValidation = validatePublicSafeRootId(photoDocId);
          if (!photoIdValidation.valid) {
            issues.push({
              severity: 'blocking',
              category: 'invalid-id',
              file,
              message: photoIdValidation.error || `Invalid public root photo document ID "${photoDocId}".`,
            });
          }

          if (seenDocIds.has(photoDocId)) {
            issues.push({
              severity: 'blocking',
              category: 'duplicate-id',
              file,
              message: `Duplicate deterministic photo document ID: "${photoDocId}".`,
            });
          }
          seenDocIds.add(photoDocId);

          const photoDoc: PlannedPhotoDoc = {
            _id: photoDocId,
            _type: 'photo',
            title: `${title} - ${rawFilename}`,
            alt: imgAlt || 'Photograph',
            caption: imgCaption,
            legacyFilename: rawFilename,
            assetSourcePath: imgSrc,
            targetAssetRef: assetResult.asset.targetAssetId,
            legacyDocId: legacyPhotoDocId,
          };
          plannedPhotos.push(photoDoc);

          const refKey = `k_${crypto.createHash('sha256').update(photoDocId).digest('hex').slice(0, 12)}`;
          plannedPhotoRefs.push({
            _type: 'reference',
            _ref: photoDocId,
            _key: refKey,
          });

          schemaMappings.push({
            documentId: photoDocId,
            documentType: 'photo',
            mappings: [
              { sourceField: 'src', targetField: 'image', sourceValue: imgSrc, targetValue: assetResult.asset.targetAssetId },
              { sourceField: 'alt', targetField: 'alt', sourceValue: imgAlt, targetValue: imgAlt },
              { sourceField: 'caption', targetField: 'caption', sourceValue: imgCaption, targetValue: imgCaption },
            ],
          });
        }
      });

      // Cover image & Exact-Alt Reuse Rule (Amendment 4)
      const coverImageRel = typeof manifest.coverImage === 'string' ? manifest.coverImage.trim() : '';
      let coverImageAlt = typeof manifest.coverImageAlt === 'string' ? manifest.coverImageAlt.trim() : '';
      let plannedCoverAsset: PlannedAsset | undefined;

      if (!coverImageRel) {
        issues.push({
          severity: 'blocking',
          category: 'missing-file',
          file,
          message: 'Gallery is missing required "coverImage" field.',
        });
      } else {
        const coverAssetResult = inspectAndPlanAsset(coverImageRel, file, 'coverImage');
        if (coverAssetResult.isZeroByte) {
          registerZeroByte(coverImageRel, 'gallery', slug, 'cover');
          issues.push({
            severity: 'blocking',
            category: 'zero-byte-file',
            file,
            message: `Gallery coverImage references zero-byte file "${coverImageRel}".`,
            recommendedResolution: 'Replace zero-byte image with valid image file before migration.',
          });
        } else if (coverAssetResult.asset) {
          plannedCoverAsset = coverAssetResult.asset;
        }

        // Apply Exact-Alt Reuse Rule (Amendment 4):
        // A gallery cover may reuse alt text from a gallery photo only when:
        // - the cover and photo resolve to the exact same canonical file,
        // - exactly one nonblank alt value exists for that file, and
        // - there are no conflicting descriptions.
        // Otherwise, coverImageAlt remains a blocking error.
        if (!coverImageAlt) {
          const matchingAlts = imageAltMap.get(coverImageRel) || [];
          const uniqueNonBlankAlts = Array.from(new Set(matchingAlts.filter((a) => a.trim().length >= 5)));

          if (uniqueNonBlankAlts.length === 1) {
            coverImageAlt = uniqueNonBlankAlts[0];
          } else if (uniqueNonBlankAlts.length > 1) {
            issues.push({
              severity: 'blocking',
              category: 'missing-alt-text',
              file,
              message: `Gallery coverImage "${coverImageRel}" has conflicting alt text across gallery photos (${uniqueNonBlankAlts.length} different descriptions). Cannot reuse alt text unambiguously.`,
              recommendedResolution: 'Add explicit "coverImageAlt" to gallery manifest.',
            });
          } else {
            issues.push({
              severity: 'blocking',
              category: 'missing-alt-text',
              file,
              message: `Gallery coverImage "${coverImageRel}" is missing required accessible alt text ("coverImageAlt"). No valid matching photo alt text found for reuse.`,
              recommendedResolution: 'Add explicit "coverImageAlt" field with at least 5 characters to gallery manifest.',
            });
          }
        } else if (coverImageAlt.length < 5) {
          issues.push({
            severity: 'blocking',
            category: 'missing-alt-text',
            file,
            message: `Gallery coverImageAlt is too short ("${coverImageAlt}"). Minimum 5 characters required.`,
          });
        }
      }

      const plannedGallery: PlannedGalleryDoc = {
        _id: docId,
        _type: 'gallery',
        title,
        slug: { current: slug },
        description,
        publicationDate: dateStr,
        displayOrder,
        category: manifest.category || 'Visual Storytelling',
        featured: Boolean(manifest.featured),
        coverImage: {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: plannedCoverAsset?.targetAssetId || 'asset-pending',
          },
        },
        coverImageAlt: coverImageAlt || '',
        photos: plannedPhotoRefs,
        sourceFile: file,
        legacyDocId,
      };

      plannedGalleries.push(plannedGallery);

      schemaMappings.push({
        documentId: docId,
        documentType: 'gallery',
        mappings: [
          { sourceField: 'title', targetField: 'title', sourceValue: title, targetValue: title },
          { sourceField: 'id', targetField: 'slug.current', sourceValue: slug, targetValue: slug },
          { sourceField: 'description', targetField: 'description', sourceValue: description, targetValue: description },
          { sourceField: 'date', targetField: 'publicationDate', sourceValue: dateStr, targetValue: dateStr },
          { sourceField: 'displayOrder', targetField: 'displayOrder', sourceValue: displayOrder, targetValue: displayOrder },
          { sourceField: 'coverImage', targetField: 'coverImage', sourceValue: coverImageRel, targetValue: plannedCoverAsset?.targetAssetId },
          { sourceField: 'coverImageAlt', targetField: 'coverImageAlt', sourceValue: coverImageAlt || undefined, targetValue: coverImageAlt || undefined },
          { sourceField: 'images[]', targetField: 'photos[]', sourceValue: `${rawImages.length} images`, targetValue: `${plannedPhotoRefs.length} references` },
        ],
      });
    }
  }

  // Count blocking vs warnings
  const blockingCount = issues.filter((i) => i.severity === 'blocking').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    valid: blockingCount === 0,
    blockingCount,
    warningCount,
    issues,
    zeroByteFiles: Array.from(zeroByteMap.values()),
    h1Findings,
    plannedFieldNotes,
    plannedGalleries,
    plannedPhotos,
    plannedAssets: Array.from(plannedAssetsMap.values()),
    schemaMappings,
  };
}

/**
 * Returns the exact 19 legacy period-based document IDs corresponding to the preflight content.
 */
export function getLegacyDocumentIds(preflight: PreflightResult): string[] {
  const legacyFieldNotes = preflight.plannedFieldNotes.map(
    (n) => n.legacyDocId || `fieldNote.${n.slug.current}`
  );
  const legacyGalleries = preflight.plannedGalleries.map(
    (g) => g.legacyDocId || `gallery.${g.slug.current}`
  );
  const legacyPhotos = preflight.plannedPhotos.map((p) => p.legacyDocId || p._id);
  return [...legacyFieldNotes, ...legacyGalleries, ...legacyPhotos];
}
