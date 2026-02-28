import { simpleParser } from "mailparser";
import { readFileSync } from "fs";
import { parseEml } from "../src/eml-parser.js";

const file = process.argv[2] || "/Users/chris/Downloads/Here's your new LEGO® account and membership.eml";
const buf = readFileSync(file);
const parsed = await simpleParser(buf);

console.log("=== FIRST 5000 CHARS OF HTML ===");
console.log(parsed.html?.slice(0, 5000));

console.log("\n=== PARSED PREVIEW ===");
const email = await parseEml(buf);
console.log("previewText:", email.previewText);
