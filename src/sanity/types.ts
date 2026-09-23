/**
 * Types for Sanity Content Lake integration.
 */

export type ContentSourceMode = 'local' | 'hybrid' | 'sanity';

export interface SanityConfig {
  contentSource: ContentSourceMode;
  projectId: string;
  dataset: string;
  apiVersion: string;
  useCdn: boolean;
}

export interface ConfigValidationResult {
  isValid: boolean;
  mode: ContentSourceMode;
  error?: string;
  config: SanityConfig;
}

export interface SanityImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface SanityImageCrop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SanityImageHotspot {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface SanityImageAsset {
  _id: string;
  url?: string;
  metadata?: {
    dimensions?: SanityImageDimensions;
    lqip?: string;
  };
}

export interface SanityImageSource {
  _type?: 'image';
  asset?: SanityImageAsset | { _ref: string };
  crop?: SanityImageCrop;
  hotspot?: SanityImageHotspot;
  alt?: string;
  caption?: string;
  [key: string]: any;
}

export interface ResponsiveImageData {
  src: string;
  srcSet: string;
  sizes: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  alt: string;
  caption?: string;
}

export interface SanityFieldNoteListDoc {
  _id: string;
  title: string;
  slug: string;
  date: string;
  summary: string;
  category: string;
  tags?: string[];
  readTime?: string;
  externalLink?: string;
  featured?: boolean;
  featuredImage?: SanityImageSource;
  featuredImageAlt?: string;
}

export interface SanityFieldNoteDetailDoc extends SanityFieldNoteListDoc {
  body: any[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface SanityPhotoDoc {
  _id: string;
  title: string;
  alt: string;
  caption?: string;
  datePhotographed?: string;
  location?: string;
  tags?: string[];
  image: SanityImageSource;
}

export interface SanityGalleryDoc {
  _id: string;
  id: string;
  title: string;
  description: string;
  date: string;
  displayOrder: number;
  category?: string;
  featured?: boolean;
  coverImage: SanityImageSource;
  coverImageAlt: string;
  photos?: SanityPhotoDoc[];
}

export interface ContentState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  mode: ContentSourceMode;
  source: 'local' | 'sanity';
  retry: () => void;
}
