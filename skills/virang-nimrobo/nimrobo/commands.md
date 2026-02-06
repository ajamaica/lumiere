# Nimrobo CLI - Command Reference

Quick reference for all Nimrobo CLI commands. Both namespaces share authentication.

---

## Voice Commands (Voice Screening Platform)

### Auth & User
| # | Command | Description |
|---|---------|-------------|
| 1 | `nimrobo login` | Login with API key |
| 2 | `nimrobo logout` | Logout from CLI |
| 3 | `nimrobo status` | Show login status |
| 4 | `nimrobo voice user profile` | Get current user profile |

### Projects
| # | Command | Description |
|---|---------|-------------|
| 5 | `nimrobo voice projects list` | List all projects |
| 6 | `nimrobo voice projects get <projectId>` | Get project details |
| 7 | `nimrobo voice projects create` | Create new project |
| 8 | `nimrobo voice projects update <projectId>` | Update project |
| 9 | `nimrobo voice projects use [projectId]` | Set/view default project |

### Links
| # | Command | Description |
|---|---------|-------------|
| 10 | `nimrobo voice links list` | List voice links |
| 11 | `nimrobo voice links create` | Create voice link(s) |
| 12 | `nimrobo voice links cancel <linkId>` | Cancel project link |
| 13 | `nimrobo voice links update <linkId>` | Update instant link |

### Sessions
| # | Command | Description |
|---|---------|-------------|
| 14 | `nimrobo voice sessions status <sessionId>` | Get session status |
| 15 | `nimrobo voice sessions transcript <sessionId>` | Get transcript |
| 16 | `nimrobo voice sessions audio <sessionId>` | Download audio URL |
| 17 | `nimrobo voice sessions evaluation <sessionId>` | Get evaluation |
| 18 | `nimrobo voice sessions summary <sessionId>` | Get/generate summary |
| 19 | `nimrobo voice sessions summary:regenerate <sessionId>` | Regenerate summary |

---

## Net Commands (Matching Network)

### My Profile & Data
| # | Command | Description |
|---|---------|-------------|
| 1 | `nimrobo net my profile` | Get current user profile |
| 2 | `nimrobo net my update` | Update profile |
| 3 | `nimrobo net my orgs` | List my organizations |
| 4 | `nimrobo net my posts` | List posts I created |
| 5 | `nimrobo net my applications` | List my applications |
| 6 | `nimrobo net my invites` | List received org invites |
| 7 | `nimrobo net my join-requests` | List my join requests |
| 8 | `nimrobo net my summary` | Get activity summary |

### Users
| # | Command | Description |
|---|---------|-------------|
| 9 | `nimrobo net users get <userId>` | Get user by ID |
| 10 | `nimrobo net users search` | Search users |
| 11 | `nimrobo net users use <userId>` | Set user context |

### Organizations
| # | Command | Description |
|---|---------|-------------|
| 12 | `nimrobo net orgs create` | Create organization |
| 13 | `nimrobo net orgs list` | List organizations |
| 14 | `nimrobo net orgs get [orgId]` | Get organization |
| 15 | `nimrobo net orgs update [orgId]` | Update organization |
| 16 | `nimrobo net orgs delete [orgId]` | Delete organization |
| 17 | `nimrobo net orgs posts [orgId]` | List org posts |
| 18 | `nimrobo net orgs leave [orgId]` | Leave organization |
| 19 | `nimrobo net orgs use <orgId>` | Set org context |
| 20 | `nimrobo net orgs join [orgId]` | Request to join |
| 21 | `nimrobo net orgs accept-invite <inviteId>` | Accept invite |
| 22 | `nimrobo net orgs decline-invite <inviteId>` | Decline invite |
| 23 | `nimrobo net orgs cancel-join-request <requestId>` | Cancel request |

### Organization Management
| # | Command | Description |
|---|---------|-------------|
| 24 | `nimrobo net orgs manage members [orgId]` | List members |
| 25 | `nimrobo net orgs manage remove-member [orgId] <userId>` | Remove member |
| 26 | `nimrobo net orgs manage update-role [orgId] <userId>` | Update role |
| 27 | `nimrobo net orgs manage invite [orgId]` | Send invite |
| 28 | `nimrobo net orgs manage invites [orgId]` | List pending invites |
| 29 | `nimrobo net orgs manage cancel-invite [orgId] <inviteId>` | Cancel invite |
| 30 | `nimrobo net orgs manage join-requests [orgId]` | List join requests |
| 31 | `nimrobo net orgs manage approve-request <requestId>` | Approve request |
| 32 | `nimrobo net orgs manage reject-request <requestId>` | Reject request |

### Posts
| # | Command | Description |
|---|---------|-------------|
| 33 | `nimrobo net posts create` | Create post |
| 34 | `nimrobo net posts list` | List/search posts |
| 35 | `nimrobo net posts get [postId]` | Get post details |
| 36 | `nimrobo net posts update [postId]` | Update post |
| 37 | `nimrobo net posts close [postId]` | Close post |
| 38 | `nimrobo net posts delete [postId]` | Delete post |
| 39 | `nimrobo net posts apply [postId]` | Apply to post |
| 40 | `nimrobo net posts applications [postId]` | List applications |
| 41 | `nimrobo net posts check-applied [postId]` | Check if applied |
| 42 | `nimrobo net posts use <postId>` | Set post context |

### Applications
| # | Command | Description |
|---|---------|-------------|
| 43 | `nimrobo net applications get <applicationId>` | Get application |
| 44 | `nimrobo net applications accept <applicationId>` | Accept application |
| 45 | `nimrobo net applications reject <applicationId>` | Reject application |
| 46 | `nimrobo net applications withdraw <applicationId>` | Withdraw application |
| 47 | `nimrobo net applications batch-action` | Batch accept/reject |

### Channels
| # | Command | Description |
|---|---------|-------------|
| 48 | `nimrobo net channels list` | List channels |
| 49 | `nimrobo net channels get [channelId]` | Get channel |
| 50 | `nimrobo net channels messages [channelId]` | List messages |
| 51 | `nimrobo net channels send [channelId]` | Send message |
| 52 | `nimrobo net channels message [channelId] <messageId>` | Get message |
| 53 | `nimrobo net channels mark-read [channelId] <messageId>` | Mark read |
| 54 | `nimrobo net channels mark-unread [channelId] <messageId>` | Mark unread |
| 55 | `nimrobo net channels read-all [channelId]` | Mark all read |
| 56 | `nimrobo net channels use <channelId>` | Set channel context |

### Context
| # | Command | Description |
|---|---------|-------------|
| 57 | `nimrobo net context show` | Show all context |
| 58 | `nimrobo net context get <type>` | Get context value |
| 59 | `nimrobo net context clear [type]` | Clear context |

---

## Pagination

List commands support pagination via `--limit` and `--skip`:

```bash
# Get first 20 results (default)
nimrobo net posts list

# Get 50 results
nimrobo net posts list --limit 50

# Skip first 20, get next 20 (page 2)
nimrobo net posts list --skip 20 --limit 20

# Page 3
nimrobo net posts list --skip 40 --limit 20
```

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "skip": 0,
    "has_more": true
  }
}
```

The `has_more` field indicates if more results exist.

---

## Filtering & Sorting

### Common Filter Options

**Status filters:**
```bash
--status active|closed|pending|accepted|rejected|withdrawn
```

**Search query:**
```bash
--query "search term"
```

**Sorting:**
```bash
--sort created_at|expires_at|name
--order asc|desc
```

### Posts Filtering

```bash
# Search by query
nimrobo net posts list --query "senior engineer"

# By status
nimrobo net posts list --status active

# By organization
nimrobo net posts list --org org_abc123

# Include posts already applied to
nimrobo net posts list --include-applied

# Using generic filter for job-specific fields (backend-extracted)
nimrobo net posts list --filter '{"compensation_type": "salary"}'
nimrobo net posts list --filter '{"remote": "remote"}'
nimrobo net posts list --filter '{"salary_min": 100000, "salary_max": 200000}'
nimrobo net posts list --filter '{"experience_min": 3}'
nimrobo net posts list --filter '{"skills": ["typescript", "react"]}'
nimrobo net posts list --filter '{"location_city": "San Francisco"}'

# Combined search with filter
nimrobo net posts list \
  --query "senior engineer" \
  --filter '{"remote": "remote", "salary_min": 100000}' \
  --sort created_at \
  --order desc
```

### Organizations Filtering

```bash
nimrobo net orgs list --keyword "tech" --status active --sort name --order asc
```

### Users Search

```bash
nimrobo net users search --keyword "developer" --city "NYC" --country "USA"
```

### Applications Filtering

```bash
# Filter by status
nimrobo net my applications --status pending
nimrobo net posts applications --status accepted

# Search
nimrobo net my applications --keyword "frontend"
```

### Channels Filtering

```bash
nimrobo net channels list --status active --application app_123 --post post_456
```

---

## Filter Values Reference

### Post Filter Keys (for `--filter` JSON)

When filtering posts, you can use these keys in the JSON filter object:

| Key | Values | Example |
|-----|--------|---------|
| `compensation_type` | `salary`, `hourly`, `equity`, `unpaid` | `{"compensation_type": "salary"}` |
| `employment_type` | `full_time`, `part_time`, `contract`, `internship`, `freelance` | `{"employment_type": "full_time"}` |
| `remote` | `remote`, `hybrid`, `onsite` | `{"remote": "remote"}` |
| `education_level` | `high_school`, `bachelors`, `masters`, `phd`, `any` | `{"education_level": "bachelors"}` |
| `salary_min` / `salary_max` | number (USD) | `{"salary_min": 100000}` |
| `hourly_rate_min` / `hourly_rate_max` | number (USD) | `{"hourly_rate_min": 50}` |
| `experience_min` / `experience_max` | number (years) | `{"experience_min": 3}` |
| `skills` | array of strings | `{"skills": ["react", "node"]}` |
| `location_city` | string | `{"location_city": "NYC"}` |
| `location_country` | string | `{"location_country": "USA"}` |
| `urgent` | boolean | `{"urgent": true}` |

### Status Values

| Entity | Statuses |
|--------|----------|
| Application | `pending`, `accepted`, `rejected`, `withdrawn` |
| Post | `active`, `closed` |
| Organization | `active`, `deleted` |
| Channel | `active`, `archived` |
