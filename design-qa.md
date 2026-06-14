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
