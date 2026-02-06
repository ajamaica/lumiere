---
name: jami
description: Make automated calls via Jami (GNU Ring). Use for light VoIP calling, messaging, and peer-to-peer communication without infrastructure.
---

# Jami Calling Skill

Automate phone calls and messaging using Jami (free, decentralized, peer-to-peer VoIP).

## Quick Start

### Installation

```bash
# macOS - Download from jami.net or use Homebrew cask (if available)
brew install --cask jami

# Or download directly from https://jami.net/download/

# Linux
sudo apt install jami  # Debian/Ubuntu
```

### Setup

1. Install Jami app
2. Create/register a Jami account
3. Get your Jami ID (looks like a long hex string)
4. Configure in Clawdbot

### Make a Call

```bash
jami account list                    # List registered accounts
jami call <jami_id> <contact_id>    # Initiate call
jami hangup <call_id>               # End call
```

### Send Message

```bash
jami message send <contact_id> "Hello"
```

## CLI Usage

### Account Management

```bash
jami account list                    # List all accounts
jami account info <account_id>       # Show account details
jami account register <username>     # Register new account
jami account enable <account_id>     # Enable account
jami account disable <account_id>    # Disable account
```

### Calling

```bash
# Initiate call
jami call <account_id> <contact_id>

# List active calls
jami call list

# Get call status
jami call status <call_id>

# End call
jami hangup <call_id>

# Set volume
jami audio volume <volume_percent>
```

### Contacts & Messaging

```bash
# Add contact
jami contact add <account_id> <contact_id>

# List contacts
jami contact list <account_id>

# Send message
jami message send <contact_id> "Message text"

# Receive messages (daemon mode)
jami message listen
```

## Automated Calling Examples

### Simple outbound call

```bash
#!/bin/bash
ACCOUNT_ID="your_jami_account_id"
CONTACT_ID="contact_jami_id"

jami call $ACCOUNT_ID $CONTACT_ID
sleep 30  # Call duration
jami hangup
```

### Call with message

```bash
#!/bin/bash
ACCOUNT_ID="your_account"
CONTACT_ID="contact_id"

# Call
jami call $ACCOUNT_ID $CONTACT_ID

# Send message during/after call
jami message send $CONTACT_ID "Automated call from Clawdbot"

# Hangup after message
sleep 5
jami hangup
```

### Listen for incoming calls

```bash
jami daemon --listening  # Start daemon
jami call list          # Monitor calls
```

## Clawdbot Integration

### Configuration (in TOOLS.md)

```
## Jami Configuration
- Account ID: [your_jami_account_hex_id]
- Contacts:
  - name: contact_jami_id (hex string)
  - name: contact_jami_id
```

### Usage in Clawdbot

```
"Make a call to [contact]"
"Send message to [contact]"
"Hang up current call"
"List my Jami contacts"
```

## How Jami Works

**Decentralized:** No central server. Calls go peer-to-peer.
**DHT:** Uses Distributed Hash Table to find contacts.
**Secure:** Encryption built-in.
**Free:** No costs, no accounts, no subscriptions.
**Open Source:** Full source available.

## Limitations

- Need both parties running Jami (or on a compatible VoIP network)
- No traditional phone numbers (uses Jami IDs instead)
- Requires internet (VoIP)
- Audio quality depends on connection
- No built-in automated IVR (you'd handle that in scripts)

## Advanced: Self-Hosted

For serious automated calling, you can self-host a SIP gateway:

```bash
# Asterisk bridge (connect Jami to traditional phone systems)
# FreeSWITCH (lightweight alternative)
```

But for light calling, basic Jami CLI is sufficient.

## Bundled Resources

- `scripts/jami_caller.sh` - Make calls from CLI
- `scripts/jami_listener.sh` - Listen for incoming calls
- `references/jami_api.md` - Full Jami CLI reference
- `assets/jami_ids.txt` - Local contact database
