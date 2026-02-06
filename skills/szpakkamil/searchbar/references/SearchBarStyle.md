# SearchBar Styling

The `SearchBar` provides a flexible styling system through the `.searchBarStyle` modifier. This allows you to customize the shape, colors, and overall aesthetic of the search component to match your app's design system.

## The `.searchBarStyle` Modifier

This is the primary entry point for styling. It allows you to configure specific colors and shapes while handling platform differences gracefully.

### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `style` | `SearchBarCornerStyle` | The shape of the search bar (`.rounded`, `.capsule`, `.rectangle`). |
| `cornerRadius` | `CGFloat` | (Alternative to `style`) A specific point value for the corner radius. |
| `borderColor` | `Color?` | Optional border color. Useful when using clear backgrounds. |
| `textColor` | `Color?` | The color of the input text. Defaults to system label color. |
| `tint` | `Color?` | The tint color for the cursor and interactive elements. |
| `tokenBackground` | `Color?` | (iOS/visionOS) The background color of token chips. |
| `backgroundColor` | `Color?` | The background color of the search field itself. |

## Corner Styles

The `SearchBarCornerStyle` enum provides semantic shape definitions:

-   **.rounded**: Standard rounded corners (iOS default).
    -   iOS: ~10pt
    -   macOS: ~5pt
    -   visionOS: ~22pt (when not capsule)
-   **.capsule**: Fully rounded ends (pill shape). Ideal for standalone search bars.
    -   iOS: ~18pt (effectively 50% height)
    -   visionOS: ~22pt
-   **.rectangle**: Sharp corners (0pt radius).

```swift
// Capsule style
SearchBar(text: $text)
    .searchBarStyle(.capsule)

// Custom radius
SearchBar(text: $text)
    .searchBarStyle(cornerRadius: 12)
```

## Color Customization

You can granularly control the color palette.

### Background & Text
```swift
SearchBar(text: $text)
    .searchBarStyle(
        .rounded,
        textColor: .white,
        backgroundColor: Color.blue.opacity(0.2)
    )
```

### Tokens (Chips)
On iOS and visionOS, you can style the background of search tokens.

```swift
SearchBar(text: $text)
    .searchBarStyle(
        .rounded,
        tokenBackground: .blue // Tokens will have a blue background
    )
```

## Materials (Glass)

**Availability:** iOS 26+, macOS 26+ (Experimental/Future)

For a modern, translucent look, you can use the `.searchBarMaterial` modifier.

-   **.solid** (Default): Uses a standard opaque or semi-opaque color.
-   **.glass**: Uses `UIGlassEffect` (iOS) or native materials (macOS) to blur content behind the search bar.

```swift
SearchBar(text: $text)
    .searchBarMaterial(.glass)
    .searchBarStyle(.capsule, backgroundColor: .clear) // Clear bg to let glass show
```

## Scaling

Use `.searchBarScale` to adjust the visual weight of the search bar. This scales the height, padding, and font size proportionally.

-   **.small** (Default): Standard system size.
-   **.medium**: Slightly larger, good for prominent search areas.
-   **.large**: Hero search bar size.

```swift
SearchBar(text: $text)
    .searchBarScale(.large)
```