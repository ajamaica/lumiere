---
name: warden-studio
description: Use Warden Studio (studio.wardenprotocol.org) via browser automation to register/publish a Community Agent to the Warden Agent Hub. Use when you need to (1) log in to Studio, (2) create/submit an agent listing, (3) configure API URL/auth, skills, avatar, and billing model, (4) pay registration + gas, and (5) verify the agent appears in Studio and in Warden's Agent Hub. Designed for safe, repeatable publishing with explicit confirmation gates.
---

# Warden Studio

Automate publishing a Community Agent in **Warden Studio** through a safe, repeatable workflow that other agents can follow.

## Safety & constraints (non-negotiable)

- Never request or store seed phrases / private keys.
- Never ask the user to paste secrets into chat. If an API key must be entered, instruct the user to paste it directly into the Studio UI field.
- Treat publishing/onchain registration as **high-risk**: confirm network, fees, and what is being signed before any wallet confirmation.
- Prefer read-only validation (checking forms, status, preview) unless the user explicitly authorizes execution (e.g., "yes, publish" / "yes, execute").
- Do not reveal any private info (local files, credentials, IPs, internal logs).
- Public comms: do not claim any affiliation or relationship unless it is publicly disclosed and the user explicitly asks you to state it.

## What this skill does

Typical outcomes:

- Log into `https://studio.wardenprotocol.org`
- Create a new Agent submission/listing
- Provide:
  - API URL (service endpoint)
  - API key / auth method (if required)
  - Name, description, skills, avatar
  - Billing model (free vs paid per inference, in USDC)
- Pay registration fee + gas (if prompted by the UI)
- Verify the agent shows up in Studio and becomes discoverable in Warden's Agent Hub (Community tab), when applicable.

## Workflow (UI automation)

### 0) Preconditions

1. A Chromium browser is available (Chrome/Brave/Edge/Chromium). (Firefox not supported.)
2. User can log in to Warden Studio (email/SSO/2FA completed).
3. The agent is already deployed somewhere and reachable via HTTPS (no UI required):
   - stable API base URL
   - (optional) API key or token if the endpoint is protected
4. Funding is ready for registration (if required by the flow):
   - USDC on Base for the registration fee (confirm the fee in the UI)
   - ETH on Base for gas

If any of the above is missing, stop and ask the user to do that step.

### 1) Open + stabilize Studio

- Open: `https://studio.wardenprotocol.org`
- Wait for the landing/dashboard to load.
- Take a snapshot and identify:
  - logged-in user / account handle
  - any "Agents" list/table or "Submit / Create agent" entry point
  - network/payment cues (e.g., Base, USDC, wallet connection state)

If Studio is gated by login, stop and ask the user to complete login in the UI.

### 2) Read-only checks (default)

Use these first to prevent failed submissions:

- Confirm the agent endpoint is reachable:
  - the URL is HTTPS
  - no obvious typos
  - (if a "Test connection" exists) run it
- Validate required metadata is prepared:
  - agent name (short)
  - description (clear, non-misleading)
  - skills list (concise + accurate)
  - avatar image ready (square recommended)
- Check billing/monetization options:
  - free vs per-inference (USDC)
  - expected fees shown by the UI

### 3) Draft the submission (no publishing yet)

**Direct create page (recommended):** `https://studio.wardenprotocol.org/agents/create`

#### Current “Register Agent” form fields

Fill the form top-to-bottom to match the UI sections:

1. **API details**
   - **API URL\*** — your agent’s HTTPS endpoint
   - **API Key** — if your endpoint requires a key  
     _Never paste secrets into chat; enter them directly into the Studio field._

   The UI may also show helper links like **“Build an agent using LangGraph”** / **“How it works”**.

2. **Info**
   - **Agent Name\***
   - **Select agent skills\*** — choose the relevant skill tags
   - **Describe the key features of the agent\*** — short, accurate capability summary

3. **Agent avatar**
   - Paste link to add an agent avatar → **Image link** (URL)

4. **Billing model**
   - Choose how the agent charges users: **Per inference** or **Free**
   - If **Per inference**: **Cost in USDC\*** (numeric)

5. **Agent Preview**
   - **Agent name**
   - **Short description about your agent** (max **100** characters)

6. Final action: **Register agent**

Navigate to the agent submission flow (or go directly to `https://studio.wardenprotocol.org/agents/create`), then fill fields in a deterministic order:

1. **Identity**
   - Agent name
   - Short tagline (if any)
   - Category (if any)

2. **Capabilities**
   - Description
   - Skills (keywords and/or bullet list)
   - Links (docs, GitHub, website) if requested

3. **Integration**
   - API URL (service endpoint)
   - Auth:
     - API key field (if present), or
     - header/token configuration (if present)

4. **Branding**
   - Upload avatar
   - Optional banner/images (if supported)

5. **Monetization**
   - Choose billing model (free vs paid/per inference) if supported
   - Review any platform/registration fee disclosures

At the end of drafting, stop and show the user a **Submission Summary**:

- Agent name + description (1–2 lines)
- Skills list
- API URL (domain + path)
- Auth method (mask any key/token)
- Billing model + any displayed fees

### 4) Publish / register (requires explicit approval)

**Execution gate:** Do not click the final "Publish / Register / Submit" button unless the user explicitly replies with **"yes, publish"** or **"yes, execute"** (or an unambiguous equivalent).

Before finalizing, summarize:

- What action will happen (publish/register agent listing)
- What network/payment is involved (e.g., Base; registration fee + gas, as shown in the UI)
- Any costs shown in the UI (USDC amount + estimated gas)
- What could go wrong:
  - wrong endpoint / downtime → failed validation
  - wrong billing settings
  - wallet prompt on wrong network
  - unintended fee payment

Then proceed with the final click and wallet confirmation step (user signs in their wallet).

### 5) Post-publish verification

After publishing/registration:

- Confirm status in Studio:
  - "Submitted", "Pending", "Published", etc.
- Capture any agent identifier or link shown (listing URL).
- Check the agent appears in Studio's Agents list.
- If the UI mentions distribution:
  - verify it appears in Warden Agent Hub → Community tab (when available)
- Record any errors verbatim and capture screenshots of:
  - validation errors
  - payment failures
  - endpoint/auth failures

## Troubleshooting playbook

Common failures and fixes:

- **Endpoint validation fails**
  - Check HTTPS, trailing slashes, versioned paths
  - Confirm the agent server is live and not geo-blocked
  - If auth required, verify the correct key/token was entered in UI (never paste it into chat)

- **Wallet/network mismatch**
  - Ensure wallet is on the correct network (e.g., Base) if Studio requires it

- **Insufficient funds**
  - Add USDC on Base for fee and ETH on Base for gas, then retry

## Building a wrapper skill other agents can use

When asked to "create a skill that lets other agents publish via Warden Studio":

1. Record the minimal repeatable workflow (URLs + UI landmarks) in `references/warden-studio-ui-notes.md`.
2. Keep `SKILL.md` stable and general; put volatile UI selectors, screenshots, and clickpaths in references.
3. Only add deterministic scripts if they reduce errors (e.g., a submission summary checklist formatter).

## References

- Read `references/warden-studio-ui-notes.md` for the latest Studio navigation map, observed fields, and publishing quirks.
