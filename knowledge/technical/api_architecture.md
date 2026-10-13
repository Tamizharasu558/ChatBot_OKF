---
type: API Endpoint
title: Core REST API Architecture
description: Specification of API gateways, OAuth2 authentication, rate limiting,
  and standard response envelopes.
resource: https://api.company.internal/docs/v2/spec
tags:
- api
- architecture
- security
- auth
- ratelimit
status: stable
generated:
  by: reference_agent/gemini-2.5-pro
  at: 2026-10-01 10:00:00+00:00
verified:
- by: human:lead_architect
  at: 2026-10-05 14:30:00+00:00
- by: human:security_lead
  at: '2026-10-10T15:33:36Z'
- by: human:security_lead
  at: '2026-10-10T15:37:52Z'
- by: human:security_lead
  at: '2026-10-10T15:52:50Z'
- by: human:security_lead
  at: '2026-10-10T15:53:05Z'
- by: human:security_lead
  at: '2026-10-10T16:07:20Z'
- by: human:security_lead
  at: '2026-10-10T16:07:45Z'
- by: human:security_lead
  at: '2026-10-10T16:24:21Z'
- by: human:security_lead
  at: '2026-10-12T10:26:45Z'
- by: human:security_lead
  at: '2026-10-12T10:28:16Z'
- by: human:security_lead
  at: '2026-10-12T10:28:39Z'
- by: human:security_lead
  at: '2026-10-12T11:00:37Z'
sources:
- id: api-rfc
  resource: https://specs.internal/rfc/rfc-402-api-standards
  title: RFC-402 Internal API Gateway Standard
  author: human:architecture_council
  usage_count: 1420
  last_modified: 2026-09-15 00:00:00+00:00
- id: auth-guide
  resource: https://auth.internal/guides/oauth2-tokens
  title: OAuth 2.0 and JWT Token Validation Guidelines
  author: human:security_team
  usage_count: 3200
---

# Overview

The Core REST API serves as the primary gateway for all customer and partner integrations.[^api-rfc] All endpoints communicate over TLS 1.3 and require JSON payload formatting.

# Authentication and Authorization

All requests to protected endpoints must include a valid JSON Web Token (JWT) in the HTTP `Authorization` header:

```http
Authorization: Bearer <jwt-token>
```

Tokens are issued by the Central Authentication Service (`https://auth.company.internal/oauth/token`) using the `client_credentials` or `authorization_code` grant types.[^auth-guide]

- Access tokens expire after 60 minutes.
- Refresh tokens are valid for 30 days with sliding window revocation.
- Scopes are enforced per endpoint (`read:orders`, `write:orders`, `admin:billing`).

# Rate Limiting

The API implements token-bucket rate limiting enforced by Envoy proxy at the ingress edge:

| Tier | Request Limit | Burst Allowance | Penalty on Exceeded |
|---|---|---|---|
| **Free / Developer** | 100 requests / minute | 150 requests | HTTP 429 with 60s Retry-After |
| **Standard Business** | 500 requests / minute | 750 requests | HTTP 429 with 30s Retry-After |
| **Enterprise Dedicated** | 1,000 requests / minute | 1,500 requests | HTTP 429 with dynamic backoff |

When a client breaches their tier limit, the server responds with status code `429 Too Many Requests` containing the `Retry-After: <seconds>` header.

# Standard Response Envelope

All API responses follow a uniform envelope structure:

```json
{
  "success": true,
  "data": {
    "id": "ord_8829104",
    "status": "confirmed"
  },
  "metadata": {
    "request_id": "req_ab9201f8",
    "timestamp": "2026-10-10T12:00:00Z"
  }
}
```

In the event of an error:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Quota limit reached. Try again in 42 seconds."
  }
}
```

[^api-rfc]: RFC-402 Internal API Gateway Standard
[^auth-guide]: OAuth 2.0 and JWT Token Validation Guidelines
