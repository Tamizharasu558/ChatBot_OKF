---
type: Guide
title: Corporate Data Governance and Privacy Policy
description: Standards for customer data classification, GDPR compliance, retention limits, and PII masking.
resource: https://security.company.internal/governance/data-policy
tags: [governance, gdpr, privacy, pii, security, retention, logs]
status: stable
generated: { by: reference_agent/gemini-2.5-pro, at: 2026-10-05T09:00:00Z }
verified: { by: human:data_protection_officer, at: 2026-10-09T13:00:00Z }
sources:
  - id: gdpr-art32
    resource: https://gdpr-info.eu/art-32-gdpr/
    title: General Data Protection Regulation Article 32 Security of Processing
    author: human:eu_commission
  - id: sec-handbook
    resource: https://infosec.company.internal/handbook/data-retention
    title: Information Security Retention and Disposal Handbook
    author: human:infosec_lead
    last_modified: 2026-09-10T00:00:00Z
---

# Data Classification Tiers

Our organization classifies all stored and processed information into four discrete tiers:[^sec-handbook]

1. **Public**: Information cleared for unrestricted public consumption (e.g., marketing content, public documentation).
2. **Internal**: Day-to-day operational documents, meeting summaries, and non-sensitive source code.
3. **Confidential**: Business contracts, unannounced roadmap items, and financial forecasts. Requires department-level authorization.
4. **Restricted**: Personally Identifiable Information (PII), credentials, payment card tokens, and secret encryption keys. Requires strict multi-factor role-based access control (RBAC).

# Retention and Deletion Schedules

- **Application Access Logs**: Ingestion logs containing IP addresses and user agent strings are retained for exactly **90 days** in hot storage, then automatically hard-deleted.
- **Customer Database Backups**: Retained for 30 days in encrypted cold storage with automated point-in-time recovery.
- **Inactive User Accounts**: If an account remains inactive with zero log-ins for 365 consecutive days, an account closure notice is dispatched. Data is purged 30 days following notice unless retained for regulatory audit reasons.

# Privacy and GDPR Compliance

Under GDPR Article 32 and CCPA regulations, our infrastructure implements the following guarantees:[^gdpr-art32]
- All customer PII (email, phone, home address) is encrypted at rest using AES-256 with KMS envelope encryption.
- Direct database query views mask the middle 6 characters of email addresses and all but the last 4 digits of credit card numbers.
- Data Subject Access Requests (DSAR) for erasure or export must be fulfilled within 30 calendar days via the Privacy Portal.

[^sec-handbook]: Information Security Retention and Disposal Handbook
[^gdpr-art32]: General Data Protection Regulation Article 32 Security of Processing
