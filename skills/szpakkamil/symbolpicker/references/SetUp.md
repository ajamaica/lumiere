# Set Up

Learn how to integrate `SymbolPicker` into your project.

## Requirements

- **iOS**: 14.0+
- **iPadOS**: 14.0+
- **macOS**: 11.0+
- **visionOS**: 1.0+
- **Swift**: 5.9+
- **Xcode**: 15.0+

## Installation

### Swift Package Manager

1.  In Xcode, select **File > Add Package Dependency**.
2.  Enter the URL: `https://github.com/SzpakKamil/SymbolPicker.git`.
3.  Select **Up to Next Major** with version **1.0.0**.
4.  Add the package to your target.

### Usage

Import the module in any file where you want to use it:

```swift
import SymbolPicker
```

Then attach the `.symbolPicker` modifier to a view (usually a Button or Image that triggers the presentation):

```swift
Button("Select Icon") {
    showPicker = true
}
.symbolPicker(isPresented: $showPicker, symbolName: $iconName)
```
