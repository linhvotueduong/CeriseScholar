**Findings**
- [P2] Browser visual comparison blocked by protected route
  Location: `/dashboard/schedule`
  Evidence: the source visual target is the user-provided Research Schedule screenshot in the current thread; the implementation route redirected to `/login` in the in-app browser because no auth session was available.
  Impact: exact visual QA against the screenshot could not be completed in this unauthenticated browser session.
  Fix: open `/dashboard/schedule` in an authenticated session and compare the visible page to the supplied screenshot.

**Open Questions**
- None about the requested screen. The remaining issue is capture access, not design intent.

**Implementation Checklist**
- Added the full weekly Research Schedule page at `/dashboard/schedule`.
- Added sidebar access through a Schedule navigation item.
- Confirmed the dashboard "Open full schedule" route already points to `/dashboard/schedule`.
- Ran focused ESLint and whitespace checks.

**Follow-up Polish**
- After authenticated visual capture, tune any remaining pixel-level spacing, event card height, and rail alignment differences against the screenshot.

source visual truth path: current-thread user screenshot
implementation screenshot path: unavailable; protected route redirected to `/login`
viewport: in-app browser default
state: unauthenticated local dev session
full-view comparison evidence: blocked by auth redirect
focused region comparison evidence: blocked by auth redirect
patches made since previous QA pass: initial implementation
final result: blocked

---

# Design QA — Eight-stage research path workspace

## Visual truth and implementation evidence

- Source visual truth:
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-0a419a16-8437-4733-b800-55aaf4443e6c.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-ca9831c1-b7f3-489b-806f-4abc27885def.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-b9613f78-b295-4d22-9c27-4466f05aaa86.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-05189290-ad3b-45d6-872b-c8203f1dabb5.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-cc3ac481-2b8e-4405-8dc7-9e3ff7f61e88.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-39eb5b49-6136-4c6d-9618-da9711874103.png`
- Desktop implementation screenshots:
  - `/tmp/cerise-research-path-desktop-final.png`
  - `/tmp/cerise-research-path-stage-03.png`
- Mobile implementation screenshot:
  - `/tmp/cerise-research-path-mobile.png`
- Desktop viewport and state: `1440 × 900`, Stage 01 Step 01 and Stage 03 Step 01.
- Mobile viewport and state: `390 × 844`, Stage 01 Step 01.

## Comparison findings

- No remaining P0, P1, or P2 issues.
- The pale-blue workspace, left research-path rail, numbered step treatment, white working canvas, and table-led Stage 01 layout match the supplied visual direction.
- The active-step header, progress controls, and compact rows for all eight stages are intentional additions needed to make the preview usable beyond Stage 01.
- The purple rectangle visible in one mock was treated as an editor selection outline, not a product border.
- Desktop page metrics were `1440 × 900` with `1440 × 900` document dimensions: no page overflow.
- Mobile page metrics showed no horizontal document overflow; wide research tables scroll inside their own canvas.

## Interaction and persistence checks

- Opened Stage 03 and entered a realistic research-design response.
- Checked a completion criterion and marked the step complete.
- Reloaded and confirmed that the answer, criterion, and `1 / 6` stage progress persisted in local browser storage.
- Confirmed previous/next step navigation, stage expansion, tabs, and completion controls.
- Console error and warning logs were empty.

## Comparison history

1. First pass showed the desktop workspace extending beyond the viewport because of its minimum height.
2. Replaced the minimum-height behavior with a viewport-height workspace and internal rail/canvas scrolling.
3. Re-ran the desktop capture and confirmed exact viewport document dimensions with no overflow.
4. The generated research-tower image was initially captured before it finished painting; waited for image completion and recaptured successfully.
5. Compared the source and final implementation together and found no further actionable visual mismatch.

## Verification

- Focused ESLint: passed.
- TypeScript: passed.
- Automated tests: 36 / 36 passed.
- Temporary unauthenticated QA route removed after visual verification.

final result: passed

---

# Design QA — Focused research workspace header

- Source visual truth path: `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-b6a902d5-9346-45bd-9f8d-7eb00524da4e.png`
- Implementation screenshot path: `/tmp/cerise-research-workspace-no-top-nav.png`
- Viewport: `1440 × 900`
- State: research-path workspace, Stage 01 Step 01
- Full-view comparison evidence: the supplied 64px global Cerise Scholar navigation is absent and the research workspace now occupies the complete viewport height.
- Focused-region comparison evidence: the implementation begins with the compact project context bar (`Projects` and project name); no Cerise Scholar brand link or global navigation items remain.

## Findings

- No remaining P0, P1, or P2 issues.
- Fonts and typography: the research workspace typography is unchanged; only the unrelated global header was removed.
- Spacing and layout rhythm: the reclaimed header space is assigned to the workspace, with `1440px` document width matching the `1440px` viewport and no page-level overflow.
- Colors and visual tokens: the existing pale-blue research canvas and white context bar remain unchanged.
- Image quality: the existing research-tower asset retains its original crop, scale, and sharpness.
- Copy and content: all research-stage labels, project context, and working content remain unchanged.

## Comparison history

1. The source showed the global navigation occupying the top of the focused research workspace.
2. The project route was given a header-free AppShell layout and full-height research canvas.
3. The revised browser capture confirmed the global brand/navigation was removed, viewport space was reclaimed, and no overflow or console warnings were introduced.

## Verification

- Focused ESLint: passed.
- TypeScript: passed.
- Automated tests: 36 / 36 passed.
- Browser console errors and warnings: none.
- Temporary QA route removed after capture.

final result: passed

---

# Design QA — Stage 02 Research Proposal workspace

## Visual truth and implementation evidence

- Source visual truth:
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-434d5399-e80b-4ba0-aed3-87ddd39d03a2.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-cb55f3c4-ca57-4cae-b0bf-8e177aec0d62.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-fdd3629b-7e0a-4ebf-a879-cb317316544b.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-549ae4bd-1dd1-4326-9d45-a06bbe74a3b8.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-27111754-2ec1-4bf9-b99a-0fefec549c20.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-2d0599f1-96c5-4e9f-8641-016e4e508bb1.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-9541a0ab-5806-4ec9-b811-88a69f00bb13.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-cf9d2b10-704c-474a-8219-90d183932de2.png`
- Desktop implementation screenshots:
  - `/tmp/cerise-stage-02-literature-review.png`
  - `/tmp/cerise-stage-02-rq-roadmap.png`
- Mobile implementation screenshot: `/tmp/cerise-stage-02-mobile.png`
- Desktop viewport and states: `1440 × 900`, Literature Review, RQ Roadmaps, ScholarAsk, Lit Review, Evidence Library, and Paper Writer.
- Mobile viewport and state: `390 × 844`, Literature Review.

## Comparison findings

- No remaining P0, P1, or P2 issues.
- Stage 02 uses the established pale-blue research-path shell, numbered left rail, white working canvas, and compact delivery controls from Stage 01.
- The literature workflow preserves the source activity checklist while expanding it into editable proposal synthesis fields.
- The RQ roadmap preserves the source structure of research question, themes, short-, medium-, and long-term tasks, and vision. The editable table intentionally omits the decorative arrow so the workspace remains readable and functional at responsive widths.
- Typography, spacing, borders, and colors follow the existing Cerise research-path design tokens. The existing research-tower asset is retained without stretching or replacement.
- Desktop document metrics matched the viewport with no page-level horizontal overflow. Mobile metrics also showed no page-level horizontal overflow; the stage steps, tool tabs, and wide roadmap table scroll inside their own regions.

## Interaction and persistence checks

- Opened each embedded proposal tool: Proposal Workspace, ScholarAsk, Lit Review, Evidence Library, and Paper Writer.
- Confirmed every embedded tool remained on the same research-path URL and did not open a separate project tab.
- Entered a realistic RQ1, theme, short-, medium-, and long-term tasks, and vision; reloaded and confirmed the saved draft returned from local browser storage.
- Confirmed Stage 02 exposes six steps: Literature Review, RQ Roadmaps, Background, Problem Statement, Current Study, and Method and Materials.
- Browser console error and warning logs were empty.

## Comparison history

1. Replaced the generic Stage 02 Data stage with the Research Proposal deliverable and six proposal-writing steps.
2. Added the literature workflow and editable RQ1–RQ4 roadmap canvases using the supplied proposal and roadmap references.
3. Embedded the five project tools behind in-canvas tabs and retained their existing standalone routes.
4. Compared the source proposal and roadmap visuals with the implementation screenshots in the same review pass.
5. Verified desktop and mobile overflow, tool switching, reload persistence, and console output.

## Verification

- Focused ESLint: passed with two pre-existing ScholarAsk warnings.
- TypeScript: passed.
- Automated tests: 36 / 36 passed.
- Temporary unauthenticated QA route removed after visual verification.

final result: passed

---

# Design QA — Account avatar control

- Source visual truth:
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-be30e8bb-6801-4f89-ac66-ce2f2d7f118c.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-c4b27dad-9e9f-40f8-a652-1327aa945a40.png`
- Implementation screenshot: not captured
- Intended state: signed-in Settings → Account profile
- Browser state reached: redirected to `/login`
- Full-view comparison: blocked by authentication
- Focused avatar comparison: blocked by authentication

## Findings

- **P1 — Visual verification blocked:** the isolated in-app browser does not share the signed-in session, and the Chrome integration is unavailable. The Account page could not be rendered for screenshot comparison.
- Static checks passed: targeted ESLint and `git diff --check`.
- Production build completed and emitted a `BUILD_ID`; its temporary 117 MB build cache was removed afterward.

## Comparison history

1. Opened `http://localhost:3020/settings/account` in the available in-app browser.
2. The application redirected to `http://localhost:3020/login`.
3. Checked for the Chrome browser connection twice; it was not available.

## Final result

**Blocked** — complete the rendered comparison after the user signs in to the in-app browser.

---

# Design QA — Compact institution mode selector

**Findings**
- [P1] Rendered visual comparison remains blocked by authentication.
  Location: Settings → Account → Organization / Institution.
  Evidence: the source visual is available, but the in-app browser remains on `/login`; the Chrome browser connection is unavailable.
  Impact: the new inline selector cannot yet be compared against the signed-in Account page at the same viewport and state.
  Fix: sign in to the in-app browser, capture the Account page, and compare the focused field region with the supplied reference.

**Implementation Checklist**
- Reduced the compact segmented selector to 94px wide with 20px minimum-height buttons.
- Placed the selector on the same row as “Organization / Institution.”
- Shortened only the compact visual labels to “U.S.” and “Other”; retained full accessible labels and hover titles.
- Kept the larger onboarding selector unchanged.
- Passed focused ESLint, TypeScript, institution-search tests, and whitespace checks.

source visual truth path: `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-636a0893-32ee-4bd1-8f3c-a2856243c16a.png`
implementation screenshot path: unavailable; protected route remains at `/login`
viewport: in-app browser default
state: unauthenticated local development session
full-view comparison evidence: blocked by auth redirect
focused region comparison evidence: blocked by auth redirect
comparison history: initial implementation; no post-fix capture available because the Account route requires authentication
final result: blocked

---

# Design QA — Consolidated Stage 02 proposal writer

- Source visual truth paths:
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-49acb70d-5759-4481-a3b4-850192966219.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-2248df1f-1275-44b7-9d20-ccb828e58dd2.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-2edd3a91-8151-4385-91e9-bb45a5547b5f.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-c11f9b9d-14cb-45b8-b396-15a0fbfbc157.png`
- Desktop implementation screenshot: `/tmp/cerise-stage-02-combined-proposal-writer.png`
- Mobile implementation screenshot: `/tmp/cerise-stage-02-combined-proposal-writer-mobile.png`
- Desktop viewport and state: `1440 × 900`, Stage 02 Step 03, Statement of the Problem selected with realistic draft text.
- Mobile viewport and state: `390 × 844`, Stage 02 Step 03, proposal section navigation and editor visible.
- Full-view comparison evidence: the four separate guided writing screens are replaced by one Paper Writer workspace while retaining the pale-blue Stage 02 shell and original writing topics.
- Focused-region comparison evidence: the proposal section rail exposes Background, Statement of the Problem, Literature Review, Current Study, Method and Materials, and References; each section opens a dedicated editor and guidance panel.

## Findings

- No remaining P0, P1, or P2 issues.
- Fonts and typography: the Paper Writer preserves Cerise Scholar's sans-serif interface hierarchy and serif manuscript editor treatment.
- Spacing and layout rhythm: desktop uses a section rail, editor, and guidance panel; mobile stacks these regions and makes proposal sections and tool tabs horizontally scrollable without document-level overflow.
- Colors and visual tokens: the existing white editor, pale-blue stage shell, warm neutral rules, active underline, and pink selected-section state are unchanged.
- Image quality: no new image assets were required; the existing research-tower image remains sharp and correctly cropped.
- Copy and content: the four requested topics are preserved as proposal sections, with Literature Review and References added to complete the proposal-writing workflow.

## Interaction and comparison history

1. The initial state placed Background, Problem Statement, Current Study, and Method and Materials in four separate Stage 02 steps.
2. Stage 02 was reduced to Literature Review, RQ Roadmaps, and Write Proposal.
3. The final step now opens Paper Writer by default in proposal mode with six integrated proposal sections.
4. Selected Statement of the Problem, entered realistic text, and confirmed the active section, editor value, unchanged URL, and zero console errors.
5. Verified `1440 × 900` and `390 × 844`; both matched the viewport width with no document-level horizontal overflow.

## Verification

- Focused ESLint: passed.
- TypeScript: passed.
- Automated tests: 37 / 37 passed, including a Stage 02 consolidation regression test.
- Temporary QA route removed after capture.

final result: passed

---

# Design QA — Immersive Stage 02 Literature Review

- Source visual truth paths:
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-72b4ab12-6820-4427-b48b-ef525f0b81e5.png`
  - `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-91d22655-5bb7-4f92-aaf0-9611d66c92fe.png`
- Desktop implementation screenshot: `/tmp/cerise-lit-review-immersive-desktop.png`
- Mobile implementation screenshot: `/tmp/cerise-lit-review-immersive-mobile.png`
- Desktop viewport and state: `1440 × 900`, Stage 02 Step 01, embedded Lit Review selected.
- Mobile viewport and state: `390 × 844`, Stage 02 Step 01, embedded Lit Review selected.
- Full-view comparison evidence: the large step heading and description, return-to-step row, stage deliverable, and Previous/Complete/Next footer shown in the references are absent; the embedded Literature Review begins immediately beneath the proposal tool tabs.
- Focused-region comparison evidence: exact role checks returned zero matches for the removed heading, return button, and completion button. The Literature Review filters, empty state, and tool tabs remain visible and functional.

## Findings

- No remaining P0, P1, or P2 issues.
- Fonts and typography: removing the duplicate step heading leaves the built-in product's own `Synthesized Literature Review` heading as the clear page title.
- Spacing and layout rhythm: the Literature Review canvas now occupies the work area's full vertical track with only 14px desktop and 10px mobile outer padding.
- Colors and visual tokens: the pale-blue research-path shell, white product surface, warm neutral rules, and selected-tab treatment remain unchanged.
- Image quality: no assets were added or changed; the existing research-tower illustration remains sharp and correctly cropped.
- Copy and content: only the redundant outer title, description, return control, deliverable label, and footer actions were removed. The Cerise Literature Review content is unchanged.

## Interaction and comparison history

1. Opened Stage 02 and confirmed Literature Review remained the first step.
2. Selected the embedded Lit Review tab and confirmed it loaded in the same research-path workspace.
3. Compared both supplied removal references with the desktop and mobile implementation captures in the same review pass.
4. Verified the removed controls are absent, the document has no horizontal overflow, and browser console error and warning logs are empty.

## Verification

- Focused ESLint: passed.
- TypeScript: passed.
- Automated tests: 37 / 37 passed.
- Temporary unauthenticated QA route removed after capture.

final result: passed

---

# Design QA — Full-height embedded Cerise products

- Source visual truth path: `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-22397455-d909-4ef7-b3a4-e7ffbffa947e.png`
- Desktop implementation screenshot: `/tmp/cerise-scholarask-full-height-desktop.png`
- Mobile implementation screenshot: `/tmp/cerise-scholarask-full-height-mobile.png`
- Desktop viewport and state: `1440 × 900`, Stage 02 Literature Review, ScholarAsk selected, empty conversation state.
- Mobile viewport and state: `390 × 844`, Stage 02 Literature Review, ScholarAsk selected, conversation sidebar collapsed.
- Full-view comparison evidence: the source shows the ScholarAsk product ending above a large reserved white block. The implementation gives the embedded product the full remaining canvas height beneath the tool tabs.
- Focused-region comparison evidence: measured desktop heights are 828px for the proposal studio, 780px for the embedded product track, and 780px for the ScholarAsk root. The product and its track now match exactly rather than stopping at the previous 680px cap.

## Findings

- No remaining P0, P1, or P2 issues.
- Fonts and typography: unchanged; the embedded ScholarAsk hierarchy and native Cerise type treatments remain intact.
- Spacing and layout rhythm: the Literature Review studio now uses a two-row grid and the selected built-in product stretches through the full flexible row without a fixed-height gap.
- Colors and visual tokens: unchanged; the pale-blue shell, white product surface, rules, and selected-tab treatment remain consistent.
- Image quality: the existing ScholarAsk lightbulb artwork is unchanged, fills its intended product state, and remains sharp.
- Copy and content: unchanged; only space allocation and responsive conversation navigation were adjusted.

## Interaction and comparison history

1. Identified the 680px embedded-tool height cap as the source of the unused white area.
2. Replaced the cap with a full-height flexible track for the Literature Review step.
3. Verified the desktop product and parent track both render at 780px.
4. At mobile width, collapsed the conversation sidebar by default and retained it as an overlay when opened so the main product is not squeezed or clipped.
5. Compared the supplied empty-space reference with desktop and mobile implementation captures in the same review pass.
6. Confirmed no page-level horizontal overflow and no browser console errors or warnings.

## Verification

- Focused ESLint: no errors; two unchanged ScholarAsk warnings remain.
- TypeScript: passed.
- Automated tests: 37 / 37 passed.
- Temporary unauthenticated QA route removed after capture.

final result: passed

---

# Design QA — Stage 02 built-in Workspace

- Source visual truth path: `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-70bb2092-f53b-4127-a3c0-b716f20c7b63.png`
- Desktop implementation screenshot: `/tmp/cerise-workspace-embed-desktop.png`
- Viewport and state: `1440 × 900`, Stage 02 Literature Review, Workspace selected, no PDF open.
- Full-view comparison evidence: the supplied reference used the central Stage 02 surface for a custom literature-review worksheet. The implementation keeps the same full-height tabbed surface but replaces that worksheet with Cerise Scholar's real document workspace.
- Focused-region comparison evidence: the selected Workspace tab exposes the existing Documents panel, upload control, Code System, PDF toolbar and reader, and Highlights panel. The former search-scope, inclusion criteria, themes, gap, workflow rail, and synthesis note fields are absent.

## Findings

- No remaining P0, P1, or P2 issues.
- Typography: the embedded product retains its existing interface hierarchy; the tool tabs continue to use the established Stage 02 type treatment.
- Spacing and layout: the Workspace fills the flexible Stage 02 product track. At `1440 × 900`, document and viewport widths both measured `1440px`, with no page-level horizontal overflow.
- Colors and tokens: the established pale-blue research shell, white product surface, warm PDF canvas, neutral rules, and selected-tab underline are preserved.
- Image quality and assets: the existing research-path illustration and document workspace assets are reused without stretching or replacement.
- Copy and content: `Proposal Workspace` is shortened to `Workspace`; all other built-in product labels and controls remain native to the existing Workspace.

## Interaction and comparison history

1. The earlier implementation displayed a custom four-field literature worksheet in the Workspace tab, leaving the real document product elsewhere.
2. Replaced the worksheet with the existing PDF Workspace rather than recreating its UI.
3. Added in-place document selection and upload handling so opening a document does not leave the Stage 02 research path.
4. Switched from Workspace to ScholarAsk and back; both products remained inside the same Stage 02 surface and the selected tab updated correctly.
5. Compared the supplied reference and final implementation together at the same Stage 02 state.
6. Browser console error and warning logs were empty.

## Verification

- Focused ESLint: passed with five unchanged warnings (two in ScholarAsk and three in the PDF viewer).
- TypeScript: passed.
- Automated tests: 37 / 37 passed.
- Temporary unauthenticated QA route removed after capture.

final result: passed

---

# Design QA — Context-specific Stage 02 tools

- Source visual truth path: `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-eba5ebe8-258c-4062-963c-c34b46b99d02.png`
- Implementation screenshots:
  - `/tmp/cerise-stage2-literature-tabs-final.png`
  - `/tmp/cerise-stage2-roadmap-no-tool-tabs.png`
  - `/tmp/cerise-stage2-write-proposal-tabs-final.png`
- Viewport: `1440 × 900`.
- States: Stage 02 Literature Review, RQ Roadmaps, and Write Proposal.
- Full-view comparison evidence: the RQ Roadmaps screenshot now begins directly with the roadmap heading and editor; the unrelated built-in-product tab row shown in the source is absent.
- Focused-region comparison evidence: semantic tab checks found four tools in Literature Review (`Workspace`, `ScholarAsk`, `Lit Review`, `Evidence Library`), zero research-proposal tool tabs in RQ Roadmaps, and only `Paper Writer` in Write Proposal.

## Findings

- No remaining P0, P1, or P2 issues.
- Fonts and typography: unchanged; the remaining tab labels retain the established weight, scale, and active underline.
- Spacing and layout rhythm: removing the Roadmap tab row reclaims its full height for the roadmap editor. The direct canvas uses one flexible grid row and introduces no empty reserved track.
- Colors and visual tokens: unchanged; the pale-blue research shell, white canvas, neutral rules, and purple focused-step outline remain consistent.
- Image quality and assets: the existing research-path illustration remains unchanged and correctly scaled; no new assets were introduced.
- Copy and content: Literature Review no longer exposes `Paper Writer`; RQ Roadmaps exposes no built-in-product tabs; Write Proposal exposes only `Paper Writer`.

## Interaction and comparison history

1. The earlier RQ Roadmaps state displayed Workspace, ScholarAsk, Lit Review, Evidence Library, and Paper Writer above the roadmap editor.
2. Removed the complete tool tab row from RQ Roadmaps and changed the layout to a direct single-row roadmap canvas.
3. Scoped Literature Review to its four research/evidence tools and Write Proposal to Paper Writer alone.
4. Opened all three Stage 02 steps and verified their exact visible tab sets.
5. Confirmed `1440px` viewport and document widths match, with no page-level horizontal overflow.
6. Browser console error and warning logs were empty.

## Verification

- Focused ESLint: passed without warnings.
- TypeScript: passed.
- Automated tests: 37 / 37 passed.
- Temporary unauthenticated QA route and generated route cache removed after capture.

final result: passed

---

# Design QA — Literature Review hero

- Source visual truth paths:
  - Before: `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-56b05aa5-2460-453c-9589-9f285ffc6726.png`
  - Target: `/var/folders/z6/_4kzjccj7b536ckrs_zm57540000gn/T/codex-clipboard-0814934b-54a7-472e-b76f-9b6166bd66c1.png`
- Implementation screenshot: `/tmp/cerise-lit-review-hero-final.png`.
- Viewport: `1440 × 900`.
- State: Stage 02 Literature Review with the embedded Lit Review product selected and no saved entries.
- Full-view comparison evidence: the former standalone serif title is replaced by an Evidence Library-style hero above the existing filters and review table without changing the rest of the product layout.
- Focused-region comparison evidence: the rendered hero uses a gold `Workspace` eyebrow, a 26px/850-weight sans-serif title, and a 12.5px/600-weight muted subtitle—the same hierarchy, palette, and rhythm as the supplied Evidence Library target.

## Findings

- No remaining P0, P1, or P2 issues.
- Fonts and typography: the title now uses the existing DM Sans body family rather than the serif display family; eyebrow, title, and subtitle sizes and weights match the Evidence Library hero tokens.
- Spacing and layout rhythm: the hero uses the same 8px eyebrow gap, 10px title-to-subtitle gap, 16px lower padding, and bottom rule. The Export action remains aligned to the lower edge and stacks responsively below 860px.
- Colors and visual tokens: the eyebrow renders at `#a87f4f`, title at `#121212`, subtitle at `#625d56`, and rule at `#eee9e4`, matching the target component.
- Image quality and assets: neither reference contains imagery in the hero; no assets were introduced or altered.
- Copy and content: added `Workspace` and the supporting sentence `Review, organize, and synthesize evidence from your highlighted sources.` while preserving `Synthesized Literature Review`.

## Comparison history

1. The original hero consisted only of a large serif `Synthesized Literature Review` heading.
2. Rebuilt the hero with the Evidence Library typography and spacing pattern and added the requested gold `Workspace` eyebrow.
3. Compared the original, Evidence Library target, and final rendered Literature Review together.
4. Verified the exact computed typography/color values, matching viewport and document widths, and empty browser console.

## Verification

- Focused ESLint: passed without warnings.
- TypeScript: passed.
- Automated tests: 37 / 37 passed.
- Temporary unauthenticated QA route and generated route cache removed after capture.

final result: passed

---

# Current design QA status

The most recent change is the Literature Review hero documented above. Its Evidence Library-style hierarchy, responsive layout, overflow, console, type, lint, and automated-test checks passed. Older blocked entries are retained only as historical records for unrelated authenticated settings screens.

final result: passed
