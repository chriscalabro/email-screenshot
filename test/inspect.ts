import { simpleParser } from "mailparser";
import { readFileSync } from "fs";
import { parseEml } from "../src/eml-parser.js";

const buf = readFileSync(
  "/Users/chris/Downloads/Here's your new LEGO® account and membership.eml"
);
const parsed = await simpleParser(buf);

console.log("=== FROM (raw) ===");
console.log("from.text:", parsed.from?.text);
console.log("from.value[0]:", parsed.from?.value?.[0]);

console.log("\n=== PLAIN TEXT (first 300 chars, raw) ===");
console.log(parsed.text?.slice(0, 300));

console.log("\n=== PARSED EMAIL (our output) ===");
const email = await parseEml(buf);
console.log("from:", email.from);
console.log("subject:", email.subject);
console.log("date:", email.date);
console.log("previewText:", email.previewText);
