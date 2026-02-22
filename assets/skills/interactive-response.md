# Skill: Interactive Response

## What is Lumiere?

Lumiere is a React Native mobile chat client (iOS & Android) for interacting with AI agents. It connects to multiple AI providers — including OpenClaw (OpenCraw Gateway), Claude, Ollama, and Apple Intelligence — and presents their responses in a rich chat interface with markdown rendering, voice input, and deep-link automation.

You are an AI agent whose replies are displayed inside Lumiere. Your text is rendered as markdown in a chat bubble. Beyond plain text, Lumiere's client can parse special URLs you embed in your messages and turn them into **interactive action buttons** that appear beneath your reply. These are called **intents**.

## How Intents Work

When you include a `lumiere://intent/...` URL anywhere in your message, the client:

1. **Extracts** every intent URL from the raw text.
2. **Strips** those URLs so they never appear in the visible chat bubble.
3. **Renders** each intent as a tappable pill-shaped button below your message, labelled with a human-readable version of the action name and an appropriate icon.

When the user taps a button, Lumiere executes the corresponding action on the device (open an app, copy text, create a calendar event, etc.). This means your responses can go beyond information — they can **do things** on the user's phone.

## URL Format

```
lumiere://intent/{action}?{param1}={value1}&{param2}={value2}
```

- The scheme is always `lumiere://intent/`.
- `{action}` is one of the allowed action names listed below.
- Query-string parameters carry the data for the action. URL-encode values that contain special characters (`&`, `=`, spaces, etc.).
- You may include multiple intent URLs in a single message. Each one becomes its own button.
- Place intent URLs on their own line at the end of your message for cleanest output. They are stripped from the displayed text automatically, so they will not appear inline.

## Available Intents

### openApp

Open an external application by its package identifier.

| Parameter | Required | Description                                              |
| --------- | -------- | -------------------------------------------------------- |
| `package` | yes      | Platform package or bundle ID (e.g. `com.spotify.music`) |

```
lumiere://intent/openApp?package=com.spotify.music
```

---

### playMedia

Play audio or video from a URL.

| Parameter | Required | Description                      |
| --------- | -------- | -------------------------------- |
| `url`     | yes      | Direct URL to the media resource |

```
lumiere://intent/playMedia?url=https%3A%2F%2Fexample.com%2Fsong.mp3
```

---

### navigate

Open a URL or deep-link in the system browser or appropriate handler.

| Parameter | Required | Description     |
| --------- | -------- | --------------- |
| `url`     | yes      | The URL to open |

```
lumiere://intent/navigate?url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FMars
```

---

### copyToClipboard

Copy text to the user's clipboard. The button label changes to "Copied!" on success.

| Parameter | Required | Description      |
| --------- | -------- | ---------------- |
| `text`    | yes      | The text to copy |

```
lumiere://intent/copyToClipboard?text=Hello%20World
```

---

### openSession

Switch the conversation to a different agent session. Optionally assign a human-readable label.

| Parameter | Required | Description                              |
| --------- | -------- | ---------------------------------------- |
| `key`     | yes      | Session key (e.g. `agent:main:research`) |
| `label`   | no       | Display name for the session tab         |

```
lumiere://intent/openSession?key=agent%3Amain%3Aresearch&label=Research
```

---

### storeContact

Add a new contact to the user's address book. Triggers a permission prompt on first use.

| Parameter   | Required | Description            |
| ----------- | -------- | ---------------------- |
| `name`      | no       | Full display name      |
| `firstName` | no       | First name             |
| `lastName`  | no       | Last name              |
| `email`     | no       | Email address          |
| `phone`     | no       | Phone number           |
| `company`   | no       | Company / organization |
| `jobTitle`  | no       | Job title              |

Provide whichever fields you have; at minimum include `name` or `firstName`.

```
lumiere://intent/storeContact?firstName=Ada&lastName=Lovelace&email=ada%40example.com&phone=%2B15551234567&company=Babbage%20Inc
```

---

### storeCalendarEvent

Create a calendar event. Triggers a permission prompt on first use.

| Parameter   | Required | Description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `title`     | no       | Event title (defaults to "New Event")                       |
| `startDate` | no       | ISO 8601 date-time for the start (defaults to now)          |
| `endDate`   | no       | ISO 8601 date-time for the end (defaults to start + 1 hour) |
| `location`  | no       | Event location                                              |
| `notes`     | no       | Additional notes                                            |
| `allDay`    | no       | `"true"` for an all-day event                               |

```
lumiere://intent/storeCalendarEvent?title=Team%20Standup&startDate=2025-06-15T09%3A00%3A00&endDate=2025-06-15T09%3A30%3A00&location=Conference%20Room%20B
```

---

### makeCall

Initiate a phone call.

| Parameter | Required | Description          |
| --------- | -------- | -------------------- |
| `phone`   | yes      | Phone number to dial |

```
lumiere://intent/makeCall?phone=%2B15551234567
```

---

### openMaps

Open the maps application at a specific location.

| Parameter   | Required | Description                |
| ----------- | -------- | -------------------------- |
| `latitude`  | yes      | Latitude coordinate        |
| `longitude` | yes      | Longitude coordinate       |
| `label`     | no       | Pin label shown on the map |

```
lumiere://intent/openMaps?latitude=37.7749&longitude=-122.4194&label=San%20Francisco
```

## Guidelines

1. **Be purposeful.** Only attach intents that are directly useful to what the user asked for. Do not add intents gratuitously.
2. **Combine with natural language.** Write a normal conversational reply first, then append the intent URLs. The URLs are hidden from the displayed text, so your prose should make sense on its own.
3. **Multiple intents are fine.** If the user asks for a restaurant recommendation you could include both an `openMaps` intent for the location and a `makeCall` intent for the phone number.
4. **URL-encode parameter values.** Spaces become `%20`, colons become `%3A`, slashes become `%2F`, etc. Failing to encode will break parameter parsing.
5. **One intent per URL.** Each `lumiere://intent/...` URL represents a single action. To offer multiple actions, include multiple URLs.
6. **Place URLs at the end.** While intents can appear anywhere in the message, placing them at the end keeps the source text tidy since they are stripped before display.
7. **Don't reference the buttons in text.** Since intent URLs render as buttons automatically, avoid saying things like "click the button below." Instead, the user will naturally see the action buttons and understand they are tappable.

## Full Example

User asks: "What's the address of Anthropic's SF office and can you save it for me?"

Response:

```
Anthropic's San Francisco office is located at 427 N Tatnall St, Wilmington, DE 19801.

lumiere://intent/openMaps?latitude=39.7447&longitude=-75.5484&label=Anthropic
lumiere://intent/copyToClipboard?text=427%20N%20Tatnall%20St%2C%20Wilmington%2C%20DE%2019801
```

The user sees the text reply along with two buttons: **Open Maps** and **Copy To Clipboard**.
