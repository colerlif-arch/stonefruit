# Information Security Policy

Effective date: February 15, 2026  
Owner: Stonefruit Operator (repository owner)  
Applies to: All Stonefruit systems, code, data stores, and credentials

## 1. Purpose

This policy defines how Stonefruit protects confidential information, enforces secure development and operations, and responds to security events.

## 2. Scope

This policy applies to:
- Source code and infrastructure configuration
- Secrets and credentials (including Plaid credentials and access tokens)
- Raw and derived personal data
- Local and hosted runtime environments
- Backups, logs, and exported datasets

## 3. Security Objectives

Stonefruit security controls are designed to:
- Maintain confidentiality of financial and personal data
- Preserve integrity of ingested and derived data
- Maintain availability of core ingestion and derivation systems
- Minimize exposure of credentials and sensitive records

## 4. Governance and Responsibilities

- The Owner is accountable for policy maintenance and enforcement.
- Changes to security controls must be documented in version control.
- Exceptions to policy must be time-bound, documented, and approved by the Owner.

## 5. Core Security Controls

### 5.1 Secrets Management
- Secrets must never be committed to source control.
- Production/sandbox credentials are stored in environment variables or secret managers.
- Access tokens are server-side only and must not be exposed to clients.
- Any exposed credential/token must be revoked/rotated immediately.

### 5.2 Secure Development
- Code changes require review of staged diffs before commit.
- Pre-commit secret scanning is required.
- Sensitive runtime artifacts (raw databases, dumps, exports) must be `.gitignore` protected.

### 5.3 Data Protection
- Raw data is stored in controlled paths only.
- Data minimization is required: collect only needed data.
- Derived outputs should avoid exposing unnecessary raw identifiers.

### 5.4 Logging and Monitoring
- Logs must avoid plaintext secrets.
- Security-relevant events (token revocation, access failures, schema/setup failures) should be logged.

### 5.5 Dependency and Patch Management
- Dependencies should be kept reasonably current.
- Known critical vulnerabilities should be remediated promptly.

## 6. Incident Response

When a suspected exposure occurs:
1. Contain: disable/revoke affected credentials and tokens.
2. Eradicate: remove leaked artifacts from source control and storage.
3. Recover: restore safe operation and verify control effectiveness.
4. Document: record timeline, scope, and remediation.
5. Improve: update controls to prevent recurrence.

## 7. Business Continuity

- Critical data and configuration should be backed up securely.
- Recovery procedures must be documented for key services.

## 8. Compliance and Review

- This policy is reviewed at least annually or after any material incident.
- Noncompliance may require immediate operational remediation.
