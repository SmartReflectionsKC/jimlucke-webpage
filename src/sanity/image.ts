/**
 * Responsive Sanity image builder and helper utilities.
 * Preserves Sanity crop/hotspot, clamps widths to source asset dimensions,
 * deduplicates candidate widths, and provides srcSet and sizes.
 */

import { createImageUrlBuilder } from '@sanity/image-url';
import { getSanityConfig } from './config';
import { SanityImageSource, ResponsiveImageData, SanityImageDimensions } from './types';

export type ImageUrlBuilder = ReturnType<typeof createImageUrlBuilder>;

export const RESPONSIVE_WIDTHS = [400, 800, 1200, 1600, 2000] as const;

let cachedBuilder: ImageUrlBuilder | null = null;
let lastBuilderKey = '';

/**
 * Returns a configured ImageUrlBuilder instance.
 */
export function getImageBuilder(): ImageUrlBuilder {
  const config = getSanityConfig();
  const key = `${config.projectId}:${config.dataset}`;

  if (cachedBuilder && lastBuilderKey === key) {
    return cachedBuilder;
  }

  cachedBuilder = createImageUrlBuilder({
    projectId: config.projectId,
    dataset: config.dataset,
  });
  lastBuilderKey = key;

  return cachedBuilder;
}

/**
 * Checks if a value is a valid Sanity image source (document or object with asset).
 * Local paths (strings starting with /images/...) and non-Sanity assets return false.
 */
export function isSanityImage(source: unknown): source is SanityImageSource {
  if (!source || typeof source !== 'object') return false;
  const s = source as Record<string, any>;
  if (s._type === 'image') return true;
  if (s.asset && (typeof s.asset === 'object' || typeof s.asset === 'string')) {
    return true;
  }
  return false;
}

/**
 * Extracts source image dimensions from metadata or asset reference string.
 */
export function getImageDimensions(source: SanityImageSource): SanityImageDimensions | null {
  const asset = source.asset as any;
  if (asset && typeof asset === 'object' && asset.metadata?.dimensions) {
    return asset.metadata.dimensions;
  }

  // Parse dimensions from Sanity asset ID format: image-{id}-{width}x{height}-{format}
  const assetId = asset
    ? asset._id || asset._ref || (typeof asset === 'string' ? asset : '')
    : '';

  if (assetId && typeof assetId === 'string') {
    const match = assetId.match(/-(\d+)x(\d+)-/);
    if (match) {
      const width = parseInt(match[1], 10);
      const height = parseInt(match[2], 10);
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        return {
          width,
          height,
          aspectRatio: width / height,
        };
      }
    }
  }

  return null;
}

/**
 * Computes deduplicated and clamped widths so we never request a width
 * larger than the original source asset.
 */
export function getClampedWidths(originalWidth?: number): number[] {
  if (!originalWidth || originalWidth <= 0) {
    return [...RESPONSIVE_WIDTHS];
  }

  const clamped = RESPONSIVE_WIDTHS.map((w) => Math.min(w, originalWidth));
  // If originalWidth is smaller than 400, clamped will be all [originalWidth]
  const deduplicated = Array.from(new Set(clamped)).sort((a, b) => a - b);
  return deduplicated;
}

export interface BuildResponsiveImageOptions {
  fallbackAlt?: string;
  defaultSizes?: string;
  preferredWidth?: number;
}

/**
 * Generates responsive image URLs, srcSet, sizes, and dimensions for a Sanity image.
 * If given a non-Sanity image (e.g. local string path), gracefully returns it directly.
 */
export function buildResponsiveImage(
  source: unknown,
  options: BuildResponsiveImageOptions = {}
): ResponsiveImageData {
  const {
    fallbackAlt = '',
    defaultSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 1200px',
    preferredWidth = 1200,
  } = options;

  // Non-Sanity image (e.g. local string or missing asset)
  if (!isSanityImage(source)) {
    const src = typeof source === 'string' ? source : '';
    return {
      src,
      srcSet: '',
      sizes: defaultSizes,
      alt: fallbackAlt,
    };
  }

  const alt = source.alt || source.featuredImageAlt || source.coverImageAlt || fallbackAlt;
  const caption = source.caption;
  const dimensions = getImageDimensions(source);
  const originalWidth = dimensions?.width;
  const widths = getClampedWidths(originalWidth);

  const builder = getImageBuilder();

  // Generate srcSet entries with auto('format')
  const srcSetEntries = widths.map((w) => {
    const url = builder.image(source).width(w).auto('format').url();
    return `${url} ${w}w`;
  });

  const srcSet = srcSetEntries.join(', ');

  // Primary fallback src: clamped preferred width
  const clampedFallbackWidth = originalWidth ? Math.min(preferredWidth, originalWidth) : preferredWidth;
  const src = builder.image(source).width(clampedFallbackWidth).auto('format').url();

  return {
    src,
    srcSet,
    sizes: defaultSizes,
    width: dimensions?.width,
    height: dimensions?.height,
    aspectRatio: dimensions?.aspectRatio,
    alt,
    caption,
  };
}
