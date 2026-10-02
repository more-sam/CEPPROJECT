# Seed job data

**Status: planned (Phase 5).**

The MVP does not depend on a live external job API. Instead this directory holds
a curated dataset of realistic internship and entry-level listings, clearly
labelled as sample data, so the matching engine can be demonstrated honestly.

Planned contents:

- `seed_jobs.json` - companies, roles, descriptions, locations, employment
  types, required skills, application URLs and source attribution.

Every seeded listing must carry `"source": "sample-data"` (or a real, permitted
source) so the UI never implies the listing is live. The job service is designed
so an authorised external API can be added later without changing the schema.
