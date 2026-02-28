import { simpleParser } from "mailparser";
import { readFileSync } from "fs";

const file = process.argv[2] || "/Users/chris/Downloads/LEGO® Pokémon™ is here!.eml";
const buf = readFileSync(file);
const parsed = await simpleParser(buf);
const html = parsed.html || "";

// Find elements with class preheader or hidden
const matches = html.match(
  /<[^>]+class="[^"]*(?:preheader|hidden)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi
);
if (matches) {
  matches.forEach((m, i) => console.log(`Match ${i}:`, m.slice(0, 500)));
} else {
  console.log("No class-based preheader found");
}
