export interface FrontmatterData {
  title?: string;
  date?: string;
  summary?: string;
  category?: string;
  tags?: string[];
  coverImage?: string;
  published?: boolean;
  draft?: boolean;
  readTime?: string;
  externalLink?: string;
  [key: string]: unknown;
}

export interface ParsedMarkdown<T = FrontmatterData> {
  data: T;
  content: string;
}

/**
 * Safely parses a YAML-like value into string, boolean, number, or string array.
 */
function parseYamlValue(raw: string): unknown {
  const trimmed = raw.trim();

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Quoted string
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }

  // Inline array: ["a", "b", "c"]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((item) => String(parseYamlValue(item.trim())))
      .filter((item) => item.length > 0);
  }

  return trimmed;
}

/**
 * Parse frontmatter and content from raw markdown text.
 * Expects frontmatter enclosed between `---` markers at the start of the file.
 */
export function parseFrontmatter<T = FrontmatterData>(rawFileContent: string): ParsedMarkdown<T> {
  const normalized = rawFileContent.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  if (lines[0].trim() !== '---') {
    return {
      data: {} as T,
      content: rawFileContent.trim(),
    };
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return {
      data: {} as T,
      content: rawFileContent.trim(),
    };
  }

  const fmLines = lines.slice(1, closingIndex);
  const bodyContent = lines.slice(closingIndex + 1).join('\n').trim();

  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (let i = 0; i < fmLines.length; i++) {
    const line = fmLines[i];
    const trimmed = line.trim();

    // Ignore empty lines or comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // List item for multiline array: e.g. "  - item"
    if (trimmed.startsWith('- ') && currentKey) {
      const itemVal = String(parseYamlValue(trimmed.slice(2).trim()));
      if (!currentArray) {
        currentArray = [];
        data[currentKey] = currentArray;
      }
      currentArray.push(itemVal);
      continue;
    }

    // Key-value pair: e.g. "title: Value"
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const valStr = line.slice(colonIdx + 1).trim();

      currentKey = key;
      currentArray = null;

      if (valStr.length > 0) {
        data[key] = parseYamlValue(valStr);
      } else {
        // Might be a multiline list starting on next line
        data[key] = [];
        currentArray = data[key] as string[];
      }
    }
  }

  return {
    data: data as T,
    content: bodyContent,
  };
}
