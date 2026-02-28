import { simpleParser } from "mailparser";
import type { ParsedEmail, ScreenshotOptions } from "./types.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Try to extract the preheader/preview text from the HTML.
 * Many marketing emails hide it in a span/div near the top with
 * display:none, max-height:0, overflow:hidden, etc.
 */
function extractPreheader(html: string): string | null {
  // Match elements with display:none or similar hiding styles
  const hiddenPattern =
    /<(?:span|div)[^>]*style="[^"]*(?:display\s*:\s*none|max-height\s*:\s*0|font-size\s*:\s*0|mso-hide:\s*all)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/gi;

  const match = hiddenPattern.exec(html);
  if (match) {
    // Strip any nested tags and clean up
    const text = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#8199;/g, " ")
      .replace(/&#847;/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 10) return text;
  }

  return null;
}

/**
 * Extract visible text from the HTML body — similar to what Gmail uses
 * for preview text when no hidden preheader exists.
 * Strips images, style/script blocks, hidden elements, and tags,
 * then returns the first meaningful visible text.
 */
function extractVisibleText(html: string): string {
  return (
    html
      // Remove entire <head> block (contains title, styles, meta — not visible)
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
      // Remove any remaining style/script blocks in body
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      // Extract img alt text BEFORE removing hidden elements, because the
      // hidden-element regex can accidentally consume void <img> tags that
      // have display:none (responsive mobile images). Gmail includes alt
      // text from all images regardless of visibility.
      .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " $1 ")
      .replace(/<img[^>]*>/gi, "")
      // Remove hidden elements: inline style or common hiding classes
      .replace(
        /<[^>]+style="[^"]*(?:display\s*:\s*none|max-height\s*:\s*0|font-size\s*:\s*0|overflow\s*:\s*hidden)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        ""
      )
      .replace(
        /<[^>]+class="[^"]*(?:preheader|hidden|visually-hidden|sr-only)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        ""
      )
      // Convert <br> and block-level closings to spaces
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(?:p|div|h[1-6]|tr|td|th|li)>/gi, " ")
      // Strip all remaining HTML tags
      .replace(/<[^>]+>/g, "")
      // Decode common HTML entities
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#\d+;/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

export async function parseEml(buffer: Buffer): Promise<ParsedEmail> {
  const parsed = await simpleParser(buffer);

  let html = parsed.html || "";

  // If there's no HTML part, wrap plain text
  if (!html && parsed.text) {
    html = `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; padding: 20px; margin: 0;">${escapeHtml(parsed.text)}</pre>`;
  }

  // Format the "from" field without quotes around the display name.
  // mailparser's from.text adds quotes like: "LEGO Account" <addr@example.com>
  // We reconstruct it from the structured value instead.
  let from = "Unknown Sender";
  if (parsed.from?.value?.[0]) {
    const { name, address } = parsed.from.value[0];
    if (name && address) {
      from = `${name} <${address}>`;
    } else {
      from = name || address || "Unknown Sender";
    }
  }

  // Preview text: Gmail concatenates hidden preheader + visible body text
  const preheader = html ? extractPreheader(html) : null;
  const visibleText = html ? extractVisibleText(html) : "";
  const rawPreview =
    [preheader, visibleText].filter(Boolean).join(" ") || parsed.text || "";
  const previewText = rawPreview.slice(0, 200).trim();

  return {
    html,
    subject: parsed.subject || "(No Subject)",
    from,
    date: parsed.date
      ? parsed.date.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "",
    previewText,
  };
}

export function buildHeaderHtml(
  email: ParsedEmail,
  options: Pick<ScreenshotOptions, "showDate" | "showPreview">
): string {
  const datePart =
    options.showDate && email.date
      ? ` &mdash; ${escapeHtml(email.date)}`
      : "";

  const previewPart =
    options.showPreview && email.previewText
      ? `<div style="font-size: 13px; color: #999; margin-top: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(email.previewText)}</div>`
      : "";

  return `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px 24px;
      background: #fafafa;
    ">
      <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
        ${escapeHtml(email.from)}${datePart}
      </div>
      <div style="font-size: 18px; font-weight: 600; color: #1a1a1a;">
        ${escapeHtml(email.subject)}
      </div>
      ${previewPart}
    </div>`;
}

export function buildFullHtml(
  email: ParsedEmail,
  options: ScreenshotOptions
): string {
  const headerBlock = options.showHeader
    ? buildHeaderHtml(email, options)
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 0; background: white; }
</style></head><body>
${headerBlock}
<div>${email.html}</div>
</body></html>`;
}
