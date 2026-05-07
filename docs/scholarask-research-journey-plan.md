# ScholarAsk Research Journey Plan

## Goal

ScholarAsk should support two intentional answer modes:

1. Research Answer
2. Research Journey

Research Answer keeps the current behavior: answer the student's question with OpenAlex-grounded sources, citations, limitations, and follow-up questions.

Research Journey is a higher-support mentor mode. It should help students who are not only asking for an answer, but trying to shape a research idea, find academic language, connect sources, and decide what to do next.

The first implementation should add the mode concept safely without changing database structure or saving new journey data yet.

## Product Principle

ScholarAsk should not decide the student's research direction for them. It should diagnose the student's research state, explain the available paths, and help them choose a strategy that fits their own struggle.

The tone should feel like a serious research mentor:

- precise enough for advanced academic work
- warm enough for a student who may feel stuck
- evidence-grounded, not motivational filler
- clear about what the literature can and cannot support
- careful not to make research-state judgments feel like personal judgments
- written in calm professor prose, not dash-heavy AI-style phrasing

## Educational Basis

The Research Journey mode should be based on established research-learning and information-literacy models:

- Kuhlthau Information Search Process: students move through uncertainty, exploration, focus formation, collection, and presentation.
- ACRL Framework for Information Literacy: research is inquiry, searching is strategic exploration, and scholarship is conversation.
- Scaffolding and Zone of Proximal Development: support should match the learner's current difficulty and help them become more independent.
- Cognitive Apprenticeship: expert work should be modeled through coaching, scaffolding, articulation, reflection, and exploration.
- Self-Regulated Learning: students benefit from support in recognizing goals, confusion, confidence, strategy, and next steps.
- Toulmin Argument Model: academic claims need evidence, warrants, qualifiers, limitations, and possible rebuttals.

These models should guide the response structure, but the UI should not expose the student to heavy theory names unless useful.

## Mode Definitions

### Research Answer

Use when the student wants a normal research answer, clarification, or source-backed explanation.

Expected output:

- Summary Answer
- Key Mechanisms
- Evidence Map
- What the Evidence Suggests
- Limitations and Gaps
- Confidence
- Follow-up Questions

This is the current ScholarAsk direction.

### Research Journey

Use when the student wants the question to become part of their research exploration.

Expected output:

- Research Readiness
- Literature Fit
- Research State Diagnosis
- Support Opportunities
- Direct Answer
- Concept Bridge
- Evidence Map
- Research Strategy
- Possible Research Pathways
- Limitations and Gaps
- Next Best Step
- Reflective Question

Research Journey answers should identify the student's likely blockage before recommending a strategy.
In live use, this mode should stay concise enough to complete reliably on the hosted backend: around 650-850 words, fewer prompt sources than a broad literature-review pass, and no extra source retrieval beyond the standard ScholarAsk search path.

## Research Journey Intents

Research Journey has four backend intents:

- `general_journey`: the student selects Research Journey and types normally. ScholarAsk should diagnose the student's research state and choose the best-fit mentor path.
- `find_bridge`: the student is looking for support connecting a real idea to academic concepts, adjacent literature, theories, search terms, and a strategy for source scarcity.
- `narrow_question`: the student has a rough idea. ScholarAsk should let them explain it briefly, then translate it into researchable pathways, possible variables, scope choices, and 2-3 question options.
- `map_evidence`: the student already has a topic and wants to know what the literature suggests. ScholarAsk should separate direct evidence, indirect evidence, gaps, and confidence.

The starter buttons should send these hidden intents to the backend. They should not rely only on prefilling text.

## Research Readiness

Use Research Readiness as a gentle mentor diagnostic, not a grade:

- Early-stage: promising idea, with room to clarify terms or scope.
- Developing-stage: This is a clear, arguable claim with identifiable constructs, and there is room to improve how the intuitive framework is translated into precise academic language and testable relationships.
- Strong-stage: researchable question with searchable concepts and a supportable path.

Avoid score-like quality labels. The readiness level should feel like orientation, not judgment.

## Literature Fit

Use Literature Fit to explain source availability:

- Direct: sources likely discuss the exact relationship.
- Adjacent: sources exist under nearby terms or related fields.
- Emerging: few direct sources; use a careful bridge strategy.

When direct sources are scarce, use this wording when appropriate:

"This may be an emerging question, so the strongest strategy is to build a careful bridge from nearby studies."

## Research State Diagnosis

The model should infer the student's current research state:

- broad exploration
- narrowing a topic
- turning an idea into a research question
- finding source language
- connecting sources into an argument
- checking whether evidence supports a claim
- looking for theories or methods
- feeling overwhelmed and needing a smaller next step

This diagnosis should be short and practical. It should not label the student in a negative way.

## Support Opportunities

Research Journey should classify the main support need as one or two of the following:

- Vocabulary support: the idea is valid, but the literature uses different terms.
- Scope support: there is room to clarify the topic's boundaries, population, variables, or level of focus.
- Evidence support: direct sources are limited, so adjacent literature is needed.
- Theory support: the project could be strengthened by a conceptual framework.
- Method support: the project could be strengthened by clearer variables or study-design options.
- Argument support: the student has sources but cannot connect them into a claim.
- Confidence support: the student is unsure whether the idea is academically legitimate.

The answer should then choose a strategy that matches the support need.

Use soft diagnostic language. Prefer phrases like "there is room to...", "this could be strengthened by...", and "a helpful next support is..." instead of corrective language like "you need help" or "this idea needs...".
In Research Readiness, prefer observation-style sentences such as "This is..." instead of directly evaluating the student with "You have...".
When evaluating readiness, evidence fit, gaps, or limitations, prefer "this question", "this idea", "this project", or "this research path". Avoid possessive wording that makes the evaluation feel personal. Use "you" mainly for agency and choice.
Outside the Reflective Question section, prefer "this framework", "this research question", "this project", and "the argument" when referring to the work itself.
Do not write "your intuition", "your work", "your framework", "your proposed", "your argument", "your research question", "your question", or "your idea". Use "this intuition", "this project", "this framework", "the proposed relationship", "the argument", "this research question", "this question", or "this idea" instead.
Avoid "the mechanism you describe" in evidence sections. Prefer "the described mechanism" or "this mechanism".

## Research Strategy Rules

The Research Strategy section should give guidance that is specific to the student's question:

Use exactly three bullets:

- **Search phrases:** better keywords, academic synonyms, and what to avoid searching.
- **Theory anchors:** related theories or conceptual frameworks.
- **Source strategy and safest claim:** source types to look for, how to bridge indirect evidence, and what kind of claim is safest.

The strategy should not imply there is only one correct path.

## Student Agency Rules

ScholarAsk should preserve the student's ownership of the research journey.

Use language like:

- "A strong path would be..."
- "If your goal is X, use this route..."
- "If you care more about Y, another route is..."
- "This does not prove the idea yet, but it gives the project a defensible bridge..."
- "This may be an emerging question, so the strongest strategy is to build a careful bridge from nearby studies."

When evaluating readiness, evidence fit, gaps, or limitations, use depersonalized language:

- "this question"
- "this idea"
- "this project"
- "this research path"
- "this claim"

Use direct "you" language mainly for agency, choice, and encouragement:

- "if you want to explore..."
- "you could choose..."
- "which path feels most aligned..."

For pathway formatting, avoid markdown numbered lists because rendering can restart at `1.` in nested content. Use fixed labels instead:

- **Path 1:**
- **Path 2:**
- **Path 3:**

Each path should include one research question and one separate sentence beginning "This path fits if...".

Avoid language that:

- takes ownership of the student's thesis
- implies there is only one correct topic
- turns evidence scarcity into a judgment of the student's idea
- sounds like a grade instead of guidance
- makes the student feel personally judged by using possessive wording for an evaluation

## Concept Bridge Formatting

Avoid arrow notation because it feels technical and visually harsh in the student-facing answer.

Use this format instead:

- **Original phrase:** "emotionally heavier" **Academic language:** task aversiveness **Why it matters:** it names the subjective cost that can make starting feel harder.

## Dash And Punctuation Style

Avoid em dashes in ScholarAsk answers because they can make the writing feel generated rather than mentored.

Prefer:

- short complete sentences
- colons for labels
- semicolons only when they improve readability
- separate follow-up sentences beginning with "This path fits if..."

Avoid:

- em dash attachments
- repeated dash-based transitions
- technical arrows

## UI Placement

Future implementation should place the mode control beside the input, not in the quick-start suggestion links.

First question:

- show mode control inside the main input card
- options: Research Answer and Research Journey

Follow-up questions:

- show the same mode control in the bottom follow-up input
- default to the last selected mode for the current conversation
- allow the student to switch modes message by message

Starter prompts:

- replace generic quick-start links with "Find the bridge", "Narrow my question", and "Map the evidence"
- each starter should prefill the input, switch to Research Journey, set the matching hidden intent, focus the input, and wait for the student to press send
- do not auto-submit starter prompts

Suggested later enhancement:

- add a small "Save as journey point" action after an answer
- do not add persistence in the first implementation
- consider a smaller advanced option called "More sources" or "Source depth" if students need manual control over search breadth later

## Future Code Path

Smallest safe implementation path:

- UI state: add `answerMode: "research_answer" | "research_journey"` in `src/app/dashboard/project/[projectId]/scholar-ask/page.tsx`.
- UI control: place the selector in the first input card and bottom follow-up input.
- Fetch body: include `answerMode` in the `/api/research` request body.
- API parsing: validate `answerMode` in `src/app/api/research/route.ts`, defaulting to `"research_answer"` for backward compatibility.
- Prompt branch: choose the current prompt for `"research_answer"` and a new mentor-diagnosis prompt for `"research_journey"`.
- Generation sizing: only increase `numPredict` if needed after testing. Do not increase source retrieval at first unless the journey mode quality requires it.

## Non-Goals For The First Implementation

Do not add these in the first implementation:

- database schema changes
- saved journey timeline
- automatic mode switching without user control
- new paid services
- additional OpenAlex calls beyond the current search path
- a visible "Deep research" toggle beside the answer-mode selector
- changes to PDF AI, OCR, TTS, CeriseCoach, or paper writer

## Safety Criteria

The first implementation should be safe if:

- Research Answer output remains unchanged unless the user chooses Research Journey.
- Existing conversations still render.
- Existing follow-up behavior still works.
- The API defaults to Research Answer if `answerMode` is missing.
- The UI remains usable on full screen, half screen, and mobile width.
- Azure build passes before deployment.
- One broad journey question and one simple research-answer question are tested before merge.

## Acceptance Criteria For Step 1

Step 1 is complete when:

- the two modes are defined
- the Research Journey response structure is documented
- the educational/research basis is documented
- the future implementation path is documented
- no live ScholarAsk behavior has changed yet
