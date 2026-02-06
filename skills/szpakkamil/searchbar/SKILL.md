---
name: SearchBar
description: 'Expert guidance on SearchBar, a customizable SwiftUI search component. Use when developers mention: (1) SearchBar, (2) custom search bars in SwiftUI, (3) search tokens or suggestions, (4) styling search bars (glass, capsule), (5) cross-platform search (iOS, macOS, visionOS), (6) specific SearchBar modifiers like .searchBarStyle or .searchBarSuggestions.'
---
# SearchBar Skill

## Overview

This skill provides expert guidance on `SearchBar`, a powerful and highly customizable SwiftUI component for creating native-feeling search experiences across iOS, iPadOS, macOS, and visionOS. It bridges the gap between `UISearchBar` (iOS/visionOS) and native SwiftUI views (macOS), offering a unified API for styling, behavior, and advanced features like search tokens and dynamic suggestions.

## Agent Behavior (Follow These Rules)

1.  **Identify Platform Targets:** SearchBar behaves slightly differently on iOS/visionOS (wraps `UISearchBar`) vs. macOS (custom SwiftUI). Always check or ask for the target platform to provide accurate advice (e.g., specific material effects or token behaviors).
2.  **Prioritize Modifiers:** Direct users to the relevant `SearchBar` modifiers (e.g., `.searchBarStyle`, `.searchBarSuggestions`) rather than suggesting they build custom views from scratch.
3.  **Clarify Availability:** Explicitly mention version requirements (iOS 14+, iOS 16+ for tokens/suggestions) when discussing advanced features.
4.  **Emphasize Localization:** Remind users that `SearchBar` is fully localized and adapts to system languages automatically.
5.  **Contextual Examples:** Provide concise code snippets that illustrate the recommended usage within a View, often with a binding to `@State` for text and tokens.
6.  **Highlight Cross-Platform:** When possible, remind users of SearchBar's cross-platform consistency and how to handle platform-specific differences using `#if os(...)` directives if necessary (though the library handles most internally).

## Project Settings

-   **Deployment Targets:** iOS 14.0+, iPadOS 14.0+, macOS 11.0+, visionOS 1.0+.
-   **Advanced Features:** Tokens and Suggestions require iOS 16.0+, iPadOS 16.0+, visionOS 1.0+. (Suggestions also on macOS 15.0+).
-   **Swift Version:** Swift 5.9+.

## Quick Decision Tree

1.  **Setting up a basic search bar?**
    *   Basic init and setup → `references/SearchBar.md`

2.  **Customizing appearance?**
    *   Changing colors, shape (capsule/rounded) → `references/SearchBarStyle.md`
    *   Using "Glass" or "Solid" materials → `references/SearchBarStyle.md`
    *   Changing the size/scale → `references/SearchBarStyle.md`
    *   Custom icon → `references/SearchBarModifiers.md` (`.searchBarIconView`)

3.  **Configuring behavior?**
    *   Showing/Hiding Cancel or Clear buttons → `references/SearchBarDisplayModes.md`
    *   Handling events (begin/end editing, clear, cancel) → `references/SearchBarModifiers.md`
    *   Focus management → `references/SearchBarModifiers.md` (`.searchBarIsFocused`)

4.  **Using advanced search features (iOS 16+/visionOS)?**
    *   Adding filter tokens (capsules) → `references/SearchBarData.md`
    *   Showing search suggestions → `references/SearchBarData.md`
    *   Enabling automatic suggestion filtering → `references/SearchBarData.md`

## Triage-First Playbook

-   **"My search bar looks different on macOS."**
    *   Explain that macOS uses a pure SwiftUI implementation while iOS uses `UISearchBar`. Styling is consistent but underlying implementation differs.
-   **"Tokens/Suggestions are not showing up."**
    *   Verify the deployment target is iOS 16.0+ or visionOS 1.0+.
    *   Ensure the binding to tokens/suggestions is active and populated.
-   **"How do I change the background color?"**
    *   Use `.searchBarStyle(..., backgroundColor: .red)`. See `references/SearchBarStyle.md`.
-   **"I want to hide the cancel button."**
    *   Use `.searchBarCancelButtonDisplayMode(.never)`. See `references/SearchBarDisplayModes.md`.
-   **"How do I make the search bar glass/transparent?"**
    *   Use `.searchBarMaterial(.glass)`. Note platform/version restrictions (iOS 26+). See `references/SearchBarStyle.md`.

## Core Patterns Reference

### Basic Setup
```swift
SearchBar(text: $text, prompt: "Search...")
    .searchBarStyle(.rounded)
```

### Advanced Styling
```swift
SearchBar(text: $text)
    .searchBarStyle(.capsule, textColor: .white, tint: .blue, backgroundColor: .black.opacity(0.8))
    .searchBarMaterial(.glass) // iOS 26+ (Experimental/Future)
```

### Tokens & Suggestions
```swift
SearchBar(text: $text)
    .searchBarCurrentTokens($tokens)
    .searchBarSuggestions($suggestions)
    .searchBarEnableAutomaticSuggestionsFiltering(true)
```

### Event Handling
```swift
SearchBar(text: $text)
    .searchBarBeginEditingAction { print("Started") }
    .searchBarEndEditingAction { print("Ended") }
    .searchBarCancelButtonAction { print("Cancelled") }
```

## Integration Quick Guide

SearchBar is integrated via Swift Package Manager.

1.  **Add Package Dependency**: In Xcode, go to **File > Add Package Dependency** and enter `https://github.com/SzpakKamil/SearchBar.git`.
2.  **Import**: `import SearchBar` in your Swift files.
3.  **Deployment Targets**: Ensure your project targets iOS 14.0+, macOS 11.0+, visionOS 1.0+.

For detailed setup, see `references/SearchBar.md`.

## Reference Files

-   **`SearchBar.md`** - General overview, setup, and initialization.
-   **`SearchBarModifiers.md`** - Comprehensive list of all modifiers.
-   **`SearchBarStyle.md`** - Styling, materials, corner styles, and scale.
-   **`SearchBarDisplayModes.md`** - Cancel and Clear button behaviors.
-   **`SearchBarData.md`** - Search Tokens and Suggestions.
-   **`_index.md`** - Index of all topics.
