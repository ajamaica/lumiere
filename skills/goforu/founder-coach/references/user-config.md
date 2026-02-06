## Configuration Storage Location

The user configuration for FounderCoach is stored in a YAML file located at the user's home directory to ensure persistence across coaching sessions and environment updates.

**Path:** `~/.founder-coach/config.yaml`

This directory and file are created during the initial onboarding process if they do not already exist.

## Configuration File Format

The configuration file uses standard YAML syntax. It must be valid YAML to be parsed correctly by the FounderCoach skill.

```yaml
# ~/.founder-coach/config.yaml
company_stage: 'Seed' # Idea, MVP, Seed, Series A, Series B+
industry: 'SaaS' # SaaS, Fintech, AI, E-commerce, etc.
team_size: '2-5' # 1, 2-5, 6-20, 21-50, 50+
pmf_self_assessment: 5 # 1-10
language: 'auto' # or "zh-CN", "en-US", etc.
phoenixclaw_integration: true
```

## Configurable Options

| Option                    | Description                                      | Type    | Default   | Validation                           |
| :------------------------ | :----------------------------------------------- | :------ | :-------- | :----------------------------------- |
| `company_stage`           | Current stage of the startup.                    | String  | `Idea`    | Idea, MVP, Seed, Series A, Series B+ |
| `industry`                | Primary industry or sector.                      | String  | `General` | Any string                           |
| `team_size`               | Number of people in the core team.               | String  | `1`       | 1, 2-5, 6-20, 21-50, 50+             |
| `pmf_self_assessment`     | Founder's self-assessment of Product-Market Fit. | Integer | `1`       | 1-10                                 |
| `language`                | Preferred language for coaching sessions.        | String  | `auto`    | "auto" or valid locale               |
| `phoenixclaw_integration` | Whether to integrate with PhoenixClaw journals.  | Boolean | `true`    | true/false                           |

## Onboarding Flow

When the FounderCoach skill is invoked and no configuration file is detected at `~/.founder-coach/config.yaml`, the following onboarding flow must be triggered:

1.  **Detection:** Check for existence of the config file.
2.  **Greeting:** Provide a professional yet supportive greeting as a coach.
3.  **Discovery:** Ask the user 3-4 key questions to populate the configuration:
    - "What stage is your company currently in?"
    - "What's your primary industry?"
    - "How many people are on your team?"
    - "On a scale of 1-10, how would you rate your current Product-Market Fit?"
4.  **Initialization:**
    - Create the `~/.founder-coach/` directory if missing.
    - Generate the `config.yaml` file with the collected answers.
5.  **Integration Check:** If PhoenixClaw is installed, explain how integration will help track progress.
6.  **Transition:** Proceed immediately to the first coaching check-in.

## Onboarding Conversation Example

**Assistant:** "Hello! I'm your FounderCoach. To give you the best guidance, I'd like to understand your startup better. What stage is your company currently in (e.g., Idea, MVP, Seed)?"

**User:** "We just closed our Seed round."

**Assistant:** "Congratulations on the Seed round! That's a huge milestone. What industry are you in, and how many people are on your team?"

**User:** "We're in AI, and there's 4 of us."

**Assistant:** "Got it. One last thing for now: on a scale of 1-10, how close do you feel you are to Product-Market Fit?"

**User:** "Maybe a 4. Still a lot to figure out."

**Assistant:** "Thanks for the honesty. I've set up your profile. I see you have PhoenixClaw installed; I'll coordinate with your journal to track our coaching progress. Let's start with your biggest challenge this week."
