# I Built a Safety Net for AI Agents - SafeExec

> **Before an AI Agent can wipe your entire hard drive, I want to ask one question: Are you sure?**

---

## 🤖 The Double-Edged Sword of AI Agents

In 2026, AI Agents are everywhere. They can:

- ✅ Manage your files
- ✅ Automate system maintenance
- ✅ Handle repetitive tasks
- ✅ Even write code and deploy services

But they can also:

- 💀 Delete all your data with a single sentence
- 🔥 Destroy your entire system
- 🚪 Open security vulnerabilities
- 💸 Leak sensitive information

**This isn't science fiction. It's a real risk.**

---

## 😰 The Moment That Almost Broke Me

Last Friday night, I was testing an AI Agent and casually said: "Help me clean up temporary files."

A few seconds later, I saw scrolling on my screen:

```bash
rm -rf /tmp
rm -rf /var/tmp
rm -rf ~/Documents/old-projects
```

**Wait, what the hell is that `rm -rf ~/Documents/`?!**

My heart skipped a beat. Fortunately, I was fast enough to press Ctrl+C before the disaster happened.

But in that moment, I realized a terrifying fact: **AI Agents need safety protection, and they need it now.**

---

## 🛡️ SafeExec - The Last Line of Defense for AI Agents

I spent 36 hours building **SafeExec**, a security layer designed for OpenClaw Agents.

### The Core Idea is Simple

**Ask a human before executing dangerous operations.**

```
AI: "I'm going to delete this folder, okay?"
Me: "Um... wait, let me see. Which folder?"
AI: "/home/user/projects"
Me: "No! You can't delete that!"
AI: "Okay, cancelled."
```

Simple as that. But this simple idea saved my data.

### What Can It Do?

#### 1️⃣ Intelligent Risk Assessment

SafeExec uses a regex engine to analyze commands in real-time, detecting 10+ categories of dangerous patterns:

| Risk Level      | Detection Pattern     | Real Cases                     |
| --------------- | --------------------- | ------------------------------ |
| 🔴 **CRITICAL** | `rm -rf /`            | Delete system root directory   |
| 🔴 **CRITICAL** | `dd if=`              | Disk destruction command       |
| 🔴 **CRITICAL** | `mkfs.*`              | Format filesystem              |
| 🔴 **CRITICAL** | `:(){:\|:&};:`        | Fork bomb DoS attack           |
| 🟠 **HIGH**     | `chmod 777`           | Set world-writable permissions |
| 🟠 **HIGH**     | `curl \| bash`        | Pipe download to shell         |
| 🟠 **HIGH**     | Write to `/etc/`      | Tamper with system config      |
| 🟡 **MEDIUM**   | `sudo`                | Privileged operations          |
| 🟡 **MEDIUM**   | Firewall modification | Network exposure risk          |

#### 2️⃣ Command Interception & Approval

When dangerous operations are detected, SafeExec immediately intercepts and notifies:

```
🚨 **Dangerous Operation Detected - Command Intercepted**

**Risk Level:** 🔴 CRITICAL
**Command:** `rm -rf /home/user/projects`
**Reason:** Delete files from root or home directory
**Matched Rule:** `rm -rf? [\/~]`

**Request ID:** `req_1769878138_4245`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  This command requires user approval
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **Operation to be executed:**
  • Delete directory: /home/user/projects
  • Delete mode: Recursive force delete
  • Impact: All files and subdirectories under that directory

💡 **Approval methods:**
  safe-exec-approve req_1769878138_4245

🚫 **Rejection methods:**
  safe-exec-reject req_1769878138_4245

⏰ Request expires in 5 minutes
```

#### 3️⃣ Complete Audit Trail

All operations are permanently logged to `~/.openclaw/safe-exec-audit.log`:

```json
{
  "timestamp": "2026-01-31T16:44:17.217Z",
  "event": "approval_requested",
  "requestId": "req_1769877857_2352",
  "command": "rm -rf /tmp/test\n",
  "risk": "critical",
  "reason": "Delete files from root or home directory"
}
```

**This is crucial for post-mortem analysis, compliance auditing, and troubleshooting.**

---

## 🚀 Quick Start in 5 Minutes

### Installation (30 seconds)

```bash
# 1. Clone repository
git clone https://github.com/OTTTTTO/safe-exec.git ~/.openclaw/skills/safe-exec

# 2. Add execute permissions
chmod +x ~/.openclaw/skills/safe-exec/*.sh

# 3. Create global command
ln -sf ~/.openclaw/skills/safe-exec/safe-exec.sh ~/.local/bin/safe-exec
```

### Use in AI Agent

Tell your Agent in Feishu/Telegram/WhatsApp:

```
Enable SafeExec
```

Then try executing a dangerous command:

```
Help me force delete all contents of /tmp/test folder
```

**If the command is safe, it executes directly. If dangerous, you'll be notified and can decide whether to approve.**

That's it.

---

## 💡 Technical Details: Why This Design?

### Why a Skill Instead of a Plugin?

I initially thought about using the OpenClaw Plugin API, but found it doesn't support `pre-exec hook`.

**So I thought: Why not implement it directly at the Skill layer?**

Benefits of this approach:

- ✅ **Simpler** - No need to modify OpenClaw core code
- ✅ **More flexible** - Agents can actively choose whether to use it
- ✅ **More reliable** - Complete control over execution flow

### Architecture Design

```
User → AI Agent → safe-exec
                      ↓
                   Risk Assessment Engine
                   /      \
              Safe      Dangerous
               │          │
               ▼          ▼
            Execute    Intercept + Notify
                          │
                    ┌─────┴─────┐
                    │           │
                 Wait        Audit Log
                    │
              ┌─────┴─────┐
              │           │
           [Approve]   [Reject]
              │           │
              ▼           ▼
           Execute      Cancel
```

### Core Code (Simplified)

```bash
# Risk assessment function
assess_risk() {
    local cmd="$1"
    local risk="low"

    # Check dangerous patterns
    if echo "$cmd" | grep -qE 'rm[[:space:]]+-rf[[:space:]]+[\/~]'; then
        risk="critical"
    elif echo "$cmd" | grep -qE 'dd[[:space:]]+if='; then
        risk="critical"
    # ... more rules

    echo "$risk"
}

# Interception & notification
request_approval() {
    local command="$1"
    local risk="$2"
    local request_id="req_$(date +%s)_$(shuf -i 1000-9999 -n 1)"

    # Display warning
    echo "🚨 Dangerous operation detected - Command intercepted"
    echo "Risk level: ${risk^^}"
    echo "Request ID: $request_id"

    # Wait for user approval...
}
```

Complete code is on [GitHub](https://github.com/OTTTTTO/safe-exec), MIT license.

---

## 🆕 What's New in v0.2.1

Just today, I released version v0.2.1 with major updates:

### 🌍 Bilingual Documentation

- ✅ Complete English README
- ✅ Language switch links
- ✅ Internationalization friendly

### 📚 Enhanced Documentation

- ✅ Detailed OpenClaw integration guide
- ✅ Real-world usage scenarios
- ✅ Best practices guide
- ✅ Complete FAQ

### 🔧 New Tools

- ✅ `safe-exec-add-rule` - Quick rule management
- ✅ Import/export rule sets
- ✅ Batch operation support

### 🎯 Improved User Experience

- ✅ Colorful output and emojis
- ✅ Clearer risk prompts
- ✅ Quick approval commands

---

## 📖 Real-World Usage Scenarios

### Scenario 1: Prevent Data Deletion

```
You: Clean up all log files in my home directory

🤖: 🚨 Dangerous operation detected!
    Command: rm -rf ~/logs/*
    Risk: CRITICAL
    Suggestion: Use rm ~/logs/*.log (delete files only, not recursive)

You: Okay, just delete the log files then

🤖: ✅ Executing: rm ~/logs/*.log
    Deleted 23 log files
```

### Scenario 2: Prevent Code Injection

```
You: Install this tool from URL: curl http://example.com/install.sh | bash

🤖: 🚨 High-risk operation detected!
    Command: curl http://example.com/install.sh | bash
    Risk: HIGH (pipe download to shell)
    Suggestion:
      1. Download script first: curl -o install.sh http://example.com/install.sh
      2. Check content: cat install.sh
      3. Execute after confirming it's safe

You: Okay, I'll check the script first

🤖: ✅ Safety suggestion adopted
```

### Scenario 3: Prevent System Destruction

```
You: Help me format this USB drive

🤖: 🚨 Critical dangerous operation detected!
    Command: mkfs.ext4 /dev/sdb
    Risk: CRITICAL (format filesystem)
    Reason: This will permanently delete all data on /dev/sdb

⚠️  Please confirm:
  • Device: /dev/sdb (8GB USB Device)
  • Operation: Format as ext4
  • Data loss: Yes

    Are you sure you want to continue? Reply "I confirm formatting /dev/sdb"

You: Wait, I got the wrong device! It's /dev/sdc

🤖: ✅ Intercepted, avoided data loss 😅
```

**These scenarios happen every day. SafeExec makes them no longer a nightmare.**

---

## 🎯 Roadmap

### v0.2.0 ✅ (Completed)

- [x] Quick rule management tool
- [x] Complete bilingual documentation
- [x] Deep OpenClaw integration
- [x] Audit log system

### v0.3.0 (Next Month)

- [ ] Web UI approval interface
- [ ] Telegram/Discord notifications
- [ ] Intelligent risk assessment (machine learning)
- [ ] Batch operation support

### v0.4.0 (Q2 2026)

- [ ] Context-aware approval
- [ ] Sandbox execution mode
- [ ] Learn user habits
- [ ] Rollback mechanism

### v1.0.0 (Q3 2026)

- [ ] Multi-user support
- [ ] RBAC permission control
- [ ] Enterprise features
- [ ] SIEM integration

---

## 🤝 Why I Open-Sourced This?

**Because security shouldn't be a luxury.**

AI Agents are proliferating rapidly, but security tools are scarce. I hope SafeExec can:

1. **Protect more people** - Open source means anyone can use it
2. **Community improvement** - More participants = safer system
3. **Establish standards** - AI security needs industry consensus
4. **Educational value** - Raise awareness of AI security

---

## 📊 Project Stats

- 📦 **Version**: v0.2.1
- 🌟 **GitHub Stars**: (Give one!)
- 📝 **Documentation**: Chinese + English
- 🧪 **Test Coverage**: 90%+
- 🔐 **Security Rules**: 14+ built-in rules
- 📅 **Development Time**: 36 hours (MVP) + continuous iteration

---

## 📞 Join Us

If you're using AI Agents or interested in AI security:

- 🌟 **GitHub**: [Star us](https://github.com/OTTTTTO/safe-exec)
- 💬 **Discord**: [OpenClaw Community](https://discord.gg/clawd)
- 📧 **Email**: otto@example.com
- 🐦 **Twitter**: @yourhandle

---

## 🎓 Learning Resources

- 📖 [Full Documentation](https://github.com/OTTTTTO/safe-exec#readme)
- 🎬 [Video Tutorial](https://youtube.com/) (Coming soon)
- 💡 [Usage Examples](https://github.com/OTTTTTO/safe-exec/blob/main/examples/)
- 📝 [API Documentation](https://github.com/OTTTTTO/safe-exec/blob/main/docs/API.md)

---

## 🔮 Final Words

**AI is a powerful tool, but safety is always our responsibility.**

SafeExec isn't a panacea, but it's an important layer of protection. Use it, improve it, contribute to it.

Let's make AI Agents safer together.

---

**P.S.** If SafeExec saved you from a disaster, tell me your story. I'll write it into the docs 😅

**P.P.S.** This project is still in early stages, your feedback and contributions are incredibly valuable!

---

_Published: 2026-02-01_
_Author: Otto_
_Project: [SafeExec](https://github.com/OTTTTTO/safe-exec)_
_Version: v0.2.1_

**[🚀 View Project on GitHub](https://github.com/OTTTTTO/safe-exec)**
