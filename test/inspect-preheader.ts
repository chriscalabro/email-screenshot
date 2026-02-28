import { simpleParser } from "mailparser";
import { readFileSync } from "fs";

const file = process.argv[2] || "/Users/chris/Downloads/LEGO® Pokémon™ is here!.eml";
const buf = readFileSync(file);
const parsed = await simpleParser(buf);
const html = parsed.html || "";

// Check for hidden preheader div
const preheaderMatch = html.match(
  /<div[^>]*class="[^"]*preheader[^"]*"[^>]*>([\s\S]*?)<\/div>/i
);
console.log("=== PREHEADER DIV ===");
console.log(preheaderMatch ? preheaderMatch[0].slice(0, 500) : "NOT FOUND");

// Check for any element with display:none that has content
const hiddenMatches = html.match(
  /<(?:span|div)[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/(?:span|div)>/gi
);
console.log("\n=== HIDDEN ELEMENTS WITH display:none IN INLINE STYLE ===");
if (hiddenMatches) {
  hiddenMatches.forEach((m, i) =>
    console.log("Match " + i + ":", m.slice(0, 300))
  );
} else {
  console.log("NONE FOUND");
}

// Look for the preheader class definition
const cssMatch = html.match(/\.preheader\s*\{[^}]+\}/i);
console.log("\n=== PREHEADER CSS ===");
console.log(cssMatch ? cssMatch[0] : "NOT FOUND");

// Show what Gmail sees — the first ~500 chars of visible text including img alt text
// Gmail DOES include alt text from images
console.log("\n=== VISIBLE TEXT WITH ALT TEXT (Gmail-like) ===");
const gmailLike = html
  .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
  // Remove hidden elements by inline style
  .replace(
    /<[^>]+style="[^"]*(?:display\s*:\s*none|max-height\s*:\s*0|font-size\s*:\s*0|overflow\s*:\s*hidden)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
    ""
  )
  // Remove hidden elements by class
  .replace(
    /<[^>]+class="[^"]*(?:preheader|hidden|visually-hidden|sr-only)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
    ""
  )
  // KEEP img alt text (Gmail does this)
  .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " $1 ")
  .replace(/<img[^>]*>/gi, "")
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<\/(?:p|div|h[1-6]|tr|td|th|li)>/gi, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#\d+;/g, " ")
  .replace(/&[a-z]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

console.log(gmailLike.slice(0, 300));

console.log("\n=== VISIBLE TEXT WITHOUT ALT TEXT (current) ===");
const noAlt = html
  .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(
    /<[^>]+style="[^"]*(?:display\s*:\s*none|max-height\s*:\s*0|font-size\s*:\s*0|overflow\s*:\s*hidden)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
    ""
  )
  .replace(
    /<[^>]+class="[^"]*(?:preheader|hidden|visually-hidden|sr-only)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
    ""
  )
  .replace(/<img[^>]*>/gi, "")
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<\/(?:p|div|h[1-6]|tr|td|th|li)>/gi, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#\d+;/g, " ")
  .replace(/&[a-z]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

console.log(noAlt.slice(0, 300));
