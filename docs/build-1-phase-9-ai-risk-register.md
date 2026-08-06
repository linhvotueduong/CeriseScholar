# Build 1 Phase 9 — AI risk register and evaluation map

This register uses the NIST Generative AI Profile as a risk-management reference, not as a certification or claim of compliance: [NIST AI 600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence).

| ID | Risk | Primary controls | Required evaluation | Residual risk / response |
|---|---|---|---|---|
| AI-01 | Project or uploaded text attempts prompt injection | Trusted system/data separation; escaped, labeled JSON; strict schema; no tool authority | Injection strings stay outside trusted instructions; output extras fail closed | Models may still be influenced by adversarial data. Never treat output as authority; cancel, dismiss, or report unexpected behavior. |
| AI-02 | Hallucinated evidence, citation, approval, novelty, or validity | No browsing/tool claim; exact source IDs; unsafe-claim filter; epistemic labels; researcher review | Unknown IDs and unsupported evidence labels are rejected | Plausible unsupported prose may remain. Researchers must verify claims against actual sources. |
| AI-03 | Stale advice is applied after pathway edits | Project, content, pathway, technique, and suggestion checksums | Changed checksum blocks retry, apply, and save | A semantically important change that does not reach the selected context may not invalidate the response; the researcher still reviews it. |
| AI-04 | Cross-project data or decision mix-up | Owner query; project-ID equality; context normalization; project-scoped local keys | Mismatched project IDs fail before provider submission | Compromised credentials/session remain outside this feature’s control. |
| AI-05 | Sensitive participant or personal data reaches the model | Schema excludes participant rows, signatures, recordings, raw datasets, and full chat; bounded redaction | Context fixtures assert exclusion flags and common identifier redaction | Free text can contain unrecognized sensitive data. UI and privacy docs instruct researchers not to submit restricted raw data. |
| AI-06 | Automation bias or loss of researcher agency | Advisory wording; no automatic canvas mutation; review/edit/dismiss; zero automatic retry | UI and tests verify `no project change`; decision ledger captures researcher action | Users may still over-trust polished prose. Keep epistemic status and uncertainty visible. |
| AI-07 | Availability, cost, or duplicate-request harm | Per-minute/day limits; allowance guardrails; server/client timeouts; cancellation; explicit retry only | Cancel and transient-failure fixtures; `automaticRetries: 0` | Provider latency and rate limits remain possible; local guides preserve a non-AI path. |
| AI-08 | Accessibility exclusion | Keyboard close/focus restoration; visible focus; live errors; responsive layout; reduced motion | Keyboard, automated accessibility, desktop, and mobile review | Automated scans cannot establish complete usability; manual assistive-technology review remains advisable before public release. |
| AI-09 | Behavioral telemetry becomes a mental-state profile | Local breakpoint rules; two-signal threshold; corrections/cooldowns; no diagnosis vocabulary; no activity transcript sent | Proactivity/cooldown tests and product walkthroughs | A work-state suggestion can still feel intrusive; focus/on-request modes and category suppression remain available. |
| AI-10 | Malformed or overlong model output reaches the UI | Exact JSON parse; allowlisted keys; text/array bounds; safe token IDs; target validation | Markdown, extra-key, unknown-provenance, and size fixtures | Valid JSON can still be low quality; researcher review remains mandatory. |

## NIST-aligned operating loop

- **Govern:** keep the authority boundary, risk owners, privacy contract, and release evidence versioned with the feature.
- **Map:** identify the research state, route, selected context, affected user, and potential data sensitivity before provider invocation.
- **Measure:** run the 72-scenario matrix plus security, stale-context, output, accessibility, and product walkthrough checks.
- **Manage:** fail closed, cancel, permit only explicit safe retry, provide local fallback, and retain researcher control over every mutation.

Review triggers include a provider/model change, a new tool or retrieval capability, a context-schema expansion, storage/retention changes, direct participant-data integration, new autonomous actions, or a material accessibility regression.
