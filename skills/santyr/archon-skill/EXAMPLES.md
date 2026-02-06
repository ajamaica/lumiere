# Archon Public Interface - Usage Examples

## Quick Start

```bash
# Check if node is up
~/clawd/skills/archon/scripts/archon-ready.sh

# Get network stats
~/clawd/skills/archon/scripts/archon-stats.sh

# Full status (JSON)
~/clawd/skills/archon/scripts/archon-status.sh
```

---

## Example 1: Verify a Credential Issuer

You receive a credential and want to verify the issuer's DID exists on the network:

```bash
# Extract issuer DID from credential
ISSUER=$(jq -r '.issuer' credential.json)

# Resolve it
~/clawd/skills/archon/scripts/archon-resolve.sh "$ISSUER"

# Check if confirmed
~/clawd/skills/archon/scripts/archon-resolve.sh "$ISSUER" | \
  jq -r '.didDocumentMetadata.confirmed'
```

---

## Example 2: Network Monitoring in Heartbeats

Add to your heartbeat routine to track Archon network growth:

```bash
# Get current stats
STATS=$(~/clawd/skills/archon/scripts/archon-status.sh)

TOTAL=$(echo "$STATS" | jq -r '.dids.total')
AGENTS=$(echo "$STATS" | jq -r '.dids.byType.agents')

echo "Archon Network: $TOTAL DIDs ($AGENTS agents)"

# Compare to last check
LAST_TOTAL=$(cat ~/clawd/memory/archon-last-count.txt 2>/dev/null || echo 0)
if [ "$TOTAL" -gt "$LAST_TOTAL" ]; then
  GROWTH=$((TOTAL - LAST_TOTAL))
  echo "  → +$GROWTH DIDs since last check"
fi

echo "$TOTAL" > ~/clawd/memory/archon-last-count.txt
```

---

## Example 3: Check Your Own DID Propagation

After creating a DID locally, check if it's propagated to the public network:

```bash
# Your DID from TOOLS.md
MY_DID="did:cid:bagaaieratn3qejd6mr4y2bk3nliriafoyeftt74tkl7il6bbvakfdupahkla"

# Try to resolve on public network
if ~/clawd/skills/archon/scripts/archon-resolve.sh "$MY_DID" 2>/dev/null; then
  echo "✓ DID is publicly visible"
else
  echo "✗ DID not yet propagated (or only on local node)"
fi
```

---

## Example 4: Using web_fetch in OpenClaw

From an agent session, query the API directly:

```javascript
// Check status
const status = web_fetch('https://archon.technology/api/v1/status')
console.log(`Network has ${status.dids.total} DIDs`)

// Resolve a DID
const did = 'did:cid:bagaaiera...'
const resolution = web_fetch(`https://archon.technology/api/v1/did/${did}`)

if (resolution.didResolutionMetadata.error) {
  console.log('DID not found')
} else {
  console.log('DID Document:', resolution.didDocument)
}
```

---

## Example 5: Integration with Nostr Identity

Verify a Nostr user's Archon credential:

```bash
# From Nostr profile, extract Archon DID (custom field or NIP-39)
ARCHON_DID="did:cid:bagaaiera..."

# Resolve it
RESULT=$(~/clawd/skills/archon/scripts/archon-resolve.sh "$ARCHON_DID")

# Extract verification method (public key)
PUBKEY=$(echo "$RESULT" | jq -r '.didDocument.verificationMethod[0].publicKeyMultibase')

echo "Archon identity verified: $PUBKEY"
```

---

## Example 6: Agent Discovery

Find all agent DIDs in the network:

```bash
STATUS=$(~/clawd/skills/archon/scripts/archon-status.sh)

AGENT_COUNT=$(echo "$STATUS" | jq -r '.dids.byType.agents')
TOTAL=$(echo "$STATUS" | jq -r '.dids.total')

PERCENT=$((AGENT_COUNT * 100 / TOTAL))

echo "Agents: $AGENT_COUNT / $TOTAL ($PERCENT%)"
```

---

## Example 7: Registry Distribution Analysis

See where DIDs are registered:

```bash
STATUS=$(~/clawd/skills/archon/scripts/archon-status.sh)

echo "Registry Distribution:"
echo "$STATUS" | jq -r '.dids.byRegistry | to_entries[] | "  \(.key): \(.value)"'
```

**Output:**

```
Registry Distribution:
  hyperswarm: 149
  BTC:mainnet: 3
  BTC:signet: 1
```

---

## Error Handling

Common errors and how to handle them:

```bash
# DID not found
{
  "didResolutionMetadata": {
    "error": "notFound"
  },
  "didDocument": {},
  "didDocumentMetadata": {}
}

# Invalid DID format
{
  "didResolutionMetadata": {
    "error": "invalidDid"
  },
  "didDocument": {},
  "didDocumentMetadata": {}
}
```

**Script handling:**

```bash
ERROR=$(~/clawd/skills/archon/scripts/archon-resolve.sh "$DID" 2>&1 | grep "Error:")
if [ -n "$ERROR" ]; then
  echo "Resolution failed: $ERROR"
  exit 1
fi
```

---

## Performance Tips

- Cache status checks (network stats don't change rapidly)
- Batch DID resolutions if checking multiple
- Use `archon-ready.sh` for quick health checks (faster than full status)
- Store resolved DIDs locally to avoid repeated lookups

---

## Next Steps

- **Local Node**: For creating DIDs, see `TOOLS.md` → Archon Server
- **Credentials**: Issue credentials using Keymaster (local node)
- **Integration**: Link Archon DIDs with Nostr profiles via NIP-05 + credentials
