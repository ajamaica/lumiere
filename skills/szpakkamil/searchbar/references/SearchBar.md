# SearchBar Overview & Setup

## Overview

The `SearchBar` package offers a native, highly customizable search component for SwiftUI. It supports iOS, iPadOS, macOS, and visionOS, providing a unified API that adapts to each platform's conventions while offering advanced styling and data capabilities.

-   **iOS/iPadOS/visionOS**: Wraps `UISearchBar` via `UIViewRepresentable` for authentic platform behavior, including support for tokens and standard keyboard interactions.
-   **macOS**: Re-implements the search bar using native SwiftUI views (`TextField`, `HStack`, etc.) for maximum flexibility and consistency with macOS design patterns.

## Setup

Add the package via Swift Package Manager:
URL: `https://github.com/SzpakKamil/SearchBar.git`

**Requirements:**
-   iOS 14.0+
-   macOS 11.0+
-   visionOS 1.0+
-   Swift 5.9+

**Import:**
```swift
import SearchBar
```

## Initialization

The core component is the `SearchBar` view. It requires a binding to a string for the search text and an optional prompt.

```swift
public init(text: Binding<String>, prompt: String? = nil)
```

### Parameters

-   `text`: A `Binding<String>` that controls the search query. This is a two-way binding; changes in the search bar update the state, and changes to the state update the search bar.
-   `prompt`: An optional `String` used as placeholder text when the search field is empty. If `nil`, a default localized prompt (e.g., "Search") is used.

## Basic Usage

The simplest usage involves a state variable for the text and the default style.

```swift
import SwiftUI
import SearchBar

struct ContentView: View {
    @State private var searchText = ""

    var body: some View {
        VStack {
            SearchBar(text: $searchText, prompt: "Search here...")
                .padding()
            
            Text("You are searching for: \(searchText)")
            
            Spacer()
        }
    }
}
```

## Key Features

-   **Unified Styling**: Customize corner radius, text colors, background colors, and materials using a single API (`.searchBarStyle`, `.searchBarMaterial`).
-   **Event Handling**: Comprehensive hooks for text changes, begin/end editing, and button taps (`.searchBarBeginEditingAction`, `.searchBarCancelButtonAction`).
-   **Advanced Data**: Built-in support for search tokens (chips) and dynamic suggestions on iOS 16+ and visionOS (`.searchBarCurrentTokens`, `.searchBarSuggestions`).
-   **Accessibility**: Full VoiceOver and Dynamic Type support, respecting system settings.
-   **Cross-Platform**: Automatically handles differences between `UISearchBar` (iOS) and SwiftUI views (macOS).

## Next Steps

-   **Styling**: Learn how to customize the look in `SearchBarStyle.md`.
-   **Behavior**: Configure buttons and events in `SearchBarDisplayModes.md` and `SearchBarModifiers.md`.
-   **Data**: Implement tokens and suggestions in `SearchBarData.md`.