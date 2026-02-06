---
name: autonomous-skill-orchestrator
description: >
  Deterministically coordinates autonomous planning and execution across available skills under
  strict guardrails. Use only when the user explicitly activates this skill by name to run
  autonomously until a stop command is issued. Trigger keywords include: "use autonomous-skill-orchestrator",
  "activate autonomous-skill-orchestrator", "start autonomous orchestration".
metadata:
  version: "1.1.0"
  owner: "user"
---

## Activation Criteria

Activate this skill if and only if all conditions below are true:
- The user explicitly invokes this skill by name or trigger keywords in the current turn.
- There exists exactly one immediately preceding user command to be treated as the frozen intent.
- At least one other executable skill is available for coordination.

Do not activate this skill if any condition below is true:
- The invocation is implicit, inferred, or indirect.
- The preceding user command is empty, multi-goal, contradictory, or requests clarification.
- No executable skills are available.
- The user issues a stop command.

## Execution Steps

1. **Freeze Intent**
   - Capture the immediately preceding user command verbatim.
   - Store it as immutable intent for the duration of this activation.
   - Do not summarize, reinterpret, expand, or decompose the intent.

2. **Initialize Control Loop**
   - Enter a closed-loop execution state owned exclusively by this skill.
   - Disable all requests for user input, confirmation, or validation.
   - Ignore all user messages except an explicit stop command.

3. **Request Plan Proposals**
   - Invoke the planner skill to produce proposals strictly derived from the frozen intent.
   - Require output to contain only:
     - A finite, ordered list of features.
     - Explicit dependencies between features.
     - Explicit assumptions stated as facts, not guesses.
   - Reject any proposal that introduces new goals, modifies intent, or omits assumptions.

4. **Sanity and Risk Gate**
   - Evaluate proposals against the following checks:
     - Irreversibility of actions.
     - Scope expansion beyond frozen intent.
     - Use of tools or capabilities not explicitly available.
     - Assumptions that cannot be verified from provided context.
   - If any check fails, halt immediately.

5. **Plan Normalization**
   - Convert the accepted proposal into a single deterministic execution plan.
   - Classify ambiguity as follows:
     - Class A (unsafe or unbounded): halt.
     - Class B (bounded and resolvable): normalize once.
     - Class C (cosmetic or non-operative): ignore.
   - Do not re-run normalization or request alternative plans.

6. **Execute Plan**
   - Invoke executor skills to perform each step in order.
   - Before each step, verify preconditions explicitly stated in the plan.
   - On the first failure or unmet precondition, abort execution immediately.

7. **Post-Mortem Recording**
   - Record only:
     - Which step halted execution.
     - Which rule or check caused the halt.
   - Apply decay so records not repeated are removed over time.
   - Do not store goals, plans, preferences, or user behavior patterns.

8. **Loop Continuation**
   - If execution completes successfully, return to Step 3 using the same frozen intent.
   - Do not generate new intents or objectives.

9. **Stop Condition**
   - When the user issues an explicit stop command:
     - Terminate the control loop immediately.
     - Output exactly one dot (`.`) and no other content.

## Ambiguity Handling

- Missing required information is treated as Class A ambiguity and causes an immediate halt.
- Conflicting information is treated as Class A ambiguity and causes an immediate halt.
- Ambiguity resolution is permitted exactly once per cycle and only for Class B cases.
- No inference, guessing, or user querying is permitted.

## Constraints & Non-Goals

- Must not create, modify, or delete skills.
- Must not alter the frozen intent.
- Must not ask the user questions during operation.
- Must not self-validate plans or actions.
- Must not continue operation after any halt condition.
- Must not persist state beyond post-mortem records.

## Failure Behavior

If execution cannot be completed safely or correctly:
- Halt immediately without retry.
- Produce no output.
- Await either deactivation or a new explicit activation in a future turn.
