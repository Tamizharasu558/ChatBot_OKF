---
type: Attested Computation
title: Fiscal Year Recognized Revenue Computation
description: Sanctioned deterministic computation for recognized company revenue by fiscal year.
runtime: postgres
status: stable
parameters:
  - { name: fiscal_year, type: integer, required: true }
executor:
  resource: references/skills/run-postgres-query.md
  receipt: [job_id, executed_sql, total_revenue]
attester:
  resource: references/attesters/revenue_check.py
tags: [finance, revenue, computation, attested]
generated: { by: reference_agent/gemini-2.5-pro, at: 2026-10-01T14:00:00Z }
verified: { by: human:chief_financial_officer, at: 2026-10-04T11:00:00Z }
sources:
  - id: fin-policy-2026
    resource: https://finance.company.internal/policies/revenue-recognition-gaap
    title: GAAP ASC 606 Revenue Recognition Policy
    author: human:finance_compliance
    last_modified: 2026-09-01T00:00:00Z
---

# Computation

The computation sums all recognized amounts on finalized invoices booked within the designated fiscal year window, excluding refunded line items:

```sql
SELECT 
    COALESCE(SUM(inv.subtotal_usd - inv.discount_usd), 0.00) AS total_revenue
FROM finance.invoices inv
JOIN finance.billing_accounts acc ON inv.account_id = acc.id
WHERE inv.status = 'PAID'
  AND inv.fiscal_year = :fiscal_year
  AND inv.refund_status IS NULL;
```

# Verification Rules

1. Only invoices marked as `PAID` with no chargeback or refund status are aggregated.[^fin-policy-2026]
2. Tax and shipping fees are withheld from recognized operational revenue.
3. The attester compares executed SQL hashes against the canonical computation above to prevent unauthorized variance.

[^fin-policy-2026]: GAAP ASC 606 Revenue Recognition Policy
