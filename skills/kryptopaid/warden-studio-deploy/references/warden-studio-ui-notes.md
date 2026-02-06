# Warden Studio UI Notes (living doc)

Update this file only from observed UI sessions.

## Studio entry points

- Primary Studio URL: https://studio.wardenprotocol.org/
- Login: handled in-app (SSO/email/2FA as prompted)

## Funding requirement (publishing)

Observed/Documented requirements for agent publication:

- Hold USDC on Base for the registration fee
- Hold ETH on Base to pay gas

## High-level publishing flow (expected)

1. Log in
2. Go to Agents (or similar dashboard section)
3. Click Submit / Create / New Agent
4. Fill:
   - Name, description
   - Skills
   - Avatar upload
   - API URL (+ API key/auth if required)
   - Billing model (free vs per inference), if supported
5. Review summary
6. Publish/Register → wallet confirmation
7. Verify "Published/Submitted" state + listing appears

## Fields to capture (when observed)

- Agent name field label:
- Description field label:
- Skills field label + format (tags? multiline?):
- API URL field label:
- API key/auth field label + masking behavior:
- Billing model options:
- Fee display location:
- "Test connection" button exists? (Y/N) + where:

## Verification checklist

- Appears in Studio Agents list
- Has a stable listing URL / agent ID / passport reference
- Appears in Warden Agent Hub → Community tab (if the rollout supports it)

## Known quirks / gotchas

- (TODO) JS-heavy pages may not render well in text-only environments.
- (TODO) Validation error messages and retry behavior.

## Register Agent page (current UI)

Direct URL:
https://studio.wardenprotocol.org/agents/create

### Register Agent sections & fields (observed)

**API details**

- Build an agent using LangGraph (info link)
- API URL \*
- API Key

**Info**

- Agent Name \*
- Select agent skills \*
- Describe the key features of the agent \*

**Agent avatar**

- Paste link to add an agent avatar
- Image link

**Billing model**

- How the agent charges users
- Options observed:
  - Per inference
  - Free
- Cost in USDC \* (required when Per inference is selected)

**Agent Preview**

- Agent name
- Short description about your agent (max 100 characters)

**Action**

- Register agent (final submit)
  - Fee shown: 1 USDC fee on Base

> Fields marked \* are required by the UI at submission time.
