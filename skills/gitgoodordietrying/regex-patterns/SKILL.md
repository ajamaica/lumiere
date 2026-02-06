---
name: regex-patterns
description: Practical regex patterns across languages and use cases. Use when validating input (email, URL, IP), parsing log lines, extracting data from text, refactoring code with search-and-replace, or debugging why a regex doesn't match.
metadata:
  {
    'clawdbot':
      {
        'emoji': '🔤',
        'requires': { 'anyBins': ['grep', 'python3', 'node'] },
        'os': ['linux', 'darwin', 'win32'],
      },
  }
---

# Regex Patterns

Practical regular expression cookbook. Patterns for validation, parsing, extraction, and refactoring across JavaScript, Python, Go, and command-line tools.

## When to Use

- Validating user input (email, URL, IP, phone, dates)
- Parsing log lines or structured text
- Extracting data from strings (IDs, numbers, tokens)
- Search-and-replace in code (rename variables, update imports)
- Filtering lines in files or command output
- Debugging regexes that don't match as expected

## Quick Reference

### Metacharacters

| Pattern          | Matches                                 | Example                                   |
| ---------------- | --------------------------------------- | ----------------------------------------- |
| `.`              | Any character (except newline)          | `a.c` matches `abc`, `a1c`                |
| `\d`             | Digit `[0-9]`                           | `\d{3}` matches `123`                     |
| `\w`             | Word char `[a-zA-Z0-9_]`                | `\w+` matches `hello_123`                 |
| `\s`             | Whitespace `[ \t\n\r\f]`                | `\s+` matches spaces/tabs                 |
| `\b`             | Word boundary                           | `\bcat\b` matches `cat` not `scatter`     |
| `^`              | Start of line                           | `^Error` matches line starting with Error |
| `$`              | End of line                             | `\.js$` matches line ending with .js      |
| `\D`, `\W`, `\S` | Negated: non-digit, non-word, non-space |                                           |

### Quantifiers

| Pattern    | Meaning                         |
| ---------- | ------------------------------- |
| `*`        | 0 or more (greedy)              |
| `+`        | 1 or more (greedy)              |
| `?`        | 0 or 1 (optional)               |
| `{3}`      | Exactly 3                       |
| `{2,5}`    | Between 2 and 5                 |
| `{3,}`     | 3 or more                       |
| `*?`, `+?` | Lazy (match as few as possible) |

### Groups and Alternation

| Pattern         | Meaning                        |
| --------------- | ------------------------------ |
| `(abc)`         | Capture group                  |
| `(?:abc)`       | Non-capturing group            |
| `(?P<name>abc)` | Named group (Python)           |
| `(?<name>abc)`  | Named group (JS/Go)            |
| `a\|b`          | Alternation (a or b)           |
| `[abc]`         | Character class (a, b, or c)   |
| `[^abc]`        | Negated class (not a, b, or c) |
| `[a-z]`         | Range                          |

### Lookahead and Lookbehind

| Pattern    | Meaning                                   |
| ---------- | ----------------------------------------- |
| `(?=abc)`  | Positive lookahead (followed by abc)      |
| `(?!abc)`  | Negative lookahead (not followed by abc)  |
| `(?<=abc)` | Positive lookbehind (preceded by abc)     |
| `(?<!abc)` | Negative lookbehind (not preceded by abc) |

## Validation Patterns

### Email

```
# Basic (covers 99% of real emails)
^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$

# Stricter (no consecutive dots, no leading/trailing dots in local part)
^[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$
```

### URL

```
# HTTP/HTTPS URLs
https?://[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*(/[^\s]*)?

# With optional port and query
https?://[^\s/]+(/[^\s?]*)?(\?[^\s#]*)?(#[^\s]*)?
```

### IP Addresses

```
# IPv4
\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b

# IPv4 (simple, allows invalid like 999.999.999.999)
\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b

# IPv6 (simplified)
(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}
```

### Phone Numbers

```
# US phone (various formats)
(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}
# Matches: +1 (555) 123-4567, 555.123.4567, 5551234567

# International (E.164)
\+[1-9]\d{6,14}
```

### Dates and Times

```
# ISO 8601 date
\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])

# ISO 8601 datetime
\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})

# US date (MM/DD/YYYY)
(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\d|3[01])/\d{4}

# Time (HH:MM:SS, 24h)
(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d
```

### Passwords (Strength Check)

```
# At least 8 chars, 1 upper, 1 lower, 1 digit, 1 special
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=-]).{8,}$
```

### UUIDs

```
[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
```

### Semantic Version

```
\bv?(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?(?:\+([\w.]+))?\b
# Captures: major, minor, patch, prerelease, build
# Matches: 1.2.3, v1.0.0-beta.1, 2.0.0+build.123
```

## Parsing Patterns

### Log Lines

```bash
# Apache/Nginx access log
# Format: IP - - [date] "METHOD /path HTTP/x.x" status size
grep -oP '(\S+) - - \[([^\]]+)\] "(\w+) (\S+) \S+" (\d+) (\d+)' access.log

# Extract IP and status code
grep -oP '^\S+|"\s\K\d{3}' access.log

# Syslog format
# Format: Mon DD HH:MM:SS hostname process[pid]: message
grep -oP '^\w+\s+\d+\s[\d:]+\s(\S+)\s(\S+)\[(\d+)\]:\s(.*)' syslog

# JSON log — extract a field
grep -oP '"level"\s*:\s*"\K[^"]+' app.log
grep -oP '"message"\s*:\s*"\K[^"]+' app.log
```

### Code Patterns

```bash
# Find function definitions (JavaScript/TypeScript)
grep -nP '(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?function\s*\()' src/*.ts

# Find class definitions
grep -nP 'class\s+\w+(?:\s+extends\s+\w+)?' src/*.ts

# Find import statements
grep -nP '^import\s+.*\s+from\s+' src/*.ts

# Find TODO/FIXME/HACK comments
grep -rnP '(?:TODO|FIXME|HACK|XXX|WARN)(?:\([^)]+\))?:?\s+' src/

# Find console.log left in code
grep -rnP 'console\.(log|debug|info|warn|error)\(' src/ --include='*.ts' --include='*.js'
```

### Data Extraction

```bash
# Extract all email addresses from a file
grep -oP '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' file.txt

# Extract all URLs
grep -oP 'https?://[^\s<>"]+' file.html

# Extract all quoted strings
grep -oP '"[^"\\]*(?:\\.[^"\\]*)*"' file.json

# Extract numbers (integer and decimal)
grep -oP '-?\d+\.?\d*' data.txt

# Extract key-value pairs (key=value)
grep -oP '\b(\w+)=([^\s&]+)' query.txt

# Extract hashtags
grep -oP '#\w+' posts.txt

# Extract hex colors
grep -oP '#[0-9a-fA-F]{3,8}\b' styles.css
```

## Language-Specific Usage

### JavaScript

```javascript
// Test if a string matches
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
emailRegex.test('user@example.com') // true

// Extract with capture groups
const match = '2026-02-03T12:30:00Z'.match(/(\d{4})-(\d{2})-(\d{2})/)
// match[1] = '2026', match[2] = '02', match[3] = '03'

// Named groups
const m = 'John Doe, age 30'.match(/(?<name>[A-Za-z ]+), age (?<age>\d+)/)
// m.groups.name = 'John Doe', m.groups.age = '30'

// Find all matches (matchAll returns iterator)
const text = 'Call 555-1234 or 555-5678'
const matches = [...text.matchAll(/\d{3}-\d{4}/g)]
// [{0: '555-1234', index: 5}, {0: '555-5678', index: 18}]

// Replace with callback
'hello world'.replace(/\b\w/g, (c) => c.toUpperCase())
// 'Hello World'

// Replace with named groups
'2026-02-03'.replace(/(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/, '$<m>/$<d>/$<y>')
// '02/03/2026'

// Split with regex
'one, two;  three'.split(/[,;]\s*/)
// ['one', 'two', 'three']
```

### Python

```python
import re

# Match (anchored to start)
m = re.match(r'^(\w+)@(\w+)\.(\w+)$', 'user@example.com')
if m:
    print(m.group(1))  # 'user'

# Search (find first match anywhere)
m = re.search(r'\d{3}-\d{4}', 'Call 555-1234 today')
print(m.group())  # '555-1234'

# Find all matches
emails = re.findall(r'[\w.+-]+@[\w.-]+\.\w{2,}', text)

# Named groups
m = re.match(r'(?P<name>\w+)\s+(?P<age>\d+)', 'Alice 30')
print(m.group('name'))  # 'Alice'

# Substitution
result = re.sub(r'\bfoo\b', 'bar', 'foo foobar foo')
# 'bar foobar bar'

# Sub with callback
result = re.sub(r'\b\w', lambda m: m.group().upper(), 'hello world')
# 'Hello World'

# Compile for reuse (faster in loops)
pattern = re.compile(r'\d{4}-\d{2}-\d{2}')
dates = pattern.findall(log_text)

# Multiline and DOTALL
re.findall(r'^ERROR.*$', text, re.MULTILINE)  # ^ and $ match line boundaries
re.search(r'start.*end', text, re.DOTALL)      # . matches newlines

# Verbose mode (readable complex patterns)
pattern = re.compile(r'''
    ^                   # Start of string
    (?P<year>\d{4})     # Year
    -(?P<month>\d{2})   # Month
    -(?P<day>\d{2})     # Day
    $                   # End of string
''', re.VERBOSE)
```

### Go

```go
import "regexp"

// Compile pattern (panics on invalid regex)
re := regexp.MustCompile(`\d{4}-\d{2}-\d{2}`)

// Match test
re.MatchString("2026-02-03")  // true

// Find first match
re.FindString("Date: 2026-02-03 and 2026-03-01")  // "2026-02-03"

// Find all matches
re.FindAllString(text, -1)  // []string of all matches

// Capture groups
re := regexp.MustCompile(`(\w+)@(\w+)\.(\w+)`)
match := re.FindStringSubmatch("user@example.com")
// match[0] = "user@example.com", match[1] = "user", match[2] = "example"

// Named groups
re := regexp.MustCompile(`(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})`)
match := re.FindStringSubmatch("2026-02-03")
for i, name := range re.SubexpNames() {
    if name != "" {
        fmt.Printf("%s: %s\n", name, match[i])
    }
}

// Replace
re.ReplaceAllString("foo123bar", "NUM")  // "fooNUMbar"

// Replace with function
re.ReplaceAllStringFunc(text, strings.ToUpper)

// Note: Go uses RE2 syntax — no lookahead/lookbehind
```

### Command Line (grep/sed)

```bash
# grep -P uses PCRE (Perl-compatible — full features)
# grep -E uses Extended regex (no lookahead/lookbehind)

# Find lines matching a pattern
grep -P '\d{3}-\d{4}' file.txt

# Extract only the matching part
grep -oP '\d{3}-\d{4}' file.txt

# Invert match (lines NOT matching)
grep -vP 'DEBUG|TRACE' app.log

# sed replacement
sed 's/oldPattern/newText/g' file.txt         # Basic
sed -E 's/foo_([a-z]+)/bar_\1/g' file.txt     # Extended with capture group

# Perl one-liner (most powerful)
perl -pe 's/(?<=price:\s)\d+/0/g' file.txt    # Lookbehind works in Perl
```

## Search-and-Replace Patterns

### Code Refactoring

```bash
# Rename a variable across files
grep -rlP '\boldName\b' src/ | xargs sed -i 's/\boldName\b/newName/g'

# Convert var to const (JavaScript)
sed -i -E 's/\bvar\b/const/g' src/*.js

# Convert single quotes to double quotes
sed -i "s/'/\"/g" src/*.ts

# Add trailing commas to object properties
sed -i -E 's/^(\s+\w+:.+[^,])$/\1,/' config.json

# Update import paths
sed -i 's|from '\''../old-path/|from '\''../new-path/|g' src/*.ts

# Convert snake_case to camelCase (Python → JavaScript naming)
perl -pe 's/_([a-z])/uc($1)/ge' file.txt
```

### Text Cleanup

```bash
# Remove trailing whitespace
sed -i 's/[[:space:]]*$//' file.txt

# Remove blank lines
sed -i '/^$/d' file.txt

# Remove duplicate blank lines (keep at most one)
sed -i '/^$/N;/^\n$/d' file.txt

# Trim leading and trailing whitespace from each line
sed -i 's/^[[:space:]]*//;s/[[:space:]]*$//' file.txt

# Remove HTML tags
sed 's/<[^>]*>//g' file.html

# Remove ANSI color codes
sed 's/\x1b\[[0-9;]*m//g' output.txt
```

## Common Gotchas

### Greedy vs lazy matching

```
Pattern: <.*>     Input: <b>bold</b>
Greedy  matches: <b>bold</b>     (entire string between first < and last >)
Lazy    matches: <b>              (stops at first >)
Pattern: <.*?>    (lazy version)
```

### Escaping special characters

```
Characters that need escaping in regex: . * + ? ^ $ { } [ ] ( ) | \
In character classes []: only ] - ^ \ need escaping

# To match a literal dot:  \.
# To match a literal *:    \*
# To match a literal \:    \\
# To match [ or ]:         \[ or \]
```

### Newlines and multiline

```
By default . does NOT match newline.
By default ^ and $ match start/end of STRING.

# To make . match newlines:
JavaScript: /pattern/s (dotAll flag)
Python: re.DOTALL or re.S
Go: (?s) inline flag

# To make ^ $ match line boundaries:
JavaScript: /pattern/m (multiline flag)
Python: re.MULTILINE or re.M
Go: (?m) inline flag
```

### Backtracking and performance

```
# Catastrophic backtracking (avoid these patterns on untrusted input):
(a+)+        # Nested quantifiers
(a|a)+       # Overlapping alternation
(.*a){10}    # Ambiguous .* with repetition

# Safe alternatives:
[a]+         # Instead of (a+)+
a+           # Instead of (a|a)+
[^a]*a       # Possessive/atomic instead of .*a
```

## Tips

- Start simple and add complexity. `\d+` is almost always enough — you rarely need `[0-9]+`.
- Test your regex on real data, not just the happy path. Edge cases (empty strings, special characters, Unicode) break naive patterns.
- Use non-capturing groups `(?:...)` when you don't need the captured value. It's slightly faster and cleaner.
- In JavaScript, always use the `g` flag for `matchAll` and global `replace`. Without it, only the first match is found/replaced.
- Go's `regexp` package uses RE2 (no lookahead/lookbehind). If you need those, use a different approach or the `regexp2` package.
- `grep -P` (PCRE) is the most powerful command-line regex. Use it over `grep -E` when you need lookahead, `\d`, or `\b`.
- For complex patterns, use verbose mode (`re.VERBOSE` in Python, `/x` in Perl) with comments explaining each part.
- Regex is the wrong tool for parsing HTML, XML, or JSON. Use a proper parser. Regex works for extracting simple values from these formats, not for structural parsing.
