# Nimrobo CLI - Workflow Guide

Common workflow patterns for the Nimrobo CLI.

---

## 1. Interview Screening Workflow (Voice)

Set up and run a structured interview process.

```bash
# 1. Login
nimrobo login

# 2. Create interview project
nimrobo voice projects create -f interview.json

# 3. Set as default project
nimrobo voice projects use proj_abc123

# 4. Generate links for candidates
nimrobo voice links create -p default -l "Alice,Bob,Charlie" -e 1_week

# 5. (After interviews) Check session status
nimrobo voice sessions status sess_xyz -t project -p default

# 6. Get evaluation results
nimrobo voice sessions evaluation sess_xyz -t project -p default

# 7. Get transcript
nimrobo voice sessions transcript sess_xyz -t project -p default --json > transcript.json
```

---

## 2. Quick User Research (Voice)

Run instant voice sessions without creating a project.

```bash
# Create instant links with embedded prompt
nimrobo voice links create \
  -l "User1,User2,User3" \
  -e 1_day \
  --prompt "You are conducting user research about our mobile app..." \
  --landing-title "User Research Session" \
  -t 10

# Check results
nimrobo voice sessions status sess_abc -t instant
nimrobo voice sessions summary sess_abc -i
nimrobo voice sessions transcript sess_abc -t instant
```

---

## 3. Job Posting Workflow (Net)

Create and manage posts as an organization.

```bash
# 1. Login (shared auth)
nimrobo login

# 2. Create or select organization
nimrobo net orgs create --name "Acme Corp" --use
# OR
nimrobo net orgs use org_abc123

# 3. Create post
nimrobo net posts create \
  --title "Senior Engineer" \
  --short-content "We're hiring a senior engineer for our backend team." \
  --long-content-file ./job-description.md \
  --expires "2024-06-01" \
  --org current \
  --use

# 4. View incoming applications
nimrobo net posts applications current --status pending

# 5. Accept promising applicants
nimrobo net applications accept app_123
nimrobo net applications accept app_456

# 6. Message accepted candidates
nimrobo net channels list --post current
nimrobo net channels send ch_abc --message "Thanks for applying! Let's schedule a call."

# 7. Close post when done
nimrobo net posts close current
```

---

## 4. Job Seeking Workflow (Net)

Search and apply for jobs.

```bash
# 1. Login and update profile
nimrobo login
nimrobo net my update --name "John Doe" --city "SF" --bio "Senior developer"

# 2. Search for jobs
nimrobo net posts list --query "senior engineer"

# 3. Filter by job attributes (backend-extracted fields)
nimrobo net posts list \
  --query "senior engineer" \
  --filter '{"remote": "remote", "salary_min": 120000}'

# 4. View job details
nimrobo net posts get post_xyz789 --use

# 5. Apply with note
nimrobo net posts apply current \
  --note "I'm excited about this role..." \
  --expected-salary 140000

# 6. Track applications
nimrobo net my applications
nimrobo net my applications --status accepted

# 7. Check messages from employers
nimrobo net my summary
nimrobo net channels messages ch_abc123

# 8. Respond to messages
nimrobo net channels send ch_abc123 --message "Thanks! I'm available tomorrow."
```

---

## 5. Organization Management Workflow (Net)

Manage team members and handle join requests.

```bash
# 1. Set org context
nimrobo net orgs use org_abc123

# 2. View current members
nimrobo net orgs manage members current

# 3. Invite new members
nimrobo net orgs manage invite current --email "new@example.com" --role member
nimrobo net orgs manage invite current --email "lead@example.com" --role admin

# 4. Review join requests
nimrobo net orgs manage join-requests current
nimrobo net orgs manage approve-request req_123 --role member
nimrobo net orgs manage reject-request req_456

# 5. Update member roles
nimrobo net orgs manage update-role current usr_789 --role admin

# 6. Remove member if needed
nimrobo net orgs manage remove-member current usr_xyz
```

---

## 6. Applicant Review Workflow (Net)

Efficiently review and process job applications.

```bash
# 1. Set post context
nimrobo net posts use post_abc123

# 2. Check activity summary
nimrobo net my summary

# 3. List pending applications
nimrobo net posts applications current --status pending

# 4. Review individual applications
nimrobo net applications get app_123
nimrobo net applications get app_456

# 5. Batch process multiple applications
nimrobo net applications batch-action \
  --action accept \
  --ids "app_123,app_456,app_789" \
  --channel-expires "2024-08-01"

nimrobo net applications batch-action \
  --action reject \
  --ids "app_abc,app_def" \
  --reason "Position filled"

# 6. Message accepted applicants
nimrobo net channels list --post current
nimrobo net channels send ch_new1 --message "Congratulations! Let's schedule an interview."
```

---

## Quick Reference: Common Patterns

### Using Context to Avoid Repetition

```bash
# Set contexts once
nimrobo net orgs use org_abc
nimrobo net posts use post_xyz
nimrobo net channels use ch_123

# Then use "current" everywhere
nimrobo net orgs get current
nimrobo net posts applications current
nimrobo net channels messages current
```

### JSON Output for Scripting

```bash
# Get data in JSON format
nimrobo net posts list --json > posts.json
nimrobo net my applications --status accepted --json | jq '.data[].id'
```

### Pagination for Large Lists

```bash
# Page through results
nimrobo net posts list --limit 20 --skip 0   # Page 1
nimrobo net posts list --limit 20 --skip 20  # Page 2
nimrobo net posts list --limit 20 --skip 40  # Page 3
```

### Checking Status Quickly

```bash
# Quick activity overview
nimrobo status
nimrobo net my summary
```

### Batch Operations

```bash
# Create multiple links
nimrobo voice links create -p default -l "A,B,C,D,E" -e 1_week

# Process multiple applications
nimrobo net applications batch-action --action accept --ids "1,2,3"
```
