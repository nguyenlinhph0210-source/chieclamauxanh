import React, { useMemo } from 'react';

export interface RichTextRendererProps {
  content: string;
  className?: string;
  indentParagraphs?: boolean;
}

/**
 * Strips all HTML and BBCode/Markdown tags for plain-text excerpts
 * (used for StoryCard, SearchModal preview, etc.)
 */
export function stripRichText(text?: string | null): string {
  if (!text) return '';
  let s = text;
  // Strip HTML tags
  s = s.replace(/<[^>]*>/g, ' ');
  // Strip BBCode tags
  s = s.replace(/\[\/?(?:center|right|left|justify|indent|quote|heading|h[1-6]|b|i|u|s|mark)[^\]]*\]/gi, ' ');
  // Strip markdown markers
  s = s.replace(/\*\*\*([^*]+?)\*\*\*/g, '$1');
  s = s.replace(/\*\*([^*]+?)\*\*/g, '$1');
  s = s.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '$1');
  s = s.replace(/~~([^~]+?)~~/g, '$1');
  s = s.replace(/==([^=]+?)==/g, '$1');
  // Normalize whitespace
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitizes arbitrary HTML to prevent malicious XSS and cleans out
 * intrusive copied DevTools / browser inspector styles that break reader customization.
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';
  let s = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript\s*:/gi, '');

  // Strip devtools / angular / web clipper attributes
  s = s.replace(/\s*_ngcontent-[a-zA-Z0-9_-]+="[^"]*"/g, '');
  s = s.replace(/\s*inline-copy-host(?:=""|)/g, '');
  s = s.replace(/\s*aria-busy="[^"]*"/g, '');
  s = s.replace(/\s*aria-live="[^"]*"/g, '');
  s = s.replace(/\s*dir="ltr"/g, '');
  s = s.replace(/\s*data-path-to-node="[^"]*"/g, '');
  s = s.replace(/\s*id="model-response-[^"]*"/g, '');
  s = s.replace(/\s*class="[^"]*markdown-main-panel[^"]*"/g, '');

  // Strip intrusive inline styles (e.g. line-height: 1.15, hardcoded color, font-family)
  // so reader themes, font choices, and line-height toggles can work freely.
  s = s.replace(/\s*style="[^"]*(?:animation|line-height|color:\s*rgb|font-family|fill:)[^"]*"/gi, '');
  s = s.replace(/\s*style="background-color:\s*rgba\(0,\s*0,\s*0,\s*0\);?"/gi, '');
  s = s.replace(/\s*style=""/gi, '');

  return s;
}

/**
 * Converts BBCode, Markdown, and custom tags into semantic HTML.
 * By default, indentParagraphs is FALSE (user explicitly requested no automatic indentation).
 */
export function formatRichTextToHtml(raw?: string | null, indentParagraphs = false): string {
  if (!raw || !raw.trim()) return '';

  let text = sanitizeHtml(raw.trim());

  // 1. Convert Flower Divider (❀ ❀ ❀)
  text = text.replace(
    /(?:^|\n)\s*❀\s*❀\s*❀\s*(?:$|\n)/g,
    '\n<div class="my-6 text-center text-pink-500 dark:text-pink-400 font-serif text-lg tracking-widest select-none">❀ ❀ ❀</div>\n'
  );

  // 2. Convert BBCode block tags (allowing multiline content)
  text = text.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, (_, inner) => {
    return `<div style="text-align: center;" class="my-3 font-medium">${inner.trim().replace(/\n/g, '<br/>')}</div>`;
  });
  text = text.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, (_, inner) => {
    return `<div style="text-align: right;" class="my-3">${inner.trim().replace(/\n/g, '<br/>')}</div>`;
  });
  text = text.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, (_, inner) => {
    return `<div style="text-align: left;" class="my-3">${inner.trim().replace(/\n/g, '<br/>')}</div>`;
  });
  text = text.replace(/\[justify\]([\s\S]*?)\[\/justify\]/gi, (_, inner) => {
    return `<div style="text-align: justify;" class="my-3">${inner.trim().replace(/\n/g, '<br/>')}</div>`;
  });
  // Indent (explicit indentation requested by author using indent tool)
  text = text.replace(/\[indent\]([\s\S]*?)\[\/indent\]/gi, (_, inner) => {
    return `<div style="text-indent: 2.2rem;" class="my-3">${inner.trim().replace(/\n/g, '<br/>')}</div>`;
  });
  // Blockquote
  text = text.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, (_, inner) => {
    return `<blockquote class="my-3 pl-4 sm:pl-5 py-2 border-l-3 border-pink-400 rounded-r-xl italic text-sm sm:text-base">${inner.trim().replace(/\n/g, '<br/>')}</blockquote>`;
  });
  // Headings
  text = text.replace(/\[(?:h[1-3]|heading)\]([\s\S]*?)\[\/(?:h[1-3]|heading)\]/gi, (_, inner) => {
    return `<h3 class="font-bold text-base sm:text-lg text-inherit my-3 pb-1 border-b border-current/20">${inner.trim()}</h3>`;
  });

  // Markdown block headings
  text = text.replace(/^### (.*$)/gim, '<h3 class="font-bold text-base sm:text-lg text-inherit my-3 pb-1 border-b border-current/20">$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg sm:text-xl text-inherit my-3.5 pb-1.5 border-b border-current/20">$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl sm:text-2xl text-inherit my-4 pb-2 border-b border-current/20">$1</h1>');
  text = text.replace(/^> (.*$)/gim, '<blockquote class="my-3 pl-4 sm:pl-5 py-2 border-l-3 border-pink-400 rounded-r-xl italic text-sm sm:text-base">$1</blockquote>');

  // 3. Inline formatting
  // Bold + Italic: ***text***
  text = text.replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text** or [b]text[/b]
  text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong class="font-bold text-inherit">$1</strong>');
  text = text.replace(/\[b\]([\s\S]+?)\[\/b\]/gi, '<strong class="font-bold text-inherit">$1</strong>');
  // Italic: *text* or [i]text[/i]
  text = text.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em class="italic">$1</em>');
  text = text.replace(/\[i\]([\s\S]+?)\[\/i\]/gi, '<em class="italic">$1</em>');
  // Underline: [u]text[/u]
  text = text.replace(/\[u\]([\s\S]+?)\[\/u\]/gi, '<u class="underline underline-offset-3 decoration-pink-400">$1</u>');
  // Strikethrough: ~~text~~ or [s]text[/s]
  text = text.replace(/~~([^~]+?)~~/g, '<del class="line-through opacity-60">$1</del>');
  text = text.replace(/\[s\]([\s\S]+?)\[\/s\]/gi, '<del class="line-through opacity-60">$1</del>');
  // Highlight: ==text== or [mark]text[/mark]
  text = text.replace(/==([^=]+?)==/g, '<mark class="bg-pink-100 dark:bg-pink-950/60 text-inherit px-1 rounded-sm">$1</mark>');
  text = text.replace(/\[mark\]([\s\S]+?)\[\/mark\]/gi, '<mark class="bg-pink-100 dark:bg-pink-950/60 text-inherit px-1 rounded-sm">$1</mark>');

  // 4. Clean up any remaining/unclosed stray BBCode tags so they NEVER leak as raw text!
  text = text.replace(/\[\/?(?:center|right|left|justify|indent|quote|heading|h[1-6]|b|i|u|s|mark)\]/gi, '');

  // 5. Structure paragraphs and line breaks:
  // If the content is already fully wrapped in HTML blocks (<p>, <div, <blockquote, <h[1-6]), preserve it.
  const hasHtmlBlocks = /^<(?:p|div|blockquote|h[1-6]|ul|ol|table)[\s>]/i.test(text.trim());

  if (hasHtmlBlocks) {
    return text;
  }

  // Otherwise, split by double newlines into paragraphs
  const blocks = text.split(/\n{2,}/);
  const formattedBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // If it starts with a block-level HTML tag (div, blockquote, h1-6, hr), keep as block
    if (/^<(?:div|blockquote|h[1-6]|p|hr)/i.test(trimmed)) {
      return trimmed;
    }

    // Normal paragraph:
    // Do NOT lock line-height here so reader line-height toggle controls it!
    const indentClass = indentParagraphs ? 'indent-6 sm:indent-8' : 'indent-0';
    const withBr = trimmed.replace(/\n/g, '<br/>');
    return `<p class="${indentClass} my-3 sm:my-4">${withBr}</p>`;
  });

  return formattedBlocks.filter(Boolean).join('\n');
}

/**
 * Backward compatibility helper for inline content rendering
 */
export function renderInlineContent(text: string): React.ReactNode {
  if (!text) return null;
  const html = formatRichTextToHtml(text, false);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * RichTextRenderer component:
 * Renders rich text formatted with HTML, BBCode, or Markdown.
 * Defaults to indentParagraphs={false} as requested (no automatic indentation).
 */
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
  indentParagraphs = false,
}) => {
  const htmlContent = useMemo(() => {
    return formatRichTextToHtml(content, indentParagraphs);
  }, [content, indentParagraphs]);

  if (!htmlContent) {
    return null;
  }

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
