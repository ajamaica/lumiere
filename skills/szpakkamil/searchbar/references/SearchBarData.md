# SearchBar Data: Tokens & Suggestions

**Availability:** iOS 16.0+, visionOS 1.0+, macOS 15.0+ (Suggestions only).

`SearchBar` supports advanced search data structures: **Tokens** (also known as chips or tags) and **Suggestions** (dynamic results that appear while typing).

## Search Tokens

Tokens represent discrete search criteria (e.g., "Status: Open", "Tag: Swift"). They appear inside the search field before the text input.

### The `SearchBarToken` Structure

```swift
public struct SearchBarToken: Identifiable, Codable, Hashable {
    public let text: String       // Display text
    public let systemName: String // SF Symbol name
    public let id: String         // Unique ID (derived from text + icon)
}
```

### Managing Tokens

Use `.searchBarCurrentTokens(_:)` to bind an array of tokens to the search bar. This is a two-way binding:
1.  **Read:** You know what tokens the user has added.
2.  **Write:** You can programmatically add or remove tokens.

```swift
@State private var tokens: [SearchBarToken] = []

SearchBar(text: $text)
    .searchBarCurrentTokens($tokens)
```

### Suggesting Tokens

To let users pick tokens, provide a list of *suggested* tokens. These appear in the suggestion list and turn into tokens when tapped.

```swift
let availableTokens = [
    SearchBarToken(text: "Favorites", systemName: "star.fill"),
    SearchBarToken(text: "Unread", systemName: "envelope.badge")
]

SearchBar(text: $text)
    .searchBarSuggestedTokens(availableTokens) // or pass a Binding
```

## Search Suggestions

Suggestions are dynamic results that appear below the search bar as the user types.

### The `SearchBarSuggestion` Structure

```swift
public struct SearchBarSuggestion: Identifiable, Hashable {
    public let text: String        // Main title
    public let description: String? // Subtitle
    public let systemName: String?  // Optional icon
    public let token: SearchBarToken? // Associated token (if any)
}
```

### Displaying Suggestions

Bind an array of `SearchBarSuggestion` to `.searchBarSuggestions(_:)`.

```swift
@State private var suggestions: [SearchBarSuggestion] = []

SearchBar(text: $text)
    .searchBarSuggestions($suggestions)
    .onChange(of: text) { newText in
        // Update suggestions based on newText
        suggestions = myDataService.search(newText).map {
            SearchBarSuggestion(text: $0.title, description: $0.subtitle)
        }
    }
```

### Automatic Filtering

If you have a static list of suggestions and want `SearchBar` to filter them automatically based on the input text, use `.searchBarEnableAutomaticSuggestionsFiltering`.

```swift
SearchBar(text: $text)
    .searchBarSuggestions(allPossibleSuggestions)
    .searchBarEnableAutomaticSuggestionsFiltering(true)
```

**Custom Filtering Logic:**

You can provide a closure to define custom matching logic (e.g., case-insensitive, contains vs starts-with).

```swift
.searchBarEnableAutomaticSuggestionsFiltering(true) { query, suggestion in
    // Custom filter: Match only if query is at the start
    suggestion.text.lowercased().hasPrefix(query.lowercased())
}
```

## Unified Example

Here is how to combine tokens and suggestions for a rich search experience.

```swift
struct AdvancedSearch: View {
    @State private var text = ""
    @State private var tokens: [SearchBarToken] = []
    
    // Static suggestions for tokens
    let tokenSuggestions = [
        SearchBarSuggestion(
            text: "Filter: Image", 
            systemName: "photo", 
            token: SearchBarToken(text: "Image", systemName: "photo")
        ),
        SearchBarSuggestion(
            text: "Filter: Video", 
            systemName: "video", 
            token: SearchBarToken(text: "Video", systemName: "video")
        )
    ]
    
    var body: some View {
        SearchBar(text: $text)
            .searchBarCurrentTokens($tokens)
            .searchBarSuggestions(tokenSuggestions) // Show these when appropriate
            .searchBarEnableAutomaticSuggestionsFiltering(true)
    }
}
```