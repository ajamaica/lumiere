# Advanced Calendar Skill v1.02 Release Notes

## New Features

### Multi-Channel Notifications
- Added support for notifications across multiple communication channels
- Works with all OpenClaw-supported channels (WhatsApp, Discord, Telegram, Signal, etc.)
- No longer limited to WhatsApp-only notifications

### Persistent Reminders
- Implemented snooze-alarm-style repeated notifications
- If no acknowledgment is received, reminders repeat every 15 minutes
- Stops only when user responds with acknowledgment keywords

### Acknowledgment Recognition
- Recognizes common acknowledgment phrases like "OK", "Got it", "Received", "Understood", "Ack", etc.
- Automatically stops repeated notifications upon receiving acknowledgment
- Allows users to opt-out of repeated reminders by confirming receipt

## Improvements

- Enhanced notification reliability and coverage
- Better user experience with guaranteed message delivery
- More flexible notification options to suit different user preferences
- Improved reminder persistence to ensure important events aren't missed

## Configuration Updates

New configuration options added:
- Repeat reminder intervals (default: every 15 minutes)
- Customizable acknowledgment keywords
- Multi-channel notification preferences

## Breaking Changes

None. This is a backward-compatible update that enhances existing functionality.

## Upgrade Instructions

Simply update the skill using:
```bash
clawhub update advanced-calendar
```

Your existing calendar events and settings will remain intact.