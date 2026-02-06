# AI Navigation Best Practices

## Core Principle

Every token counts. Keep navigation files under 100 lines. Target 30-50 lines.

## Essential Elements

### 1. Purpose Statement (1-2 lines)

`**Purpose**: PARA PKM for John's coding projects and career.`

### 2. Quick Lookup Paths

```
**Active projects**: `projects/active/`
**Consulting ops**: `areas/consulting/operations/`
**Coding standards**: `resources/coding-standards/`
```

### 3. Current Context (optional)

Only if actively relevant: active clients, current projects, job hunt status

### 4. PARA Structure (brief)

```
projects/  = Time-bound goals
areas/     = Ongoing responsibilities
resources/ = Reference material
archives/  = Completed work
```

### 5. Navigation Tips (1 line)

`Use grep for keywords. Use glob for patterns.`

## Anti-Patterns

- **Explaining PARA**: AI knows it; just show structure
- **Listing all files**: Show paths, let AI grep/glob
- **Usage instructions**: Focus on navigation only
- **Duplicate info**: Point to files, don't repeat content
- **Detailed descriptions**: Just list paths

## Progressive Disclosure

Navigation file → grep/glob → read specific files

Navigation provides entry points; agent discovers details through tools.

## Template (~30-50 lines)

```markdown
# AI Agent Navigation Index

**Purpose**: [One line]

## Quick Lookup Paths

**Key area 1**: `path/`
**Key area 2**: `path/`

## Current Context

[Optional: what's active now]

## PARA Structure

projects/ = Time-bound
areas/ = Ongoing
resources/ = Reference
archives/ = Completed

Use grep for keywords.
```

## When to Update

Update for: major structural changes, significant project shifts, new usage patterns
Don't update for: individual file additions, minor tweaks, content updates

## Multiple AI Systems

Option 1: Single `AGENTS.md`, symlink others
Option 2: System-specific files (keep all minimal)
