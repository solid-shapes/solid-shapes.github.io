# solid-shapes

SHACL [NodeShapes](https://www.w3.org/TR/shacl/#node-shapes) for [urn:solid](https://urn-solid.github.io/) types — auto-derived from [solid-schema](https://solid-schema.github.io/)'s JSON Schemas.

Each shape is JSON-LD (parses as JSON, expands as RDF) — drop it into any SHACL validator alongside your data, or read it as JSON if that's all you need.

```
Person/index.json   →  https://solid-shapes.github.io/Person/index.json
Note/index.json     →  https://solid-shapes.github.io/Note/index.json
Event/index.json    →  https://solid-shapes.github.io/Event/index.json
...
```

## Why both JSON Schema *and* SHACL?

They validate different layers of the same data. solid-schema validates the JSON document on the wire. solid-shapes validates the resulting RDF graph after parsing.

Most apps only need solid-schema (form generation, write-time validation). Apps doing federated graph validation (cross-pod cardinality checks, path expressions, SPARQL-based rules) need SHACL. They're complementary, not competing.

For the 80% overlap (basic types, cardinality, formats), this repo derives SHACL automatically from the JSON Schema, so you don't have to maintain two contracts by hand.

## Stack position

```
LION  →  urn-solid  →  solid-schema  →  solid-shapes (this)  →  solid-panes  →  LOSOS
                       (JSON validation)  (RDF validation)
```

## Repo layout

```
<Name>/index.json    SHACL NodeShape in JSON-LD — derived from solid-schema/<Name>/index.json
scripts/build.js     Fetches solid-schema, converts each schema to a SHACL NodeShape
scripts/validate.js  Sanity-checks the emitted shapes
index.json           Generated: name → shape URL + metadata
reverse-index.json   Generated: urn:solid type → shape URL
corpus.jsonl         Generated: every shape, one per line
```

## Anatomy of a shape

```json
{
  "@context": {
    "sh": "http://www.w3.org/ns/shacl#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@id": "https://solid-shapes.github.io/Person/index.json#Shape",
  "@type": "sh:NodeShape",
  "sh:targetClass": { "@id": "urn:solid:Person" },
  "sh:property": [
    {
      "sh:path": { "@id": "urn:solid:name" },
      "sh:datatype": { "@id": "xsd:string" },
      "sh:minLength": 1,
      "sh:maxLength": 200
    },
    {
      "sh:path": { "@id": "urn:solid:knows" },
      "sh:nodeKind": { "@id": "sh:IRI" }
    }
  ],
  "x-urn-solid": {
    "term": "urn:solid:Person",
    "schemaSource": "https://solid-schema.github.io/Person/index.json",
    "derivedFrom": "JSON Schema 2020-12"
  }
}
```

The body is real SHACL in JSON-LD form. Any SHACL processor that accepts JSON-LD reads it directly. Any JSON tool reads it as JSON. The `x-urn-solid` extension carries the back-link to the source schema for auditability.

## What auto-conversion handles

Mapped from JSON Schema → SHACL:

- `type: string` → `sh:datatype xsd:string`
- `type: integer/number/boolean` → corresponding `xsd:` datatype
- `format: uri` → `sh:nodeKind sh:IRI`
- `format: date-time/date` → `sh:datatype xsd:dateTime/xsd:date`
- `format: email` → `sh:pattern` (RFC 5322 simplified)
- `minLength`/`maxLength` → `sh:minLength`/`sh:maxLength`
- `minimum`/`maximum` → `sh:minInclusive`/`sh:maxInclusive`
- `pattern` → `sh:pattern`
- `enum` → `sh:in`
- `required: ["x"]` → `sh:minCount: 1` on x's property shape

## What auto-conversion skips (yet)

Logged as `notes` in the shape's `x-urn-solid.notes` array, with no constraint emitted:

- `anyOf` / `oneOf` with mixed branches (would need `sh:or` with alternatives)
- Cross-document constraints (require hand-written SHACL)
- SPARQL-based constraints

For these, hand-augmentation is the path — write a separate `<Name>-extra.shacl.ttl` (or extend the JSON-LD) with the graph-level rules.

## Cross-vocabulary shape surveys

The auto-derived SHACL shapes describe *one* canonical model per type. But for many domains (tasks, contacts, calendars) the Solid ecosystem has multiple incompatible conventions in the wild. [`docs/shapes/`](docs/shapes/) is a growing series of surveys comparing them with sample data, predicate-alignment tables, and tradeoffs — so app builders can choose deliberately rather than reverse-engineer.

- [Tasks & to-do lists](docs/shapes/tasks.md) — `wf:Tracker` vs Solid Focus vs pure ical.

## Build

```bash
npm install   # no deps actually — just for npm scripts
npm run build
npm run validate
```

`build` fetches https://solid-schema.github.io/index.json + each schema, derives shapes, writes them. `validate` sanity-checks the emitted JSON.

Override the source via env: `SOLID_SCHEMA_INDEX=<url> SOLID_SCHEMA_BASE=<url> npm run build`.

## License

Code: [AGPL-3.0](LICENSE). Shape data: [CC BY 4.0](LICENSE-DATA).
