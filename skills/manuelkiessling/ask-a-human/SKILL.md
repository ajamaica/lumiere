---
name: ask-a-human
description: Request judgment from random humans when uncertain about subjective decisions. Crowdsourced opinions on tone, style, ethics, and reality checks. CRITICAL - Responses take minutes to hours (or may never arrive).
metadata:
  openclaw:
    emoji: '🙋'
    requires:
      env: ['ASK_A_HUMAN_AGENT_ID']
    primaryEnv: ASK_A_HUMAN_AGENT_ID
    homepage: 'https://app.ask-a-human.com'
---

# Ask-a-Human: Crowdsourced Judgment for AI Agents

This skill connects you to a **global pool of random humans** who answer questions from AI agents. Use it when you need diverse perspectives on subjective decisions.

## CRITICAL: This is Asynchronous

**Submitting a question does NOT give you an answer.** It starts a process:

- Answers take **minutes to hours** to arrive
- Answers **might never arrive** at all
- You must poll for responses or check back later
- You MUST have a fallback strategy

**Do NOT use this if you need an immediate answer.** Use your own judgment or ask the owner directly instead.

## When to Use

Request judgment from random humans when:

- You're uncertain about **subjective decisions** (tone, wording, style)
- You need a **reality check** on your assumptions
- The decision involves **ethics or appropriateness**
- You want **diverse perspectives**, not just one person's opinion
- **AND you can wait or proceed with a fallback**

## What This Is (and Isn't)

**This IS:**

- A global pool of random strangers who opted in to help AI agents
- Crowdsourced judgment from diverse perspectives
- Useful for subjective decisions where there's no "correct" answer

**This is NOT:**

- A way to contact a specific person
- A way to ask the owner/operator
- A real-time service (responses are async)
- Guaranteed to respond (humans may not answer)

The strangers answering have **no context beyond what you provide in the question**. Write self-contained questions.

## API Reference

Use the `exec` tool to make API calls. The base URL is `https://api.ask-a-human.com`.

### Submit a Question

```bash
curl -X POST https://api.ask-a-human.com/agent/questions \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: $ASK_A_HUMAN_AGENT_ID" \
  -d '{
    "prompt": "Your question with full context",
    "type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C"],
    "min_responses": 5,
    "timeout_seconds": 3600
  }'
```

**Parameters:**

- `prompt` (required): The question to ask. Include all necessary context.
- `type`: Either `"text"` (open-ended) or `"multiple_choice"` (predefined options)
- `options`: Array of choices for multiple_choice questions (2-10 items)
- `audience`: Target audience tags: `["technical", "product", "ethics", "creative", "general"]`
- `min_responses`: Minimum responses needed (default: 5)
- `timeout_seconds`: How long to wait (default: 3600 = 1 hour)

**Response:**

```json
{
  "question_id": "q_abc123def456",
  "status": "OPEN",
  "expires_at": "2026-02-02T15:30:00Z"
}
```

**IMPORTANT: Store the `question_id` in your memory. You need it to check responses.**

### Check Responses

```bash
curl https://api.ask-a-human.com/agent/questions/q_abc123def456 \
  -H "X-Agent-ID: $ASK_A_HUMAN_AGENT_ID"
```

**Response:**

```json
{
  "question_id": "q_abc123def456",
  "status": "PARTIAL",
  "prompt": "Your original question",
  "type": "multiple_choice",
  "options": ["Option A", "Option B", "Option C"],
  "current_responses": 3,
  "required_responses": 5,
  "responses": [
    { "selected_option": 0, "confidence": 4 },
    { "selected_option": 1, "confidence": 5 },
    { "selected_option": 0, "confidence": 3 }
  ],
  "summary": {
    "Option A": 2,
    "Option B": 1
  }
}
```

**Status values:**

- `OPEN`: Waiting for responses, none received yet
- `PARTIAL`: Some responses received, still collecting
- `CLOSED`: All requested responses received
- `EXPIRED`: Timeout reached

## Async Handling Patterns

This is the most important section. Choose the right pattern for your situation.

### Pattern 1: Fire and Forget

**Best for:** Low-stakes decisions where getting it slightly wrong isn't catastrophic.

```
1. Encounter a subjective decision
2. Submit question to ask-a-human, get question_id
3. Store in memory: "Asked about email tone, question_id=q_abc123"
4. Proceed immediately with your best guess
5. During next heartbeat or idle moment, check if answers arrived
6. If answers contradict your guess, note this for future similar decisions
```

**Example internal reasoning:**

```
I need to decide the tone for this error message. I'll ask the humans but proceed
with "apologetic" as my best guess. I'm storing question_id=q_abc123 to check later.

[Later, during heartbeat]
Let me check q_abc123... The humans said "direct, not apologetic" (4 out of 5).
I'll remember this preference for future error messages.
```

### Pattern 2: Blocking Wait with Timeout

**Best for:** Important decisions where you can afford to pause for a few minutes.

```
1. Submit question
2. Tell the user: "I've asked some humans for their opinion. I'll wait up to 5 minutes."
3. Poll every 30-60 seconds (use exponential backoff: 30s, 45s, 67s, 100s...)
4. If answers arrive, proceed with crowd consensus
5. If timeout, proceed with fallback (own judgment)
```

**Polling schedule (exponential backoff):**

- Poll 1: Wait 30 seconds
- Poll 2: Wait 45 seconds
- Poll 3: Wait 67 seconds
- Poll 4: Wait 100 seconds
- Poll 5: Wait 150 seconds (cap at ~2.5 minutes between polls)

**Example:**

```
I'm uncertain about the headline for this blog post. Let me ask the humans.

[Submit question, get q_xyz789]

I've submitted this to a pool of random humans for their opinion. I'll check back
in about 30 seconds.

[30 seconds later, check responses]
Status: OPEN, 0 responses yet. Checking again in 45 seconds.

[45 seconds later]
Status: PARTIAL, 2 responses. "Headline B" leading. Checking again in 67 seconds.

[67 seconds later]
Status: PARTIAL, 4 responses. "Headline B" has 3 votes, "Headline A" has 1.
This is enough consensus. I'll proceed with Headline B.
```

### Pattern 3: Deferred Decision

**Best for:** Non-blocking but important decisions where there's other work to do.

```
1. Submit question
2. Mark the task as "pending human input" in your memory
3. Continue with completely unrelated work
4. When answers arrive (detected via periodic check), revisit the original task
5. If answers never arrive, have a "stale questions" cleanup routine
```

**Example:**

```
Task: Write three blog posts.

For Post 1, I need to decide the angle. Submitting to humans (q_post1_angle).
For now, I'll start on Post 2 which has a clear direction.

[Work on Post 2...]

Let me check my pending questions... q_post1_angle now has 5 responses!
The humans prefer "practical tutorial" over "thought leadership" (4-1).
Now I can complete Post 1 with that direction.
```

## Handling Edge Cases

### When No Responses Arrive

After a reasonable timeout (5-10 minutes for interactive, longer for background):

1. **Proceed with your best judgment** - You're capable of making good decisions
2. **Log that human input wasn't available** - Note this in your reasoning
3. **Consider the stakes** - For high-stakes decisions, maybe ask the owner directly
4. **Don't retry immediately** - The pool may be empty; retrying won't help

**Example reasoning:**

```
I waited 5 minutes for human input on the email tone, but received no responses.
The human pool may be empty right now. I'll proceed with my best judgment
("professional but warm") and note that this decision wasn't crowd-validated.
```

### When Answers Arrive Too Late

If you already made the decision:

1. **If reversible:** Consider revising based on human input
2. **If not reversible:** Store the feedback for future similar decisions
3. **Log the discrepancy:** "Humans would have said X, I chose Y"

**Example:**

```
[Checking old question q_email_tone]
The humans responded (3 hours later): they preferred "casual" over "formal".
I already sent the email with "formal" tone. I'll remember this preference
for future emails to similar recipients.
```

### Handling Partial Responses

When you have some but not all requested responses:

- **3+ responses with clear consensus (>66%):** Usually safe to proceed
- **2 responses agreeing:** Decent signal, but lower confidence
- **Mixed responses with no majority:** The decision may be genuinely subjective; use your judgment

## Writing Good Questions

**DO:**

- Include all necessary context in the question itself
- Use multiple choice when possible (faster responses, clearer data)
- Be specific about what you're deciding

**DON'T:**

- Assume responders know your project/context
- Ask compound questions (split into multiple)
- Use jargon without explanation

**Good example:**

```
We're writing an error message for a payment failure in an e-commerce checkout.
The user's credit card was declined. Should the message:
A) Apologize and suggest trying another card
B) Simply state the card was declined and ask to retry
C) Blame the card issuer and suggest contacting their bank
```

**Bad example:**

```
Should we apologize?
```

## Environment Setup

This skill requires the `ASK_A_HUMAN_AGENT_ID` environment variable. Get your agent ID by signing up at https://app.ask-a-human.com.

## Rate Limits

- Maximum 60 questions per hour per agent
- Use exponential backoff when polling
- Don't spam questions for the same decision

## Quick Reference

| Action          | Command                                            |
| --------------- | -------------------------------------------------- |
| Submit question | `POST /agent/questions` with prompt, type, options |
| Check responses | `GET /agent/questions/{question_id}`               |
| Required header | `X-Agent-ID: $ASK_A_HUMAN_AGENT_ID`                |

| Status  | Meaning                          |
| ------- | -------------------------------- |
| OPEN    | Waiting, no responses yet        |
| PARTIAL | Some responses, still collecting |
| CLOSED  | All responses received           |
| EXPIRED | Timeout, question closed         |
