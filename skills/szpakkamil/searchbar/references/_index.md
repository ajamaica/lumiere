# SearchBar Reference Index

Quick navigation for all SearchBar topics.

## Overview

This index provides a comprehensive guide to the reference files for the SearchBar library. Use the tables and links below to quickly find the information you need.

## File Index

| File | Lines | Description |
|------|-------|-------------|
| `SearchBar.md` | ~100 | The main overview of the SearchBar library, including setup and basic initialization. |
| `SearchBarModifiers.md` | ~150 | A complete list of all public modifiers for customizing behavior, events, and input traits. |
| `SearchBarStyle.md` | ~100 | Deep dive into visual customization, including shapes, colors, materials, and scaling. |
| `SearchBarData.md` | ~120 | Detailed guide on implementing Search Tokens and dynamic Suggestions. |
| `SearchBarDisplayModes.md` | ~80 | Configuration for the visibility and actions of Cancel and Clear buttons. |

## Core Components

| Topic | Description | See Also |
|-------|-------------|----------|
| **SearchBar** | The main entry point. Learn how to install and initialize the search component. | `SearchBar.md` |
| **Styling** | Customize the appearance, from capsule shapes to glass materials. | `SearchBarStyle.md` |
| **Modifiers** | Explore the vast API of modifiers for behavior and appearance. | `SearchBarModifiers.md` |

## Advanced Features

| Topic | Description | See Also |
|-------|-------------|----------|
| **Search Tokens** | Implement chip-based filtering (tags/tokens) inside the search field. | `SearchBarData.md` |
| **Suggestions** | Provide dynamic results and completions as the user types. | `SearchBarData.md` |
| **Display Modes** | Control when and how Cancel and Clear buttons are shown. | `SearchBarDisplayModes.md` |

## Quick Links by Problem

### "I need to..."

- **Get started with SearchBar** → `SearchBar.md`
- **Change the shape to a Capsule** → `SearchBarStyle.md`
- **Add filter chips (Tokens)** → `SearchBarData.md`
- **Show results while typing (Suggestions)** → `SearchBarData.md`
- **Bind the focus state to a `@State` variable** → `SearchBarModifiers.md`
- **Handle the "Cancel" button tap** → `SearchBarDisplayModes.md`, `SearchBarModifiers.md`
- **Customize the magnifying glass icon** → `SearchBarModifiers.md`
- **Change the keyboard return key type** → `SearchBarModifiers.md`
- **Implement a "Glass" background effect** → `SearchBarStyle.md`

### "I want to understand..."

- **How SearchBar handles cross-platform differences** → `SearchBar.md`
- **The difference between `whileEditing` and `always` display modes** → `SearchBarDisplayModes.md`
- **How automatic suggestion filtering works** → `SearchBarData.md`
- **The specific modifiers available for iOS vs. macOS** → `SearchBarModifiers.md`
