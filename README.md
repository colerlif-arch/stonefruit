# stonefruit
Stonefruit is a private, single-user personal analytics system. The project is structured so data sources are independent ingestors, derivations are deterministic transforms over raw facts, and outputs are read models or notifications.

## Current status
- Active ingestor: Plaid Transactions
- Active app surface: Node API + React frontend
- Derivation and output layers: scaffolded for incremental build-out

## Repository structure
```text
apps/
  frontend/                     # temporary UI client (planned phase-out)

data-layer/
  ingestors/
    plaid/                      # Plaid API ingestion service (Node)
    gps/                        # planned ingestor
    photo-metadata/             # planned ingestor
  raw/
    plaid.db                    # raw ingestion store (SQLite)

derivation-layer/               # deterministic transforms and rollups (planned)
output-layer/                   # read models, alerts, and serving layer (planned)
docs/
  architecture.md               # conventions and design guidance
scripts/
  sqlite_cli.py                 # DB inspection helper
```

## Runtime
- API: `http://localhost:8000`
- UI: `http://localhost:3000`
- Compose services: `node`, `frontend`

## Plaid data usage
Stonefruit uses Plaid (Transactions) to retrieve read-only transaction data after authentication via Plaid Link. Transactions are stored on a private backend and persisted for downstream derivation. The system does not initiate payments or transfers, does not modify accounts, and does not share or sell data. Access tokens remain server-side.
