# Advanced Calendar Skill - Update History

## Version 1.0.2 (Current)

### New Features
- **Multi-Channel Notifications**: Added support for notifications via multiple channels (WhatsApp, Discord, Telegram, Signal, etc.)
- **Persistent Reminders**: Added repeat reminder functionality that sends notifications every 15 minutes until acknowledged
- **Acknowledgment Tracking**: Implemented system to detect user acknowledgments ("OK", "Got it", "Received", etc.) to stop repeated notifications

### Improvements
- Enhanced notification system to work with various OpenClaw-supported channels
- Improved reminder reliability with snooze-alarm-style repetition
- Updated documentation to reflect new features

### Changes
- Updated version number to 1.0.2
- Modified SKILL.md, README.md, package.json, and PUBLISH.md to reflect new capabilities

---

## Version 1.0.0 (Initial Release)

### Original Features
- Natural Language Processing for event creation
- Smart parsing of dates, times, durations, and reminders
- Interactive event creation with information completion
- WhatsApp notifications for reminders
- Daily summary functionality
- Complete CRUD operations for calendar events
- Local JSON-based storage
- Cron integration for automated checks