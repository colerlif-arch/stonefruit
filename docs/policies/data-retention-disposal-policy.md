# Data Retention and Disposal Policy

Effective date: February 15, 2026  
Owner: Stonefruit Operator  
Applies to: Raw data, derived data, logs, exports, backups, and credentials

## 1. Purpose

This policy defines retention periods, deletion triggers, and secure disposal procedures for Stonefruit data.

## 2. Data Classes

- Credentials and secrets: API keys, tokens, client secrets
- Raw source data: ingested transactions, metadata, event payloads
- Derived data: normalized records, rollups, prompts/read models
- Operational logs: system and debug logs
- Backups and exports: snapshots and portable data files

## 3. Retention Baseline

Unless legal requirements dictate otherwise:
- Credentials and tokens: retain only while valid and operationally required
- Raw source data: retain only as long as needed for derivation and auditability
- Derived data: retain based on product utility and legal obligations
- Logs: retain minimally and rotate regularly
- Backups: retain according to recovery objectives, with defined expiration

## 4. Disposal Triggers

Data must be disposed when:
- No longer required for operational purpose
- Retention period expires
- Subject deletion request applies (when legally required)
- Credentials/tokens are compromised or invalidated

## 5. Disposal Procedures

### 5.1 Credentials and Tokens
- Revoke via provider API/dashboard.
- Remove from local storage and logs where feasible.
- Rotate replacement credentials promptly.

### 5.2 Raw and Derived Data
- Delete records from active stores when no longer needed.
- Delete local database files and exports when superseded.
- Ensure disposed artifacts are not present in source control.

### 5.3 Source Control Hygiene
- Raw databases and dumps must be ignored by Git.
- If sensitive data is committed, perform:
  1. Immediate credential/token revocation
  2. Removal from tracked files
  3. Git history rewrite and force push
  4. Post-remediation verification

## 6. Legal and Regulatory Compliance

- Retention/deletion decisions must comply with applicable law and contractual obligations.
- This policy is operational and does not replace legal counsel.
- Where legal obligations conflict, legal requirements take precedence.

## 7. Verification and Audit

- Periodic checks must confirm:
  - ignored sensitive paths remain ignored
  - no secrets in reachable Git history
  - stale raw artifacts are purged
- Incident records should include retention/disposal remediation steps.

## 8. Enforcement

Controls supporting enforcement:
- `.gitignore` protections for raw data
- Pre-commit secret scanning
- Token revocation and incident response procedures
