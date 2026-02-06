# AH GraphQL API Investigation (2026-02-02)

## Goal

Find a way to resolve recipe IDs from titles or search queries to enable full recipe detail lookups.

## Findings

### ✅ Solution: URL-based ID Extraction

**Recipe IDs are embedded in the URL structure:**

- Format: `https://www.ah.nl/allerhande/recept/R-R{ID}/{slug}`
- Example: `R-R1187649` → Recipe ID = `1187649`

**Extraction method:**

```python
import re
id_match = re.search(r'R-R(\d+)', url)
recipe_id = int(id_match.group(1))
```

### ❌ What Doesn't Work

1. **GraphQL Introspection:** Disabled by AH

   ```json
   {
     "errors": [
       {
         "message": "introspection has been disabled",
         "extensions": { "code": "INTROSPECTION_DISABLED" }
       }
     ]
   }
   ```

2. **recipeSearch Query:** Exists but unusable
   - Field: `recipeSearch(query: RecipeSearchParams!): RecipeSearchResult`
   - Problem: `RecipeSearchResult` type has no usable fields
   - Attempted fields: `recipes`, `items`, `results`, `hits`, `nodes`, `edges`
   - All return: `Cannot query field "{field}" on type "RecipeSearchResult"`
   - Likely returns paginated connections, but structure is undocumented

3. **Title-based Lookup:** Not available
   - `recipe(title: String!)` doesn't exist
   - Only `recipe(id: Int!)` is available
   - No filter-based queries work

### ✅ What Works

**Existing APIs:**

1. `recipeAutoSuggestions(query: String!)` → Returns list of recipe titles
2. `recipe(id: Int!)` → Returns full recipe details (ingredients, steps, images, etc.)

**New implementation:**

- `ah-recipes.py url --url <recipe-url>` → Extracts ID and fetches details

## GraphQL Query Structure

### Working Query: recipe(id: Int!)

```graphql
query recipe($id: Int!) {
  recipe(id: $id) {
    id
    title
    cookTime
    description
    preparation {
      steps
    }
    ingredients {
      name {
        singular
        plural
      }
      quantity
    }
    images {
      url
      width
      height
    }
  }
}
```

**Note:** `slug` field does NOT exist on Recipe type.

### Working Query: recipeAutoSuggestions

```graphql
query recipeAutosuggestion($query: String!) {
  recipeAutoSuggestions(query: $query)
}
```

Returns: Array of recipe title strings (not objects).

## Recipe ID Validation

**Tested ID:** `1187649` (from URL `R-R1187649`)
**Result:** ✅ Successfully returned recipe details for "Zoete-tortillachips"

**ID Range:** Unknown, but format suggests sequential numeric IDs starting from ~1000000+

## Recommendations

1. **For search:** Use `recipeAutoSuggestions` to get titles
2. **For details:**
   - If you have a URL → Use `url` action (extracts ID via regex)
   - If you have an ID → Use `details` action directly
3. **Don't waste time:** `recipeSearch` query is a dead end without introspection

## Limitations

- **Search returns titles only:** `recipeAutoSuggestions` doesn't return IDs or URLs
- **No title→ID mapping:** No GraphQL query exists to resolve title to ID
- **Client-side rendering:** Recipe search pages are React/Next.js apps (no scraping possible)
- **Workaround:** User must provide direct recipe URL or ID for full details

## Implementation

**Added to ah-recipes.py:**

```python
def get_recipe_from_url(url):
    """Extract recipe ID from URL and fetch details"""
    id_match = re.search(r'R-R(\d+)', url)
    if not id_match:
        raise ValueError(f"Cannot extract recipe ID from URL: {url}")
    recipe_id = int(id_match.group(1))
    return get_recipe_details(recipe_id)
```

**Usage:**

```bash
./ah-recipes.py url --url "https://www.ah.nl/allerhande/recept/R-R1187649/zoete-tortillachips" --pretty
```

## Investigation Notes

- Spent ~30 minutes trying different GraphQL query structures
- Introspection disabled is common for production GraphQL APIs
- URL pattern analysis proved most reliable method
- No server-side search endpoint available (client-side only)
- AH likely uses Algolia or similar for frontend search, not exposed via GraphQL

## Status

✅ **Problem solved:** Recipe IDs can be extracted from URLs
✅ **Feature implemented:** `ah-recipes.py url` action added
✅ **Documentation updated:** SKILL.md includes new examples

---

## UPDATE 2026-02-02: recipeSearchV2 Breakthrough! 🎉

**Discovery:** Found complete GraphQL schema from https://github.com/gwillem/appie-go

**Working Query:**

```graphql
query recipeSearchV2($searchText: String) {
  recipeSearchV2(searchText: $searchText) {
    result {
      id
      title
    }
    page {
      total
      hasNextPage
    }
  }
}
```

**Test Results:**

- Query: "pasta carbonara"
- Found: 49 recipes
- Output: IDs + titles directly!

**Implementation:**

- Updated `search_recipes()` to use `recipeSearchV2` instead of `recipeAutoSuggestions`
- Now returns: `{"recipes": [...], "total": 49, "hasMore": true}`
- Direct ID access - no URL parsing needed!

**Benefits:**

- ✅ Search by text → get IDs immediately
- ✅ Pagination support (total, hasMore)
- ✅ No need for URL extraction workarounds
- ✅ Complete recipe objects (can extend with more fields)
