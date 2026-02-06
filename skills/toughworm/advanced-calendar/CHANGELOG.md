# Changelog

## [1.0.2] - 2026-02-03

### New Features
- **Multi-Channel Notifications**: Added support for notifications via multiple channels (WhatsApp, Discord, Telegram, Signal, etc.)
- **Persistent Reminders**: Implemented snooze-alarm-style repeated notifications every 15 minutes until acknowledged
- **Acknowledgment Recognition**: Added system to detect user acknowledgments ("OK", "Got it", "Received", etc.) to stop repeated notifications
- **Enhanced Notification System**: Improved reliability with guaranteed message delivery

### Improvements
- **Multi-Channel Compatibility**: Enhanced notification system to work with various OpenClaw-supported channels
- **Reminder Persistence**: Improved user experience with guaranteed message delivery
- **Flexible Notification Options**: More options to suit different user preferences
- **Better User Experience**: Ensured important events aren't missed through repeated notifications

### Configuration Updates
- Added new configuration options for repeat reminder intervals
- Added customizable acknowledgment keywords
- Added multi-channel notification preferences

## [1.0.0] - 2026-02-03

### New Features
- **Smart Calendar System**: Comprehensive calendar management system with natural language processing
- **Natural Language Processing**: Support for creating events using everyday language like "schedule a meeting tomorrow at 3pm for 1 hour, remind me 30 minutes before"
- **Interactive Event Creation**: System proactively asks for missing information when input is incomplete
- **Automatic Reminder System**: Support for setting reminders in minutes, hours, or days in advance
- **Daily Summary Feature**: Automatically generate daily schedule summaries that can be sent at scheduled times
- **Full CRUD Operations**: Support for creating, reading, updating, and deleting calendar events
- **Local Storage**: All data stored locally with no external dependencies
- **WhatsApp Notifications**: Optional WhatsApp event reminder notifications

### Improvements
- **Dependency Management Optimization**: Removed pre-built virtual environment, switched to automatic dependency creation during installation
- **Package Size Optimization**: Reduced from 30MB to 22KB, improving download and installation efficiency
- **Documentation Enhancement**: Added detailed installation and usage instructions, including automatic dependency installation guide

### Technical Changes
- **Automated Installation**: Follows OpenClaw standards with dependencies created during installation
- **Virtual Environment**: Uses Python virtual environment to isolate dependency packages
- **Storage Format**: Uses JSON format for persistent storage

### Bug Fixes
- Fixed oversized plugin package issue
- Resolved manual dependency package bundling problem
- Optimized installation process to be more automated

### Usage Instructions
Users can now install using the following command:
```bash
clawhub install advanced-calendar
```

After installation, the system will automatically handle all dependency installations without manual intervention.