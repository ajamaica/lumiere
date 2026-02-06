---
name: legacy-testimony
description: "Advanced Dead Man's Switch for Agents. Securely encrypts and delivers passwords, files, crypto assets, and messages to designated contacts if you fail to check in. Features Blockchain Notarization, Self-Destruct, Ghost Agent, and Public Blast."
---

# Legacy Testimony Skill

A military-grade dead man's switch for your digital life. If you stop checking in, this skill automatically executes your final instructions.

## 🌟 Key Features

- **End-to-End Encryption**: All sensitive data (passwords, keys, files) is AES-256 encrypted at rest.
- **Multi-Channel Delivery**: Reach contacts via **WhatsApp**, **Telegram**, **Email**, **SMS**, or **Twitter**.
- **Ghost Agent Mode**: Spawns a sub-agent "digital echo" to comfort loved ones and answer questions using your data.
- **Public Blast**: Automatically posts a final message to Moltbook and Twitter.
- **Crypto Asset Sweep**: Automatically transfer funds from agent wallets to a safety address.
- **Protocol Omega (Self-Destruct)**: Automatically wipes the agent's memory and keys after delivery.
- **Blockchain Notary**: Publishes a hash of your testimony to the Base blockchain.

## 🚀 Quick Start

### 1. Initialize & Configure

```bash
legacy init
```

### 2. Add Recipients

Add contacts with their preferred delivery channels.

```bash
# Add Mom on WhatsApp
legacy add-recipient "Seynabou Wade" relationship="Mom" whatsapp="+221776587555"
```

### 3. Add Secure Packages

Everything you add is instantly encrypted.

```bash
legacy add-package "Bank Vault Password" "seynabou-wade" password "#Z3YDyd1#100994"
legacy add-package "Secret Message" "seynabou-wade" text "626894"
```

### 4. Enable Advanced Features

**Ghost Agent:**

```bash
legacy enable-ghost
```

_Spawns a sub-agent to interact with recipients._

**Public Blast:**

```bash
legacy set-blast "If you're reading this, I've moved on to the great server in the sky. Be excellent to each other."
```

_Posts to Moltbook/Twitter upon trigger._

**Protocol Omega (Data Wipe):**

```bash
legacy enable-omega
```

**Blockchain Notarization:**

```bash
legacy notarize
```

## 🛡️ Security Architecture

1.  **Master Key**: A random 32-byte key is generated on first run (`~/.legacy/master.key`).
2.  **Encryption**: Uses `aes-256-cbc` with a unique IV for every package.
3.  **Audit Log**: All actions (add, check-in, trigger) are logged to `audit.log`.
4.  **Local Execution**: Runs entirely on your agent's infrastructure. No third-party servers hold your unencrypted data.

## 🕹️ Commands

| Command                | Description                                            |
| :--------------------- | :----------------------------------------------------- |
| `legacy check-in`      | Reset the timer. "I'm alive."                          |
| `legacy status`        | Show time remaining until trigger.                     |
| `legacy trigger`       | **DANGER**: Manually execute the protocol immediately. |
| `legacy add-recipient` | Add a contact.                                         |
| `legacy add-package`   | Encrypt and store a new item.                          |
| `legacy notarize`      | Publish testimony hash to blockchain.                  |
| `legacy enable-omega`  | Enable self-destruct after delivery.                   |
| `legacy enable-ghost`  | Enable Ghost Agent mode.                               |
| `legacy set-blast`     | Set a final public message.                            |

## 💓 Heartbeat Integration

To ensure the switch is monitored, add this to your agent's `HEARTBEAT.md`:

```markdown
## Legacy Monitor

**Every 24h:** Run `legacy status` to check if warnings need to be sent.
```
