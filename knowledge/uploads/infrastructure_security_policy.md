---
type: Uploaded Document
title: "Infrastructure Security Policy"
description: "This document governs enterprise cloud infrastructure, credential isolation, and audit logging standards. All public traffic must traverse Cloudflare Enterprise WAF before hitting internal Kubernetes ingress controllers. Edge rate limiting is enforced at 1,000 requests per minute per IP address. Direct SSH access to nodes is forbidden; engineers must use Teleport bastion proxies with short-lived c"
resource: "file://uploads/infrastructure_security_policy.md"
tags: [uploaded, user_document, reference]
status: stable
generated: { by: "user_upload/infrastructure_security_policy.md", at: "2026-10-12T11:01:09Z" }
verified: { by: "human:user", at: "2026-10-12T11:01:09Z" }
sources:
  - id: original-upload
    resource: "file://uploads/infrastructure_security_policy.md"
    title: "infrastructure_security_policy.md"
---

# Overview

This document was uploaded, analyzed, and indexed into the OKF knowledge bundle from `infrastructure_security_policy.md`.[^original-upload]

## Infrastructure Security and Zero Trust Architecture

This document governs enterprise cloud infrastructure, credential isolation, and audit logging standards.

## Network Ingress and Edge Protection

All public traffic must traverse Cloudflare Enterprise WAF before hitting internal Kubernetes ingress controllers.
Edge rate limiting is enforced at 1,000 requests per minute per IP address.
Direct SSH access to nodes is forbidden; engineers must use Teleport bastion proxies with short-lived certificates.

## Cryptographic Key Management & Rotation

Root KMS encryption keys must reside in FIPS 140-2 Level 3 hardware security modules (HSM).
Database encryption keys must rotate automatically every 60 days.
TLS certificates must support TLS 1.3 only with AES-256-GCM cipher suites.

## Incident Response SLAs

Severity 1 breaches require incident commander declaration within 5 minutes.
Customer trust notifications must be dispatched within 4 hours.
All forensic snapshots must be retained in immutable S3 Glacier Vault for 365 days.

[^original-upload]: infrastructure_security_policy.md
