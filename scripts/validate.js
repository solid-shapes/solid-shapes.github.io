#!/usr/bin/env node
// Validate every <Name>/index.json:
//   - parses as JSON
//   - has the expected SHACL NodeShape shape (@type, sh:targetClass, sh:property)
//   - $id matches directory name

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

const RESERVED = new Set([
  "scripts", "node_modules", ".github", ".git", ".claude",
  "assets", "vendor", "spec", "shapes", "schema"
]);

const isShapeDir = (name) => {
  if (RESERVED.has(name)) return false;
  if (name.startsWith(".")) return false;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) return false;
  return fs.existsSync(path.join(ROOT, name, "index.json"));
};

const names = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(isShapeDir)
  .sort();

let ok = 0;
let failed = 0;
for (const name of names) {
  const filePath = path.join(ROOT, name, "index.json");
  let shape;
  try { shape = JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (e) { console.error(`[validate] ${name}: malformed JSON — ${e.message}`); failed++; continue; }

  const expectedId = `https://solid-shapes.github.io/${name}/index.json#Shape`;
  if (shape["@id"] !== expectedId) {
    console.error(`[validate] ${name}: @id "${shape["@id"]}" must be "${expectedId}"`);
    failed++; continue;
  }
  if (shape["@type"] !== "sh:NodeShape") {
    console.error(`[validate] ${name}: @type must be sh:NodeShape, got ${shape["@type"]}`);
    failed++; continue;
  }
  if (!shape["sh:targetClass"]) {
    console.error(`[validate] ${name}: missing sh:targetClass`);
    failed++; continue;
  }
  if (!Array.isArray(shape["sh:property"])) {
    console.error(`[validate] ${name}: sh:property must be an array`);
    failed++; continue;
  }
  ok++;
}

console.log(`[validate] ${ok} ok, ${failed} failed`);
if (failed > 0) process.exit(1);
