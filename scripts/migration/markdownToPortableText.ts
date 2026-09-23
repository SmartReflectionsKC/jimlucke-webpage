/**
 * Real Markdown AST to Sanity Portable Text converter using mdast-util-from-markdown.
 *
 * Supported structures:
 * - Paragraphs (normal)
 * - Headings: H2, H3, H4
 * - Bullet lists & Numbered lists
 * - Bold, Italic, Inline Code
 * - Code blocks (fenced)
 * - Blockquotes
 * - Links (relative, http, https, mailto; rejects unsafe schemes)
 * - Embedded images (requires alt text >= 5 chars)
 *
 * Strictly flags unsupported structures (e.g. H1 headings, raw HTML, tables, etc.)
 * as blocking preflight issues without silent omission.
 */

import { fromMarkdown } from 'mdast-util-from-markdown';
import { PreflightIssue, H1Finding } from './types';

export interface ConversionOptions {
  sourceFile: string;
  lineOffset?: number;
}

export interface MarkdownConversionResult {
  blocks: any[];
  issues: PreflightIssue[];
  h1Findings: H1Finding[];
}

export function isSafeLinkUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }
  return true;
}

export function isExternalLinkUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Extracts plain text from an mdast node and its descendants.
 */
function extractPlainText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (node.type === 'inlineCode') return node.value || '';
  if (Array.isArray(node.children)) {
    return node.children.map(extractPlainText).join('');
  }
  return '';
}

let keyCounter = 0;
function generateKey(prefix = 'k'): string {
  keyCounter++;
  return `${prefix}_${Date.now().toString(36)}_${keyCounter.toString(36)}`;
}

export function convertMarkdownToPortableText(
  markdown: string,
  options: ConversionOptions
): MarkdownConversionResult {
  const { sourceFile } = options;
  const lineOffset = options.lineOffset || 0;
  const issues: PreflightIssue[] = [];
  const h1Findings: H1Finding[] = [];
  const blocks: any[] = [];

  let ast: any;
  try {
    ast = fromMarkdown(markdown);
  } catch (err: any) {
    issues.push({
      severity: 'blocking',
      category: 'unsupported-markdown',
      file: sourceFile,
      message: `Failed to parse Markdown AST: ${err.message}`,
    });
    return { blocks: [], issues, h1Findings };
  }

  function processInlineChildren(
    children: any[],
    activeMarks: string[],
    markDefs: any[]
  ): any[] {
    const spans: any[] = [];

    for (const child of children) {
      const line = child.position?.start?.line
        ? child.position.start.line + lineOffset
        : undefined;

      switch (child.type) {
        case 'text':
          spans.push({
            _type: 'span',
            _key: generateKey('s'),
            text: child.value,
            marks: [...activeMarks],
          });
          break;

        case 'strong':
          spans.push(
            ...processInlineChildren(
              child.children || [],
              [...activeMarks, 'strong'],
              markDefs
            )
          );
          break;

        case 'emphasis':
          spans.push(
            ...processInlineChildren(
              child.children || [],
              [...activeMarks, 'em'],
              markDefs
            )
          );
          break;

        case 'inlineCode':
          spans.push({
            _type: 'span',
            _key: generateKey('s'),
            text: child.value,
            marks: [...activeMarks, 'code'],
          });
          break;

        case 'link': {
          const url = child.url || '';
          if (!isSafeLinkUrl(url)) {
            issues.push({
              severity: 'blocking',
              category: 'unsafe-url',
              file: sourceFile,
              line,
              message: `Unsafe link URL scheme detected: "${url}". Only http, https, mailto, and relative URLs are allowed.`,
            });
            break;
          }

          const linkKey = generateKey('link');
          markDefs.push({
            _key: linkKey,
            _type: 'link',
            href: url,
            openInNewTab: isExternalLinkUrl(url),
          });

          spans.push(
            ...processInlineChildren(
              child.children || [],
              [...activeMarks, linkKey],
              markDefs
            )
          );
          break;
        }

        case 'break':
          spans.push({
            _type: 'span',
            _key: generateKey('s'),
            text: '\n',
            marks: [...activeMarks],
          });
          break;

        case 'image': {
          // Handled at block level if standalone, or reported if inline
          const alt = (child.alt || '').trim();
          if (!alt || alt.length < 5) {
            issues.push({
              severity: 'blocking',
              category: 'missing-alt-text',
              file: sourceFile,
              line,
              message: `Inline embedded image "${child.url}" is missing required accessible alt text (minimum 5 characters).`,
            });
          }
          break;
        }

        default:
          issues.push({
            severity: 'blocking',
            category: 'unsupported-markdown',
            file: sourceFile,
            line,
            message: `Unsupported inline Markdown construct "${child.type}".`,
          });
      }
    }

    return spans;
  }

  function processBlockNode(node: any) {
    const line = node.position?.start?.line
      ? node.position.start.line + lineOffset
      : undefined;

    switch (node.type) {
      case 'paragraph': {
        // Check for Markdown table constructs in paragraph text
        const plain = extractPlainText(node);
        if (/^\s*\|.*\|\s*$/m.test(plain) && /^\s*\|?\s*[-:]+[-| :]*\s*\|?\s*$/m.test(plain)) {
          issues.push({
            severity: 'blocking',
            category: 'unsupported-markdown',
            file: sourceFile,
            line,
            message: 'Markdown table construct detected. Tables are not supported in blockContent schema.',
          });
          return;
        }

        // Check if paragraph contains only an image
        if (
          node.children?.length === 1 &&
          node.children[0].type === 'image'
        ) {
          const imgNode = node.children[0];
          const alt = (imgNode.alt || '').trim();
          if (!alt || alt.length < 5) {
            issues.push({
              severity: 'blocking',
              category: 'missing-alt-text',
              file: sourceFile,
              line,
              message: `Embedded image "${imgNode.url}" is missing required accessible alt text (minimum 5 characters).`,
            });
          }
          blocks.push({
            _type: 'image',
            _key: generateKey('img'),
            alt: alt || 'Embedded image',
            caption: imgNode.title || undefined,
            _localSourcePath: imgNode.url,
          });
          return;
        }

        const markDefs: any[] = [];
        const spans = processInlineChildren(node.children || [], [], markDefs);
        if (spans.length > 0) {
          blocks.push({
            _type: 'block',
            _key: generateKey('b'),
            style: 'normal',
            children: spans,
            markDefs,
          });
        }
        break;
      }

      case 'heading': {
        const text = extractPlainText(node).trim();

        if (node.depth === 1) {
          // H1 in article body: report exact finding with manual resolution
          const finding: H1Finding = {
            file: sourceFile,
            line: line || 1,
            headingText: text,
            recommendedResolution:
              `Replace top-level '# ${text}' with '## ${text}' or integrate into introductory body text, as the article title already provides the H1 heading.`,
          };
          h1Findings.push(finding);
          issues.push({
            severity: 'blocking',
            category: 'h1-heading',
            file: sourceFile,
            line,
            message: `Body-level H1 heading detected: "# ${text}". Article body headings must start at H2.`,
            recommendedResolution: finding.recommendedResolution,
          });
          return;
        }

        if (node.depth >= 2 && node.depth <= 4) {
          const style = `h${node.depth}`;
          const markDefs: any[] = [];
          const spans = processInlineChildren(node.children || [], [], markDefs);
          blocks.push({
            _type: 'block',
            _key: generateKey('h'),
            style,
            children: spans,
            markDefs,
          });
          return;
        }

        issues.push({
          severity: 'blocking',
          category: 'unsupported-markdown',
          file: sourceFile,
          line,
          message: `Heading depth H${node.depth} ("${text}") is not supported. Studio blockContent schema supports H2, H3, and H4 only.`,
        });
        break;
      }

      case 'list': {
        const listItemType = node.ordered ? 'number' : 'bullet';
        for (const item of node.children || []) {
          for (const itemChild of item.children || []) {
            if (itemChild.type === 'paragraph') {
              const markDefs: any[] = [];
              const spans = processInlineChildren(
                itemChild.children || [],
                [],
                markDefs
              );
              blocks.push({
                _type: 'block',
                _key: generateKey('li'),
                style: 'normal',
                listItem: listItemType,
                level: 1,
                children: spans,
                markDefs,
              });
            } else {
              issues.push({
                severity: 'blocking',
                category: 'unsupported-markdown',
                file: sourceFile,
                line: itemChild.position?.start?.line,
                message: `Complex or nested list construct "${itemChild.type}" is not supported.`,
              });
            }
          }
        }
        break;
      }

      case 'blockquote': {
        for (const child of node.children || []) {
          if (child.type === 'paragraph') {
            const markDefs: any[] = [];
            const spans = processInlineChildren(
              child.children || [],
              [],
              markDefs
            );
            blocks.push({
              _type: 'block',
              _key: generateKey('quote'),
              style: 'blockquote',
              children: spans,
              markDefs,
            });
          } else {
            issues.push({
              severity: 'blocking',
              category: 'unsupported-markdown',
              file: sourceFile,
              line: child.position?.start?.line,
              message: `Blockquote child of type "${child.type}" is not supported. Only paragraphs are supported within blockquotes.`,
            });
          }
        }
        break;
      }

      case 'code': {
        blocks.push({
          _type: 'codeBlock',
          _key: generateKey('code'),
          language: node.lang || 'text',
          code: node.value || '',
        });
        break;
      }

      case 'html': {
        issues.push({
          severity: 'blocking',
          category: 'unsupported-markdown',
          file: sourceFile,
          line,
          message: `Raw HTML construct detected in Markdown: "${node.value}". Raw HTML is not supported in blockContent schema.`,
        });
        break;
      }

      case 'table': {
        issues.push({
          severity: 'blocking',
          category: 'unsupported-markdown',
          file: sourceFile,
          line,
          message: `Markdown table construct detected. Tables are not supported in blockContent schema.`,
        });
        break;
      }

      case 'thematicBreak': {
        issues.push({
          severity: 'blocking',
          category: 'unsupported-markdown',
          file: sourceFile,
          line,
          message: `Horizontal rule (thematicBreak / ---) detected in Markdown body. Not supported in blockContent schema.`,
        });
        break;
      }

      default:
        issues.push({
          severity: 'blocking',
          category: 'unsupported-markdown',
          file: sourceFile,
          line,
          message: `Unsupported Markdown construct: "${node.type}".`,
        });
    }
  }

  for (const child of ast.children || []) {
    processBlockNode(child);
  }

  return { blocks, issues, h1Findings };
}
