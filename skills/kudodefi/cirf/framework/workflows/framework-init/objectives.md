# FRAMEWORK INITIALIZATION

> **CIRF - CRYPTO INTERACTIVE RESEARCH FRAMEWORK - WORKFLOW OBJECTIVES**
> **NAME:** Framework Initialization (framework-init)
> **PURPOSE:** First-time setup wizard for new users to configure their preferences

---

## MISSION

Guide new users through the initial framework setup process, collecting essential preferences and configuring the framework for personalized use. Delivers a fully configured framework ready for crypto research with user-specific settings applied.

---

## OBJECTIVES

1. **Welcome & Introduce** - Present the framework's capabilities and value proposition to new users

2. **Collect User Identity** - Gather user's preferred name for personalized interactions

3. **Configure Localization** - Set date format and currency preferences for consistent formatting

4. **Set Language Preferences** - Configure communication and output languages based on user preference

5. **Validate & Confirm** - Review all collected settings with user before applying

6. **Apply Configuration** - Update core-config.yaml with validated user preferences

7. **Guide Next Steps** - Provide clear guidance on how to start using the framework

---

## SETUP FLOW

### Step 1: Welcome Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 WELCOME TO CIRF
   Crypto Interactive Research Framework
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CIRF is your intelligent research companion for cryptocurrency
deep research. With specialized agents and systematic workflows,
you can conduct comprehensive market analysis, project evaluation,
and trend research.

Let's set up your preferences to get started.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Collect Information

Present all questions in a single message:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 SETUP QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please answer the following (* = default):

1. Your name? ___

2. Date format? [1] YYYY-MM-DD* [2] DD/MM/YYYY [3] MM/DD/YYYY

3. Currency? [1] $* [2] € [3] £ [4] ¥ [5] Other: ___

4. Communication language? [1] English* [2] Vietnamese [3] Chinese

5. Output language? [1] English* [2] Vietnamese [3] Chinese

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Example: "John, 1, 1, 2, 2" or answer each on new line.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Confirm Settings

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:           {user_name}
Date Format:    {date_format}
Currency:       {currency}
Communication:  {communication_language}
Output:         {output_language}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Correct? (yes/no)
```

### Step 4: Apply & Complete

After confirmation, update `core-config.yaml`:

**4.1 Update user settings:**

- `user.name`
- `user.date_format`
- `user.currency`
- `language.communication`
- `language.output`

**4.2 Update initialization status:**

- `status.initialized: true`
- `status.initialized_at: {current_date}`
- `status.initialized_by: "research-analyst"`

**4.3 Display completion message:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ SETUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Welcome, {user_name}! Your framework is ready.

NEXT STEPS:

1. Create a workspace for your research project
   → Copy ./framework/_workspace.yaml to ./workspaces/{project-name}/workspace.yaml

2. Choose an agent to start working with:
   🔬 Research Analyst   - Full-stack crypto research (recommended)
   ⚙️ Technology Analyst - Technical architecture & security
   ✍️ Content Creator    - Research-to-content
   ✓  QA Specialist      - Quality assurance

3. Or explore available workflows:
   → sector-overview, competitive-analysis, project-snapshot,
     product-analysis, tokenomics-analysis, and more...

Need help? Ask any agent for guidance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## VALIDATION CRITERIA

- [ ] User name is collected and not empty
- [ ] All settings have valid values (either user-provided or defaults)
- [ ] User has confirmed settings before applying
- [ ] core-config.yaml user settings are successfully updated
- [ ] core-config.yaml status.initialized is set to true
- [ ] Completion message with next steps is displayed

---

## DELIVERABLES

- **Primary output:** Updated `./framework/core-config.yaml` with user settings
- **Secondary output:** Welcome message with next steps guidance

---

_Philosophy: A smooth onboarding experience sets the foundation for effective research. Collect only what's needed, apply sensible defaults, and guide users to their first productive session._
