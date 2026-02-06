# Bring API Reference

This document provides detailed API information for the Bring shopping list integration.

## bring-shopping NPM Package

The skill uses the `bring-shopping` npm package (https://github.com/foxriver76/node-bring-api), a zero-dependency TypeScript library for Bring! API access.

## Core Methods

### Authentication

```javascript
const bring = new BringApi({ mail: 'email@example.com', password: 'password' })
await bring.login() // Returns bearer token and user info
```

After login, `bring.name` contains the user's name and `bring.uuid` contains their user UUID.

### List Management

#### loadLists()

Get all shopping lists:

```javascript
const lists = await bring.loadLists()
```

Returns array of list objects:

```json
[
  {
    "listUuid": "9b3ba561-02ad-4744-a737-c43k7e5b93ec",
    "name": "Groceries",
    "theme": "blueFresh",
    "users": [...]
  }
]
```

#### getAllUsersFromList(listUuid)

Get members of a specific list:

```javascript
const users = await bring.getAllUsersFromList(listUuid)
```

### Item Management

#### getItems(listUuid)

Get all items in a shopping list:

```javascript
const items = await bring.getItems(listUuid)
```

Returns:

```json
{
  "uuid": "list-uuid",
  "status": "SHARED",
  "purchase": ["Milk", "Bread"],
  "recently": ["Eggs"]
}
```

- `purchase`: Items to buy
- `recently`: Recently purchased items

#### getItemsDetails(listUuid)

Get detailed item information including notes:

```javascript
const details = await bring.getItemsDetails(listUuid)
```

Returns detailed item objects with specifications and metadata.

#### saveItem(listUuid, itemName, specification)

Add or update an item:

```javascript
await bring.saveItem(listUuid, 'Milk', '2 liters')
await bring.saveItem(listUuid, 'Apples', '') // No note
```

Parameters:

- `listUuid`: List UUID
- `itemName`: Item name (string)
- `specification`: Optional note/specification (string, can be empty)

#### moveToRecentList(listUuid, itemName)

Remove item from purchase list (move to recently purchased):

```javascript
await bring.moveToRecentList(listUuid, 'Milk')
```

This is equivalent to "marking as purchased" in the app.

### Translations & Catalog

#### loadTranslations(locale)

Get localized item names:

```javascript
const translations = await bring.loadTranslations('en-US')
// Also supports: 'de-DE', 'fr-FR', 'it-IT', 'es-ES', etc.
```

#### getCatalog(locale)

Get the full catalog of available items with images:

```javascript
const catalog = await bring.getCatalog('en-US')
```

### Invitations

#### getPendingInvitations()

Get pending list invitations:

```javascript
const invitations = await bring.getPendingInvitations()
```

## Item Images

The package also supports associating images with items:

```javascript
// Link image to item
await bring.linkItemImage(listUuid, itemName, imageUrl)

// Remove image
await bring.removeItemImage(listUuid, itemName)
```

## Error Handling

All methods throw proper Error objects (not strings) on failure. Common errors:

- Authentication failure (wrong email/password)
- List not found (invalid listUuid)
- Network errors
- Invalid item names

## Rate Limiting

Bring API has rate limiting. Best practices:

- Cache list UUIDs when possible
- Batch operations when adding multiple items
- Don't poll for changes continuously (use push updates in production)

## Technical Notes

- Requires Node.js 18 or above (uses native fetch)
- Zero external dependencies
- Fully typed with TypeScript
- Async/await based API
- Bearer token automatically refreshed on expiry
