import { parseFrontmatter, FrontmatterData } from './frontmatter';

export interface FieldNoteItem {
  slug: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  tags: string[];
  coverImage?: string;
  published: boolean;
  draft?: boolean;
  readTime?: string;
  externalLink?: string;
  content: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface PhotographyGallery {
  id: string;
  title: string;
  description: string;
  date: string;
  coverImage: string;
  displayOrder: number;
  published: boolean;
  images: GalleryImage[];
}

// Vite glob imports
const rawFieldNotes = import.meta.glob('/content/field-notes/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const rawGalleries = import.meta.glob('/content/photography/*.json', {
  import: 'default',
  eager: true,
}) as Record<string, PhotographyGallery>;

const isProd = import.meta.env.PROD;

export function getFieldNotes(): FieldNoteItem[] {
  const notes: FieldNoteItem[] = [];

  for (const [filepath, rawContent] of Object.entries(rawFieldNotes)) {
    const filename = filepath.split('/').pop() || '';

    // Permanently ignore template and any file starting with _
    if (filename.startsWith('_')) {
      continue;
    }

    const slug = filename.replace(/\.md$/, '');
    const { data, content } = parseFrontmatter<FrontmatterData>(rawContent);

    const isPublished = data.published === true && data.draft !== true;

    // Filter drafts out in production builds
    if (isProd && !isPublished) {
      continue;
    }

    notes.push({
      slug,
      title: data.title || slug,
      date: data.date ? String(data.date) : '',
      summary: data.summary || '',
      category: data.category || 'Field Note',
      tags: Array.isArray(data.tags) ? data.tags : [],
      coverImage: data.coverImage,
      published: isPublished,
      draft: data.draft === true || data.published === false,
      readTime: data.readTime,
      externalLink: data.externalLink,
      content,
    });
  }

  // Sort newest first
  return notes.sort((a, b) => {
    const dateA = a.date ? Date.parse(a.date) : 0;
    const dateB = b.date ? Date.parse(b.date) : 0;
    return dateB - dateA;
  });
}

export function getFieldNoteBySlug(slug: string): FieldNoteItem | undefined {
  return getFieldNotes().find((n) => n.slug === slug);
}

export function getPhotographyGalleries(): PhotographyGallery[] {
  const galleries: PhotographyGallery[] = [];

  for (const [filepath, manifest] of Object.entries(rawGalleries)) {
    const filename = filepath.split('/').pop() || '';
    if (filename.startsWith('_')) continue;

    const id = manifest.id || filename.replace(/\.json$/, '');
    const isPublished = manifest.published === true;

    if (isProd && !isPublished) {
      continue;
    }

    galleries.push({
      ...manifest,
      id,
    });
  }

  // Sort by displayOrder ascending
  return galleries.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
}

export function getPhotographyGalleryById(id: string): PhotographyGallery | undefined {
  return getPhotographyGalleries().find((g) => g.id === id);
}
