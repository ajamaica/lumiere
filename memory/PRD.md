# Lumiere Markdown Styling Improvements PRD

## Original Problem Statement
Improve markdown styling in chat bubbles for the Lumiere React Native app, focusing on:
- Indentation for nested lists
- Code block styling
- Link colors

## Architecture
- **Framework**: React Native (Expo)
- **Markdown Library**: react-native-markdown-display
- **Styling**: Theme-based with dark/light mode support
- **Files Modified**:
  - `src/components/chat/ChatMessage.styles.ts` - Core markdown styles
  - `src/components/chat/useMarkdownRules.tsx` - Custom markdown rendering rules

## What's Been Implemented (Feb 15, 2026)

### Code Blocks
- Enhanced container with better background contrast (dark: rgba(0,0,0,0.5), light: rgba(15,23,42,0.04))
- Improved header styling with larger padding and clearer language labels
- Better copy button with rounded corners and improved visibility
- Increased line height (1.7x) for better code readability
- Enhanced code text colors for better contrast

### Lists & Indentation
- Added paddingLeft to bullet_list and ordered_list for proper indentation
- Improved list_item spacing with proper vertical margins
- Better bullet/number icon alignment with proper lineHeight
- Added flex wrapping support for content
- Nested list handling in useMarkdownRules.tsx

### Inline Code
- Enhanced background contrast
- Added subtle border for non-user messages
- Improved padding (vertical: 3px vs 2px)

### Blockquotes
- Thicker left border (4px vs 3px)
- Primary color accent for agent messages
- Better padding and border radius
- Added right padding

### Links
- Distinct blue colors:
  - Dark mode: #60A5FA (agent), #93C5FD (user)
  - Light mode: #2563EB (agent), #FFFFFF (user)
- Matching textDecorationColor for consistency

### Tables
- Cleaner border styling with rgba colors
- Overflow hidden for rounded corners
- Hairline separators between rows

## Backlog
- P0: None
- P1: Syntax highlighting for code blocks
- P2: Animated code block expansion

## Next Tasks
- Test with various markdown content types
- Verify dark/light mode consistency across all 8 color themes
