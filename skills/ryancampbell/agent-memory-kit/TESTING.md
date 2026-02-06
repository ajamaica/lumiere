# Memory Kit Search - Testing Guide

**Purpose:** Verify the search system works correctly.

---

## Manual Testing

### 1. Basic Keyword Search

```bash
memory-search "memory"
```

**Expected:** Find entries mentioning "memory" across memory files.

**Verify:**

- Results displayed with file:line
- Preview text shown
- Results ranked by relevance

---

### 2. Tag Filtering

```bash
memory-search --tag decision
```

**Expected:** Find entries tagged with `#decision`.

**Verify:**

- Only decision-tagged entries shown
- Tag shown in output
- Results from tagged files only

---

### 3. Date Range

```bash
# Relative
memory-search "kit" --since 7d

# Absolute
memory-search "kit" --since 2026-02-01
```

**Expected:** Only results from specified date range.

**Verify:**

- File dates match range
- Older files excluded
- Date shown in output

---

### 4. Quick Shortcuts

```bash
memory-search --today
memory-search --recent-decisions
memory-search --recent-wins
memory-search --active-blockers
```

**Expected:** Each shortcut works as filter combination.

**Verify:**

- `--today` = today's date only
- `--recent-decisions` = #decision + last 7d
- Results match filter intent

---

### 5. Procedure Search

```bash
memory-search --procedure "posting"
```

**Expected:** Search procedures/ folder only.

**Verify:**

- Only procedure files shown
- Files from memory/procedures/
- Daily logs excluded

---

### 6. Count Mode

```bash
memory-search "kit" --count
```

**Expected:** Count occurrences, show summary.

**Verify:**

- Total count shown
- By-file breakdown
- Most recent date
- Tag aggregation (if entries tagged)

---

### 7. Multiple Tags

```bash
memory-search --tag kits --tag distribution
```

**Expected:** AND logic — entries with BOTH tags.

**Verify:**

- Results have both tags
- Fewer results than single tag
- Correct filtering

---

### 8. Combined Filters

```bash
memory-search "ClawHub" --tag decision --since 7d
```

**Expected:** Keyword + tag + date range all applied.

**Verify:**

- Contains "ClawHub"
- Tagged #decision
- Within last 7 days
- All filters active

---

### 9. JSON Output

```bash
memory-search "memory" --format json
```

**Expected:** Valid JSON array.

**Verify:**

- Valid JSON syntax
- Fields: file, date, line, tags, preview, score
- Can pipe to jq

```bash
memory-search "memory" --format json | jq '.[0]'
```

---

### 10. No Results

```bash
memory-search "nonexistentxyzabc123"
```

**Expected:** "No results found."

**Verify:**

- Clean error message
- No crashes
- Exit code 0

---

## Automated Testing

### Test Script

Create `test-search.sh`:

```bash
#!/bin/bash

echo "=== Memory Kit Search Tests ==="

# Test 1: Help
echo -n "Test 1: Help... "
memory-search --help > /dev/null && echo "✓" || echo "✗"

# Test 2: Basic search
echo -n "Test 2: Basic search... "
memory-search "memory" > /dev/null && echo "✓" || echo "✗"

# Test 3: Tag search
echo -n "Test 3: Tag search... "
memory-search --tag decision > /dev/null && echo "✓" || echo "✗"

# Test 4: Date range
echo -n "Test 4: Date range... "
memory-search --since 7d > /dev/null && echo "✓" || echo "✗"

# Test 5: Shortcuts
echo -n "Test 5: Shortcuts... "
memory-search --today > /dev/null && echo "✓" || echo "✗"

# Test 6: Count mode
echo -n "Test 6: Count mode... "
memory-search "kit" --count > /dev/null && echo "✓" || echo "✗"

# Test 7: JSON output
echo -n "Test 7: JSON output... "
memory-search "memory" --format json | jq . > /dev/null 2>&1 && echo "✓" || echo "✗"

# Test 8: Procedure search
echo -n "Test 8: Procedure search... "
memory-search --procedure "test" > /dev/null && echo "✓" || echo "✗"

echo "=== Tests Complete ==="
```

Run:

```bash
chmod +x test-search.sh
./test-search.sh
```

---

## Performance Testing

### Large Dataset Test

```bash
# Count total memory files
find memory -name "*.md" | wc -l

# Time a search
time memory-search "memory"

# Time with filters
time memory-search --tag decision --since 30d
```

**Target:** <2 seconds for 100 files

---

### Stress Test

```bash
# Search with no filters (all files)
time memory-search ""

# Complex multi-filter query
time memory-search "kit" --tag kits --tag distribution --project "Memory Kit" --since 30d
```

---

## Edge Cases

### 1. Empty Query

```bash
memory-search ""
```

**Expected:** Return all tagged/filtered entries if filters present, or empty.

---

### 2. Special Characters

```bash
memory-search "token-limit"
memory-search "memory/procedures"
memory-search "API call"
```

**Expected:** Handle hyphens, slashes, spaces correctly.

---

### 3. Case Sensitivity

```bash
memory-search "MEMORY"
memory-search "memory"
memory-search "Memory"
```

**Expected:** All return same results (case-insensitive).

---

### 4. Multiple Words

```bash
memory-search "token limit"
memory-search "decision making"
```

**Expected:** Treat as phrase or individual words.

---

### 5. Tag Variations

```bash
memory-search --tag decision
memory-search --tag Decision
memory-search --tag #decision
```

**Expected:** All should work (normalize input).

---

### 6. Invalid Dates

```bash
memory-search --since 2026-99-99
memory-search --since "invalid"
```

**Expected:** Graceful error or skip invalid dates.

---

## Regression Tests

### After Each Update

1. **Basic search still works**

   ```bash
   memory-search "memory"
   ```

2. **Tag filtering works**

   ```bash
   memory-search --tag decision
   ```

3. **Date ranges work**

   ```bash
   memory-search --since 7d
   ```

4. **Count mode works**

   ```bash
   memory-search "kit" --count
   ```

5. **JSON output valid**
   ```bash
   memory-search "memory" --format json | jq .
   ```

---

## User Acceptance Testing

### Scenario 1: Morning Orientation

**Task:** Wake up, get oriented quickly.

**Actions:**

```bash
memory-search --today
memory-search --active-blockers
```

**Success:** <30 seconds to understand current state.

---

### Scenario 2: Find Past Decision

**Task:** "What did we decide about ClawHub publishing?"

**Actions:**

```bash
memory-search "ClawHub" --tag decision
```

**Success:** Find decision in <10 seconds.

---

### Scenario 3: Procedure Lookup

**Task:** "How do we post to DEV.to again?"

**Actions:**

```bash
memory-search --procedure "DEV.to"
```

**Success:** Find procedure immediately.

---

### Scenario 4: Pattern Detection

**Task:** "How often do we hit token limits?"

**Actions:**

```bash
memory-search "token limit" --count
```

**Success:** See frequency and context.

---

## Bug Reporting

If you find issues:

1. **Note the exact command** you ran
2. **Note the error message** (full output)
3. **Note your environment** (bash version, OS)
4. **Log to memory/feedback.md** with `#bug` tag

Example:

```markdown
### Search Bug: Tag Filtering Not Working #bug #search

**Command:** `memory-search --tag decision`
**Expected:** Find tagged entries
**Actual:** No results, but entries exist
**Environment:** macOS, bash 3.2
**Date:** 2026-02-04
```

---

## Known Issues

### 1. Bash 3.2 Compatibility

**Issue:** Older bash doesn't support associative arrays.

**Solution:** Using temp files for compatibility.

**Status:** Fixed in v2.1.0

---

### 2. Binary File Warnings

**Issue:** grep may warn about binary files.

**Solution:** Use `2>/dev/null` to suppress.

**Status:** Working as intended.

---

### 3. Large Context Windows

**Issue:** `--context 100` may be slow.

**Solution:** Keep context reasonable (3-5 lines).

**Status:** User education.

---

## Continuous Monitoring

### Weekly Health Check

```bash
# Check search usage (if logging enabled)
grep "memory-search" memory/*.md | wc -l

# Check tag coverage
grep -r "#" memory/*.md | wc -l

# Check average search time
for i in {1..10}; do
  time memory-search "memory" > /dev/null
done
```

---

_Testing ensures reliability. Test often, test early._
