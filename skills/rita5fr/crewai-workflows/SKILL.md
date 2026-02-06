---
name: crewai-workflows
description: Execute AI-powered crew workflows for marketing content generation, customer support handling, data analysis, and social media calendar creation. Use when tasks involve (1) creating marketing content, taglines, or campaigns, (2) handling customer support inquiries or responses, (3) analyzing business data for insights, (4) generating comprehensive social media content calendars, or (5) any content generation or analysis task that benefits from specialized AI crew workflows. Workflows are powered by DeepSeek, Perplexity, and Gemini models.
---

# CrewAI Workflows Skill

Execute specialized AI crew workflows for content generation, analysis, and support tasks. All crews run on a dedicated server with production-grade LLMs.

## Prerequisites

Set the API key as an environment variable (recommended):

```bash
export CREWAI_API_KEY="5aZyTFQJAAT03VPIII5zsIPcL8KTtdST"
```

Or pass it directly when calling the helper script.

## Available Crews

### 1. Marketing Crew 📢

Generate marketing content, taglines, and campaign copy.

**Use for:**

- Product/service taglines
- Marketing copy for ads or landing pages
- Campaign messaging
- Value propositions

**Input:**

- `topic` (required) - What to create marketing content about
- `target_audience` (optional) - Who the content is for

**LLM:** DeepSeek  
**Response Time:** 3-10 seconds

**Example:**

```bash
scripts/call_crew.sh marketing \
  '{"topic": "hypnotherapy for better sleep", "target_audience": "working professionals with insomnia"}'
```

---

### 2. Support Crew 🎧

Handle customer support inquiries with AI-generated responses.

**Use for:**

- Responding to customer questions
- Drafting support emails
- Handling common inquiries
- Escalation guidance

**Input:**

- `issue` (required) - The customer issue or question

**LLM:** DeepSeek  
**Response Time:** 3-10 seconds

**Example:**

```bash
scripts/call_crew.sh support \
  '{"issue": "Client wants to reschedule their hypnotherapy session"}'
```

---

### 3. Analysis Crew 📊

Analyze business data and provide actionable insights.

**Use for:**

- Data interpretation
- Trend analysis
- Performance metrics review
- Business intelligence

**Input:**

- `data_description` (required) - Description of the data to analyze

**LLM:** DeepSeek  
**Response Time:** 3-10 seconds

**Example:**

```bash
scripts/call_crew.sh analysis \
  '{"data_description": "Monthly client retention rates for Q4 2025"}'
```

---

### 4. Social Media Crew ⭐ 📱

Generate comprehensive 30-day social media content calendars with daily posts, captions, and hashtags.

**Use for:**

- Social media planning
- Content calendar creation
- Multi-platform content strategy
- Monthly content batches

**Input:**

- `industry` (required) - The business industry/niche
- `company_name` (required) - Business or personal brand name

**LLMs:** Perplexity (research) + Gemini (content generation)  
**Response Time:** 3-5 minutes ⏳

**Example:**

```bash
scripts/call_crew.sh social_media \
  '{"industry": "hypnotherapy", "company_name": "Sidharth Mahto"}'
```

**Note:** This crew takes significantly longer due to comprehensive research and content generation phases.

---

## Usage

### Option 1: Using the Helper Script (Recommended)

```bash
cd crewai-workflows
scripts/call_crew.sh <crew_name> '<json_input>' [api_key]
```

**Examples:**

```bash
# Marketing crew
scripts/call_crew.sh marketing '{"topic": "sleep therapy for entrepreneurs", "target_audience": "startup founders"}'

# Support crew
scripts/call_crew.sh support '{"issue": "Client asking about session pricing"}'

# Analysis crew
scripts/call_crew.sh analysis '{"data_description": "Weekly session booking trends"}'

# Social media crew (takes 3-5 minutes)
scripts/call_crew.sh social_media '{"industry": "wellness coaching", "company_name": "Calm Mind Studio"}'

# With explicit API key
scripts/call_crew.sh marketing '{"topic": "mindfulness apps"}' "YOUR_API_KEY"
```

### Option 2: Direct cURL

```bash
curl -X POST "https://crew.iclautomation.me/crews/<crew_name>/run" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $CREWAI_API_KEY" \
  -d '{"input": {...}}'
```

---

## Response Format

All crews return structured JSON:

```json
{
  "ok": true,
  "crew": "marketing",
  "trace_id": "abc123-def456",
  "result": {
    "workflow": "marketing",
    "output": "... the generated content ...",
    "input_summary": {...}
  },
  "error": null
}
```

**Extract the output:** The actual generated content is in `result.output`.

---

## Best Practices

1. **Set timeouts appropriately:**
   - Marketing/Support/Analysis: 30-60 seconds
   - Social Media: 5-10 minutes

2. **Check API key:** Ensure `CREWAI_API_KEY` environment variable is set or pass explicitly

3. **Handle errors:** Check the `error` field in responses

4. **Social Media crew:** Expect 3-5 minutes response time; don't interrupt

5. **Batch requests:** For multiple similar tasks, consider running them sequentially

---

## Health Check

Verify the CrewAI server is running:

```bash
curl https://crew.iclautomation.me/health
# Expected: {"ok": true}
```

---

## Future Expansion

When new crews are added to the server:

1. Update the "Available Crews" section
2. Add example usage to the helper script
3. Document input parameters and response times

---

**Server:** https://crew.iclautomation.me  
**Authentication:** API key via `X-API-Key` header  
**Last Updated:** 2026-01-17
