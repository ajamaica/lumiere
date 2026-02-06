# Outlook Web UI Patterns

This document records discovered UI element patterns for Outlook Web. Update this file as you discover reliable selectors during usage.

## Email List

| Element           | Selector                              | Notes                                   |
| ----------------- | ------------------------------------- | --------------------------------------- |
| Email row         | `[role="option"]`                     | Each email in list, can click by ref ID |
| Unread emails     | Text "Unread" at start of option name | Prefix in option name                   |
| Collapsed threads | Text "Collapsed" in option name       | Has expand button                       |
| Sender name       | Generic element within option         | Displayed prominently                   |
| Subject line      | Generic element within option         |                                         |
| Preview text      | Generic element within option         | First ~100 chars                        |
| Timestamp         | Generic element with time             | e.g., "2:12 PM", "Sun 9:00 AM"          |

## Reading Pane

| Element              | Selector                            | Notes                        |
| -------------------- | ----------------------------------- | ---------------------------- |
| Subject              | `heading` with level 3              | At top of reading pane       |
| From                 | `heading` with "From:" prefix       | Level 3 heading              |
| To                   | Generic with "To:" prefix           | Shows recipient              |
| Date/Time            | `heading` with level 3              | e.g., "Mon 2/2/2026 2:12 PM" |
| Body                 | `document` with "Message body" role | Contains email content       |
| Reply button         | `menuitem "Reply"`                  | In quick actions toolbar     |
| Forward button       | `menuitem "Forward"`                | In quick actions toolbar     |
| Show message history | `button "Show message history"`     | For conversation threads     |

## Compose Window

| Element        | Selector                 | Notes                     |
| -------------- | ------------------------ | ------------------------- |
| To button      | `button "To"`            | Opens recipient picker    |
| Cc button      | `button "Cc"`            | Opens Cc field            |
| Bcc button     | `button "Bcc"`           | Opens Bcc field           |
| Subject        | `textbox "Subject"`      | Direct text input         |
| Body           | `textbox "Message body"` | Rich text editor          |
| Send button    | `button "Send"`          | Sends the email           |
| Discard button | `button "Discard"`       | Discards draft            |
| Pop Out button | `button "Pop Out"`       | Opens in new window       |
| Auto-save      | Automatic                | Drafts save automatically |

**Note**: To add recipients, click the "To" button which opens an address book picker. For programmatic use, consider filling recipient fields may require additional interaction with the contact picker UI.

## Toolbar Actions

| Element      | Selector                   | Notes |
| ------------ | -------------------------- | ----- |
| Reply        | `[aria-label='Reply']`     |       |
| Reply All    | `[aria-label='Reply all']` |       |
| Forward      | `[aria-label='Forward']`   |       |
| Delete       | `[aria-label='Delete']`    |       |
| Archive      | `[aria-label='Archive']`   |       |
| Move         | TBD                        |       |
| Flag         | TBD                        |       |
| Mark as read | TBD                        |       |

## Navigation

| Element            | Selector                    | Notes                     |
| ------------------ | --------------------------- | ------------------------- |
| Folder pane        | `region "Navigation pane"`  | Left sidebar with folders |
| Folder items       | `treeitem` with folder name | e.g., "Inbox 45 unread"   |
| Inbox link         | `treeitem "Inbox..."`       | Shows unread count        |
| Drafts link        | `treeitem "Drafts..."`      | Shows item count          |
| Search box         | `textbox` in search region  | At top of page            |
| New message button | `button "New"`              | In Home ribbon tab        |
| Mail button        | `button "Mail"`             | Left rail app bar         |
| Calendar button    | `button "Calendar"`         | Left rail app bar         |

## Calendar

| Element              | Selector                                  | Notes                        |
| -------------------- | ----------------------------------------- | ---------------------------- |
| Week view URL        | `/calendar/view/week`                     | Default view                 |
| Day view URL         | `/calendar/view/day`                      | Day view                     |
| Month view URL       | `/calendar/view/month`                    | Month view                   |
| Event buttons        | `button` with event details               | Contains time, title, status |
| New event button     | `button "New event"`                      | Creates new calendar event   |
| Recurring event icon | `img "Repeating event"`                   | Shows it's recurring         |
| Modified recurring   | `img "Repeating event that was modified"` | Exception to series          |

**Event button format**: Typically includes event title, time range, date, status (Busy/Free/Tentative), and whether it's recurring.

## Login Detection

Patterns that indicate user is not logged in:

- URL contains `login.microsoftonline.com`
- Page title: "Sign in to your account"
- Snapshot shows heading "Sign in" (level 1)
- Snapshot shows textbox with placeholder "Enter your email, phone, or Skype."
- Snapshot shows "Next" button

Login form elements:

- Email input: textbox with placeholder "Email, phone, or Skype"
- Next button: button "Next"

## Notes

- Outlook Web uses React; elements may have dynamic IDs
- Prefer ARIA labels over CSS classes when possible
- Some elements load asynchronously; may need to wait
- Microsoft may update UI; patterns may need periodic updates
