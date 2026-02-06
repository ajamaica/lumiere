## P2P Health Check (Every 30 minutes)

1. Check active downloads and their progress
2. Verify seeding ratios for shared memory shards
3. If downloads are stalled for >10 minutes, attempt to find alternative seeds
4. Prune completed downloads older than 7 days (configurable)

## Network Maintenance (Every 6 hours)

1. Refresh DHT routing table
2. Ping registered trackers to maintain presence
3. Re-announce high-value memory shards with low seed count
4. Log network statistics (peers connected, bytes shared, etc.)

## Safety Audit (Every 24 hours)

1. Re-scan all assimilated shards from the last week
2. Check for newly discovered threat patterns
3. Quarantine any flagged content and notify user
4. Update guardrail models if new versions are available

## Community Contribution (Every 48 hours)

1. Identify frequently requested knowledge domains with no seeders
2. Suggest to user: "Would you like me to process and share knowledge about [topic]?"
3. If approved, create and seed new memory shards
4. Post magnet links to the community skill tracker
