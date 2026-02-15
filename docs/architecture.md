# Stonefruit Architecture

## Layer model
1. Data layer: source-specific ingestors append raw events/facts with minimal mutation.
2. Derivation layer: deterministic transforms create normalized entities, aggregates, and timelines.
3. Output layer: query/read models and time-sensitive prompts built from derivations.

## Data layer conventions
- One source per folder under `data-layer/ingestors/<source>/`.
- Source adapters should never depend on derivation logic.
- Raw writes are append/upsert of source facts; avoid business semantics in this layer.
- Normalize identifiers and timestamps as close to source ingestion as possible.

## Derivation layer conventions
- Deterministic and idempotent jobs.
- Inputs are raw tables/files and previously derived tables.
- Outputs are versioned datasets with explicit job metadata.
- No network calls in derivation jobs.

## Output layer conventions
- Build from derived tables, not raw source payloads.
- Keep interfaces narrow and explicit (`read model` or `prompt model` contracts).
- Track freshness and derivation version in every output artifact.

## Source expansion plan
- `data-layer/ingestors/plaid`: financial transactions and account metadata.
- `data-layer/ingestors/gps`: continuous location pings/tracks.
- `data-layer/ingestors/photo-metadata`: EXIF/time/location/media fingerprints.

## Practical next build steps
1. Add canonical event schemas in `derivation-layer/schemas/`.
2. Add first derivation job for recurring spend and cash-flow windows.
3. Add output read model for "daily financial state" with freshness metadata.
