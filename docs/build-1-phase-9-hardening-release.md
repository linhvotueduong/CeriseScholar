# Build 1 Phase 9 — Mentor hardening and verification release

## Outcome

Phase 9 turns the Stage 1 Mentor into a bounded, failure-aware release candidate. It does not make the model authoritative and does not claim that prompt injection can be eliminated. It uses layered controls, fails closed when output cannot be verified, and leaves every project mutation behind researcher review.

## Security and authority boundary

- The system message contains only Cerise-owned policy and server-selected capability metadata.
- Every project-authored title, field, selected excerpt, memory item, work-state note, and ephemeral turn is serialized under `CERISE_UNTRUSTED_RESEARCH_DATA_V1`.
- Angle brackets and Unicode line separators inside project JSON are escaped before provider submission.
- Injection-like text is counted for verification telemetry; it is not interpreted as an instruction and is not stored as a personal profile.
- Provider input is bounded to 22,000 serialized data bytes and a conservative 14,000-token estimate. Three deterministic projection passes reduce arrays, keys, and text lengths before the request fails closed.
- Provider output must be one exact JSON object. Markdown fences, unexpected top-level keys, unexpected suggestion keys, unknown IDs, unsafe authority claims, and invalid canvas targets are rejected.
- The API re-verifies project ownership, project ID, Stage 1 step scope, context checksums, technique checksum, rate limits, and allowance guardrails before calling the provider.

OWASP describes prompt injection as a residual risk without a foolproof prevention method, so the Cerise boundary is deliberately layered rather than described as a guarantee: [OWASP LLM01 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).

## Failure, cancellation, and retry behavior

- The server timeout is 55 seconds; the client timeout is 60 seconds.
- Closing the Mentor or choosing **Cancel request** aborts the browser request and propagates cancellation to the provider call.
- Cerise performs zero automatic retries. This avoids an invisible second provider charge or duplicate generation.
- A researcher may choose **Retry request once** only for a verified transient failure: provider busy, provider timeout, temporary unavailability, rate limiting, or invalid structured output.
- Retry is refused when the project-context checksum changed after the failed request. The researcher must inspect the current context and make a new request.
- Provider response bodies and prompt fragments are not written to server logs. User-facing errors are mapped to bounded codes and sanitized messages.
- When AI is unavailable, the UI presents a mode-specific three-step local guide labeled `not AI output` and `no project change`.

## Privacy and retention contract

| Data class | Used for a Mentor request | Stored by this feature | Boundary |
|---|---:|---:|---|
| Selected project summaries and explicit project memory | Only after the researcher opens or invokes Mentor | Existing local/project artifact remains; provider payload is not saved by Cerise | Bounded and redacted before submission |
| Raw participant rows, signatures, recordings, raw datasets, full transcripts | No | No | Explicitly excluded from the context schema |
| Ephemeral Mentor turns | Last four bounded turns may be submitted | No transcript is stored by the Mentor context or decision ledger | Used only within the current client session |
| AI review decision | No prompt or transcript | Yes, as checksum-bound action, rationale, artifact reference, and served model | Researcher-owned review history |
| Project memory | Only explicit preference/open-question items | Local, correctable, removable | No inferred mental or personal profile |
| Usage metadata | Request/accounting metadata | Existing AI usage infrastructure | No project prompt content in the Phase 9 report |

Cerise sends the selected context to OpenRouter when the researcher invokes AI. This phase cannot technically guarantee the upstream provider or selected model’s retention behavior. Researchers should assume selected context leaves the device and should not include participant records or restricted raw data. `Cache-Control: private, no-store` applies to Cerise API responses; it is not a claim about provider-side retention.

## Accessibility release contract

The target is WCAG 2.2 Level AA, assessed against the official Recommendation: [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Phase 9 specifically covers visible keyboard focus, Escape-to-close with launcher focus restoration, cancellation without a pointer, live failure status, focus scroll margins, reduced-motion preservation, and desktop/mobile comparisons. It also reviews the WCAG 2.2 additions relevant to this surface: Focus Not Obscured (Minimum), Dragging Movements, and Target Size (Minimum).

An accessibility check is evidence of the tested fixture and viewport, not a certification of the whole product.

## Deterministic verification

The release verifier materializes 12 Build 0 route fixtures across six Stage 1 states:

1. Route only; pathway canvas blank.
2. Raw concern.
3. Candidate problem frame.
4. Baseline evidence map.
5. Candidate research question.
6. Selected pathway with rationale.

All 72 combinations must compile a route, build and re-verify both checksummed contexts, exclude participant/transcript data, preserve project scope, and fit the provider budget. Additional fixtures cover cross-project denial, stale checksum changes, prompt-like content, strict output, the 40-row table limit, migration/conflict regression, proactivity/cooldown regression, keyboard behavior, and responsive visual evidence.

## Operational boundary

No remote deployment or production database mutation is part of this phase. Existing unapplied Build 0/Build 1 migrations remain an operator concern. Phase 9 changes application code, local deterministic fixtures, documentation, and generated verification evidence.
