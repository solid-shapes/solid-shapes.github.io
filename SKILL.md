---
name: solid-shapes
description: SHACL NodeShapes (in JSON-LD) for urn:solid types — auto-derived from solid-schema. Use for RDF graph validation, federated cross-pod checks, or any tooling that needs SHACL alongside JSON Schema.
---

# solid-shapes

SHACL `NodeShape` per `urn:solid:` type, serialized as JSON-LD. Auto-derived from solid-schema's JSON Schemas — same source of truth, complementary contract.

```
LION  →  urn-solid  →  solid-schema  →  solid-shapes (this)  →  solid-panes  →  LOSOS
                       (JSON layer)     (RDF graph layer)
```

## When to use this skill

- The user is validating RDF data (Turtle, JSON-LD, N-Triples) against a SHACL processor (Apache Jena, pyshacl, RDF4J, TopBraid).
- The user wants graph-level constraints (cardinality across documents, path expressions) that JSON Schema can't express.
- The user is doing federated pod validation and needs the SHACL counterpart of solid-schema's JSON Schema.

## Quick-start: validate RDF data with pyshacl

```bash
# fetch the shape
curl -s https://solid-shapes.github.io/Person/index.json > person.shape.jsonld

# validate your data graph
pyshacl -s person.shape.jsonld -sf json-ld -d your-data.jsonld -df json-ld
```

## Quick-start: load in JS

```js
const shape = await fetch('https://solid-shapes.github.io/Person/index.json').then(r => r.json())
// shape is a SHACL NodeShape in JSON-LD form. Pass to any SHACL validator
// that accepts JSON-LD (or jsonld-expand to N-Triples first).
```

## Resolving a shape

URL pattern: `https://solid-shapes.github.io/<Name>/index.json`. Reverse lookup by `urn:solid:` term:

```bash
curl -s https://solid-shapes.github.io/reverse-index.json
```

## Why JSON-LD (not Turtle)?

Consistent with the rest of the stack (urn-solid, solid-schema, solid-panes, solid-apps, solid-shapes all JSON-LD). SHACL processors accept any RDF format — JSON-LD expands to the same graph as Turtle. Keeping JSON throughout means JSON tooling reads everything natively.

## Anatomy

```json
{
  "@context": { "sh": "...", "xsd": "..." },
  "@id": "https://solid-shapes.github.io/Person/index.json#Shape",
  "@type": "sh:NodeShape",
  "sh:targetClass": { "@id": "urn:solid:Person" },
  "sh:property": [
    { "sh:path": { "@id": "urn:solid:name" }, "sh:datatype": { "@id": "xsd:string" }, "sh:minLength": 1 }
  ],
  "x-urn-solid": {
    "term": "urn:solid:Person",
    "schemaSource": "https://solid-schema.github.io/Person/index.json",
    "derivedFrom": "JSON Schema 2020-12"
  }
}
```

## Adding a new shape

Don't write shapes by hand — they're derived. Steps:

1. Add the term to urn-solid (if missing).
2. Add the JSON Schema to solid-schema.
3. Run `npm run build` here — solid-shapes fetches solid-schema's index, generates the SHACL.

The single source of truth is solid-schema. Hand-edits to `<Name>/index.json` here will be overwritten on the next build.

For graph-level rules JSON Schema can't express (cross-document cardinality, path expressions, SPARQL constraints), the path is hand-augmentation: ship a `<Name>-extra.shacl.ttl` or `<Name>-extra.json` with the additional rules. Not yet automated.

## What converts cleanly

| JSON Schema | SHACL |
|---|---|
| `type: string` | `sh:datatype xsd:string` |
| `type: integer/number/boolean` | corresponding `xsd:` datatype |
| `format: uri` | `sh:nodeKind sh:IRI` |
| `format: date-time` | `sh:datatype xsd:dateTime` |
| `format: email` | `sh:pattern` (RFC 5322 simplified) |
| `minLength` / `maxLength` | `sh:minLength` / `sh:maxLength` |
| `minimum` / `maximum` | `sh:minInclusive` / `sh:maxInclusive` |
| `pattern` | `sh:pattern` |
| `enum` | `sh:in` |
| `required: ["x"]` | `sh:minCount: 1` on x's property |

## What doesn't (yet)

`anyOf` / `oneOf` with mixed branches → skipped with a note in `x-urn-solid.notes`. Would need `sh:or` with alternative property-shape branches. Real but non-trivial.

## Don't

- Don't hand-edit `<Name>/index.json` files — they're regenerated from solid-schema. Add fields to the upstream JSON Schema instead.
- Don't add a shape for a type that has no solid-schema entry — the registry chain breaks.
- Don't expect cross-document cardinality from auto-derived shapes — those need hand-written SHACL.

## Reference URLs

- Index: https://solid-shapes.github.io/index.json
- Reverse index (urn:solid type → shape URL): https://solid-shapes.github.io/reverse-index.json
- Corpus (every shape, JSONL): https://solid-shapes.github.io/corpus.jsonl
- Source schemas: https://solid-schema.github.io/

## Related skills

- `solid-schema` — the upstream source. Edit there to update shapes here.
- `urn-solid` — vocabulary registry that defines the terms.
- `solid-panes` — pane registry that points apps at the right schema + UI.
- `losos` — runtime. https://losos.org/SKILL.md
- `xlogin` — auth. https://github.com/melvincarvalho/xlogin/blob/gh-pages/SKILL.md
