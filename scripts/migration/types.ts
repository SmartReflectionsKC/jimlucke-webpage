/**
 * Type definitions for Sanity content migration tooling (Phase 3A).
 */

export type PreflightSeverity = 'blocking' | 'warning';

export type PreflightCategory =
  | 'missing-file'
  | 'zero-byte-file'
  | 'image-dimension'
  | 'filename-case-mismatch'
  | 'missing-alt-text'
  | 'unsupported-markdown'
  | 'h1-heading'
  | 'broken-link'
  | 'unsafe-url'
  | 'invalid-date'
  | 'invalid-category'
  | 'empty-gallery'
  | 'duplicate-slug'
  | 'duplicate-id'
  | 'schema-constraint'
  | 'unresolved-reference';

export interface PreflightIssue {
  severity: PreflightSeverity;
  category: PreflightCategory;
  file: string;
  line?: number;
  message: string;
  details?: Record<string, any>;
  recommendedResolution?: string;
}

export interface ZeroByteImageReference {
  imagePath: string;
  referencedBy: Array<{
    documentType: 'fieldNote' | 'gallery';
    documentId: string;
    role: 'cover' | 'gallery-image' | 'both';
  }>;
}

export interface H1Finding {
  file: string;
  line: number;
  headingText: string;
  recommendedResolution: string;
}

export interface PlannedAsset {
  sourcePath: string;
  canonicalPath: string;
  hash: string;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;
  sizeBytes: number;
  targetAssetId: string;
}

export interface PlannedPhotoDoc {
  _id: string;
  _type: 'photo';
  title: string;
  alt: string;
  caption?: string;
  legacyFilename: string;
  assetSourcePath: string;
  targetAssetRef: string;
}

export interface PlannedFieldNoteDoc {
  _id: string;
  _type: 'fieldNote';
  title: string;
  slug: { current: string };
  publicationDate: string;
  excerpt: string;
  category: string;
  tags: string[];
  featuredImage?: {
    _type: 'image';
    asset: { _type: 'reference'; _ref: string };
  };
  featuredImageAlt?: string;
  readTime?: string;
  externalLink?: string;
  featured: boolean;
  body: any[];
  sourceFile: string;
}

export interface PlannedGalleryDoc {
  _id: string;
  _type: 'gallery';
  title: string;
  slug: { current: string };
  description: string;
  publicationDate: string;
  displayOrder: number;
  category: string;
  featured: boolean;
  coverImage: {
    _type: 'image';
    asset: { _type: 'reference'; _ref: string };
  };
  coverImageAlt: string;
  photos: Array<{
    _type: 'reference';
    _ref: string;
    _key: string;
  }>;
  sourceFile: string;
}

export interface SchemaMappingDetail {
  documentId: string;
  documentType: 'fieldNote' | 'gallery' | 'photo';
  mappings: Array<{
    sourceField: string;
    targetField: string;
    sourceValue: any;
    targetValue: any;
  }>;
}

export interface PreflightResult {
  valid: boolean;
  blockingCount: number;
  warningCount: number;
  issues: PreflightIssue[];
  zeroByteFiles: ZeroByteImageReference[];
  h1Findings: H1Finding[];
  plannedFieldNotes: PlannedFieldNoteDoc[];
  plannedGalleries: PlannedGalleryDoc[];
  plannedPhotos: PlannedPhotoDoc[];
  plannedAssets: PlannedAsset[];
  schemaMappings: SchemaMappingDetail[];
}

export interface MigrationReportData {
  mode: 'dry-run' | 'execute';
  timestamp: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  isPermittedToExecute: boolean;
  summary: {
    fieldNoteCount: number;
    galleryCount: number;
    photoCount: number;
    uniqueAssetCount: number;
    blockingErrorCount: number;
    warningCount: number;
  };
  plannedDocumentIds: string[];
  plannedSlugs: string[];
  sourceImagePaths: string[];
  zeroByteFiles: ZeroByteImageReference[];
  h1Findings: H1Finding[];
  blockingErrors: PreflightIssue[];
  warnings: PreflightIssue[];
  schemaMappings: SchemaMappingDetail[];
}
