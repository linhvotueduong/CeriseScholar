# Cerise Scholar - Dashboard Master Functional Spec v2

> **In-repo copy.** Source of truth for dashboard functionality, copied verbatim from `~/Downloads/Cerise_Dashboard_Master_Functional_Spec_v2.md` on 2026-06-16. Diagrams/visuals live only in the companion PDF (`~/Downloads/Cerise_Dashboard_Master_Functional_Spec_v2.pdf`). The buildable translation of this spec into TypeScript types, source-data shape, Supabase fields, and phased tasks is in `docs/dashboard-technical-appendix.md`. Plain-language card meanings are in `docs/dashboard-metric-contract.md`.

Status: buildable v2. This document combines the original dashboard workflow, Claude engineering review, and added production rules. Use the PDF version for diagrams/images and this Markdown version for Codex copy/paste.

## Three rules
1. Database + formulas = truth. AI = interpretation, tagging, and wording. UI = display only.
2. AI never produces final dashboard numbers. It returns structured signals that formulas can count.
3. Every card has `dataState: real | empty | demo | upcoming | stale | error`. Demo values never write to persisted state.

## Formula taxonomy
- Measurement formula: raw counts/ratios from data, such as `rowsWithCitations / totalRows`.
- Metric formula: weighted score or ranking, such as `sectionProgress01`, `projectProgress01`, `bottleneckScore`.
- AI signal: stored classifications such as `themeTags`, `methodLabels`, `weakRows`, `uncitedClaims`.
- UI display formula: percent, ring, badge, empty/upcoming/stale/error message.

## Acyclic evaluation order
1. Project facts + settings
2. Section progress
3. projectProgress01
4. Research health scores
5. Research Focus / bottleneck
6. Today's Schedule
7. Today's Target
8. Activity Log
9. Greeting + Continue Learning

## Keystone formula
```ts
function projectProgress01(sectionProgress, type, applicability): Score01 {
  const weights = PROJECT_PROGRESS_WEIGHTS[type];
  const active = Object.entries(weights).filter(([id]) => applicability[id] !== false);
  const weightSum = active.reduce((sum, [, w]) => sum + w, 0);
  if (weightSum === 0) return 0;
  return active.reduce((sum, [id, w]) => sum + (sectionProgress[id] ?? 0) * (w / weightSum), 0);
}
```

## Card specs

### Greeting + Daily Guidance
Purpose: Top orientation sentence: welcome the user, state where the active project stands, and name the smartest move today. It is computed last so it can summarize the real snapshot.

Data used:
- user profile and timezone
- active project and pinned/auto current section
- today target status
- research focus bottleneck
- today schedule tasks
- recent meaningful activity
- deadline and pace pressure

Measurement formulas:
- localHour in user timezone
- displayName fallback chain
- strongest bottleneck label from Research Focus
- repeated action that does not resolve bottleneck

Metric formulas:
- projectStateScore = currentSectionImportance*.25 + bottleneckUrgency*.30 + deadlinePressure*.15 + recentActivitySignal*.15 + todayScheduleRelevance*.15
- dailyMove = highestValueActionFromTodaySchedule ?? nextStepFromResearchFocus ?? activeSectionBottleneckAction

AI role: AI writes one short sentence from structured input. It does not choose the state. If snapshot confidence is below 0.60, use deterministic fallback text.

State contract: `CardState<{ line1, line2, bestMove, avoidMove?, confidence }>`

Interactions:
- No active project -> ask user to choose/create a project.
- Behind pace -> mention scheduled evidence tasks first.
- On track -> mention next synthesis step.

Tests:
- AI failure still renders deterministic greeting.
- Greeting never contains random motivation without project data.

### Current Project
Purpose: Context selector. It tells the user which project every other dashboard card is currently about.

Data used:
- projects
- dashboard_activity_events
- dashboard_project_settings
- section progress snapshot
- user pinned current section override

Measurement formulas:
- last meaningful activity timestamp, excluding page refreshes
- activeStage from recent activity + user-selected section + strongest gap
- phase badge from progress/stage or user pin

Metric formulas:
- badge/current section should be hybrid: auto-infer by default, user can pin or override. Last activity uses newest meaningful event, not dashboard_loaded.

AI role: AI is not required. AI may phrase a readable phase label later, but formula/pin decides the selected project context.

State contract: `CardState<{ projectId, projectName, phaseBadge, currentSection, lastActivityAt, isPinned }>`

Interactions:
- Dropdown switch reloads the entire DashboardSnapshot.
- + New project routes to /projects.
- Open Research Desk routes to /research-desk.

Tests:
- Switching project updates every card.
- Last activity ignores project_opened/page_viewed.

### Today's Target
Purpose: Daily pacing controller. It answers how much progress should happen today, what is done, what remains, and whether the deadline is realistic.

Data used:
- projectProgress01
- project targets
- project start date/deadline
- pace
- work_weekdays and skipped_dates
- daily work goal
- today schedule tasks and completed statuses
- manual override for selected date

Measurement formulas:
- activeDaysBetween using timezone-local dates
- remainingProjectPercent = 100 - projectProgressPercent
- completedTaskWeight from tasks that count toward daily target

Metric formulas:
- paceMultiplier: low 1.0, moderate 0.9, high 0.8
- dailyTarget = clamp(ceil(remaining/daysLeftAtPace), min 1, max by pace)
- deadlineAchievable = rawDailyTarget <= maxDailyTargetByPace[pace]
- ringProgress = doneTodayFloat / finalDailyTarget

AI role: AI does not set percent. AI may phrase warnings like Deadline at risk after formulas set status.

State contract: `CardState<TodayTargetState> with dailyTargetPercent, doneTodayPercent, remainingTodayPercent, ringProgress, deadlineAchievable, status.`

Interactions:
- Three-dot settings opens pace/deadline/workday/manual target controls.
- Manual target override applies only to one date.
- Project complete -> daily target 0, ring 100%, status Project complete.

Tests:
- Past expected finish date has no NaN/Infinity.
- Impossible deadline shows Deadline at risk, not calm capped target.
- All four counting tasks complete closes ring exactly.

```ts
if (projectProgress01 >= 1) return projectCompleteTarget();
const daysLeft = Math.max(1, activeDaysBetween(today, expectedFinishDate, workWeekdays, skippedDates));
const rawDailyTarget = remainingProjectPercent / daysLeft;
const dailyTarget = Math.min(Math.ceil(rawDailyTarget), maxDailyTargetByPace[pace]);
const deadlineAchievable = rawDailyTarget <= maxDailyTargetByPace[pace];
```

### Today's Plan + Today's Schedule
Purpose: Operational planner. Today Plan selects the date; Today Schedule shows exactly four AI-recommended research tasks plus optional manual tasks.

Data used:
- selectedDate
- visibleMonth
- project progress
- research focus blocker
- health scores
- deadline/pace
- daily work goal
- previous task history
- activity cursor from previous snapshot
- manual tasks

Measurement formulas:
- calendar day flags: isToday, isSelected, hasTasks, hasCheckpoint
- recent task completion/skip/reschedule rates
- available work windows and default times

Metric formulas:
- recommendationScore = stageNeed*.30 + deadlineNeed*.20 + healthNeed*.20 + userMomentum*.15 + effortFit*.10 + varietyBalance*.05
- taskScore = blockerScore*.35 + deadlineUrgency*.25 + stageRelevance*.25 + effortFit*.15
- taskWeight = taskScore / sum(taskScores); four recommended task weights sum to 1.0
- pace changes intensity, not count

AI role: AI can phrase task titles/subtitles after the candidate and weight are chosen. It must reuse persisted recommendation runs when input_hash is unchanged.

State contract: `CardState<{ selectedDate, calendarDays, recommendedTasks[4], manualTasks, deviceLaneTasks }>`

Interactions:
- Add task/checkpoint opens quick-create modal.
- Open full schedule routes to /schedule.
- Manual task defaults countsTowardDailyTarget=false unless user opts in.

Tests:
- Pace Low -> High keeps exactly four tasks.
- Refresh twice with same input_hash reuses same tasks.
- Non-workday shows No target scheduled unless user manually requests tasks.

### Activity Log
Purpose: Research memory trail. Shows the most recent meaningful work in the active project, not generic notifications or fake marketing activity.

Data used:
- dashboard_activity_events
- active user/project
- event type
- entity id
- section id
- safe label
- created_at
- display dedupe key

Measurement formulas:
- ageHours from parsed ISO timestamps
- meaningful event filter excludes dashboard_loaded/page_viewed/research_focus_opened
- display dedupe collapses repeated rows within a 30 minute bucket

Metric formulas:
- activityScore = recencyScore*.50 + importanceScore*.30 + projectStageRelevance*.20
- recencyScore = max(0, 1 - ageHours/48)
- display top 4 after filtering/scoring/dedupe

AI role: AI is not needed. AI should not rewrite private source text into the compact activity rows.

State contract: `CardState<{ items: ActivityLogItem[], emptyState? }>`

Interactions:
- Task completed logs dashboard_task_completed.
- Source saved from ScholarAsk logs scholarask_source_saved.
- Activity cursor feeds schedule recommendations on the next snapshot only.

Tests:
- Double-save creates one server event via idempotency key.
- Private PDF quotes never appear in compact log.
- Only safe user-visible titles appear.

### Local Setup
Purpose: Device-scoped readiness card for laptop-first private/local workflows. It is not a productivity metric.

Data used:
- local agent health/version/status
- Ollama status and selected model
- project folder permission state
- trusted origin/security checks
- device_id
- last_checked_at

Measurement formulas:
- readyCount = count(agentReady, ollamaReady, folderConnected, safetyChecked)
- readyPercent = readyCount / 4
- dependency: if !agentReady, downstream local checks are false

Metric formulas:
- agentReady = reachable && versionSupported
- ollamaReady = agentReady && ollamaInstalled && selectedModelAvailable && modelHealthOk
- folderConnected = agentReady && activeProjectHasFolder && permissionGranted && pathStillAvailable
- safetyChecked = agentReady && originAllowed && sessionTokenValid && folderScopeValid && trustCheckPassed

AI role: AI is not required. Local AI workflows can be disabled if local setup is incomplete.

State contract: `CardState<LocalSetupState> with readyCount, readyPercent, checks, display values, deviceScoped=true, lastCheckedAt.`

Interactions:
- Setup issues appear in a separate device lane, not by replacing the four research tasks.
- Full local setup modal can show redacted status and repair actions.

Tests:
- Agent offline -> card shows 0/4 but dashboard still renders.
- Second device changes only device lane, not project research plan.
- Full local paths are never synced or displayed.

### Research Sections + Section Details
Purpose: Project map. Left side shows major research areas and readiness; right side explains the selected section, bottleneck, and next action.

Data used:
- evidence library
- literature rows
- workspace notes/highlights
- meta-analysis setup fields
- draft sections and evidence links
- citation metadata
- AI-derived quality signals stored as structured rows

Measurement formulas:
- SectionCheck values in 0-1
- weighted progress for each applicable section
- downstream blocking graph from check.blocks
- at-a-glance counts per section

Metric formulas:
- sectionProgress01 = sum(weight * value) / sum(weights)
- bottleneckScore = gapSeverity*.30 + sectionWeight*.20 + downstreamBlocking*.25 + deadlinePressure*.10 + actionability*.10 + userMomentumFit*.05
- nextStepScore = resolvesBottleneck*.35 + progressUnlocked*.20 + effortFit*.15 + paceFit*.10 + userSkillFit*.10 + scheduleFitPrior*.10

AI role: AI may identify missing themes, weak rows, and uncited claims, but formulas decide progress and bottleneck ranking.

State contract: `CardState<{ selectedSection, sectionProgress, atAGlance, bottleneck, nextStep, route }>`

Interactions:
- Clicking a section updates details in place.
- Open section routes to the correct workspace and preselects missing work.

Tests:
- Optional/not-applicable sections are excluded from global project progress.
- Meta-analysis can be 0% without blocking a non-meta project if marked not_applicable.

### Research Focus
Purpose: Best-next-move card. Summarizes research health, chooses the useful blocker, and turns it into one clickable action.

Data used:
- research health snapshots
- section progress
- active stage
- nearest milestone
- pace pressure
- knowledge level signals
- project health risks

Measurement formulas:
- evidenceBalanceScore, citationCoverageScore, themeClarityScore, draftReadinessScore from 0-1 inputs
- knowledgeLevelScore from normalized behavior signals
- risk item counts and estimated item minutes

Metric formulas:
- focusPriority = urgency*.20 + weakestHealthMetric*.40 + projectStageNeed*.30 + userMomentum*.10
- watchPoint riskScore = impactOnProgress*.45 + easeToFix*.25 + urgency*.20 + relationToPriorTasks*.10
- estimated range = round(est*.85) to round(est*1.15)

AI role: AI phrases recommendation text after formula chooses the metric and action. Research Focus must not read todayScheduleFit; that back-edge is removed.

State contract: `CardState<{ recommendation, healthRows, watchPoint, estimatedMinutesRange, startNextMoveRoute }>`

Interactions:
- Start next move opens the exact workspace with relevant rows/sources preselected.
- Logs research_focus_opened as low-value event not shown in Activity Log.

Tests:
- Weak citation coverage changes focus to citation linking.
- AI failure still leaves formula-derived health rows visible.
- No circular dependency with Schedule.

### Continue Learning
Purpose: Project-aware learning card. It should recommend the lesson that helps the active project, not generic course progress.

Data used:
- courses, modules, lessons
- user_course_progress
- user_lesson_progress
- learning_notes
- active project stage
- Research Focus weak areas
- courseStatus

Measurement formulas:
- modulesCompleted count
- lessonsDone count
- notesCreated count
- lessonsRemaining count
- completedLessonWeight / totalLessonWeight

Metric formulas:
- currentLesson = inProgress ?? nextIncomplete ?? bestRecommendedForProject ?? firstStarterLesson
- lessonRecommendationScore = projectStageFit*.30 + researchGapFit*.25 + userSkillFit*.20 + courseContinuity*.15 + deadlineUsefulness*.10
- paceDelta = courseProgressPercent - expectedProgressToday when course has a target date

AI role: AI recommends useful learning based on project gaps; it does not fabricate module/lesson stats.

State contract: `CardState<{ courseStatus, currentLesson, modulesCompleted, lessonsDone, notesCreated, lessonsRemaining, progressPercent, pace }>`

Interactions:
- If courseStatus is not published, show Upcoming lesson and hide progress.
- Resume opens Course Library lesson and restores last position.
- View notes opens only this user's notes.

Tests:
- Unpublished course does not show fake progress.
- 0% progress cannot show On pace forever unless upcoming/no course deadline state is explicit.

### Cerise Support
Purpose: Support routing card. It is not a metric card; it gives the user a clear path for account, product, or research-process help.

Data used:
- route availability
- user auth state
- optional support context from current project/page

Measurement formulas:
- No scoring required. Track clicks as support_requested or help_center_opened events if needed.

Metric formulas:
- N/A - this card is mostly routing. It can use dataState only for link availability.

AI role: AI is not needed. Support text should be short and stable.

State contract: `CardState<{ requestSupportRoute, helpCenterRoute, currentContext? }>`

Interactions:
- Request support routes to Contact Us form.
- Open Help Center routes to Help Center.

Tests:
- Routes work.
- No project data required.

## Implementation order
1. Data foundation
2. Deterministic metrics
3. DashboardSnapshot engine
4. Target + Schedule
5. Cards connect to snapshot
6. AI cached signals and wording
7. Continue Learning published/upcoming state

## Acceptance tests
- New user with no project -> honest empty states.
- New project with no data -> four foundation tasks.
- Complete two tasks -> target ring updates and activity logs.
- Pace change -> four tasks stay four tasks, intensity updates.
- Local Agent offline -> dashboard does not crash.
- AI fails -> formula numbers still render.
- Course unpublished -> Continue Learning upcoming state, no fake progress.
- Impossible deadline -> Deadline at risk, not calm capped target.
