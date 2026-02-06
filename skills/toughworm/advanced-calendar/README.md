# Advanced Calendar Skill for OpenClaw

A sophisticated calendar management skill that understands natural language and seamlessly integrates with your workflow.

## 🌟 Features

- **Natural Language Processing**: Talk to your calendar in everyday language
- **Smart Event Creation**: Automatically extracts dates, times, durations, and reminders
- **Interactive Assistance**: Asks for missing information when needed
- **Multi-Channel Notifications**: Sends notifications via WhatsApp, Discord, Telegram, Signal, and other configured channels
- **Persistent Reminders**: If no acknowledgment is received, reminders repeat every 15 minutes like a snooze alarm
- **Flexible Reminders**: Set reminders minutes, hours, or days in advance
- **Full CRUD Operations**: Create, read, update, delete calendar events
- **Local Storage**: All data stored privately on your system
- **Zero External Dependencies**: Works completely offline

## 🚀 Quick Start

After installation, simply talk to your OpenClaw assistant:

```
You: "Schedule a meeting with the team tomorrow at 2pm, lasting 1 hour, remind me 30 minutes before"
OpenClaw: ✅ Created event: meeting with the team
         Time: 2026-02-03 14:00, Duration: 60 minutes, Reminder: 30 minutes before
```

## 🛠️ Installation

```bash
clawhub install advanced-calendar
```

## 📖 Examples

### Natural Language Commands
- `"Create a dentist appointment next Friday at 10am, remind me 2 hours before"`
- `"What do I have scheduled for tomorrow?"`
- `"I have lunch with Sarah today at noon"`
- `"Show me my calendar for this week"`

### Structured Commands
```bash
calendar create --title "Team Meeting" --date 2026-02-15 --time 14:00 --reminder 30
calendar list --days 7
```

## 🔧 Configuration

The skill works out-of-the-box with sensible defaults. Optional configuration includes:

- Setting up WhatsApp notifications for reminders
- Adjusting default reminder times
- Modifying natural language parsing rules

## 🤝 Contributing

We welcome contributions! Feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support, please open an issue in the repository or visit the OpenClaw community forums.