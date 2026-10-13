---
type: Metric
title: Recognized Company Revenue
description: Definition and accounting governance for GAAP-compliant recognized revenue.
resource: https://metrics.company.internal/catalog/fin_rev_recognized
tags: [finance, revenue, metrics, gaap]
status: stable
generated: { by: reference_agent/gemini-2.5-pro, at: 2026-10-02T08:00:00Z }
verified: { by: human:finance_director, at: 2026-10-06T16:00:00Z }
sources:
  - id: gaap-standards
    resource: https://fasb.org/standards/asc-606
    title: Financial Accounting Standards Board ASC 606
    author: human:fasb_board
---

# Definition

Recognized Revenue represents monetary value earned from products delivered or software services rendered during the reporting period, satisfying GAAP ASC 606 performance obligations.[^gaap-standards]

# Computation Link

To prevent discrepancies and improvision by automated agents, revenue must only be computed by executing the sanctioned computation contract in [the revenue computation](/technical/attested_revenue_metric.md).

# Cadence and Reporting

- Calculated on the 1st business day following fiscal month close.
- Exported automatically into the executive financial analytics dashboard.
- Any manual journal adjustments require dual sign-off from the Controller and VP of Finance.

[^gaap-standards]: Financial Accounting Standards Board ASC 606
