---
name: SymbolPicker
description: 'Expert guidance on SymbolPicker, a native SwiftUI SF Symbol picker. Use when developers mention: (1) SymbolPicker, (2) selecting SF Symbols, (3) picking symbols with colors, (4) customizing symbol picker appearance, (5) cross-platform symbol selection (iOS, macOS, visionOS), (6) specific modifiers like .symbolPickerSymbolsStyle or .symbolPickerDismiss.'
---
# SymbolPicker Skill

## Overview

This skill provides expert guidance on `SymbolPicker`, a native, customizable SwiftUI component for selecting SF Symbols on iOS, iPadOS, macOS, and visionOS. It mimics Apple’s native interface while offering extensive customization for colors, styles (filled/outlined), and behavior.

## Agent Behavior (Follow These Rules)

1.  **Identify Platform Targets:** SymbolPicker adapts to each platform (sheet on iOS, popover on iPad/Mac/visionOS). Always verify the target platform.
2.  **Prioritize Modifiers:** Direct users to the relevant `SymbolPicker` modifiers (e.g., `.symbolPickerSymbolsStyle`, `.symbolPickerDismiss`) for customization.
3.  **Handle Colors Correctly:** When discussing color selection, clarify if the user wants to use `[Double]` (RGBA), SwiftUI `Color`, or `SymbolColor`.
4.  **Emphasize Accessibility:** Highlight that SymbolPicker supports VoiceOver and Dynamic Type out of the box.
5.  **Contextual Examples:** Provide concise code snippets showing the `.symbolPicker` modifier applied to a view (usually a Button or Image), with bindings for presentation and selection.
6.  **Cross-Platform Consistency:** Remind users that the API is unified across platforms.

## Project Settings

-   **Deployment Targets:** iOS 14.0+, iPadOS 14.0+, macOS 11.0+, visionOS 1.0+.
-   **Swift Version:** Swift 5.9+.
-   **Xcode:** Xcode 15.0+.

## Quick Decision Tree

1.  **Setting up a basic symbol picker?**
    *   Basic installation and concepts → `references/SymbolPicker.md`
    *   To apply the modifier to a view → `references/SymbolPickerView.md`

2.  **Picking symbols with color?**
    *   To use different color binding types → `references/SymbolPickerView.md`
    *   To understand the `SymbolColor` model → `references/SymbolColor.md`

3.  **Customizing appearance or behavior?**
    *   Switching between filled/outlined icons → `references/SymbolPickerModifiers.md` (`.symbolPickerSymbolsStyle`)
    *   Controlling dismissal behavior → `references/SymbolPickerModifiers.md` (`.symbolPickerDismiss`)

## Triage-First Playbook

-   **"The picker isn't showing up."**
    *   Check if `.symbolPicker(isPresented: ...)` is attached to a view that is part of the hierarchy.
    *   Ensure the `isPresented` binding is being toggled true.
-   **"I want filled icons instead of outlines."**
    *   Use `.symbolPickerSymbolsStyle(.filled)`.
-   **"How do I close the picker immediately after selecting a symbol?"**
    *   Use `.symbolPickerDismiss(type: .onSymbolSelect)`.

## Core Patterns Reference

### Basic Usage
```swift
@State private var isPresented = false
@State private var icon = "star"

Button("Pick Icon") { isPresented = true }
    .symbolPicker(isPresented: $isPresented, symbolName: $icon)
```

### With Color Selection
```swift
@State private var isPresented = false
@State private var icon = "star.fill"
@State private var color: Color = .red

Button("Pick Icon & Color") { isPresented = true }
    .symbolPicker(isPresented: $isPresented, symbolName: $icon, color: $color)
    .symbolPickerSymbolsStyle(.filled)
    .symbolPickerDismiss(type: .onSymbolSelect)
```

## Integration Quick Guide

1.  **Add Package Dependency**: `https://github.com/SzpakKamil/SymbolPicker.git` (Min version 1.0.0).
2.  **Import**: `import SymbolPicker`.
3.  **Requirements**: iOS 14.0+, macOS 11.0+, visionOS 1.0+.

## Reference Files

Load these files as needed for specific topics:

-   **`SymbolPicker.md`** - General overview, setup, and core benefits.
-   **`SymbolPickerView.md`** - Detailed information on the picker view and its initializers.
-   **`SymbolPickerModifiers.md`** - Customization of style (filled/outlined) and dismissal behavior.
-   **`SymbolColor.md`** - Guide to using the `SymbolColor` enum and color bindings.
-   **`SetUp.md`** - Step-by-step installation instructions.
