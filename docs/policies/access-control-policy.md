# Access Control Policy

Effective date: February 15, 2026  
Owner: Stonefruit Operator  
Applies to: All Stonefruit systems and data stores

## 1. Purpose

This policy defines how access is granted, restricted, reviewed, and revoked for Stonefruit systems and data.

## 2. Access Principles

- Least privilege: grant only minimum access needed.
- Need-to-know: restrict data access to legitimate operational need.
- Default deny: no access unless explicitly granted.
- Individual accountability: all access is attributable to a specific actor/account.

## 3. Identity and Authentication

- Administrative access requires unique user identity.
- Shared credentials are prohibited except for documented break-glass use.
- Strong authentication controls (MFA where supported) are required for third-party dashboards and infrastructure providers.

## 4. Authorization Model

Current model (single-operator phase):
- One owner-level operator account controls code and runtime infrastructure.
- No end-user direct access to backend data stores.
- Access tokens are server-side only.

Future model (multi-operator phase):
- Role-based access control for operator, reviewer, and read-only roles.
- Privileged actions require explicit elevation.

## 5. Access Provisioning

- New access must be explicitly approved by the Owner.
- Granted permissions must be documented (who, what, when, why).
- Access should have an intended end date when possible.

## 6. Access Review

- Access rights are reviewed at least quarterly.
- Stale or unnecessary access must be removed immediately.
- Credential inventory (API keys, tokens, service accounts) is reviewed regularly.

## 7. Access Revocation

Access must be revoked immediately upon:
- Security incident or suspected compromise
- End of need or role change
- Credential leak or unauthorized disclosure

## 8. Session and Secret Handling

- Secrets must not be embedded in source code.
- Local env files containing secrets must remain untracked by Git.
- Exposed tokens/keys must be revoked and replaced.

## 9. Enforcement

Enforcement mechanisms include:
- Git ignore rules for raw/sensitive artifacts
- Pre-commit secret scanning
- Operational revocation procedures for leaked credentials/tokens

## 10. Exceptions

All exceptions must be documented with:
- Scope
- Justification
- Risk accepted
- Expiration date
