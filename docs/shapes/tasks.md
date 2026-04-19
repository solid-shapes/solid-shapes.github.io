# Shape: tasks & to-do lists

Tasks have a 25-year-old interop standard the rest of the world already uses: **iCalendar `VTODO`** ([RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545)). Every major OS speaks it — macOS Reminders & Calendar import/export `.ics` files, iOS Reminders syncs over [CalDAV](https://datatracker.ietf.org/doc/html/rfc4791), Outlook Tasks round-trips through it, Thunderbird's calendar uses it, and most third-party task apps (Todoist, Things, OmniFocus, etc.) can export to it. **If your task data can become a `.ics` file, every desktop OS reminder app on the planet can read it.** That's the floor.

The W3C published an RDF translation in 2002 — [the `ical:` vocabulary at `http://www.w3.org/2002/12/cal/ical#`](http://www.w3.org/2002/12/cal/ical#) — which carries the same predicate names (`ical:summary`, `ical:status`, `ical:due`, `ical:priority`, `ical:created`, `ical:completed`) into the RDF world. This is the shared substrate everything below is in conversation with.

The Solid challenge: how do you express VTODO in pod-native RDF + LDP, and what extra structure does the pod give you (containers, ACLs, addressability) that bare `.ics` files don't? The Solid ecosystem hasn't converged on one answer. At least six meaningfully different conventions are in use across real Solid (and Solid-adjacent) apps. They disagree on the list class, on whether tasks are independently addressable resources or inline objects, on which predicate carries done/not-done, and even on whether to use SolidOS workflow vocab, schema.org Actions, ical:Vtodo, or all three at once.

This is the canonical comparison — synthesis, not catalogue. Where two surveys disagree, we go look at the actual data and pick the truth.

## The conventions

### 1. SolidOS tracker-pane (`wf:Tracker` + embedded issues)

One JSON-LD or Turtle file per tracker. Tasks live inline in the doc's `wf:issue` array — no per-task URLs. Used by mashlib's tracker-pane and by [pilot](https://solid-apps.github.io/pilot/) today.

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

TypeIndex registers `wf:Tracker` → instance file URL.

### 2. SolidOS issue-pane (`wf:Tracker` + split `state.ttl`)

The same `wf:Tracker` class but a different storage shape: each tracker is a directory with two files, `index.ttl` (config) + `state.ttl` (issues). Issues are typed by their lifecycle state (`wf:Open`, `wf:Closed`) rather than `ical:Vtodo`. Used by SolidOS issue-pane.

```turtle
# index.ttl
<#this>
  a wf:Tracker ;
  dc:author </profile/card#me> ;
  wf:assigneeClass foaf:Person ;
  wf:initialState wf:Open ;
  wf:issueClass wf:Task ;
  wf:stateStore <state.ttl> .

# state.ttl
:Iss1718100013562
  a wf:Open ;
  dc:title "get coffee" ;
  dct:created "2024-06-11T10:00:13Z"^^xsd:dateTime ;
  wf:description "description\n" ;
  wf:tracker ind:this .
```

TypeIndex registers `wf:Tracker` → directory URL.

[`solid/shapes/issue_tracker.ttl`](https://github.com/solid/shapes/blob/main/shapes/issue_tracker.ttl) (the ODI-curated SHACL catalogue) is essentially this convention formalized.

### 3. Solid Focus current (`schema:Action` + `ical:Vtodo` per resource)

The list IS an LDP container; each task is its own resource with its own URL. Tasks are dual-typed `schema:Action` AND `ical:Vtodo`. Used by [Solid Focus](https://noeldemartin.github.io/solid-focus/) today.

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

TypeIndex registers BOTH `schema:Action` and `ical:Vtodo` → container URL.

### 4. Solid Focus legacy (`lifecycle:Task`)

Older Solid Focus data uses `http://purl.org/vocab/lifecycle/schema#Task` as the type, with `rdfs:label` for the title and `dc:created`/`dc:modified` for timestamps. Migration to convention #3 happened upstream but legacy files in the wild still use this shape.

```turtle
<https://me.example.org/my-workspace/my-list/0892486a-04ce-46ca-8ee9-fabf9fdf2d76>
  a <http://purl.org/vocab/lifecycle/schema#Task>, ldp:Resource ;
  rdfs:label "do something" ;
  dct:created "2024-01-19T08:39:35Z"^^xsd:dateTime ;
  dct:modified "2024-01-19T08:39:35Z"^^xsd:dateTime .
```

A reader for Solid Focus pods needs to handle both #3 and #4.

### 5. 0data Hello World (minimal `schema:Action`)

The smallest viable shape — `schema:Action` + `schema:actionStatus` + `schema:description`, nothing else. Tasks written individually under `/tasks/`. Used by the [0data Hello World](https://hello.0data.app/solid/) demo.

```turtle
<#it>
  a schema:Action ;
  schema:actionStatus schema:PotentialActionStatus ;
  schema:description "alfa" .
```

No list class, no `ical:` predicates, no priority or due dates. The bare-minimum baseline for "a task on a pod".

### 6. Pure ical (`ical:Vtodo` only)

Tasks are `ical:Vtodo` resources, optionally grouped into a `ical:Vcalendar` doc. The same shape iCalendar `.ics` files use, just in RDF. The OS-interop convention; round-trips losslessly with `.ics` import/export and CalDAV.

```turtle
<#task1>
  a ical:Vtodo ;
  ical:summary "Buy milk" ;
  ical:status ical:NEEDS-ACTION ;
  ical:priority 1 ;
  ical:due "2026-05-01T00:00:00Z"^^xsd:dateTime .
```

Equivalent `.ics` for handing to macOS Reminders / Outlook / Thunderbird:

```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTODO
SUMMARY:Buy milk
STATUS:NEEDS-ACTION
PRIORITY:1
DUE:20260501T000000Z
END:VTODO
END:VCALENDAR
```

This is the convention with the largest installed base outside Solid. macOS Reminders, iOS Reminders, Calendar.app, Outlook, Thunderbird, Todoist (export), Things (export), OmniFocus (export) all speak this.

## Predicate alignment

Same concept, different predicates across the six (and the `.ics` baseline they all derive from):

| Concept | iCalendar VTODO | tracker-pane | issue-pane | Focus current | Focus legacy | 0data | Pure ical |
|---|---|---|---|---|---|---|---|
| List class | `VCALENDAR` (optional) | `wf:Tracker` | `wf:Tracker` | none (LDP container) | none (LDP container) | none | none / `ical:Vcalendar` |
| Storage | one `.ics` doc | one file, embedded | dir + index/state | per-task resource | per-task resource | per-task resource | per-task resource |
| Task class | `VTODO` | `ical:Vtodo` | `wf:Open` / `wf:Closed` | `schema:Action`, `ical:Vtodo` | `lifecycle:Task` | `schema:Action` | `ical:Vtodo` |
| Title | `SUMMARY` | `ical:summary` | `dc:title` | `schema:name`, `ical:summary` | `rdfs:label` | — | `ical:summary` |
| Description | `DESCRIPTION` | `ical:description` | `wf:description` | `schema:description` | — | `schema:description` | `ical:description` |
| Status | `STATUS` (enum) | `ical:status` (string) | type itself (`wf:Open`/`wf:Closed`) | `schema:actionStatus` (typed IRI) | (none — soft-delete?) | `schema:actionStatus` | `ical:status` |
| Priority | `PRIORITY` (1–9) | `ical:priority` | — | `ical:priority` | — | — | `ical:priority` |
| Due date | `DUE` | `ical:due` | — | `ical:due` | — | — | `ical:due` |
| Created | `CREATED` | `dct:created` | `dct:created` | `dct:created` | `dct:created` | — | `ical:created` |
| Completed at | `COMPLETED` | (implied by status) | (implied by type) | (implied by status) | — | — | `ical:completed` |

## Tradeoffs

**Embedded vs per-resource storage** is the biggest split:

| Dimension | Embedded (tracker-pane) | Per-resource (issue-pane / Focus / 0data / ical) |
|---|---|---|
| HTTP per list view | 1 GET | N+1 (container + each task) |
| Per-task URL | no | yes |
| Per-task ACL | no — list inherits | yes |
| Linkable from elsewhere | no | yes |
| Client complexity | low (parse one doc) | high (LDP container + per-resource CRUD) |
| Conflict scope on edit | whole list | one task |
| ACL granularity | whole list | per task |

**Choosing among per-resource shapes** comes down to interop targets:

- **Solid Focus current (#3)** — most expressive in Solid. Dual `schema:Action + ical:Vtodo` typing means schema.org tooling AND iCalendar tooling can both make sense of your data
- **Pure ical (#6)** — when OS interop matters. Round-trips losslessly with `.ics` and CalDAV. Trades schema.org compatibility for being able to email someone's macOS Reminders a working file
- **issue-pane (#2)** — if you need shared trackers with comments/messages and lifecycle state machines (`wf:Open` / `wf:Closed` is its own little type system)
- **0data minimal (#5)** — when you want the absolute smallest schema.org-compatible shape and can layer extensions later

## Recommendation

For new apps targeting **the Solid ecosystem first, OS interop second**: **Solid Focus current (#3)** — `schema:Action` + `ical:Vtodo` dual-typed, one resource per task in an LDP container. The `ical:` half lets you generate VTODO `.ics` exports trivially; the `schema:Action` half is more parseable in modern tooling.

For new apps targeting **OS interop first**: **Pure ical (#6)** as your wire format with a thin LDP container holding `ical:Vtodo` resources. Add `ical:Vcalendar` at the container level for free `.ics` collection export. macOS Reminders gets a download link and it Just Works.

For apps that need to **read the wild Solid pod** as it exists today: **read all six**, write the canonical one (#3 or #6 depending on whether OS interop matters). A small normalizer maps any source shape to a common in-memory model.

Two-shape pragmatism: covering #1 + #3 captures most existing Solid data (`wf:Tracker` from SolidOS pods + Focus from Focus pods). Add #6 for OS round-tripping. Three normalizers, ~80 lines, covers ~95% of what's out there.

## References

### iCalendar VTODO (the OS-level baseline)

- [RFC 5545 — Internet Calendaring and Scheduling Core (iCalendar)](https://datatracker.ietf.org/doc/html/rfc5545)
- [RFC 4791 — Calendaring Extensions to WebDAV (CalDAV)](https://datatracker.ietf.org/doc/html/rfc4791) — the protocol macOS/iOS use to sync
- [W3C ical RDF vocabulary](http://www.w3.org/2002/12/cal/ical#) — the RDF translation
- macOS Reminders, iOS Reminders, Calendar.app, Outlook, Thunderbird, Lightning, Mozilla Sunbird, KOrganizer, Evolution, Todoist (export), Things (export), OmniFocus (export), Apple iCloud, Google Calendar, Microsoft 365 — all speak VTODO

### Solid surveys

- [PDS Interop conventions: tasks](https://pdsinterop.org/conventions/tasks/) — parallel survey, includes Projectron and a few more apps not covered here
- [solid/shapes/issue_tracker.ttl](https://github.com/solid/shapes/blob/main/shapes/issue_tracker.ttl) — ODI-curated SHACL for the issue-pane convention (#2)
- [solid-contrib/data-modules/tasks](https://github.com/solid-contrib/data-modules/tree/main/tasks) — under construction

### App sources

- SolidOS tracker-pane: <https://github.com/SolidOS/mashlib>
- SolidOS issue-pane: <https://github.com/SolidOS/issue-pane>
- Solid Focus: <https://noeldemartin.github.io/solid-focus/> · <https://github.com/NoelDeMartin/solid-focus>
- 0data Hello World: <https://hello.0data.app/solid/> · <https://github.com/0dataapp/hello>
- pilot Tasks: <https://solid-apps.github.io/pilot/#/tasks> (currently #1)

### Vocab references

- workflow vocabulary: <http://www.w3.org/2005/01/wf/flow#>
- schema.org Action: <https://schema.org/Action>
- lifecycle:Task: <http://purl.org/vocab/lifecycle/schema#Task>
