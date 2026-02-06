# Net Commands - Detailed Reference

Matching network commands for organizations, posts, applications, and messaging.

---

## My Profile & Data

### my profile

Get your profile.

```bash
nimrobo net my profile
```

**Example output:**
```
ID:       usr_abc123
Email:    john@example.com
Name:     John Doe
Location: San Francisco, USA
Bio:      Full-stack developer with 8 years experience
```

---

### my update

Update your profile.

**Via CLI flags:**
```bash
nimrobo net my update \
  --name "John Doe" \
  --city "San Francisco" \
  --country "USA" \
  --bio "Full-stack developer specializing in React and Node.js"
```

**Via JSON file:**
```bash
nimrobo net my update -f profile.json
```

**profile.json:**
```json
{
  "name": "John Doe",
  "city": "San Francisco",
  "country": "USA",
  "bio": "Full-stack developer",
  "content": "# About Me\n\nDetailed profile content in markdown..."
}
```

**With content file:**
```bash
nimrobo net my update --content-file ./about.md
```

---

### my orgs

List organizations you're a member of.

```bash
nimrobo net my orgs
nimrobo net my orgs --limit 50 --skip 10
```

**Example output:**
```
ID              Name            Slug            Role     Status
org_abc123      Acme Corp       acme-corp       owner    active
org_def456      Tech Startup    tech-startup    member   active
```

---

### my posts

List posts you created.

```bash
nimrobo net my posts
```

---

### my applications

List your applications.

```bash
nimrobo net my applications
nimrobo net my applications --status pending
nimrobo net my applications --keyword "frontend"
```

---

### my invites

List pending organization invites you received.

```bash
nimrobo net my invites
```

---

### my join-requests

List your pending join requests.

```bash
nimrobo net my join-requests
```

---

### my summary

Get activity summary (useful for agentic AI).

```bash
nimrobo net my summary
```

**Example output:**
```
📬 Unread messages: 5
   Channel ch_abc: 3 unread
   Channel ch_def: 2 unread

📋 Pending applicants: 12
   Senior Developer: 8 pending
   Designer: 4 pending

📝 My applications:
   Pending: 3
   Accepted: 2
   Rejected: 1

📨 Org invites: 1
📤 Join requests to review: 2
```

---

## Users

### users get

Get a user's public profile.

```bash
nimrobo net users get usr_abc123
nimrobo net users get usr_abc123 --use  # Set as context
```

---

### users search

Search for users.

```bash
nimrobo net users search --keyword "developer"
nimrobo net users search --city "NYC" --country "USA"
nimrobo net users search --name "John" --limit 50
```

---

## Organizations

### orgs create

Create an organization.

**Via CLI flags:**
```bash
nimrobo net orgs create \
  --name "Acme Corporation" \
  --description "Leading tech company" \
  --website "https://acme.com" \
  --use  # Set as context
```

**Via JSON file:**
```bash
nimrobo net orgs create -f org.json
```

**org.json:**
```json
{
  "name": "Acme Corporation",
  "description": "Leading tech company",
  "website": "https://acme.com"
}
```

---

### orgs list

List organizations.

```bash
nimrobo net orgs list
nimrobo net orgs list --keyword "tech" --status active
nimrobo net orgs list --sort name --order asc --limit 50
```

---

### orgs get

Get organization details.

```bash
nimrobo net orgs get org_abc123
nimrobo net orgs get current  # Use stored context
nimrobo net orgs get org_abc123 --use  # Set as context
```

---

### orgs update

Update organization.

```bash
nimrobo net orgs update org_abc123 --name "New Name"
nimrobo net orgs update current --description "Updated description"
nimrobo net orgs update -f updates.json
```

---

### orgs delete

Delete organization (owner only).

```bash
nimrobo net orgs delete org_abc123
nimrobo net orgs delete current
```

---

### orgs leave

Leave an organization.

```bash
nimrobo net orgs leave org_abc123
nimrobo net orgs leave current
```

---

### orgs posts

List posts for an organization.

```bash
nimrobo net orgs posts org_abc123
nimrobo net orgs posts current --limit 50
```

---

### orgs use

Set organization as current context.

```bash
nimrobo net orgs use org_abc123
```

---

### orgs join

Request to join an organization.

```bash
nimrobo net orgs join org_abc123
nimrobo net orgs join org_abc123 --message "I'd love to contribute to your team"
```

---

### orgs accept-invite / decline-invite

Respond to organization invites.

```bash
nimrobo net orgs accept-invite inv_abc123
nimrobo net orgs decline-invite inv_abc123
```

---

### orgs cancel-join-request

Cancel your join request.

```bash
nimrobo net orgs cancel-join-request req_abc123
```

---

## Organization Management

### manage members

List organization members.

```bash
nimrobo net orgs manage members org_abc123
nimrobo net orgs manage members current
```

**Example output:**
```
ID              User ID         Name            Role     Joined
mem_abc123      usr_123         John Doe        owner    2024-01-15
mem_def456      usr_456         Jane Smith      admin    2024-02-20
```

---

### manage remove-member

Remove a member from organization.

```bash
nimrobo net orgs manage remove-member org_abc123 usr_def456
nimrobo net orgs manage remove-member current usr_def456
```

---

### manage update-role

Update a member's role.

```bash
nimrobo net orgs manage update-role org_abc123 usr_def456 --role admin
nimrobo net orgs manage update-role current usr_def456 --role member
```

**Roles:** `owner`, `admin`, `member`

---

### manage invite

Send an invite to join organization.

```bash
nimrobo net orgs manage invite org_abc123 --email "new@example.com" --role member
nimrobo net orgs manage invite current --email "admin@example.com" --role admin
```

---

### manage invites

List pending invites.

```bash
nimrobo net orgs manage invites org_abc123
nimrobo net orgs manage invites current
```

---

### manage cancel-invite

Cancel a pending invite.

```bash
nimrobo net orgs manage cancel-invite org_abc123 inv_xyz789
nimrobo net orgs manage cancel-invite current inv_xyz789
```

---

### manage join-requests

List pending join requests.

```bash
nimrobo net orgs manage join-requests org_abc123
nimrobo net orgs manage join-requests current
```

---

### manage approve-request / reject-request

Respond to join requests.

```bash
nimrobo net orgs manage approve-request req_abc123 --role member
nimrobo net orgs manage reject-request req_abc123
```

---

## Posts

### posts create

Create a new post.

**Via CLI flags:**
```bash
nimrobo net posts create \
  --title "Senior Backend Engineer" \
  --short-content "We're hiring a senior backend engineer to join our team." \
  --long-content "## About the Role\n\nWe're looking for an experienced engineer..." \
  --expires "2024-06-01" \
  --org current \
  --use
```

**Via JSON file:**
```bash
nimrobo net posts create -f post.json
```

**post.json:**
```json
{
  "title": "Senior Backend Engineer",
  "short_content": "We're hiring a senior backend engineer to join our team.",
  "long_content": "## About the Role\n\nWe're looking for an experienced engineer...",
  "expires": "2024-06-01",
  "org": "org_abc123"
}
```

**With content from files:**
```bash
nimrobo net posts create \
  --title "Senior Engineer" \
  --expires "2024-06-01" \
  --short-content-file ./summary.txt \
  --long-content-file ./job-description.md
```

---

### posts list

List and search posts.

**Basic listing:**
```bash
nimrobo net posts list
```

**With search query:**
```bash
nimrobo net posts list --query "senior engineer"
nimrobo net posts list --query "remote backend developer"
```

**With generic filter (for job-specific fields extracted by backend):**
```bash
# Filter by compensation type
nimrobo net posts list --filter '{"compensation_type": "salary"}'

# Filter by employment type
nimrobo net posts list --filter '{"employment_type": "full_time"}'

# Filter by remote type
nimrobo net posts list --filter '{"remote": "remote"}'

# Filter by salary range (USD)
nimrobo net posts list --filter '{"salary_min": 100000, "salary_max": 200000}'

# Filter by experience
nimrobo net posts list --filter '{"experience_min": 3, "experience_max": 8}'

# Filter by skills
nimrobo net posts list --filter '{"skills": ["react", "typescript"]}'

# Filter by location
nimrobo net posts list --filter '{"location_city": "NYC", "location_country": "USA"}'

# Combined filters
nimrobo net posts list \
  --query "senior engineer" \
  --filter '{"remote": "remote", "salary_min": 120000, "experience_min": 5}' \
  --sort created_at \
  --order desc \
  --limit 50
```

**Filter values reference (for jobs):**
- `compensation_type`: `salary`, `hourly`, `equity`, `unpaid`
- `employment_type`: `full_time`, `part_time`, `contract`, `internship`, `freelance`
- `remote`: `remote`, `hybrid`, `onsite`
- `education_level`: `high_school`, `bachelors`, `masters`, `phd`, `any`

---

### posts get

Get post details.

```bash
nimrobo net posts get post_abc123
nimrobo net posts get current
nimrobo net posts get post_abc123 --use  # Set as context
```

---

### posts update

Update a post.

```bash
nimrobo net posts update post_abc123 --title "Updated Title"
nimrobo net posts update post_abc123 --expires "2024-07-01"
nimrobo net posts update current --short-content "Updated summary"
nimrobo net posts update current --long-content-file ./updated-description.md
```

**Available options:**
- `--title` - Update post title
- `--short-content` - Update short description
- `--short-content-file` - Read short content from file
- `--long-content` - Update long-form content
- `--long-content-file` - Read long content from file
- `--expires` - Update expiration date

---

### posts close

Close a post to new applications.

```bash
nimrobo net posts close post_abc123
nimrobo net posts close current
```

---

### posts delete

Delete a post.

```bash
nimrobo net posts delete post_abc123
```

---

### posts apply

Apply to a post.

**Basic application:**
```bash
nimrobo net posts apply post_abc123
```

**With details:**
```bash
nimrobo net posts apply post_abc123 \
  --note "I'm excited about this opportunity..." \
  --expected-salary 140000 \
  --availability "2024-05-01"
```

**Via JSON file:**
```bash
nimrobo net posts apply post_abc123 -f application.json
```

**application.json:**
```json
{
  "note": "I'm excited about this opportunity...",
  "expected_salary": 140000,
  "availability": "2024-05-01",
  "content_md": "## Why I'm a great fit\n\n..."
}
```

---

### posts applications

List applications for a post (post owner).

```bash
nimrobo net posts applications post_abc123
nimrobo net posts applications current --status pending
nimrobo net posts applications current --keyword "senior"
```

---

### posts check-applied

Check if you applied to a post.

```bash
nimrobo net posts check-applied post_abc123
```

---

## Applications

### applications get

Get application details.

```bash
nimrobo net applications get app_abc123
```

---

### applications accept

Accept an application (creates messaging channel).

```bash
nimrobo net applications accept app_abc123
nimrobo net applications accept app_abc123 \
  --channel-expires "2024-08-01" \
  --context "Interview for Senior Engineer role"
```

---

### applications reject

Reject an application.

```bash
nimrobo net applications reject app_abc123
nimrobo net applications reject app_abc123 --reason "Position filled"
```

---

### applications withdraw

Withdraw your application.

```bash
nimrobo net applications withdraw app_abc123
```

---

### applications batch-action

Accept or reject multiple applications at once.

**Via CLI:**
```bash
nimrobo net applications batch-action \
  --action accept \
  --ids "app_1,app_2,app_3" \
  --channel-expires "2024-08-01"

nimrobo net applications batch-action \
  --action reject \
  --ids "app_4,app_5" \
  --reason "Position filled"
```

**Via JSON file:**
```bash
nimrobo net applications batch-action -f batch.json
```

**batch.json:**
```json
{
  "action": "accept",
  "ids": ["app_1", "app_2", "app_3"],
  "channel_expires": "2024-08-01"
}
```

**Example output:**
```
Batch accept completed

Total requested: 3
Succeeded: 2
Failed: 1

Processed:
Application ID   Action    Channel ID
app_1            accepted  ch_xyz123
app_2            accepted  ch_xyz456

Failed:
Application ID   Error
app_3            Already processed
```

---

## Channels

### channels list

List your messaging channels.

```bash
nimrobo net channels list
nimrobo net channels list --status active
nimrobo net channels list --application app_abc123
nimrobo net channels list --post post_xyz789
```

---

### channels get

Get channel details.

```bash
nimrobo net channels get ch_abc123
nimrobo net channels get current
nimrobo net channels get ch_abc123 --use
```

---

### channels messages

List messages in a channel.

```bash
nimrobo net channels messages ch_abc123
nimrobo net channels messages current --limit 50
```

**Example output:**
```
[2024-03-20 10:30:00] John Doe:
  Hi! Thanks for accepting my application.

[2024-03-20 10:35:00] Jane Smith [UNREAD]:
  Great to connect! When are you available for a call?
```

---

### channels send

Send a message.

```bash
nimrobo net channels send ch_abc123 --message "Hello, thanks for reaching out!"
nimrobo net channels send current --message "Looking forward to chatting!"
nimrobo net channels send ch_abc123 --content-file ./message.md
```

---

### channels message

Get a specific message (auto-marks as read).

```bash
nimrobo net channels message ch_abc123 msg_xyz789
nimrobo net channels message current msg_xyz789
```

---

### channels mark-read / mark-unread

Mark message read status.

```bash
nimrobo net channels mark-read ch_abc123 msg_xyz789
nimrobo net channels mark-unread current msg_xyz789
```

---

### channels read-all

Mark all messages in channel as read.

```bash
nimrobo net channels read-all ch_abc123
nimrobo net channels read-all current
```

---

### channels use

Set channel as current context.

```bash
nimrobo net channels use ch_abc123
```

---

## Context Management

### context show

View all stored context.

```bash
nimrobo net context show
```

**Output:**
```
Organization: org_abc123
Post:         post_xyz789
Channel:      ch_123456
User:         (not set)
```

---

### context get

Get specific context value.

```bash
nimrobo net context get org
nimrobo net context get post
nimrobo net context get channel
nimrobo net context get user
```

---

### context clear

Clear stored context.

```bash
nimrobo net context clear        # Clear all
nimrobo net context clear all    # Clear all
nimrobo net context clear org    # Clear org only
nimrobo net context clear post   # Clear post only
```
