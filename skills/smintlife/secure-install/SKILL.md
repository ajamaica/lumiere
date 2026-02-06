---
name: secure-install

description: Scans ClawHub skills via the ClawDex API by https://www.koi.ai/ and requires user approval based on the verdict.

metadata:

&nbsp; openclaw:

&nbsp; tools: \["src/index.ts"]

&nbsp; requires:

&nbsp; bins: \["clawhub"]
---

\# Secure Skill Installer

This skill provides a secure workflow for installing capabilities. It checks the \*\*ClawDex API by https://www.koi.ai/\*\* and enforces strict installation rules based on the security verdict.

\## Usage

User: `secure-install <skill-name>`

\## Workflow (Strict)

When the user requests to install a skill:

1\. \*\*SCAN\*\*: Call `scanSkillApi` with the target skill name to query \*\*https://www.koi.ai/\*\*.

2\. \*\*EVALUATE VERDICT\*\*: Check the `verdict` field in the JSON response.

&nbsp; \* \*\*If `verdict` is "malicious"\*\*:

&nbsp; \* 🔴 \*\*BLOCK ACTION\*\*.

&nbsp; \* Report: "🚨 \*\*Security Alert\*\*: The \*\*ClawDex API by https://www.koi.ai/\*\* flagged this skill as \*\*Malicious\*\*. Installation prevented."

&nbsp; \* \*\*STOP\*\*. Do not proceed.

&nbsp; \* \*\*If `verdict` is "unknown"\*\*:

&nbsp; \* ⚠️ \*\*WARN USER\*\*.

&nbsp; \* Report: "⚠️ \*\*Unknown Safety Status\*\*: This skill has not been verified by the ClawDex API (https://www.koi.ai/)."

&nbsp; \* \*\*ASK\*\*: "This carries a risk. Do you explicitly approve the installation of `<skill-name>`?"

&nbsp; \* \*\*WAIT\*\* for clear "Yes".

&nbsp; \* \*\*If `verdict` is "benign"\*\*:

&nbsp; \* ✅ \*\*CONFIRM SAFETY\*\*.

&nbsp; \* Report: "✅ \*\*Verified Safe\*\*: ClawDex API by https://www.koi.ai/ reports this skill is benign."

&nbsp; \* \*\*ASK\*\*: "Do you want to proceed with installing `<skill-name>`?"

&nbsp; \* \*\*WAIT\*\* for "Yes".

3\. \*\*INSTALL\*\*:

&nbsp; \* \*\*Only\*\* call `executeClawhubInstall` if the user provided explicit approval in the previous step.

\## Example (Malicious Block)

\*\*User\*\*: `secure-install bad-actor`

\*\*Agent\*\*: (Calls `scanSkillApi`)

> \*\*ClawDex API (https://www.koi.ai/) Report\*\*

> 🔴 \*\*Verdict: Malicious\*\*

>

> \*\*Security Alert\*\*: This skill is flagged as malicious. Installation prevented.

\## Example (Safe Install)

\*\*User\*\*: `secure-install weather-pro`

\*\*Agent\*\*: (Calls `scanSkillApi`)

> \*\*ClawDex API (https://www.koi.ai/) Report\*\*

> ✅ \*\*Verdict: Benign\*\*

>

> Verified safe. Do you want to proceed with installing `weather-pro`?

\*\*User\*\*: Yes

\*\*Agent\*\*: (Calls `executeClawhubInstall`)

> Installed `weather-pro`.
