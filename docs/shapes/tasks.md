# Shape: tasks & to-do lists

There is no single Solid convention for "a list of tasks". Three meaningfully different conventions are in use across real Solid apps, and they don't agree on the list class, on whether tasks are independently addressable, or even on which predicate carries "is this done?". This survey compares them so a new app can pick deliberately.

## The conventions

### 1. SolidOS Tracker (`wf:Tracker` + embedded issues)

The convention used by the SolidOS / mashlib `tracker-pane`. One file per list; tasks live as inline objects in the doc's `wf:issue` array. No per-task URLs.

```turtle
@prefix wf: <http://www.w3.org/2005/01/wf/flow#> .
@prefix ical: <http://www.w3.org/2002/12/cal/ical#> .
@prefix dct: <http://purl.org/dc/terms/> .

<#this>
  a wf:Tracker ;
  dct:title "Today" ;
  wf:initialState ical:NEEDS-ACTION ;
  wf:issue
    [ a ical:Vtodo ;
      ical:summary "Buy milk" ;
      ical:status ical:NEEDS-ACTION ;
      dct:created "2026-04-19T10:00:00Z"^^xsd:dateTime ] ,
    [ a ical:Vtodo ;
      ical:summary "Walk the dog" ;
      ical:status ical:COMPLETED ] .
```

Used by: SolidOS, mashlib, Tabulator-era apps, [pilot](https://solid-apps.github.io/pilot/) (today).

TypeIndex registers `wf:Tracker` → instance file URL.

### 2. Solid Focus (`schema:Action` + `ical:Vtodo` per resource)

The convention used by [Noel De Martin's Solid Focus](https://noeldemartin.github.io/solid-focus/). The list IS an LDP container; each task is its own resource with its own URL. Tasks are dual-typed `schema:Action` AND `ical:Vtodo`.

```turtle
@prefix schema: <https://schema.org/> .
@prefix ical: <http://www.w3.org/2002/12/cal/ical#> .

<#it>
  a schema:Action, ical:Vtodo ;
  schema:actionStatus schema:PotentialActionStatus ;
  schema:name "Learn Solid" ;
  ical:summary "Learn Solid" ;
  ical:priority 1 ;
  schema:description "Read the spec." ;
  ical:due "2026-05-01T00:00:00Z"^^xsd:dateTime .
```

Used by: Solid Focus.

TypeIndex registers BOTH `schema:Action` and `ical:Vtodo` → container URL.

### 3. Pure ical (`ical:Vtodo` only, no list class)

A minimal convention: tasks are `ical:Vtodo` resources, optionally grouped into a `ical:Vcalendar` doc. The same shape iCalendar files (`.ics`) use. No SolidOS / Solid Focus extensions.

```turtle
@prefix ical: <http://www.w3.org/2002/12/cal/ical#> .

<#task1>
  a ical:Vtodo ;
  ical:summary "Buy milk" ;
  ical:status ical:NEEDS-ACTION ;
  ical:priority 1 ;
  ical:due "2026-05-01T00:00:00Z"^^xsd:dateTime .
```

Used by: anything that interoperates with iCalendar (RFC 5545). Most direct path to round-tripping with `.ics` exports.

TypeIndex registers `ical:Vtodo` → container URL.

## Predicate alignment

Same concept, different predicates across the three:

| Concept | SolidOS Tracker | Solid Focus | Pure ical |
|---|---|---|---|
| List class | `wf:Tracker` | none (LDP container) | none (or `ical:Vcalendar`) |
| Task class | `ical:Vtodo` | `schema:Action`, `ical:Vtodo` | `ical:Vtodo` |
| Title | `ical:summary` | `schema:name`, `ical:summary` | `ical:summary` |
| Description | `ical:description` | `schema:description` | `ical:description` |
| Status | `ical:status` (string enum) | `schema:actionStatus` (typed) | `ical:status` |
| Done flag | `ical:status ical:COMPLETED` | `schema:actionStatus schema:CompletedActionStatus` | `ical:status ical:COMPLETED` |
| Priority | `ical:priority` (1–9) | `ical:priority` (1–9) | `ical:priority` (1–9) |
| Due date | `ical:due` | `ical:due` | `ical:due` |
| Created | `dct:created` | `dct:created` | `ical:created` |
| Containment | `wf:issue` (inline list) | LDP `ldp:contains` | LDP or `ical:component` |

## Tradeoffs

| Dimension | `wf:Tracker` (one file) | Solid Focus (one file per task) |
|---|---|---|
| HTTP requests per list | 1 GET | N+1 (container + each task) |
| Per-task URL | no — embedded | yes |
| Per-task ACL | no — list inherits | yes |
| Linkable from elsewhere | no | yes |
| Client complexity | low (parse one doc) | high (LDP container + per-resource CRUD) |
| Conflict scope on edit | whole list | one task |
| iCalendar interop | partial (manual mapping) | partial (via Vtodo) |
| ACL granularity | whole list | per task |
| Round-trip with `.ics` | needs glue | needs glue |

**Choose `wf:Tracker`** when: you want minimum HTTP, all tasks share visibility, the list is the natural unit of edit and ACL.

**Choose Solid Focus shape** when: tasks need their own URLs (linkable from notes, projects, calendars), per-task ACL matters (shared lists with private items), or you want one task = one document for sync conflict isolation.

**Choose pure ical** when: you want maximum interop with calendar tooling outside Solid (iCalendar export/import is the killer feature).

## Recommendation

For new apps with no incumbent users: **Solid Focus shape** — `schema:Action` + `ical:Vtodo` dual-typed, one resource per task in an LDP container, registered under both classes. Most linked-data correct, best ACL story, and `schema:actionStatus` is more parseable than the string enum.

For apps that need to read existing pods (SolidOS users, Tabulator users, anyone with `wf:Tracker` data): **read both shapes**, write the more canonical one. A normalizer in the client maps either source to a common in-memory model.

## References

- SolidOS tracker pane: <https://github.com/SolidOS/mashlib>
- Solid Focus app: <https://noeldemartin.github.io/solid-focus/> · source: <https://github.com/NoelDeMartin/solid-focus>
- pilot Tasks: <https://solid-apps.github.io/pilot/#/tasks> (currently `wf:Tracker`)
- iCalendar (RFC 5545): <https://datatracker.ietf.org/doc/html/rfc5545>
- W3C ical RDF vocabulary: <http://www.w3.org/2002/12/cal/ical#>
- workflow vocabulary: <http://www.w3.org/2005/01/wf/flow#>
- schema.org Action: <https://schema.org/Action>
