# Build 1 Phase 5 — Cross-stage Context Compiler and No-recap Project Memory

Status: implemented and verified locally on 2026-08-04. No remote deployment was performed. This phase adds no database migration; secure foundation reads and Living Research Record writes become active after the existing Build 0 migration is applied.

## Researcher outcome

The Research mentor now follows a project through Stages 1–8. A researcher can open it on any step without recapping the current location, route, verified foundation artifacts, researcher-approved evidence, open questions, recent decisions, or explicitly saved preferences. Stage 1 retains its reviewed additive canvas alternatives. Stages 2–8 are advisory only and cannot target a canvas or approve a research artifact.

The new **What I understand** view makes the context inspectable. It shows the active stage and step, route, approved evidence, open questions, artifact lifecycle, project memory, refresh time, and a shortened semantic checksum. Missing Build 0 tables are reported plainly; the current device context remains usable.

## Context and memory architecture

`MentorContextEnvelope` is a bounded, project-scoped compiler output rather than a copy of every stage draft. It can contain only:

- active stage and step;
- researcher-selected text captured by an explicit action;
- route-profile fields;
- artifact identity, checksum, lifecycle, and source-reference metadata;
- checksum-valid, current, researcher-authored evidence entries;
- explicit open questions and preferences;
- bounded researcher decision summaries;
- Stage 1 item summaries and non-diagnostic work-state notes.

It excludes participant rows, signatures, recordings, raw dataset rows, raw qualitative material, manuscript payloads, and complete chat transcripts. Direct identifiers in selected text and explicit memory are redacted. A semantic `contentChecksum` changes when relevant context changes but not merely because refresh time advances.

Project memory is device-persisted, checksum-verified, project-namespaced, and explicitly researcher-controlled. Preferences can be added, corrected, or removed. Open questions can be added, edited, resolved, or removed. Cerise does not infer a psychological or personal profile from pauses, editing behavior, or conversation.

## Review-before-save knowledge workflow

Any advisory suggestion may be opened in **Save an insight to the project**. The researcher must review and may edit its title, knowledge kind, and wording. `writing-note` is the safe default. Choosing `evidence` displays a warning that model output is not an independent source and should only summarize a source the researcher actually reviewed.

Saving creates a canonical Living Research Record entry. It is written to secure foundation storage when available and retained in a bounded project-scoped device fallback otherwise. The chat prompt and transcript are never copied into that entry.

Every apply or save action compares the response's semantic checksum with the current envelope. If route, artifact status, selected text, approved knowledge, location, or memory changed while the model was answering, the old response becomes stale and cannot be applied or saved.

## Incremental refresh

The workspace rebuilds local context after pathway or memory changes. Secure foundation metadata refreshes when the drawer opens, the active location changes, the researcher requests refresh, or a domain workspace emits the shared meaningful-save event. This avoids raw-keystroke logging and avoids copying entire consent, study, collection, or analysis payloads into the mentor.

## Researcher-visible verification

1. Open Mentor in Stage 1, then open **What I understand**. Confirm the active location and checksum are visible without entering a recap.
2. Add a preference, correct it, and confirm the checksum changes. Reload and confirm the preference remains scoped to the same project.
3. Add an open question, edit it, resolve it, and confirm it leaves the active context.
4. Move to Stage 3 while the drawer is open. Confirm the drawer remains open, the location changes, and the saved preference remains available.
5. Return to **Mentor** in Stage 3. Confirm the support boundary says later-stage guidance is advisory and no canvas-review action is available.
6. Capture selected workspace text. Confirm it appears in the request section only after pressing **Use selected workspace text**, and can be cleared.
7. Review an advisory suggestion for saving. Confirm the title, kind, and wording are editable and that `writing note` is the default.
8. Change project context after receiving a response. Confirm the stale banner appears and Apply/Save is disabled.
9. At phone width, confirm the drawer fills the viewport, scrolls independently, and keeps the close control and privacy boundary available.

## Verification commands

```bash
npm run verify:build1-phase5
npx tsx --test src/lib/research/mentorContextEnvelope.test.ts src/lib/research/researchMentor.test.ts
npm test
npm run build
```

Deterministic reports are written to `output/build-1-phase-5-verification.json` and `output/build-1-phase-5-verification.md`. Browser evidence is in `output/playwright/build1-phase5-context-stage3-1536x1024.png`, `output/playwright/build1-phase5-context-mobile-390x844.png`, and `output/playwright/build1-phase5-insight-review-panel.png`.
