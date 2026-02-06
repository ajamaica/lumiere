# SearchBar Display Modes

Control the visibility and behavior of the auxiliary buttons (Cancel and Clear) within the `SearchBar`.

## Cancel Button (iOS/visionOS)

The "Cancel" button is standard on iOS/visionOS search bars. It usually appears when the search bar is active (focused) and disappears when the user finishes or cancels search.

**Modifier:** `.searchBarCancelButtonDisplayMode(_:)`

### Modes

-   **.whileEditing** (Default): The button appears with an animation when the search bar gains focus and hides when it loses focus.
-   **.always**: The button is always visible, regardless of focus state.
-   **.never**: The button is never shown. Use this if you want to provide your own external cancel mechanism or for pure "filter" inputs.

```swift
// Force the cancel button to always be visible
SearchBar(text: $text)
    .searchBarCancelButtonDisplayMode(.always)
```

## Clear Button

The "Clear" button (small "x" circle) inside the text field allows users to quickly empty the search query.

**Modifier:** `.searchBarClearButtonDisplayMode(_:)`

### Modes

-   **.whileEditing** (iOS Default): Appears only when the text field is editing and has text.
-   **.always**: Always visible if there is text, even if not editing (common on macOS).
-   **.never**: Never shown.

```swift
// Hide the clear button completely
SearchBar(text: $text)
    .searchBarClearButtonDisplayMode(.never)
```

## Actions

You can attach custom actions to these buttons.

### Cancel Action
Triggered when the Cancel button is tapped. The search bar automatically resigns focus (closes keyboard), but you can add extra logic (e.g., clearing results).

```swift
.searchBarCancelButtonAction {
    print("User cancelled the search flow")
    // e.g., dismiss the view
}
```

### Clear Action
Triggered when the Clear button is tapped. The text is automatically set to empty, but you can hook into this event.

```swift
.searchBarClearButtonAction {
    print("User cleared the text")
    // e.g., reset filters
}
```