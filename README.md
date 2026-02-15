# stonefruit
Stonefruit is a private, single-user personal analytics system that computes deterministic summaries and time-sensitive prompts based on explicit rules and derived state.
Primary use cases
- Personal finance analytics (transactions, cash flow, recurring expenses)
- Optional contextual analytics (photos/metadata, location logs, calendar events)

Plaid data usage
Stonefruit uses Plaid (Transactions) to retrieve read-only transaction data after authentication via Plaid Link. Transactions are stored securely on a private backend and processed to compute recurring charges, income cadence, cash flow trends, and discretionary spending. The system does not initiate payments or transfers, does not modify accounts, and does not share or sell data. Access tokens are stored server-side and are never exposed to clients.

Architecture (high level)
1) Ingestion: periodic sync or file-watchers append raw events to storage
2) Derivation: deterministic normalization/classification and aggregate rollups
3) Output: optional notifications or on-demand query responses

Security
- Tokens stored only on the backend
- No financial credentials stored
- Local/private deployment; not a public service

Status
Active development; intended for personal use only.
