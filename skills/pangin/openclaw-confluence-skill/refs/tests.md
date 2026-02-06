# Confluence v2 skill - quick test checklist

1. Auth check (list spaces)

```
node scripts/spaces.js list
```

2. Folder children (LIFE)

```
node scripts/folders.js direct-children 87457793
```

3. Page fetch

```
node scripts/pages.js get 89522178
```

4. Labels list

```
node scripts/labels.js list
```

5. Ad-hoc call

```
node scripts/call.js GET /spaces
```
