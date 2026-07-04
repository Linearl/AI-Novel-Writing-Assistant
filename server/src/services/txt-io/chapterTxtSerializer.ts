/**
 * Chapter TXT serializer — strips markdown formatting from chapter content
 * and produces clean plain text.
 */

/* ------------------------------------------------------------------ */
/*  Export (markdown -> plain text)                                    */
/* ------------------------------------------------------------------ */

/**
 * Strip markdown formatting markers from chapter content,
 * preserving readable plain text with paragraph breaks.
 *
 * Handles: headings (#), bold/italic (*, **, __), links [text](url),
 * images ![alt](url), horizontal rules (---, ***, ___), code blocks, etc.
 */
export function markdownToPlainText(markdown: string): string {
  let text = markdown;

  // Remove fenced code blocks (``` ... ```)
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove inline code backticks
  text = text.replace(/`([^`\n]+)`/g, "$1");

  // Remove images: ![alt](url) -> alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Remove links: [text](url) -> text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Remove heading markers but keep the text
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold markers
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/__(.+?)__/g, "$1");

  // Remove italic markers
  text = text.replace(/\*(.+?)\*/g, "$1");
  text = text.replace(/_(.+?)_/g, "$1");

  // Remove strikethrough
  text = text.replace(/~~(.+?)~~/g, "$1");

  // Remove blockquotes markers
  text = text.replace(/^>\s*/gm, "");

  // Remove unordered list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");

  // Remove ordered list markers
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");

  // Remove horizontal rules
  text = text.replace(/^[\s]*[-*_]{3,}\s*$/gm, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Collapse multiple blank lines into one
  text = text.replace(/\n{3,}/g, "\n\n");

  // Trim leading/trailing whitespace
  text = text.trim();

  return text;
}
