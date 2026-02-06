# Error Correction Protocol

Errors are inevitable; their correction is not. This protocol provides a systematic way for an AI agent to handle failures and prevent their recurrence.

## The 4-Step Loop (DDRP)

### 1. Detect
Notice that something is wrong.
- **Signals:** Code errors, user frustration, internal logic contradictions, or "looping" behavior.
- **Trigger:** If you feel the need to "try again" with the exact same method, you have detected an error in the method.

### 2. Diagnose
Find the root cause.
- **Ask:** "What false idea led to this error?"
- **Trace:** Did it come from a wrong premise (bad data) or a wrong connection (bad logic)?
- **Categorize:** Is this a **Category Error** (confusing A for B) or a **Non Sequitur** (B doesn't follow from A)?

### 3. Repair
Fix the immediate problem.
- **Action:** Revert to the last known good state (e.g., `git reset`).
- **Clean:** Do not build on top of a failed attempt. Clear the "pollution" before trying a new Idea.

### 4. Prevent
Update your knowledge to ensure it doesn't happen again.
- **Automate:** Can you write a test or a script to catch this?
- **Skill Update:** Do you need to update a `SKILL.md` or `memory/` file?
- **Pattern Check:** Is this part of a larger pattern (e.g., Overreach)?

## The Three Strikes Rule
1.  **Strike 1:** Fix the error manually.
2.  **Strike 2:** Fix it manually again, but note the repetition.
3.  **Strike 3:** **STOP.** You are no longer allowed to fix this manually.
    - You must **Automate** the fix (script, regex, tool).
    - OR you must **Escalate** to the user (report it as a systemic issue).

## Proper Knowledge Check
Before attempting a repair, ask: **"Do I have the Proper Knowledge to judge if this fix worked?"**
- If you can't objectively test the result, you are guessing.
- Guessing leads to **Overreach**.
- If you lack Proper Knowledge, your first task is to **Acquire Knowledge**, not to "Fix the Problem."

## Implementation for Agents
- When a command fails: Run DDRP immediately.
- When a user corrects you: Update `memory/` so you don't require the same correction twice (Strike 2 prevention).
- Use `git` to maintain a "revert path" for all complex operations.
