---
name: bring
description: Manage Bring! shopping lists - view, add, and remove grocery items from shared shopping lists. Use when the user wants to interact with their Bring! shopping list app, add groceries, check what's on the list, or remove items after shopping.
---

# Bring Shopping List Integration

Interact with Bring! shopping lists to manage groceries and shopping items.

## Prerequisites

The `bring-shopping` npm package must be installed:

```bash
npm install -g bring-shopping
```

## Initial Setup

Before first use, configure Bring credentials:

```bash
./bring configure <email> <password>
```

Credentials are stored in `~/.openclaw/bring/config.json`.

## Common Operations

### List All Shopping Lists

Get all available shopping lists with their UUIDs:

```bash
./bring lists
```

Output includes list names, UUIDs, and themes.

### Find a List by Name

Search for a list by partial name match:

```bash
./bring findlist "Home"
./bring findlist "Groceries"
```

Returns matching lists with their UUIDs.

### View List Items

Show all items in a shopping list:

```bash
./bring items <listUuid>
```

Or use the default list (if set):

```bash
./bring items
```

Returns items to purchase and recently purchased items.

### Add Items

Add an item to a shopping list:

```bash
./bring add <listUuid> "<item-name>" "<optional-note>"
```

Examples:

```bash
./bring add abc-123 "Latte" "2 litri"
./bring add abc-123 "Pane"
```

**Tip:** Use item names that match what you already use in the Bring app to ensure icons appear.

### Remove Items

Remove an item from a shopping list (moves to recent list):

```bash
./bring remove <listUuid> "<item-name>"
```

### Set Default List

Set a default list UUID to avoid passing it each time:

```bash
./bring setdefault <listUuid>
```

After setting default, you can use `./bring items` without specifying listUuid.

### Manage List Languages

Set the language for a list (for reference):

```bash
./bring setlang <listUuid> it-IT
./bring setlang <listUuid> es-ES
./bring setlang <listUuid> en-US
```

Get the configured language:

```bash
./bring getlang <listUuid>
```

Supported locales: `en-US`, `it-IT`, `es-ES`, `de-DE`, `fr-FR`

## Workflow Examples

### Adding to a Named List

When user says "Add milk to the Home list":

1. Find the list:

   ```bash
   ./bring findlist "Home"
   ```

2. Check what language/names are used in that list:

   ```bash
   ./bring items <listUuid>
   ```

3. Add using the appropriate name (match existing items):
   ```bash
   ./bring add <listUuid> "Latte"  # If list uses Italian
   # or
   ./bring add <listUuid> "Milk"   # If list uses English
   ```

### Checking What's Needed

When user asks "What's on my shopping list?":

```bash
./bring items <listUuid>
```

Or if default is set:

```bash
./bring items
```

Parse and present items in a readable format.

### Marking Items as Purchased

When user says "Remove milk from the list":

```bash
./bring remove <listUuid> "Latte"
```

## Multilingual Families

For families using multiple languages:

1. **Check existing items** in each list to see what language is used
2. **Use consistent naming** - match the names already in the list
3. **Set list language** with `setlang` for reference
4. **Learn from context** - if a list has "Latte", "Pane", "Uova", it's Italian

The Bring app automatically shows icons when item names match its catalog. To ensure icons appear, use names that match what the Bring app recognizes for that language.

## Technical Details

- The `bring` wrapper script sets NODE_PATH for the npm package
- Configuration stored in `~/.openclaw/bring/config.json`
- Session authenticated via email/password
- Lists can be shared among family members
- Changes sync in real-time across all devices

## Notes

- Item names are case-sensitive
- The "remove" command moves items to "recent" list (not permanent deletion)
- Multiple family members can share lists
- Each list can use different language conventions
- Match item names to what's already in your lists for best icon support
