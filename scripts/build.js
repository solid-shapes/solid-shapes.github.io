#!/usr/bin/env node
// Fetch every JSON Schema from solid-schema, derive a SHACL NodeShape,
// emit it as JSON-LD at <Name>/index.json. Plus index/reverse-index/corpus.
//
// Conversion is intentionally minimal — handles only what our schemas
// actually use. Anything fancy (oneOf with mixed branches, $ref to non-
// solid-schema URLs, custom keywords) gets a comment and is skipped
// rather than silently mis-converted.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

const SOURCE_INDEX = process.env.SOLID_SCHEMA_INDEX || "https://solid-schema.github.io/index.json";
const SOURCE_BASE  = process.env.SOLID_SCHEMA_BASE  || "https://solid-schema.github.io/";
const SHAPES_BASE  = "https://solid-shapes.github.io/";

const writeIfChanged = (file, content) => {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
};

// Map a JSON Schema property to a SHACL property constraint object.
// Returns { property: { sh:path, ...constraints }, notes: [...] }
function propertyConstraint(name, prop, required) {
  const c = { "sh:path": { "@id": "urn:solid:" + name } };
  const notes = [];

  if (required) c["sh:minCount"] = 1;

  // Skip @-keys when iterating, but if called directly on @type we model nothing
  if (name.startsWith("@")) return null;

  // Single type
  if (typeof prop.type === "string") {
    switch (prop.type) {
      case "string":
        if (prop.format === "uri" || prop.format === "iri") {
          c["sh:nodeKind"] = { "@id": "sh:IRI" };
        } else if (prop.format === "date-time") {
          c["sh:datatype"] = { "@id": "xsd:dateTime" };
        } else if (prop.format === "date") {
          c["sh:datatype"] = { "@id": "xsd:date" };
        } else if (prop.format === "email") {
          c["sh:datatype"] = { "@id": "xsd:string" };
          // Pattern from RFC 5322 (simplified) — JSON Schema's format:email is library-defined
          c["sh:pattern"] = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
          c["sh:flags"] = "i";
        } else {
          c["sh:datatype"] = { "@id": "xsd:string" };
        }
        if (typeof prop.minLength === "number") c["sh:minLength"] = prop.minLength;
        if (typeof prop.maxLength === "number") c["sh:maxLength"] = prop.maxLength;
        if (typeof prop.pattern === "string") c["sh:pattern"] = prop.pattern;
        break;
      case "integer":
        c["sh:datatype"] = { "@id": "xsd:integer" };
        if (typeof prop.minimum === "number") c["sh:minInclusive"] = prop.minimum;
        if (typeof prop.maximum === "number") c["sh:maxInclusive"] = prop.maximum;
        break;
      case "number":
        c["sh:datatype"] = { "@id": "xsd:decimal" };
        if (typeof prop.minimum === "number") c["sh:minInclusive"] = prop.minimum;
        if (typeof prop.maximum === "number") c["sh:maxInclusive"] = prop.maximum;
        break;
      case "boolean":
        c["sh:datatype"] = { "@id": "xsd:boolean" };
        break;
      case "array":
        if (prop.items && prop.items.type === "string" && prop.items.format === "uri") {
          c["sh:nodeKind"] = { "@id": "sh:IRI" };
        }
        if (typeof prop.minItems === "number") c["sh:minCount"] = Math.max(c["sh:minCount"] || 0, prop.minItems);
        if (typeof prop.maxItems === "number") c["sh:maxCount"] = prop.maxItems;
        break;
      case "object":
        c["sh:nodeKind"] = { "@id": "sh:BlankNodeOrIRI" };
        break;
    }
  }

  // Enum → sh:in
  if (Array.isArray(prop.enum)) {
    c["sh:in"] = { "@list": prop.enum };
  }

  // Description / title
  if (prop.description) c["sh:description"] = prop.description;
  if (prop.title) c["sh:name"] = prop.title;

  // Skip-with-note for things we don't translate
  if (prop.anyOf) notes.push(`property "${name}": anyOf not translated`);
  if (prop.oneOf) notes.push(`property "${name}": oneOf not translated`);

  return { property: c, notes };
}

function schemaToShape(schema, name) {
  const required = new Set(schema.required || []);
  const props = schema.properties || {};
  const propertyConstraints = [];
  const notes = [];

  for (const [key, p] of Object.entries(props)) {
    if (key.startsWith("@") || key.startsWith("$")) continue;
    const out = propertyConstraint(key, p, required.has(key));
    if (!out) continue;
    propertyConstraints.push(out.property);
    if (out.notes.length) notes.push(...out.notes);
  }

  const term = schema["x-urn-solid"]?.term || `urn:solid:${name}`;

  const shape = {
    "@context": {
      "sh": "http://www.w3.org/ns/shacl#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
    },
    "@id": `${SHAPES_BASE}${name}/index.json#Shape`,
    "@type": "sh:NodeShape",
    "sh:targetClass": { "@id": term },
    "rdfs:label": schema.title || name,
    "rdfs:comment": schema.description || "",
    "sh:property": propertyConstraints,
    "x-urn-solid": {
      "term": term,
      "termRegistry": schema["x-urn-solid"]?.termRegistry,
      "schemaSource": `${SOURCE_BASE}${name}/index.json`,
      "status": schema["x-urn-solid"]?.status || "experimental",
      "added": schema["x-urn-solid"]?.added || new Date().toISOString().slice(0, 10),
      "derivedFrom": "JSON Schema 2020-12",
      "notes": notes
    }
  };

  return shape;
}

async function main() {
  console.log(`[build] fetching schema index from ${SOURCE_INDEX}`);
  const indexRes = await fetch(SOURCE_INDEX);
  if (!indexRes.ok) throw new Error(`failed to fetch ${SOURCE_INDEX}: ${indexRes.status}`);
  const index = await indexRes.json();

  const names = Object.keys(index).sort();
  const shapeIndex = {};
  const reverseIndex = {};
  const corpusLines = [];

  for (const name of names) {
    const schemaUrl = SOURCE_BASE + name + "/index.json";
    const r = await fetch(schemaUrl);
    if (!r.ok) {
      console.warn(`[build] skip ${name}: fetch returned ${r.status}`);
      continue;
    }
    const schema = await r.json();
    const shape = schemaToShape(schema, name);

    const outPath = path.join(ROOT, name, "index.json");
    const json = JSON.stringify(shape, null, 2) + "\n";
    writeIfChanged(outPath, json);

    const term = shape["x-urn-solid"].term;
    shapeIndex[name] = {
      term,
      label: shape["rdfs:label"],
      description: shape["rdfs:comment"],
      shape: `/${name}/index.json`,
      status: shape["x-urn-solid"].status,
      schemaSource: shape["x-urn-solid"].schemaSource
    };
    if (term) reverseIndex[term] = `/${name}/index.json`;
    corpusLines.push(JSON.stringify(shape));

    if (shape["x-urn-solid"].notes?.length) {
      console.log(`[build] ${name}: notes — ${shape["x-urn-solid"].notes.join("; ")}`);
    }
  }

  writeIfChanged(path.join(ROOT, "index.json"), JSON.stringify(shapeIndex, null, 2) + "\n");
  writeIfChanged(path.join(ROOT, "reverse-index.json"), JSON.stringify(reverseIndex, null, 2) + "\n");
  writeIfChanged(path.join(ROOT, "corpus.jsonl"), corpusLines.join("\n") + "\n");

  console.log(`[build] ${names.length} shapes derived from solid-schema`);
}

main().catch(e => { console.error(e); process.exit(1); });
