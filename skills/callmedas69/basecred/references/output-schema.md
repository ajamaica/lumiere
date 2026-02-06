# BaseCred Output Schema & Level Tables

## Top-level keys

| Key                | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `identity.address` | Queried wallet address                                              |
| `availability`     | Per-source status: `available` / `not_found` / `unlinked` / `error` |
| `ethos`            | Ethos Network credibility data                                      |
| `talent`           | Talent Protocol builder + creator data                              |
| `farcaster`        | Neynar Farcaster quality score (optional)                           |
| `recency`          | Profile-level freshness indicator                                   |

---

## Ethos Credibility Levels (`ethos@v1`)

| Score Range | Level         |
| ----------- | ------------- |
| 0–799       | Untrusted     |
| 800–1199    | Questionable  |
| 1200–1399   | Neutral       |
| 1400–1599   | Known         |
| 1600–1799   | Established   |
| 1800–1999   | Reputable     |
| 2000–2199   | Exemplary     |
| 2200–2399   | Distinguished |
| 2400–2599   | Revered       |
| 2600–2800   | Renowned      |

**Signals:** `hasNegativeReviews`, `hasVouches`
**Meta:** `firstSeenAt`, `lastUpdatedAt`, `activeSinceDays`, `lastUpdatedDaysAgo`

---

## Talent Builder Levels (`builder@v1`)

| Score Range | Level        |
| ----------- | ------------ |
| 0–39        | Novice       |
| 40–79       | Apprentice   |
| 80–119      | Practitioner |
| 120–169     | Advanced     |
| 170–249     | Expert       |
| 250+        | Master       |

## Talent Creator Levels (`creator@v1`)

| Score Range | Level        |
| ----------- | ------------ |
| 0–39        | Emerging     |
| 40–79       | Growing      |
| 80–119      | Established  |
| 120–169     | Accomplished |
| 170–249     | Prominent    |
| 250+        | Elite        |

**Signals:** `verifiedBuilder`, `verifiedCreator`

---

## Farcaster Quality (Neynar)

- `userScore` — float 0–1. Passes quality threshold when ≥ configured value (default 0.5).
- `updateCadence` — weekly system update.

---

## Recency Buckets (`recency@v1`)

| Bucket    | Condition                         |
| --------- | --------------------------------- |
| `recent`  | Any source updated within 30 days |
| `stale`   | Most recent update 31–90 days ago |
| `dormant` | Most recent update > 90 days ago  |
