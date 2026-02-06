# Session Context Assembly Template

This template shows how the system prompt is assembled for each therapy interaction. The runtime system fills in the variables from the SQLite database.

## Assembled Prompt Structure

```
[BASE THERAPIST PROMPT]
(from base-therapist.md — always included)

[CRISIS LAYER]
(from crisis-layer.md — always included)

[SESSION CONTEXT — below]
```

## Session Context Block

```
## Current Session Context

### Client Profile
- Name: {client_name}
- Sessions completed: {session_count}
- Therapy start date: {start_date}
- Primary presenting concern: {primary_concern}
- Identified disorder pattern: {disorder_pattern} (e.g., "GAD with comorbid mild depression")
- Current severity: {current_severity} (based on most recent assessment)

### Most Recent Assessment Scores
- GAD-7: {gad7_score}/21 ({gad7_severity}) — {gad7_date}
- PHQ-9: {phq9_score}/27 ({phq9_severity}) — {phq9_date}
- DASS-21: Depression {dass_d}/42, Anxiety {dass_a}/42, Stress {dass_s}/42 — {dass_date}
- Mood trend (last 5 sessions): {mood_trend} (e.g., "7, 6, 5, 6, 4 — improving")

### Previous Session Summary
- Date: {last_session_date}
- Type: {last_session_type}
- Key themes: {last_session_themes}
- Technique used: {last_technique}
- Insight gained: {last_insight}
- Homework assigned: {last_homework}
- Homework status: {homework_status}

### Identified Triggers
{triggers_list}
(e.g., "- Work deadlines (frequency: high, first identified: session 3)
        - Conflict with family (frequency: moderate, first identified: session 1)
        - Uncertainty about posting (frequency: high, first identified: intake)")

### Identified Thought Patterns
{thought_patterns}
(e.g., "- Catastrophizing about work performance (recurring since session 2)
        - Should statements about being a 'perfect' officer
        - All-or-nothing thinking about career success")

### Effective Coping Strategies
{coping_strategies}
(e.g., "- Deep breathing (effectiveness: 7/10, used 12 times)
        - Thought records (effectiveness: 8/10, used 5 times)
        - 5-4-3-2-1 grounding (effectiveness: 6/10, used 3 times)")

### Current Homework
- Task: {current_homework}
- Assigned: {homework_date}
- Due: {homework_due}

### Assessment Schedule
- GAD-7 due: {gad7_due} (weekly)
- PHQ-9 due: {phq9_due} (bi-weekly)
- DASS-21 due: {dass21_due} (monthly)

### Session Directives
- Session type: {session_type} (intake / regular / check-in / assessment-focused)
- Assessments to administer this session: {assessments_due}
- Follow up on: {follow_up_items}
```

## Notes on Context Assembly

1. **First session (intake):** Most fields will be empty. The prompt should include: "This is the first session. Conduct intake assessment."
2. **Context window management:** If history is long, summarize older sessions. Keep last 3 sessions in detail.
3. **Assessment triggers:** If a scheduled assessment is due, add: "Administer {instrument} during this session's check-in phase."
4. **Crisis history:** If any previous crisis events exist, flag: "Client has history of {crisis_type} on {crisis_date}. Monitor closely."
5. **Progress notes:** Include trajectory direction: "Client is improving / stable / declining based on last 4 assessment scores."
