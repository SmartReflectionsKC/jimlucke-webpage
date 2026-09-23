/**
 * Portable Text renderer for Field Note bodies.
 * Supports paragraphs, H2-H4 headings, lists, blockquotes, strong/em/code marks,
 * safe external/internal links, embedded images, code blocks,
 * and visibly reports unsupported block types.
 */

import React from 'react';
import { PortableText, PortableTextComponents } from '@portabletext/react';
import { buildResponsiveImage } from '../sanity/image';

/**
 * Validates whether a URL uses a safe protocol.
 * Rejects javascript:, data:, vbscript:, etc.
 */
export function isSafeUrl(href?: string): boolean {
  if (!href || typeof href !== 'string') return false;
  const trimmed = href.trim();

  // Safe relative paths or hashes
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return true;
  }

  // Safe explicit protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:')
  ) {
    return true;
  }

  // Unsafe
  return false;
}

/**
 * Determines whether a safe URL points to an external site.
 */
export function isExternalUrl(href?: string): boolean {
  if (!href || typeof href !== 'string') return false;
  const trimmed = href.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        return false;
      }
      if (parsed.hostname === 'jimlucke.com' || parsed.hostname === 'www.jimlucke.com') {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  return false;
}

export const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="mb-6 leading-relaxed text-slate-300">{children}</p>,
    h2: ({ children }) => (
      <h2 className="text-2xl md:text-3xl font-display font-semibold text-white mt-10 mb-4">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl md:text-2xl font-display font-semibold text-white mt-8 mb-4 border-b border-white/5 pb-2">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg md:text-xl font-display font-medium text-white mt-6 mb-3">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-amber-500/50 pl-4 italic text-slate-400 my-6 bg-slate-800/30 py-2 rounded-r-md">
        {children}
      </blockquote>
    ),
  },

  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-300">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2 text-slate-300">{children}</ol>
    ),
  },

  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },

  marks: {
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
    code: ({ children }) => (
      <code className="bg-slate-800 text-amber-200 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    underline: ({ children }) => (
      <span className="underline underline-offset-4">{children}</span>
    ),
    link: ({ value, children }) => {
      const href = value?.href;

      // Reject unsafe schemes
      if (!isSafeUrl(href)) {
        return (
          <span className="text-amber-400/60 line-through cursor-not-allowed" title="Unsafe link removed">
            {children}
          </span>
        );
      }

      const external = isExternalUrl(href) || Boolean(value?.openInNewTab);

      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="text-amber-400 hover:text-amber-300 underline underline-offset-4 font-medium transition-colors"
        >
          {children}
        </a>
      );
    },
  },

  types: {
    image: ({ value }) => {
      if (!value) return null;
      const responsive = buildResponsiveImage(value, {
        fallbackAlt: value.alt || 'Field note illustration',
      });

      return (
        <figure className="my-8">
          <img
            src={responsive.src}
            srcSet={responsive.srcSet || undefined}
            sizes={responsive.sizes || undefined}
            alt={responsive.alt}
            loading="lazy"
            className="rounded-xl border border-white/10 max-h-96 w-full object-cover"
          />
          {value.caption && (
            <figcaption className="text-xs text-slate-500 italic mt-2 text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },

    codeBlock: ({ value }) => {
      if (!value || !value.code) return null;
      return (
        <div className="my-6 rounded-xl overflow-hidden border border-white/10 bg-slate-950 font-mono text-sm">
          {value.language && (
            <div className="px-4 py-1.5 bg-slate-900 border-b border-white/5 text-xs text-amber-400 font-mono">
              {value.language}
            </div>
          )}
          <pre className="p-4 overflow-x-auto text-slate-200">
            <code>{value.code}</code>
          </pre>
        </div>
      );
    },
  },

  unknownType: ({ value }) => {
    const typeName = value?._type || 'unknown';
    return (
      <div
        className="my-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono"
        role="alert"
      >
        Unsupported content block: [{typeName}]
      </div>
    );
  },
};

interface PortableTextRendererProps {
  value: any[];
}

export function PortableTextRenderer({ value }: PortableTextRendererProps) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return <PortableText value={value} components={portableTextComponents} />;
}
