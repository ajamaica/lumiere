# Overreach

Overreach is the most common cause of systemic failure in both humans and AI agents. It occurs when your **Error Creation Rate** exceeds your **Error Correction Capacity**.

## The Core Concept
Error correction is a limited resource. Every time you take on a task that is too complex, you create errors (bugs, hallucinations, logic gaps). If you don't have the time, energy, or **Proper Knowledge** to find and fix those errors, they compound.

## Identification: The "Overreach Signals"
- **Looping:** You have tried to fix the same problem 3+ times and are getting nowhere.
- **Compounding Errors:** Your "fixes" are creating new, unexpected bugs.
- **Confusion:** You can no longer explain *why* the system is behaving the way it is.
- **Vagueness:** You are "hoping" a change works rather than "knowing" it will.

## The Overreach Protocol (The Response)
If you detect Overreach, you must follow this protocol:

### 1. Hard Stop
Stop making "attempts." Every further action in an overreached state is likely to create more damage than it fixes.

### 2. Simplify and Revert
- Revert the system to the last state where you had **Proper Knowledge** (the last "stable" state).
- Discard your complex "Idea" and break it into **Many Small Skills** (sub-tasks).

### 3. Exponential Backoff
Reduce the difficulty of your next task exponentially.
- If you failed at Level 10, your next task should be Level 3.
- Do not just "try a slightly different way." Try a **vastly simpler** way.

### 4. Acquire Proper Knowledge
If you can't judge success/failure, you are overreaching. Your new Goal is to build an objective test or acquire the knowledge needed to evaluate the results.

## Application for AI Agents
- **Context Overload:** If the conversation is too long and you are getting confused, you are overreaching on context. **Action:** Summarize and start a fresh context.
- **Complex Coding:** If a script is getting too large and buggy, you are overreaching on complexity. **Action:** Break the script into small, testable modules.
- **Tool Failures:** If a tool is failing and you don't understand why, don't keep calling it. **Action:** Use `exec` to probe the environment and understand the tool's behavior at a lower level.

## The Golden Rule of Overreach
**It is better to succeed at a tiny, "unimpressive" task than to fail at a large, "impressive" one.**
