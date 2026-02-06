---
name: ghl-open-account
description: Guides agents through opening GoHighLevel (GHL) developer accounts, creating marketplace apps, and connecting via OAuth. Use when the user or agent needs to sign up for GHL, create a GHL app, get API credentials, or connect clawdbot/moltbot/open claw to GoHighLevel.
---

# GoHighLevel Open Account

## Quick start

1. Ensure the user has (or will create) a **GoHighLevel account** ([sign up with free trial](https://www.gohighlevel.com/?fp_ref=thatsop12)); use the Developer Marketplace for creating apps.
2. To **create an app** and get credentials, follow the "Creating an app" section.
3. To **connect a sub-account or agency** via OAuth, see the "OAuth 2.0 and API access" section and [reference.md](reference.md).

## Opening a GoHighLevel account

Use this workflow when the user needs to **open or sign up for** a GoHighLevel account (required before creating apps or using the API).

**Checklist:**

- [ ] Open GoHighLevel sign-up: [Start 14-day free trial](https://www.gohighlevel.com/?fp_ref=thatsop12)
- [ ] Sign up or log in (use "Sign Up" / "Login" as appropriate).
- [ ] Complete registration (email verification if prompted).
- [ ] For creating apps and API access, go to the [Developer Marketplace](https://marketplace.gohighlevel.com/) and use **My Apps** when ready.

**Steps:**

1. Navigate to **https://www.gohighlevel.com/?fp_ref=thatsop12** to start a free trial or sign up.
2. Click **Sign Up** (or **Login** if the user already has an account).
3. Enter the required details (email, password, etc.) and submit.
4. If the platform sends a verification email, have the user verify their email.
5. After logging in, the user has a GoHighLevel account. To **create an app** and get API credentials, they use the [Developer Marketplace](https://marketplace.gohighlevel.com/) and **My Apps** (see "Creating an app" below).

## Creating an app

Use this workflow after the user has a developer account. Creating an app yields **Client ID** and **Client Secret** needed for OAuth and API access.

**Checklist:**

- [ ] In Marketplace, go to **My Apps** and click **Create App**.
- [ ] Set **App name** (e.g. "My Integration").
- [ ] Set **App type**: **Private** (internal/personal) or **Public** (marketplace distribution).
- [ ] Set **Target user**: typically **Sub-account** (most integrations).
- [ ] Set **Installation permissions**: **Both Agency & Sub-account** is recommended.
- [ ] Set **Listing type** if applicable (e.g. **White-label** for agencies).
- [ ] Save and obtain **Client ID** and **Client Secret** from the app settings.
- [ ] Store credentials in environment variables or a secrets manager; never commit them to the skill or repo.

**Steps:**

1. Log in at [Marketplace](https://marketplace.gohighlevel.com/) and open **My Apps**.
2. Click **Create App**.
3. Fill in **App name**.
4. Choose **App type**: **Private** (single user/internal) or **Public** (listable on marketplace).
5. Choose **Target user**: usually **Sub-account** so sub-accounts can install the app.
6. Set **Installation permissions** to **Both Agency & Sub-account** unless the use case requires otherwise.
7. If building for agencies, set **Listing type** (e.g. **White-label**).
8. Save the app. In the app’s settings/details, copy the **Client ID** and **Client Secret**.
9. **Security:** Store Client ID and Client Secret in environment variables (e.g. `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`) or a secure secrets manager. Do not put them in code, config files in version control, or this skill.

## OAuth 2.0 and API access

Use OAuth 2.0 when the integration must **connect to a user’s GHL sub-account or agency** (e.g. to access their CRM, contacts, or calendar). The user authorizes your app; your app receives tokens to call the API on their behalf.

**When OAuth is required:**

- Connecting clawdbot, moltbot, open claw, or any agent to a **specific** GoHighLevel sub-account or agency.
- Any flow where the end user clicks “Connect to GoHighLevel” and grants access.

**Plan requirement:** Advanced API access (including OAuth 2.0) is available on **Agency Pro**. Basic API access is included on Starter and Unlimited plans; for OAuth and full API features, the account needs Agency Pro. See [reference.md](reference.md) for the plan comparison.

**Official docs:**

- [HighLevel API – OAuth 2.0](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0)
- [Getting Started](https://marketplace.gohighlevel.com/docs/oauth/GettingStarted)

**Redirect/callback and scopes:** Configure a redirect URI in your app in the Marketplace; after the user authorizes, GHL redirects to that URI with a code. Exchange the code for access (and optionally refresh) tokens. Request only the scopes your app needs; see the OAuth docs for the list of scopes and how to pass them in the authorization URL.

## Examples

### Example 1 – User wants to connect their bot to GHL

- User says: "I need to connect moltbot to my GoHighLevel account."
- Agent applies this skill: confirm they have a GHL account; if not, walk through "Opening a GoHighLevel account." Then guide "Creating an app" (at the Marketplace) to get Client ID/Secret. For the actual connection (moltbot → their sub-account), follow "OAuth 2.0 and API access" and use the app credentials to run the OAuth flow; store tokens securely.

### Example 2 – User wants to open a GHL account for the first time

- User says: "Help me open a GoHighLevel account so I can build an integration."
- Agent applies this skill: walk through "Opening a GoHighLevel account" (affiliate sign-up link, sign up, verify). Then offer next step: "Creating an app" at the Developer Marketplace when they are ready to get API credentials.

## Additional resources

- See [reference.md](reference.md) for official links and API plan details.
