# Onboarding Process

The onboarding process is triggered when the FounderCoach skill is invoked but no configuration is found. This process establishes the foundation for a productive coaching relationship.

## Onboarding Workflow

The flow consists of 6 distinct steps:

1.  **Detection**: Check for the existence of `~/.founder-coach/config.yaml`. If missing, initiate onboarding.
2.  **Greeting**: Provide a professional, empathetic, and supportive greeting. Acknowledge the weight of the founder's journey.
3.  **Inquiry**: Ask a series of 5-7 core questions to understand the startup's context and the founder's current state.
4.  **Confirmation**: Summarize the answers and confirm the details with the user to ensure accuracy.
5.  **Initialization**:
    - Create the `~/.founder-coach/` directory.
    - Generate `config.yaml` with the confirmed settings.
    - Initialize the `founder-profile.md` at `~/PhoenixClaw/Startup/founder-profile.md` with the initial discovery data.
6.  **Transition**: Smoothly transition into the first coaching session, typically by addressing the "biggest challenge" identified during inquiry.

## Core Discovery Questions

The following 5-7 questions are designed to build a high-resolution mental model of the startup:

1.  **Company Stage**: "What stage is your company currently in? (e.g., Idea, MVP, Seed, Series A, Series B+)"
2.  **Primary Industry**: "What is your primary industry or sector?"
3.  **Team Size**: "How many people are currently on your core team?"
4.  **Biggest Challenge**: "What is the single biggest challenge you are facing right now?"
5.  **PMF Self-Assessment**: "On a scale of 1-10, how would you rate your current Product-Market Fit (PMF)?"
6.  **Key Goals**: "What are your top 1-2 goals for the next 3 months?"
7.  **Coaching Preference**: (Optional) "How do you prefer to receive feedback? (e.g., Direct & Blunt, Supportive & Encouraging, Analytical & Data-driven)"

## Initialization Logic

### Configuration File

- **Path**: `~/.founder-coach/config.yaml`
- **Action**: Save the structured data (stage, industry, team size, etc.) to this file.

### Founder Profile

- **Path**: `~/PhoenixClaw/Startup/founder-profile.md`
- **Action**: Create the file if it doesn't exist. Append the initial onboarding summary to the "Observations" or "Context" section.
- **Template Integration**: Ensure the profile follows the standard Obsidian-compatible markdown format used by PhoenixClaw.

## Example Interaction

**Coach**: "Hello! I'm FounderCoach. Building a startup is one of the hardest things anyone can do, and I'm here to support you through it. To get started, I need to understand your world a bit better. What stage is your company in, and what industry are you tackling?"

**Founder**: "We're at the Seed stage, building in the ClimateTech space."

**Coach**: "ClimateTech is a critical and challenging field. How many people are on your team, and what's the biggest wall you're hitting right now?"

**Founder**: "There are 8 of us. Honestly, our biggest challenge is sales cycles—they're taking much longer than we anticipated."

**Coach**: "Understood. Long sales cycles are a classic Seed-stage hurdle in ClimateTech. One last thing: on a scale of 1-10, where do you feel you are with PMF, and what's your main goal for this quarter?"

**Founder**: "Maybe a 4 on PMF. Main goal is to close 3 pilot customers."

**Coach**: "Got it. I've set up your profile and saved these details. Let's dive into those sales cycles—tell me about the last deal that stalled."
