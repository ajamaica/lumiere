# SymbolPicker Overview & Setup

## Overview

The `SymbolPicker` package provides a native, highly customizable SF Symbol picker for SwiftUI. It adapts to platform-specific presentation styles (sheets on iOS, popovers on iPadOS/macOS) and offers extensive customization for symbol rendering and color selection.

-   **iOS/visionOS**: Presents as a sheet with a search bar and grid layout.
-   **iPadOS/macOS**: Presents as a popover or window, optimized for pointer interaction.

## Setup

Add the package via Swift Package Manager:
URL: `https://github.com/SzpakKamil/SymbolPicker.git`

**Requirements:**
-   iOS 14.0+
-   iPadOS 14.0+
-   macOS 11.0+
-   visionOS 1.0+
-   Swift 5.9+

**Import:**
```swift
import SymbolPicker
```

## Initialization

The core component is the `.symbolPicker` modifier attached to a view. It requires at least a binding to presentation state and a symbol name.

```swift
func symbolPicker(isPresented: Binding<Bool>, symbolName: Binding<String>) -> some View
```

### Parameters

-   `isPresented`: A `Binding<Bool>` that controls the visibility of the picker.
-   `symbolName`: A `Binding<String>` that holds the selected SF Symbol name (e.g., "star.fill").

## Basic Usage

The simplest usage involves a state variable for the symbol name and a boolean for presentation.

```swift
import SwiftUI
import SymbolPicker

struct ContentView: View {
    @State private var isPresented = false
    @State private var icon = "star.fill"

    var body: some View {
        Button {
            isPresented = true
        } label: {
            Label("Select Icon", systemImage: icon)
        }
        .symbolPicker(isPresented: $isPresented, symbolName: $icon)
    }
}
```

## Key Features

-   **Native Integration**: Mirrors Apple’s SF Symbols interface with platform-appropriate adaptations.
-   **Color Selection**: Optional binding to select symbol colors using `SymbolColor`, `Color`, or `[Double]` (RGBA).
-   **Style Customization**: Toggle between filled and outlined symbol variants using `.symbolPickerSymbolsStyle`.
-   **Dismissal Control**: Configure whether the picker closes automatically on selection or requires manual dismissal using `.symbolPickerDismiss`.
-   **Accessibility**: Full support for VoiceOver and Dynamic Type.

## Next Steps

-   **View Details**: Explore initializers including color support in `SymbolPickerView.md`.
-   **Customization**: Configure styles and dismissal behavior in `SymbolPickerModifiers.md`.
-   **Colors**: Learn about the `SymbolColor` model in `SymbolColor.md`.