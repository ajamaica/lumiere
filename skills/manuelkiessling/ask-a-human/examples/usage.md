# Ask-a-Human Usage Examples for OpenClaw

These examples show real-world workflows demonstrating how OpenClaw agents can use the ask-a-human skill for various subjective decisions.

## Example 1: Email Tone Decision (Fire and Forget Pattern)

**Scenario:** The agent is helping draft an email to a client about a project delay.

### Conversation

**User:** Help me write an email to our client explaining that the project will be delayed by 2 weeks.

**Agent (internal reasoning):**

```
This requires a tone decision. I could be very apologetic, matter-of-fact, or
somewhere in between. Let me ask the humans while I draft options.
```

**Agent (action):**

```bash
curl -X POST https://api.ask-a-human.com/api/questions \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: $ASK_A_HUMAN_AGENT_ID" \
  -d '{
    "prompt": "We need to email a client about a 2-week project delay. What tone should the email take?\n\nContext: B2B software project, good relationship with client, delay is due to unexpected technical complexity.",
    "type": "multiple_choice",
    "options": [
      "Very apologetic - emphasize how sorry we are",
      "Professional and matter-of-fact - state the facts, offer solution",
      "Proactive - frame as an opportunity for additional features",
      "Transparent - detailed explanation of what caused the delay"
    ],
    "min_responses": 5,
    "timeout_seconds": 600
  }'
```

**API Response:**

```json
{
  "question_id": "q_delay_email_001",
  "status": "OPEN"
}
```

**Agent (stores in memory):** `Pending question q_delay_email_001 about delay email tone`

**Agent (to user):**

```
I've asked some humans for their opinion on the best tone. While waiting,
I'll draft the email using a professional, matter-of-fact approach (my best guess).

---

Subject: Project Timeline Update - [Project Name]

Dear [Client],

I wanted to update you on our timeline for [Project Name]. Due to unexpected
technical complexity in [specific area], we need an additional two weeks to
deliver the quality you expect.

New delivery date: [Date]

We've identified the issues and have a clear path forward. I'd be happy to
discuss the details on a call if you'd like.

Best regards,
[Name]

---

I can adjust the tone once the human responses come in, or you can proceed
with this version.
```

**[2 minutes later, agent checks during heartbeat]**

**Agent (internal):**

```bash
curl https://api.ask-a-human.com/api/questions/q_delay_email_001 \
  -H "X-Agent-ID: $ASK_A_HUMAN_AGENT_ID"
```

**API Response:**

```json
{
  "question_id": "q_delay_email_001",
  "status": "PARTIAL",
  "current_responses": 4,
  "summary": {
    "Professional and matter-of-fact - state the facts, offer solution": 3,
    "Transparent - detailed explanation of what caused the delay": 1
  }
}
```

**Agent (to user):**

```
Update: 4 humans have responded to my tone question. 3 out of 4 recommend
the professional, matter-of-fact approach - which matches what I drafted.
The consensus validates this direction. Ready to send?
```

---

## Example 2: Content Headline Choice (Blocking Wait Pattern)

**Scenario:** The agent is helping write a blog post and needs to choose a headline.

### Conversation

**User:** I've written this blog post about remote work productivity. Can you help me pick the best headline?

**Agent:**

```
I have a few headline options. Let me ask some humans which one resonates best.
This is an important decision, so I'll wait a few minutes for responses.
```

**Agent (action):**

```bash
curl -X POST https://api.ask-a-human.com/api/questions \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: $ASK_A_HUMAN_AGENT_ID" \
  -d '{
    "prompt": "Which headline would make you most likely to click and read a blog post about remote work productivity tips?\n\nTarget audience: Software developers working remotely",
    "type": "multiple_choice",
    "options": [
      "10 Proven Ways to Stay Productive While Working from Home",
      "Why Your Home Office Setup Is Killing Your Productivity",
      "The Remote Developer'\''s Guide to Deep Work",
      "I Doubled My Output Working from Home. Here'\''s How."
    ],
    "audience": ["creative", "product"],
    "min_responses": 5,
    "timeout_seconds": 300
  }'
```

**Agent (to user):**

```
I've submitted four headline options to a pool of random humans. I'll check
back every 30 seconds or so. This usually takes 2-5 minutes.

Waiting for responses... (0/5 received)
```

**[30 seconds later]**

**Agent (checks):**

```
Still waiting... (1/5 received)
```

**[45 seconds later]**

**Agent (checks):**

```
Making progress... (3/5 received)
```

**[67 seconds later]**

**Agent (checks):**

```json
{
  "status": "CLOSED",
  "current_responses": 5,
  "summary": {
    "Why Your Home Office Setup Is Killing Your Productivity": 3,
    "I Doubled My Output Working from Home. Here's How.": 2
  }
}
```

**Agent (to user):**

```
The humans have spoken! 5 responses received.

Results:
- "Why Your Home Office Setup Is Killing Your Productivity" - 3 votes (60%)
- "I Doubled My Output Working from Home. Here's How." - 2 votes (40%)

The winner is the provocative "killing your productivity" angle. This makes
sense - it creates curiosity and a bit of urgency. Want me to use this headline?
```

---

## Example 3: Code Review Sensitivity Check (Deferred Pattern)

**Scenario:** The agent is reviewing code and found something that might be a sensitive issue to raise.

### Conversation

**User:** Review the code changes in this PR for our authentication system.

**Agent (internal reasoning):**

```
I found a potential security issue, but I'm not sure how to phrase feedback
without sounding alarmist or condescending. I'll ask humans while I continue
reviewing the rest of the PR.
```

**Agent (action):**

```bash
curl -X POST https://api.ask-a-human.com/api/questions \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: $ASK_A_HUMAN_AGENT_ID" \
  -d '{
    "prompt": "I'\''m reviewing code and found a junior developer stored passwords with MD5 hashing instead of bcrypt. How should I phrase feedback that'\''s helpful but not condescending?\n\nContext: This is a code review comment that will be public to the team.",
    "type": "text",
    "audience": ["technical", "product"],
    "min_responses": 3,
    "timeout_seconds": 1800
  }'
```

**Agent (stores in memory):**

```
Pending: q_code_review_tone - How to phrase password hashing feedback
Continue with: Rest of PR review
```

**Agent (to user):**

```
I'm reviewing the PR and making notes. I've found a few things to discuss.

In the meantime, I've asked some humans for advice on phrasing feedback for
a sensitive issue I found. I'll incorporate their suggestions into my final
review comments.

Continuing with the review...
```

**[Agent continues reviewing other parts of the code]**

**Agent:**

```
Here's what I've found so far:

1. ✅ Input validation looks good
2. ✅ SQL injection prevention is solid
3. ⚠️ Rate limiting could be improved (line 45)
4. 🔴 Password hashing concern (waiting for human input on phrasing)
5. ✅ Session management is correct
```

**[5 minutes later, agent checks pending questions]**

**API Response:**

```json
{
  "question_id": "q_code_review_tone",
  "status": "CLOSED",
  "responses": [
    {
      "answer": "Frame it as a learning opportunity: 'I noticed MD5 here - have you considered bcrypt? It's the current standard because [reason]. Happy to pair on this if helpful!'"
    },
    {
      "answer": "Lead with the why: 'MD5 has known vulnerabilities for password storage. Let's upgrade to bcrypt - I can point you to some good resources.'"
    },
    {
      "answer": "Be direct but kind: 'This needs to use bcrypt instead of MD5 for security. Not a big change - want me to suggest the specific code?'"
    }
  ]
}
```

**Agent (to user):**

```
Great news - I got feedback on how to phrase the password hashing comment.
Here's my complete review:

## Code Review: Authentication PR

### Must Fix
**Password Hashing (auth/users.py:78)**
I noticed MD5 is used for password hashing here. MD5 has known vulnerabilities
for password storage - let's upgrade to bcrypt which is the current standard.
Not a big change! Happy to suggest the specific code if helpful.

### Should Fix
**Rate Limiting (auth/login.py:45)**
Consider adding rate limiting to prevent brute force attempts...

[rest of review]
```

---

## Example 4: Handling No Responses (Timeout Fallback)

**Scenario:** The agent asks a question but no humans respond.

### Conversation

**User:** What color scheme should I use for my new SaaS dashboard?

**Agent:**

```
That's a subjective design decision. Let me ask some humans for their opinion
while I analyze your existing brand colors.

Submitted question to human pool. Waiting up to 5 minutes...
```

**[5 minutes pass with polling every 30-60 seconds]**

**API Response (final check):**

```json
{
  "question_id": "q_color_scheme",
  "status": "OPEN",
  "current_responses": 0
}
```

**Agent (to user):**

```
I waited 5 minutes but didn't receive any human responses. The pool might
be quiet right now.

I'll proceed with my own analysis instead:

Based on your existing brand colors (#2563EB blue, #F8FAFC off-white),
I'd recommend:

1. **Primary:** Keep your brand blue for CTAs and key actions
2. **Background:** Light gray (#F1F5F9) for main areas
3. **Accent:** A complementary orange (#EA580C) for alerts/notifications
4. **Text:** Dark gray (#1E293B) for readability

This follows your brand while maintaining dashboard usability conventions.
Would you like me to generate a complete color palette spec?
```

---

## Example 5: Handling Late Responses

**Scenario:** Humans respond after the agent already made a decision.

### Agent (internal, during heartbeat)

```
Checking stale questions from earlier sessions...

q_api_naming from 3 hours ago now has responses:
- Original question: "Should this API endpoint be named /users/deactivate
  or /users/archive?"
- I chose: /users/deactivate
- Human consensus: 4 out of 5 said /users/archive

The decision was already made and deployed. Storing this feedback for future
reference: "Humans prefer 'archive' over 'deactivate' for soft-delete operations."
```

**Agent (might mention to user in appropriate context):**

```
By the way, I got late feedback on that API naming question from earlier.
The humans preferred "archive" over "deactivate" (4-1). The endpoint is already
deployed, but I'll keep this in mind for future naming decisions.
```

---

## Pattern Summary

| Pattern             | Use When                                     | Example                            |
| ------------------- | -------------------------------------------- | ---------------------------------- |
| **Fire and Forget** | Low-stakes, can proceed with best guess      | Email tone, minor wording choices  |
| **Blocking Wait**   | Important decision, can pause 2-5 minutes    | Headlines, user-facing copy        |
| **Deferred**        | Important but non-blocking, other work to do | Code review tone, design decisions |

## Tips for Writing Good Questions

1. **Include context** - Responders don't know your project
2. **Be specific** - "Which headline?" not "What do you think?"
3. **Use multiple choice** - Faster responses, clearer data
4. **Set appropriate audiences** - `technical` for code, `creative` for content
5. **Provide options** - Give 3-5 choices, not open-ended when possible
