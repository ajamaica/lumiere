# Helpscout Skill

## Description

This skill interacts with Helpscout to fetch all conversations from specific inboxes. It is designed to streamline the retrieval of customer support conversations directly into OpenClaw, ensuring easy integration and follow-up.

## Features

- Fetch conversations from multiple Helpscout inboxes.
- Securely authenticate using an API key and App Secret.
- Handle potential errors like invalid credentials or network issues gracefully.

## Setup Instructions

To use this skill, you need to configure Helpscout credentials and specify the IDs of the inboxes you want to fetch conversations from.

### 1. Retrieve Helpscout API Key & App Secret

1. Go to your Helpscout account.
2. Navigate to **Manage > Apps**.
3. Create or open your app to retrieve the following details:
   - **API Key**
   - **App Secret**

### 2. Collect Inbox IDs

1. Retrieve the IDs of the inboxes you want to fetch conversations from using Helpscout’s [API documentation](https://developer.helpscout.com/).

### 3. Save Credentials in OpenClaw

Use the following command to save your Helpscout credentials:

```bash
cat ~/.openclaw/openclaw.json | jq '.skills.helpscout = {
  "apiKey": "your-api-key",
  "appSecret": "your-app-secret",
  "inboxIds": ["inbox-id-1", "inbox-id-2"]
}' | openclaw gateway config.apply
```

### 4. Verify Configuration

To ensure the credentials are properly set, check your configuration:

```bash
openclaw gateway config.get
```

Make sure the `helpscout` object looks correct (avoid sharing the `apiKey` or `appSecret`).

### Usage

- Once the setup is complete, the skill will securely authenticate and fetch conversations based on the specified inbox IDs.
- If credentials or inbox IDs are missing or invalid, the skill will throw a detailed error message to help you fix the issue.

### Security Best Practices

- Never hardcode credentials into your codebase.
- Use OpenClaw’s `config.apply` system for securely managing sensitive details.
- Avoid sharing sensitive parts of your configuration output (`apiKey` and `appSecret`) with others.

## Contribution Guidelines

- Ensure compliance with Helpscout’s API usage policies.
- Add documentation for any new features added.
