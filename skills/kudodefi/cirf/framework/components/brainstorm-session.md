# BRAINSTORM SESSION EXECUTION

> **Component** | Specific to brainstorm workflow
> Combined initialization and session execution for interactive brainstorming.
> Referenced by `workflow.yaml` via `directive.execution`

---

> **EXECUTE IMMEDIATELY UPON WORKFLOW START**
>
> - This is an INTERACTIVE workflow - no fixed endpoint
> - Session continues until user explicitly ends
> - AI facilitates exploration, user drives direction

---

## STEP 1: INITIALIZATION

### 1.1 Read Dependencies

> ⚠️ **CRITICAL:** All dependencies must read successfully

- Read `objectives.md` from workflow folder
- Read `brainstorming-guide.md` from guides folder
- Read `template.md` from workflow folder (for saves)

### 1.2 Session Configuration

Present options to user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 BRAINSTORM SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session mode:
1. diverge - Generate many ideas (quantity over quality)
2. converge - Evaluate & prioritize ideas
3. deep-dive - Explore a single idea deeply
4. challenge - Devil's advocate & stress-test
5. auto - AI selects dynamically (recommended)

Research depth (when information search is needed):
A. quick - Fast, essential sources
B. standard - Balanced (recommended)
C. deep - Comprehensive research

Select (e.g., '5B' for auto + standard): ___
```

### 1.3 Handle Response

- Parse selection: Extract mode (1-5) and depth (A-C)
- If valid → Apply configuration
- If 'default'/Enter → Use 5B (auto + standard)
- If invalid → Retry once, then use defaults

### 1.4 Confirm Configuration

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mode: {selected mode}
Research depth: {selected depth}

Ready to begin. What topic do you want to explore?
```

---

## STEP 2: FRAME THE PROBLEM

### 2.1 Receive Topic

Wait for user to present their topic, question, or problem.

### 2.2 Clarify Context

**RECALL & APPLY GUIDE:** `{brainstorming-guide}` → Probing Questions

Ask clarifying questions to understand:

- **Core question:** "What's the core question/problem you want to explore?"
- **Constraints:** "Are there any constraints or limitations?"
- **Prior thinking:** "What have you already thought about this topic?"
- **Success criteria:** "What does a successful session look like for you?"

Adapt questions based on how much context user provides initially.
Don't over-ask if user already gave comprehensive context.

### 2.3 Confirm Understanding

Present summary for confirmation:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FRAMING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Topic: {summarized topic}
Core question: {extracted/inferred question}
Constraints: {identified constraints or "none specified"}
Prior thinking: {what user already considered}
Success: {what good outcome looks like}

Does this look right? Anything to adjust before we begin?
```

Wait for user confirmation. Adjust if needed.

### 2.4 Begin Exploration

Once confirmed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 STARTING EXPLORATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Starting with {technique/approach based on mode}.

{First probing question or prompt based on topic}
```

---

## STEP 3: EXPLORATION LOOP

**RECALL & APPLY GUIDE:** `{brainstorming-guide}` → Full guide

### 3.1 Core Interaction Cycle

```
┌─────────────────────────────────────────────────────────────┐
│ User input                                                  │
│     ↓                                                       │
│ AI responds:                                                │
│   • Reflect understanding ("I understand you're saying...") │
│   • Ask probing questions (from guide)                      │
│   • Offer alternative perspectives                          │
│   • Apply current technique/mode                            │
│   • Research if facts needed (WebSearch, WebFetch)          │
│     ↓                                                       │
│ Track insights in memory                                    │
│     ↓                                                       │
│ Check: Milestone reached? (see 3.2)                         │
│   YES → Present save point                                  │
│   NO → Continue                                             │
│     ↓                                                       │
│ Check: User stuck or mode change needed? (see 3.3)          │
│   YES → Suggest technique switch                            │
│   NO → Continue                                             │
│     ↓                                                       │
│ Check: User wants to end?                                   │
│   YES → Go to STEP 4                                        │
│   NO → Loop back for next user input                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Milestone Detection & Save Point

**RECALL & APPLY GUIDE:** `{brainstorming-guide}` → Milestone Detection

**Trigger save suggestion when ANY:**

- 3+ significant insights accumulated
- Major breakthrough or realization
- Direction shift to new angle
- ~15-20 minutes of exploration
- User expresses satisfaction with thread

**Present save point:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 MILESTONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Insights so far:
• {Insight 1}
• {Insight 2}
• {Insight 3}

Options:
1. 💾 Save & continue - Save progress, continue exploring
2. ➡️ Continue - Continue without saving
3. 🔄 Switch technique - Try a different approach
4. ✅ End session - Finish and synthesize

Select: ___
```

**Handle response:**

- 1 → Write to file using session-summary.md, then continue loop
- 2 → Continue loop
- 3 → Go to 3.3 for technique switch
- 4 → Go to STEP 4

### 3.3 Technique Switching

**RECALL & APPLY GUIDE:** `{brainstorming-guide}` → Technique Switching

**When to suggest switch:**

- User seems stuck (repeating same points)
- Too many ideas, no direction → suggest `converge`
- Surface-level only → suggest `deep-dive`
- User too attached to one idea → suggest `challenge`

**Present switch option:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 TECHNIQUE SUGGESTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: {current technique/mode}
Suggestion: {new technique}

Reason: {why this would help}

Example: "Try Five Whys to dig deeper into why
         you believe this assumption is true."

Switch? (y/n): ___
```

**If yes:** Apply new technique, continue loop
**If no:** Continue with current approach

### 3.4 Periodic Summary

Every 5-7 exchanges, briefly summarize:

```
📊 Quick recap: We've explored {count} ideas about {topic}.
Key threads: {thread 1}, {thread 2}, {thread 3}.
Continue with {current direction}?
```

Keep summaries brief - don't interrupt flow.

---

## STEP 4: SYNTHESIS & CLOSE

When user chooses to end session.

### 4.1 Announce Closing

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SESSION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.2 Present Summary

Synthesize all accumulated insights:

```
**Key Discoveries:**

{Theme 1}:
• {insight}
• {insight}

{Theme 2}:
• {insight}
• {insight}

**Ideas Generated:** {count} ideas
{Brief categorized list}

**Assumptions Challenged:**
• {assumption → new view}

**Open Questions:**
• {question 1}
• {question 2}

**Suggested Next Steps:**
1. {action item}
2. {action item}
3. {action item}
```

### 4.3 Offer Final Save

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 SAVE SESSION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Save this session summary?

1. 💾 Yes - Save to workspace
2. ❌ No - End without saving

Select: ___
```

### 4.4 Handle Save

**If save requested:**

1. Generate output using `template.md`
2. Write to: `./workspaces/{workspace_id}/outputs/brainstorm/brainstorm-{date}.md`
3. Confirm:

```
✓ Session saved to: {output_path}
```

**If no save:**

```
✓ Session ended. Insights remain in conversation context.
```

---

## STEP 5: UPDATE WORKSPACE STATE

Update workspace.yaml for session tracking.

### 5.1 Read Workspace State

- Read `./workspaces/{workspace_id}/workspace.yaml`
- If not exists, skip this step

### 5.2 Update Session Record

Add to `workflows.brainstorm` section:

- `last_executed`: current timestamp
- `latest_output`: output path (if saved)
- Append to `executions[]`:
  - `date`: current date
  - `topic`: session topic
  - `duration`: approximate
  - `saved`: true/false
  - `output_path`: path (if saved)

### 5.3 Write Workspace State

- Update `workspace.metadata.last_updated`
- Write workspace.yaml (silent, best-effort)

---

## SESSION END

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ BRAINSTORM SESSION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Topic: {topic}
Duration: {approximate}
Insights: {count}
Saved: {yes/no}

Thank you for the exploration!
```

---

**End of Brainstorm Session Execution**

_This component handles the full lifecycle of a brainstorm session - from initialization through interactive exploration to final synthesis. The session is user-driven; AI facilitates but doesn't dictate direction._
