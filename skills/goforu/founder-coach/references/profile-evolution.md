---
created: 2026-02-02
updated: 2026-02-02
version: 1.0.0
---

# Founder Profile Evolution

The Founder Profile is a specialized expansion of the PhoenixClaw profile system, tailored for the unique journey of a startup founder. It tracks not just personality, but the evolution of a founder's mental models and the objective progress toward Product-Market Fit (PMF).

## Profile Location

The primary profile file is located at: `~/PhoenixClaw/Startup/founder-profile.md`

## Relationship to PhoenixClaw Core Profile

The Founder Profile is **not** a replacement for the core PhoenixClaw profile. It stores **founder-specific** growth data only.

- **Core Profile**: General personality patterns, life themes, and non-founder growth signals.
- **Founder Profile**: Mental models progress, PMF tracking, weekly challenges, founder anti-patterns.

**Avoid duplication**: If information already exists in the core profile, reference it rather than copying it into the founder profile.

## Dual-Track PMF Tracking

Founder Coach uses a dual-track system to assess PMF progress, acknowledging the gap between a founder's optimism and objective reality.

1. **Self-Assessment**: What the founder explicitly states about their progress, traction, and confidence.
2. **AI Observation**: Objective patterns detected in conversations (e.g., mention of churn, customer feedback, metric growth, or pivoting signals).

### PMF Stages

- **Ideation**: Validating the problem.
- **Minimum Viable Product (MVP)**: Testing the solution.
- **Initial Traction**: Early signs of repeatable growth.
- **Scaling**: Optimizing a working engine.

## Mental Models Progress

Tracks the founder's adoption of high-leverage thinking frameworks.

| Level          | Description                                                           |
| :------------- | :-------------------------------------------------------------------- |
| **Beginner**   | Knows the concept, can define it, but hasn't applied it.              |
| **Practicing** | Actively attempting to use the model in decisions (observed in logs). |
| **Mastered**   | The model has become a default cognitive tool; used intuitively.      |

## Append-Only Update Rules

To maintain a record of growth and changes in strategy, the profile follows a strict append-only rule for historical sections.

- **Rule**: Never overwrite or delete previous observations or challenge history.
- **Action**: Add new insights as new entries with timestamps.
- **Integrity**: Historical PMF assessments must remain to visualize the "Founder's Journey."

## The Sacred user_notes Section

The `user_notes` section is for the founder's manual input and is **off-limits** to AI modification.

1. **AI Respect**: If a founder writes "I am pivoting to enterprise" in `user_notes`, the AI must update its context immediately.
2. **Separation**: Insights derived from AI analysis must be kept in the `ai_observations` or `growth_logs` sections.
3. **Synthesis**: AI may suggest updates to the founder based on observations, but never edits the `user_notes` directly.

## Confidence Levels

Following the PhoenixClaw standard:

- **Low**: Single mention or short-term focus.
- **Medium**: 3+ mentions over 14 days; consistent pattern.
- **High**: Sustained behavior or mindset shift over 30+ days.
