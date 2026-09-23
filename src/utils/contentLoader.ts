import { parseFrontmatter, FrontmatterData } from './frontmatter';

export interface FieldNoteItem {
  slug: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  tags: string[];
  coverImage?: string;
  coverImageSrcSet?: string;
  coverImageSizes?: string;
  coverImageAlt?: string;
  published: boolean;
  draft?: boolean;
  readTime?: string;
  externalLink?: string;
  featured?: boolean;
  content: string;
  body?: any[];
  isSanity?: boolean;
}

export interface GalleryImage {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface PhotographyGallery {
  id: string;
  title: string;
  description: string;
  date: string;
  coverImage: string;
  coverImageSrcSet?: string;
  coverImageSizes?: string;
  coverImageAlt?: string;
  displayOrder: number;
  published: boolean;
  images: GalleryImage[];
}

function loadNodeFieldNotes(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const proc = (globalThis as any).process;
    const fs = proc?.getBuiltinModule?.('node:fs');
    const path = proc?.getBuiltinModule?.('node:path');
    if (fs && path) {
      const cwd = proc.cwd();
      const dir = path.join(cwd, 'content', 'field-notes');
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          if (f.endsWith('.md')) {
            result[`/content/field-notes/${f}`] = fs.readFileSync(path.join(dir, f), 'utf-8');
          }
        }
      }
    }
  } catch {}
  return result;
}

function loadNodeGalleries(): Record<string, PhotographyGallery> {
  const result: Record<string, PhotographyGallery> = {};
  try {
    const proc = (globalThis as any).process;
    const fs = proc?.getBuiltinModule?.('node:fs');
    const path = proc?.getBuiltinModule?.('node:path');
    if (fs && path) {
      const cwd = proc.cwd();
      const dir = path.join(cwd, 'content', 'photography');
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          if (f.endsWith('.json')) {
            result[`/content/photography/${f}`] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
          }
        }
      }
    }
  } catch {}
  return result;
}

const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);

// In the browser (Vite dev and build), isNode is false, so Vite compiles import.meta.glob
// into bundled imports.
// In Node.js (test runner), isNode is true, so the ternary short-circuits to the filesystem
// loader without invoking import.meta.glob, even if global.window is mocked.
const rawFieldNotes = (
  !isNode
    ? import.meta.glob('/content/field-notes/*.md', {
        query: '?raw',
        import: 'default',
        eager: true,
      })
    : loadNodeFieldNotes()
) as Record<string, string>;

const rawGalleries = (
  !isNode
    ? import.meta.glob('/content/photography/*.json', {
        import: 'default',
        eager: true,
      })
    : loadNodeGalleries()
) as Record<string, PhotographyGallery>;

const isProd = Boolean((import.meta as any).env?.PROD);

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
