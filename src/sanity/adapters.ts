/**
 * Explicit data adapters converting Sanity documents into website models.
 * Preserves full compatibility with existing FieldNoteItem and PhotographyGallery types.
 */

import {
  SanityFieldNoteListDoc,
  SanityFieldNoteDetailDoc,
  SanityGalleryDoc,
} from './types';
import { FieldNoteItem, PhotographyGallery, GalleryImage } from '../utils/contentLoader';
import { buildResponsiveImage } from './image';

/**
 * Adapts a Sanity Field Note list document (metadata only) into a FieldNoteItem.
 */
export function adaptSanityFieldNoteList(doc: SanityFieldNoteListDoc): FieldNoteItem {
  let coverImage: string | undefined;
  let coverImageSrcSet: string | undefined;
  let coverImageSizes: string | undefined;
  let coverImageAlt: string | undefined;

  if (doc.featuredImage) {
    const responsive = buildResponsiveImage(doc.featuredImage, {
      fallbackAlt: doc.featuredImageAlt || doc.title,
    });
    coverImage = responsive.src;
    coverImageSrcSet = responsive.srcSet;
    coverImageSizes = responsive.sizes;
    coverImageAlt = doc.featuredImageAlt || responsive.alt;
  }

  return {
    slug: doc.slug,
    title: doc.title,
    date: doc.date ? String(doc.date) : '',
    summary: doc.summary || '',
    category: doc.category || 'Field Note',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    coverImage,
    coverImageSrcSet,
    coverImageSizes,
    coverImageAlt,
    published: true,
    draft: false,
    readTime: doc.readTime,
    externalLink: doc.externalLink,
    featured: Boolean(doc.featured),
    content: '', // Listing projection does not load raw body
    body: undefined,
    isSanity: true,
  };
}

/**
 * Adapts a complete Sanity Field Note detail document into a FieldNoteItem with Portable Text body.
 */
export function adaptSanityFieldNoteDetail(doc: SanityFieldNoteDetailDoc): FieldNoteItem {
  const base = adaptSanityFieldNoteList(doc);
  return {
    ...base,
    body: Array.isArray(doc.body) ? doc.body : [],
    isSanity: true,
  };
}

/**
 * Adapts a Sanity Gallery document into a PhotographyGallery.
 */
export function adaptSanityGallery(doc: SanityGalleryDoc): PhotographyGallery {
  let coverImage = '';
  let coverImageSrcSet: string | undefined;
  let coverImageSizes: string | undefined;
  let coverImageAlt = doc.coverImageAlt || doc.title;

  if (doc.coverImage) {
    const responsive = buildResponsiveImage(doc.coverImage, {
      fallbackAlt: doc.coverImageAlt || doc.title,
    });
    coverImage = responsive.src;
    coverImageSrcSet = responsive.srcSet;
    coverImageSizes = responsive.sizes;
    coverImageAlt = doc.coverImageAlt || responsive.alt;
  }

  const images: GalleryImage[] = [];

  if (Array.isArray(doc.photos)) {
    for (const photo of doc.photos) {
      if (!photo) continue;
      const responsive = buildResponsiveImage(photo.image, {
        fallbackAlt: photo.alt || photo.title,
      });

      images.push({
        src: responsive.src,
        srcSet: responsive.srcSet,
        sizes: responsive.sizes,
        alt: photo.alt || responsive.alt || photo.title || 'Photograph',
        caption: photo.caption || undefined,
        width: responsive.width,
        height: responsive.height,
      });
    }
  }

  return {
    id: doc.id,
    title: doc.title || '',
    description: doc.description || '',
    date: doc.date ? String(doc.date) : '',
    coverImage,
    coverImageSrcSet,
    coverImageSizes,
    coverImageAlt,
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 999,
    published: true,
    images,
  };
}
