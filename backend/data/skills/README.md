# Skills data

Controlled skill taxonomy and alias dictionary used by the skill extractor.

**Status: planned (Phase 4).** This directory is intentionally empty in Phase 1.

Planned contents:

- `skill_taxonomy.json` - canonical skills grouped by category
  (Programming, Frontend, Backend, Database, Cloud, DevOps, Data/AI, Tools).
- `skill_aliases.json` - synonym mapping, e.g. `JS -> JavaScript`,
  `Postgres -> PostgreSQL`, `ReactJS -> React`.

Keeping this as data (not code) lets the taxonomy grow without touching the
extraction logic, and makes it easy to review during evaluation.
