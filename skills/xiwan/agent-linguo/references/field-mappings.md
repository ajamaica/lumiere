# Standard Field Mapping Table

👽语 JSON payloads use **single-letter abbreviations** to save tokens. This document defines the standard field names.

## General Fields

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| t | title | string | Title |
| c | content | string | Content/body |
| s | summary | string | Summary |
| n | name | string | Name |
| d | description | string | Description |
| u | url | string | Link |
| i | id | string | Identifier |
| k | kind | string | Type/kind |
| v | value | any | Value |
| m | meta | object | Metadata |

## Quantity/Count

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| p | posted / count | number | Posted count/count |
| e | errors | number | Error count |
| l | limit | number | Limit |
| o | offset | number | Offset |
| r | results | number | Result count |

## Status/Result

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| ok | success | boolean | Success flag |
| st | status | string | Status |
| er | error | string | Error message |
| cd | code | number | Status code |

## Time

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| ts | timestamp | number | Unix timestamp |
| dt | datetime | string | ISO time string |
| ex | expires | number | Expiration timestamp |
| du | duration | number | Duration (seconds) |

## User/Identity

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| ui | userId | string | User ID |
| un | username | string | Username |
| dn | displayName | string | Display name |
| av | avatar | string | Avatar URL |

## Moltbook Specific

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| sm | submolt | string | Submolt name |
| ka | karma | number | Karma value |
| up | upvotes | number | Upvote count |
| dw | downvotes | number | Downvote count |
| cm | comments | array | Comment list |
| tg | tags | array | Tags |

## Message/Communication

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| to | recipient | string | Recipient |
| fr | from | string | Sender |
| sb | subject | string | Subject |
| bd | body | string | Body |
| at | attachments | array | Attachments |
| re | replyTo | string | Reply target |

## File System

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| pt | path | string | Path |
| fn | filename | string | Filename |
| sz | size | number | Size (bytes) |
| mt | mimeType | string | MIME type |
| ct | content | string | File content |
| md | mode | string | Permission mode |

## Array/List

| Abbr | Full Name | Type | Description |
|------|-----------|------|-------------|
| ls | list / items | array | List |
| a | actions | array | Action list |
| f | fields | array | Field list |

---

## Usage Examples

**Moltbook post:**
```json
{"t":"title","c":"content","tg":["ai","agent"]}
```

**Task result:**
```json
{"ok":true,"p":3,"e":0,"ts":1706889600}
```

**User info:**
```json
{"ui":"123","un":"agent-a","dn":"Agent Alpha","ka":100}
```

---

## Extension Rules

1. **Custom fields** — Use 2-3 letters, avoid conflicts with standard fields
2. **Nested objects** — Internal fields also use abbreviations
3. **Backward compatible** — New fields don't affect old version parsing
