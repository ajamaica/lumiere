# SymbolColor

`SymbolColor` is a type that defines a set of predefined colors and a custom color option for use in a `SymbolPicker`.

## Overview

`SymbolColor` is a core component used to define colors for symbols. It provides 15 predefined colors and a `customColor` case for RGBA values. It is `Identifiable`, `Equatable`, `Comparable`, `Codable`, `CaseIterable`, and `Hashable`.

## Usage

You pass a binding to a `SymbolColor` (or `Color`, or `[Double]`) to the `SymbolPicker` initializer to enable color selection.

```swift
@State private var selectedColor: SymbolColor = .red

// In your view
.symbolPicker(..., color: $selectedColor)
```

## Predefined Colors

| Color Name | ID | RGBA Values |
|------------|----|-------------|
| Red        | 0  | [0.906, 0.392, 0.416, 1] |
| Orange     | 1  | [0.945, 0.537, 0.427, 1] |
| Yellow     | 2  | [0.925, 0.671, 0.384, 1] |
| Green      | 3  | [0.945, 0.749, 0.298, 1] |
| Mint       | 4  | [0.451, 0.780, 0.435, 1] |
| Teal       | 5  | [0.216, 0.792, 0.678, 1] |
| Cyan       | 6  | [0.298, 0.698, 0.945, 1] |
| Blue       | 7  | [0.259, 0.514, 0.969, 1] |
| Indigo     | 8  | [0.302, 0.392, 0.737, 1] |
| Purple     | 9  | [0.490, 0.329, 0.729, 1] |
| Magenta    | 10 | [0.698, 0.490, 0.871, 1] |
| Pink       | 11 | [0.906, 0.557, 0.816, 1] |
| Grey       | 12 | [0.533, 0.565, 0.604, 1] |
| Moro       | 13 | [0.584, 0.663, 0.592, 1] |
| Brown      | 14 | [0.651, 0.565, 0.455, 1] |

## Custom Color

You can create a custom color using RGBA values:

```swift
let myColor = SymbolColor.customColor(red: 0.5, green: 0.5, blue: 0.5, alpha: 1.0)
```

## Properties

- `color`: Returns the SwiftUI `Color` representation.
- `name`: Returns the name of the color (e.g., "Red").
- `value`: Returns the `[Double]` array of RGBA values.
