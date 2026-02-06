# SymbolPicker Modifiers

Modifiers allow you to customize the appearance and behavior of the `SymbolPicker` view.

## Overview

The `SymbolPicker` package provides modifiers to customize its appearance and behavior within SwiftUI applications. These modifiers are applied using SwiftUI’s dot syntax.

## Available Modifiers

### `.symbolPickerSymbolsStyle(_:)`

Configures the display style of symbols in the picker.

- **Parameters**:
    - `style`: A `SymbolPickerSymbolsStyle` value.

#### `SymbolPickerSymbolsStyle` Options

| Style | Description |
|-------|-------------|
| `.filled` | Renders symbols with a solid fill (e.g., `star.fill`). Suitable for bold visuals. |
| `.outline` | Renders symbols with a stroked outline (e.g., `star`). Ideal for a minimalistic look. |

```swift
.symbolPickerSymbolsStyle(.filled)
```

### `.symbolPickerDismiss(type:action:)`

Sets the dismissal behavior and an optional action to execute upon dismissal.

- **Parameters**:
    - `type`: A `SymbolPickerDismissType` value.
    - `action`: An optional closure `() -> Void` to execute when dismissed.

#### `SymbolPickerDismissType` Options

| Type | Description |
|------|-------------|
| `.onSymbolSelect` | Automatically dismisses the picker when a symbol is selected. Ideal for quick selections. |
| `.manual` | Requires explicit user action (e.g., tapping a close button or swiping) to dismiss. |

```swift
.symbolPickerDismiss(type: .onSymbolSelect)
```

## Example Usage

```swift
import SwiftUI
import SymbolPicker

struct ContentView: View {
    @State private var isPresented = false
    @State private var symbolName = "star.fill"

    var body: some View {
        Button("Pick Symbol") { isPresented = true }
        .symbolPicker(isPresented: $isPresented, symbolName: $symbolName)
        // Set style to outlined
        .symbolPickerSymbolsStyle(.outline)
        // Dismiss automatically when a symbol is picked
        .symbolPickerDismiss(type: .onSymbolSelect) {
            print("Symbol picked and picker dismissed")
        }
    }
}
```
