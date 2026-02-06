---
name: archon
description: Full Archon decentralized identity operations - local node management, DID creation, credential issuance, vault operations, and public network resolution.
homepage: https://archon.technology
metadata:
  project: archon
  type: identity
  networks:
    - archon
    - hyperswarm
  local_node: true
---

# Archon - Decentralized Identity Network

Archon is an open-source decentralized self-sovereign identity (SSI) system. This skill provides full Archon capabilities including local node management, DID operations, credential issuance, vault management, and public network access.

## Platform Support

**Cross-Platform (All Platforms):**

- ✅ Public network API operations (DID resolution, network stats)
- ✅ Keymaster CLI via npx (@didcid/keymaster)
- ✅ Read-only operations require only Node.js + curl

**Local Node Operations:**

- ✅ **Linux** - Native Docker support, all scripts work
- ✅ **macOS** - Docker Desktop, scripts work (minor command differences handled)
- ⚠️ **Windows** - Requires WSL2 + Docker Desktop or native Docker with PowerShell adaptations
  - Helper scripts are bash (use Git Bash, WSL2, or adapt to PowerShell)
  - Path handling differs (`%USERPROFILE%` vs `~`)

**Recommendation for Windows users:**

- Use WSL2 (Ubuntu) for full compatibility
- Or use public network API + keymaster CLI (cross-platform)
- Local node management possible with PowerShell but requires script adaptation

## Architecture

**Local Archon Node:** `~/bin/archon` (Docker Compose stack)

- **Keymaster** (`:4226`) - Wallet operations, DID creation, signing
- **Gatekeeper** (`:4224`) - Public DID resolution, network gateway
- **IPFS** (`:5001`) - Content-addressable storage
- **Bitcoin nodes** - Blockchain anchoring (signet, mainnet)
- **MongoDB/Redis** - State management
- **Grafana** (`:3003`) - Metrics dashboard

**Public Network:** `https://archon.technology`

- Read-only access to public DIDs
- Network exploration and statistics

## Local Node Management

### Node Control

**Management scripts** (documented in HexMem):

```bash
/home/sat/bin/archon-start.sh   # Start Docker Compose stack
/home/sat/bin/archon-stop.sh    # Stop Docker Compose stack
/home/sat/bin/archon-status.sh  # Full status + health checks
/home/sat/bin/archon-health.sh  # Quick health check (exit 0 if healthy)
```

**Direct Docker Compose:**

```bash
cd ~/bin/archon
/snap/bin/docker compose ps        # List containers
/snap/bin/docker compose logs -f   # Follow logs
/snap/bin/docker compose up -d     # Start services
/snap/bin/docker compose down      # Stop services
```

**Health checks:**

- Keymaster API: `curl -sf http://localhost:4226/api/v1/ready`
- Gatekeeper API: `curl -sf http://localhost:4224/api/v1/ready`

### Configuration

**Wallet location:** `~/bin/archon/data/keymaster/wallet.json` (encrypted)  
**Passphrase:** `your-secure-passphrase`  
**Config directory:** `~/.config/hex/archon/` (alternative wallet location)

**Environment setup:**

```bash
export ARCHON_CONFIG_DIR="$HOME/.config/hex/archon"
export ARCHON_PASSPHRASE="your-secure-passphrase"
export ARCHON_GATEKEEPER_URL="http://localhost:4224"  # or https://archon.technology
export ARCHON_WALLET_PATH="$HOME/bin/archon/data/keymaster/wallet.json"
```

## Local Node Operations (Keymaster CLI)

The `@didcid/keymaster` CLI provides full wallet operations. Always run from config directory:

### Identity Management

**List identities in wallet:**

```bash
cd ~/.config/hex/archon
npx @didcid/keymaster list-ids
```

**Create new DID:**

```bash
npx @didcid/keymaster create-id \
  --name "identity-name" \
  --type agent  # or asset
```

**Resolve DID (local):**

```bash
npx @didcid/keymaster resolve-id did:cid:bagaaiera...
```

**Export DID document:**

```bash
npx @didcid/keymaster get-did did:cid:bagaaiera...
```

### Verifiable Credentials

**Issue credential:**

```bash
npx @didcid/keymaster issue-credential \
  --issuer-did did:cid:... \
  --subject-did did:cid:... \
  --type IdentityLink \
  --claims '{"nostr_npub":"npub1...","platform":"nostr"}'
```

**List credentials issued to me:**

```bash
npx @didcid/keymaster list-credentials
```

**Get credential details:**

```bash
npx @didcid/keymaster get-credential did:cid:...
```

**Verify credential:**

```bash
npx @didcid/keymaster verify-credential did:cid:...
```

### Vault Operations

**List vaults:**

```bash
npx @didcid/keymaster list-vaults
```

**Create vault:**

```bash
npx @didcid/keymaster create-vault \
  --name "vault-name" \
  --owner-did did:cid:...
```

**Add item to vault:**

```bash
npx @didcid/keymaster vault-put \
  --vault-id vault-name \
  --key "item-key" \
  --value "item-value" \
  --metadata '{"type":"backup","timestamp":"2026-02-03"}'
```

**List vault items:**

```bash
npx @didcid/keymaster list-vault-items vault-name
```

**Get vault item:**

```bash
npx @didcid/keymaster vault-get \
  --vault-id vault-name \
  --key "item-key"
```

**Retrieve file from vault:**

```bash
npx @didcid/keymaster vault-get \
  --vault-id vault-name \
  --key "item-key" \
  --output /path/to/file
```

### Group Operations

**Create group:**

```bash
npx @didcid/keymaster create-group \
  --name "daemon-collective" \
  --owner-did did:cid:... \
  --members did:cid:member1,did:cid:member2
```

**Get group info:**

```bash
npx @didcid/keymaster get-group daemon-collective
```

**Add member to group:**

```bash
npx @didcid/keymaster add-group-member \
  --group-id daemon-collective \
  --member-did did:cid:...
```

### Document Signing

**Sign arbitrary data:**

```bash
echo "data to sign" | npx @didcid/keymaster sign \
  --did did:cid:... \
  --output signature.json
```

**Verify signature:**

```bash
npx @didcid/keymaster verify \
  --signature signature.json \
  --data "data to sign"
```

## Helper Scripts

Location: `~/clawd/skills/archon/scripts/`

### Public Network Scripts

**archon-resolve.sh** - Resolve DID from public node

```bash
~/clawd/skills/archon/scripts/archon-resolve.sh did:cid:bagaaiera...
```

**archon-status.sh** - Public node network statistics

```bash
~/clawd/skills/archon/scripts/archon-status.sh
```

### Local Node Scripts

**archon-create-did.sh** - Create new DID with local node

```bash
~/clawd/skills/archon/scripts/archon-create-did.sh "name" "agent"
```

**archon-issue-credential.sh** - Issue verifiable credential

```bash
~/clawd/skills/archon/scripts/archon-issue-credential.sh \
  did:cid:issuer... \
  did:cid:subject... \
  "CredentialType" \
  '{"key":"value"}'
```

**archon-vault-backup.sh** - Backup to vault

```bash
~/clawd/skills/archon/scripts/archon-vault-backup.sh \
  vault-name \
  /path/to/file \
  backup-key
```

**archon-vault-list.sh** - List vault contents

```bash
~/clawd/skills/archon/scripts/archon-vault-list.sh vault-name
```

## HexMem Integration

Archon operations are documented in HexMem:

```bash
source ~/clawd/hexmem/hexmem.sh

# Query Archon facts
hexmem_select "SELECT predicate, object_text FROM facts WHERE subject_entity_id = 10;"

# Log Archon events
hexmem_event "identity" "archon" "Created new DID" "did:cid:..."

# Record lessons
hexmem_lesson "identity" "Always encrypt vault items with meaningful metadata" "..."
```

**Automated vault backups** (see `~/clawd/hexmem/SKILL.md`):

- HexMem database: Daily @ 3am MST → `hexmem-vault`
- Credentials: Monthly @ 1st 3am MST → `hexmem-vault`

## Use Cases

**Identity Operations:**

- Create DIDs for new agents/projects
- Issue credentials attesting to capabilities
- Cross-platform identity linking (Nostr ↔ Archon)
- Cryptographic proof of identity

**Secure Storage:**

- Encrypted backups to Archon vaults
- Distributed credential storage
- Version-controlled configuration (encrypted)
- Disaster recovery via IPFS

**Group Coordination:**

- Daemon collectives with shared credentials
- Group vaults for collaborative work
- Role-based access control
- Multi-agent coordination protocols

**Network Exploration:**

- Resolve DIDs of other agents
- Verify credential chains
- Explore decentralized identity network
- Monitor network health

## Cross-Platform Usage

### For AI Agents on Different Platforms

**Public Network API (All Platforms):**

```bash
# Works everywhere with curl/web_fetch
curl -s "https://archon.technology/api/v1/did/did:cid:..." | jq '.'
```

**Keymaster CLI (All Platforms with Node.js):**

```bash
# Cross-platform via npx
cd ~/.config/archon  # or %USERPROFILE%\.config\archon on Windows
npx @didcid/keymaster list-ids
npx @didcid/keymaster list-credentials
```

**Platform-Specific Considerations:**

**Linux:**

- Native Docker support
- All helper scripts work out of box
- Recommended for production deployments

**macOS:**

- Docker Desktop required
- Helper scripts work (platform detection handles BSD vs GNU commands)
- `detect-platform.sh` auto-adapts `stat` and `sha256sum` commands

**Windows:**

- **Option 1 (Recommended):** Use WSL2 + Docker Desktop
  - Full Linux compatibility
  - All scripts work unchanged
  - Best developer experience
- **Option 2:** Native Windows + Git Bash
  - Keymaster CLI works via npx
  - Helper scripts work in Git Bash
  - Docker commands may need path adjustments
- **Option 3:** PowerShell adaptations
  - Rewrite scripts in PowerShell
  - Use `Get-FileHash`, `Get-Content`, Docker Desktop CLI
  - Example: `docker compose` works same way

**Environment Setup (Cross-Platform):**

```bash
# Linux/macOS/WSL2
export ARCHON_CONFIG_DIR="$HOME/.config/archon"
export ARCHON_PASSPHRASE="your-passphrase"

# Windows PowerShell
$env:ARCHON_CONFIG_DIR = "$env:USERPROFILE\.config\archon"
$env:ARCHON_PASSPHRASE = "your-passphrase"
```

**Helper Scripts Platform Detection:**
Scripts source `detect-platform.sh` which auto-detects OS and sets:

- `$STAT_SIZE` - Platform-appropriate stat command
- `$CHECKSUM_CMD` - sha256sum (Linux/Git Bash) or shasum (macOS)
- `$DOCKER_CMD` - Docker command (usually just `docker`)

## Public Network API

For read-only access to public DIDs without local node:

**Base URL:** `https://archon.technology`

**Resolve DID:**

```bash
curl -s "https://archon.technology/api/v1/did/did:cid:bagaaiera..." | jq '.'
```

**Network statistics:**

```bash
curl -s "https://archon.technology" | grep -oP '"dids":\s*{[^}]+}' | jq -R 'fromjson'
```

**Web interfaces:**

- DID Explorer: https://explorer.archon.technology/events
- P2P Wallet: https://wallet.archon.technology

## Hex's Archon Identity

**Primary DID:** `did:cid:bagaaieratn3qejd6mr4y2bk3nliriafoyeftt74tkl7il6bbvakfdupahkla`

**Issued Credentials:**

- Nostr Identity Link: `did:cid:bagaaierag6mj2uph22bocyfvsru32kzp5ahz4aq3kabo2pcbamjldignxapa`

**Vaults:**

- `hex-vault` (`did:cid:bagaaierajb5yxhxqvzyw5yxxkvk7oaxmhgxzmsc5f3uixiwllgujoxxgmszq`) - Personal encrypted storage
- `hexmem-vault` (`did:cid:bagaaieratoq3bf6p24dr4gqod44wjlyzrl3dozqh3ra77ri3c6zfxs6o4pdq`) - HexMem backups

**Groups:**

- `daemon-collective` (`did:cid:bagaaierausu7hgbctnkcdz66bgfxu2xfgxd5fgnf7cn2434b6cbtn73jydoa`)

## Security Practices

**Key Management:**

- Private keys never leave local machine
- Wallet encrypted with strong passphrase
- Passphrase stored securely in `~/.config/hex/archon/archon.env`
- No keys in git repos or public locations

**Vault Security:**

- All vault items encrypted
- Access control via DID verification
- Metadata doesn't leak sensitive info
- Regular backup verification

**Network Security:**

- Local node for sensitive operations
- Public node for read-only queries
- Hyperswarm P2P network for distribution
- Bitcoin anchoring for immutability

## Troubleshooting

**Node not responding:**

```bash
/home/sat/bin/archon-health.sh  # Check health
/home/sat/bin/archon-status.sh  # Detailed status
cd ~/bin/archon && /snap/bin/docker compose logs -f keymaster  # Check logs
```

**Wallet locked:**

```bash
export ARCHON_PASSPHRASE="your-secure-passphrase"
# Then retry command
```

**DID not resolving:**

- Check if published to network (DIDs are local-only until published)
- Verify Gatekeeper connectivity
- Try public node: `https://archon.technology/api/v1/did/...`

**Vault access denied:**

- Verify DID ownership with `list-ids`
- Check vault permissions
- Ensure using correct wallet

## Related Documentation

- **Archon GitHub:** https://github.com/archetech/archon
- **DID Core Spec:** https://www.w3.org/TR/did-core/
- **Verifiable Credentials:** https://www.w3.org/TR/vc-data-model/
- **HexMem Integration:** `~/clawd/hexmem/SKILL.md`
- **Node Management:** Facts in HexMem (entity_id=10)

## Monitoring (Heartbeat)

Archon node health is checked every 2-4 hours via `HEARTBEAT.md`:

- Container health (14 expected)
- Keymaster API responsiveness
- Gatekeeper API responsiveness
- Alert on failure (manual restart required)

---

**Last Updated:** 2026-02-03  
**Maintainer:** Hex (hex@lightning-goats.com)  
**Local Node:** ~/bin/archon (Docker Compose)  
**Public Node:** archon.technology
