# SymbolPicker View

The `SymbolPicker` view presents an interactive interface for selecting SF Symbols.

## Overview

The `SymbolPicker` adapts to platform-specific layouts:
- **iPhone**: Full-screen sheet.
- **iPad / visionOS**: Popover.
- **macOS**: Fixed-size window / popover.

It is primarily used via the `.symbolPicker` modifier attached to a view.

## Initializers & Modifiers

The `SymbolPicker` is typically presented using the `.symbolPicker` modifier.

### Basic Selection (Symbol Name Only)

Presents the picker to select a symbol name.

```swift
.symbolPicker(isPresented: Binding<Bool>, symbolName: Binding<String>)
```

### Selection with Color

Presents the picker to select a symbol name AND a color. The color binding can be of three types:

1.  **`Binding<SymbolColor>`**: The native enum type.
2.  **`Binding<Color>`**: Standard SwiftUI Color.
3.  **`Binding<[Double]>`**: An array of RGBA values (e.g. `[r, g, b, a]`).

```swift
// Using SymbolColor
.symbolPicker(isPresented: $show, symbolName: $name, color: $symbolColor)

// Using SwiftUI Color
.symbolPicker(isPresented: $show, symbolName: $name, color: $swiftUIColor)

// Using [Double]
.symbolPicker(isPresented: $show, symbolName: $name, color: $rgbaValues)
```

## Properties

| Property | Description |
|----------|-------------|
| `isPresented` | Controls visibility. |
| `symbolName` | Binding to the selected SF Symbol string (e.g., "star.fill"). |
| `color` | Binding to the selected color (optional). |

## Behavior

- **Search**: Includes a built-in search bar (powered by `SearchBar` package).
- **Filtering**: Automatically filters symbols based on the device's iOS/macOS version to prevent showing unavailable symbols.
- **Debounce**: Search is debounced (500ms) for performance.
