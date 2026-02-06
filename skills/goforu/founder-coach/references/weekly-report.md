# Weekly Report Generation Guide

The Weekly Report is a synthesized reflection of the founder's growth, challenges, and mindset shifts over a 7-day period.

## Timing & Triggers

- **Automatic:** Every Sunday at 10 PM (via cron).
- **Manual:** Triggered when the user asks for a "weekly summary", "how was my week", or "generate report".

## Data Sources

1. **Daily Journals:** `skills/phoenixclaw/Journal/daily/YYYY-MM-DD.md` files for the week.
2. **Founder Profile:** `skills/founder-coach/references/profile-evolution.md` and the user's `profile.md`.
3. **Challenges:** Active and completed challenges in `weekly-challenge.md`.
4. **Session Logs:** Recent conversations for high-fidelity context.

## Content Structure

### 1. Weekly Executive Summary

A 2-3 sentence overview of the week's "vibe", primary focus, and major emotional/intellectual breakthroughs.

### 2. Mental Model Progress (Three-Tier System)

Track the founder's adoption of core frameworks (e.g., 4Ps, nfx models, PMF levels).

- **Novice:** Concept introduced, starting to recognize patterns.
- **Practitioner:** Applying the model to real decisions, though sometimes inconsistently.
- **Master:** Automatic application, internalizing the framework as a default lens.

### 3. Anti-Pattern & Low-Level Thinking Observations

Identify recurring "traps" observed during the week:

- Comfort zone seeking
- Priority chaos
- Fear-driven decision making
- Founder's Trap (doing rather than leading)

### 4. Challenge Completion Status

- Review goals set in the previous week or at the start of the current week.
- Categorize as: Completed, In Progress, or Stalled.
- Include a "Coach's Note" on why a challenge might have stalled.

### 5. PMF Stage Observations

Note any shifts in the founder's understanding of their Product-Market Fit.

- Level 0: Idea/Delusion
- Level 1: Problem-Solution Fit
- Level 2: Language-Market Fit
- Level 3: Product-Market Fit (Initial)

### 6. Strategy for Next Week

3 actionable suggestions to improve focus, mitigate anti-patterns, or advance a specific mental model.

## Implementation Workflow

1. **Aggregate:** Collect all daily journal data and session highlights for the week.
2. **Analyze:** Run the "Growth Lens" prompt to identify patterns that weren't obvious in daily logs.
3. **Template:** Use `assets/weekly-report-template.md` to format the output.
4. **Link:** Ensure bidirectional links to daily journals and specific mental model docs.
