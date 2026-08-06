# Build 1 Phase 9 — Security review

## Disposition

The Phase 9 scope was reviewed as an active security-hardening change. Three concrete weaknesses were corrected; prompt injection remains a documented residual model risk.

| Finding | Severity | Evidence before fix | Phase 9 disposition |
|---|---|---|---|
| P9-SEC-01 — Researcher-controlled stage titles entered the system role | High | A checksum verified integrity, but did not make project text a trusted instruction | Removed all project-authored titles from system instructions; moved all project content to the untrusted provider envelope |
| P9-SEC-02 — No end-to-end cancellation or explicit safe retry | Medium | Client could not stop a request and provider helper accepted only its own timeout | Added browser cancellation, close-to-abort, provider signal propagation, separate timeout/cancel codes, checksum-bound explicit retry, and zero automatic retry |
| P9-SEC-03 — Provider error logging could retain a response prefix | Medium | Upstream failure diagnostics included the beginning of the provider body | Removed response-body prefixes and raw provider error text; return bounded codes and sanitized messages |

## Layered controls

1. Same-origin JSON request gate.
2. Authenticated user and owner-filtered project query.
3. Per-minute, daily, allowance, and model guardrails.
4. Request byte limit plus provider input/token budgets.
5. Checksummed, normalized project and Stage 1 contexts.
6. Exact project/step/technique scope checks.
7. Trusted-instruction versus untrusted-data role separation.
8. Strict output shape, provenance, capability, and unsafe-claim validation.
9. Review-before-apply and stale-checksum denial.
10. Sanitized logs, no-store API response, cancellation, and explicit-only retry.

## Residual risks

- Prompt injection cannot be guaranteed away; unexpected output must remain non-authoritative and reviewable.
- Redaction patterns do not detect every form of sensitive or identifying free text.
- Upstream provider retention and training behavior cannot be guaranteed by application response headers.
- Rate limiting is feature-level abuse resistance, not a substitute for infrastructure-wide traffic controls.
- Authorization assumes the existing Supabase session and project ownership policies are correctly deployed.

No remote security configuration, key rotation, deployment, or production migration was performed in this phase.
