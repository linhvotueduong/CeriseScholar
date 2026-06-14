# Cerise Scholar Design Phase Storage Protocol

Date: 2026-06-12
Status: design phase checkpoint saved. Use this as the visual baseline before starting function work.

## Locked Design Surfaces

- App shell: left sidebar, top navigator, active states, profile block, language/night mode controls, and half-screen behavior.
- Dashboard: research summary cards, research sections/detail transition, right rail plan/schedule cards, continue learning, support cards, footer.
- Research Desk: stats row, project list, project overview tabs, synthesis funnel, evidence library, right rail cards, quick note, assistant card, full-screen and half-screen compositions.
- Course Library: progress summary, continue learning, recommended courses, course cards, book-style recommendation icons, two-card half-screen course layout.
- Help Center: half-screen support layout, category cards, popular questions, support/policy hiding rules.
- Schedule: weekly calendar, compact controls, stats cards, right-side today/notes/deadlines layout, half-screen stacking rules.
- Settings: shared header, compact subnav, account/local setup/preferences/notifications/privacy/security/help/danger content framing, footer alignment.
- Policy pages: Privacy Policy and Terms of Use article layout with page-specific rail behavior.
- Night mode: dark shell and page treatment should keep text, stats, charts, controls, and borders readable instead of only blacking out the page.

## Visual Rules To Preserve

- Match screenshots by spacing, alignment, card heights, and composition before broad refactors.
- Preserve content. Do not clip text to force height.
- When card height changes, tighten or spread the inner content so empty space does not appear accidental.
- Avoid visible divider lines when the design request removes them.
- Dark buttons use black background with white text unless a request says otherwise.
- Settings `Save Settings` buttons have no save icon.
- Half-screen layouts should hide secondary panels only when requested, then let primary content breathe without creating large blank gaps.
- Footer pattern for app pages: `© 2025 Cerise Scholar. All rights reserved.` on the left, `Terms`, `Privacy`, `Help` on the right.

## Function Phase Guardrails

- Bind real data into the existing card surfaces instead of reshaping the layouts.
- Keep research/project transitions consistent with the dashboard research-section transition pattern.
- Keep project overview tabs sized to their active text label, not a fixed underline width.
- Keep the authenticated app routes behind the existing shell and navigation structure.
- Do not reintroduce mascot art where it was replaced or removed during the design phase.
- Keep dark mode tokens synchronized with any new functional components.
- If a function requires new state, prefer small hooks or existing `src/lib/app-data`, `src/lib/dashboard`, and route-local data helpers before adding broad abstractions.

## Current Verification Protocol

Use focused checks after each function slice:

```bash
npx eslint <changed files>
git diff --check -- <changed files>
```

When local preview is needed, use:

```bash
PORT=3020 npm run dev -- --hostname 127.0.0.1 --port 3020
```

Preview URL:

```text
http://127.0.0.1:3020
```

## Design Files Most Likely To Matter Next

- `src/app/dashboard/page.tsx`
- `src/app/research-desk/page.tsx`
- `src/app/courses/page.tsx`
- `src/app/help/page.tsx`
- `src/app/dashboard/schedule/page.tsx`
- `src/app/settings/layout.tsx`
- `src/components/app-shell/`
- `src/components/app-ui/`
- `src/components/dashboard/`
- `src/lib/app-data/`
- `src/lib/dashboard/`
- `src/lib/help/`
- `src/lib/legal/`

## Checkpoint Note

The worktree already contains unrelated older edits and untracked folders. Future commits should stay scoped to the function slice being built, or first create a deliberate design checkpoint commit from only the app UI files.
