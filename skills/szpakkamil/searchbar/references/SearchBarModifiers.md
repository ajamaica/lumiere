# SearchBar Modifiers

This document lists all available modifiers for customizing the behavior and appearance of the `SearchBar`.

## Styling Modifiers

### `.searchBarStyle(_:)`

Customizes the visual style of the search bar. This is the primary modifier for changing colors and shape.

**Signatures:**

```swift
// Using a preset corner style
func searchBarStyle(
    _ style: SearchBarCornerStyle = .rounded, 
    borderColor: Color? = nil, 
    textColor: Color? = nil, 
    tint: Color? = nil, 
    tokenBackground: Color? = nil, // iOS/visionOS only
    backgroundColor: Color? = nil
) -> SearchBar

// Using a custom corner radius
func searchBarStyle(
    cornerRadius: CGFloat, 
    borderColor: Color? = nil, 
    textColor: Color? = nil, 
    tint: Color? = nil, 
    tokenBackground: Color? = nil, // iOS/visionOS only
    backgroundColor: Color? = nil
) -> SearchBar
```

**Parameters:**
-   `style`: A `SearchBarCornerStyle` (`.rounded`, `.capsule`, `.rectangle`).
-   `cornerRadius`: Exact point value for the corner radius.
-   `borderColor`: Color of the border (useful for custom backgrounds).
-   `textColor`: Color of the input text.
-   `tint`: Color of the cursor and interactive elements.
-   `tokenBackground`: Background color for search tokens (iOS/visionOS).
-   `backgroundColor`: Background color of the search field itself.

**Example:**
```swift
SearchBar(text: $text)
    .searchBarStyle(.capsule, textColor: .white, tint: .yellow, backgroundColor: .gray)
```

### `.searchBarMaterial(_:)` (iOS 26+ / macOS 26+)

Sets the material of the search bar background.

```swift
func searchBarMaterial(_ material: SearchBarMaterial) -> SearchBar
```

-   `material`: `.solid` (default) or `.glass`. Note: `.glass` uses `UIGlassEffect` on supported platforms.

### `.searchBarScale(_:)`

Adjusts the overall size of the search bar.

```swift
func searchBarScale(_ scale: SearchBarScale) -> SearchBar
```

-   `scale`: `.small`, `.medium`, `.large`. Default is `.small`.

### `.searchBarIconView(_:)`

Replaces the default magnifying glass icon with a custom view.

```swift
func searchBarIconView(_ view: () -> some View) -> SearchBar
```

**Example:**
```swift
SearchBar(text: $text)
    .searchBarIconView { Image(systemName: "star.fill") }
```

## Behavior & Events

### `.searchBarBeginEditingAction(_:)` / `.searchBarEndEditingAction(_:)`

Execute code when the user focuses or leaves the search field.

```swift
.searchBarBeginEditingAction { print("Focus gained") }
.searchBarEndEditingAction { print("Focus lost") }
```

### `.searchBarChangeAction(_:)`

Execute code specifically when the text changes.

```swift
.searchBarChangeAction { newText in
    print("User typed: \(newText)")
}
```

### `.searchBarIsFocused(_:)`

Programmatically control or observe the focus state.

```swift
@State private var isFocused = false

SearchBar(text: $text)
    .searchBarIsFocused($isFocused)

// ... elsewhere
Button("Focus Search") { isFocused = true }
```

### Keyboard & Input (iOS/visionOS)

These modifiers wrap standard `UITextInputTraits`.

-   `.searchBarReturnKeyType(_ type: UIReturnKeyType)`: e.g., `.go`, `.search`, `.done`.
-   `.searchBarKeyboardType(_ type: UIKeyboardType)`: e.g., `.emailAddress`, `.numberPad`.
-   `.searchBarAutoCorrectionType(_ type: UITextAutocorrectionType)`: `.default`, `.no`, `.yes`.
-   `.searchBarAutoCapitalizationType(_ type: UITextAutocapitalizationType)`: `.none`, `.words`, `.sentences`.
-   `.searchBarTextContentType(_ type: UITextContentType)`: e.g., `.emailAddress`.

## Button Configuration

### `.searchBarCancelButtonDisplayMode(_:)` (iOS/visionOS)

Controls when the "Cancel" button appears.

```swift
func searchBarCancelButtonDisplayMode(_ mode: SearchBarCancelButtonDisplayMode) -> SearchBar
```

-   `mode`: `.never`, `.always`, `.whileEditing` (default).

### `.searchBarCancelButtonAction(_:)` (iOS/visionOS)

Action to perform when Cancel is tapped.

```swift
.searchBarCancelButtonAction {
    print("Search cancelled")
}
```

### `.searchBarClearButtonDisplayMode(_:)`

Controls the "X" button visibility.

```swift
func searchBarClearButtonDisplayMode(_ mode: SearchBarClearButtonDisplayMode) -> SearchBar
```

-   `mode`: `.never`, `.always`, `.whileEditing` (iOS default behavior).

### `.searchBarClearButtonAction(_:)`

Action to perform when Clear is tapped.

```swift
.searchBarClearButtonAction {
    print("Text cleared")
}
```

## Data (Tokens & Suggestions)

See `SearchBarData.md` for detailed usage of:
-   `.searchBarCurrentTokens(_:)`
-   `.searchBarSuggestedTokens(_:)`
-   `.searchBarSuggestions(_:)`
-   `.searchBarEnableAutomaticSuggestionsFiltering(...)`