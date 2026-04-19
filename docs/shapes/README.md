# Shapes

Cross-vocabulary surveys for common Solid app domains. Each doc compares the conventions in use, lists the predicates each one assumes, and notes the tradeoffs — so app builders choosing how to model their data don't have to reverse-engineer the field.

The registry (the `<Term>/index.json` files) is the *what* — what stable URN maps to what canonical IRI. These docs are the *how* — what shapes those terms actually appear in across real apps.

## Surveys

- [Tasks & to-do lists](tasks.md) — `wf:Tracker`, `schema:Action` + `ical:Vtodo`, pure `ical:Vtodo`. Comparison + tradeoffs.

## Contributing

Open a PR with `<topic>.md` here. Suggested shape:

- **The problem** — one paragraph: what's being modeled and why apps disagree
- **The conventions** — survey 2-5 actual implementations with sample data (Turtle or JSON-LD) for each
- **Predicate alignment** — table mapping the same concept across vocabularies
- **Tradeoffs** — when to pick which
- **References** — links to the apps / specs / repos surveyed

Goal: someone reading this for the first time should be able to make an informed shape decision without having to read source code from 5 projects.
