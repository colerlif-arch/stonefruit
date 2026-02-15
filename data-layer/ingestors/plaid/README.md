# Plaid Ingestor

This service is a source adapter for Plaid.

Responsibilities:
- Create link tokens and exchange public tokens.
- Fetch/sync transactions from Plaid APIs.
- Persist raw transaction and item data into SQLite (`data-layer/raw/plaid.db`).

Non-responsibilities:
- Cross-source joins
- business derivations
- prompt generation
