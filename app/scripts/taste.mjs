// Copies ../TASTE.md into lib/taste.ts so the server bundle always carries the taste library.  node scripts/taste.mjs
import fs from "node:fs";
const md = fs.readFileSync(new URL("../../TASTE.md", import.meta.url), "utf8");
fs.writeFileSync(new URL("../lib/taste.ts", import.meta.url), "// Generated from unslop/TASTE.md by scripts/taste.mjs. Edit TASTE.md, then rerun.\nexport const TASTE = " + JSON.stringify(md) + ";\n");
console.log("taste.ts", md.length, "chars");
