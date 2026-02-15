# Lumiere Markdown Styling Improvements PRD

## Original Problem Statement
Improve markdown styling in chat bubbles for the Lumiere React Native app, focusing on:
- Indentation for nested lists and enumerations
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

### Lists & Enumerations (Bullet + Ordered Lists)
- **Nested list indentation**: 16px left margin for nested lists
- **Better spacing**: marginTop/Bottom with sm spacing between lists
- **Bullet points**: Centered 8px width bullets with proper line height
- **Numbered lists**: 24px minWidth for consistent number alignment, medium font weight
- **List items**: 5px vertical margin (xs + 1) with paddingRight for edge spacing
- **Content wrapping**: flex: 1 + flexShrink: 1 for proper text flow
- **Custom rendering rules**: bullet_list and ordered_list rules detect nested lists via parent.type === 'list_item'

### Code Blocks
- Enhanced container with better background contrast
- Improved header styling with larger padding
- Increased line height (1.7x) for better readability
- Enhanced code text colors for better contrast

### Inline Code
- Enhanced background contrast
- Added subtle border for non-user messages
- Improved padding

### Blockquotes
- Thicker left border (4px)
- Primary color accent
- Better padding and border radius

### Links
- Distinct blue colors for dark/light modes
- Matching textDecorationColor

## Backlog
- P0: None
- P1: Syntax highlighting for code blocks
- P2: Animated code block expansion

## Next Tasks
- Test with deeply nested lists (3+ levels)
- Verify dark/light mode consistency
