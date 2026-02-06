---
name: tg-miniapp
description: Build Telegram Mini Apps without the pain. Includes solutions for safe areas, fullscreen mode, BackButton handlers, sharing with inline mode, position:fixed issues, and React gotchas. Use when building or debugging Telegram Mini Apps, or when encountering issues with WebApp API, safe areas, or sharing.
---

# Telegram Mini App Development

Battle-tested solutions for common Telegram Mini App issues.

## Quick Reference

### Safe Area (Fullscreen Mode)
```typescript
// Use reactive hook - values are async and context-dependent
const safeArea = useSafeAreaInset(); // from references/hooks.ts
<div style={{ paddingTop: safeArea.top }}>Header</div>
```

### position:fixed Broken
Telegram applies `transform` to container. Use `createPortal`:
```tsx
import { createPortal } from 'react-dom';
createPortal(<Modal />, document.body);
```

### BackButton Not Firing
Use `@telegram-apps/sdk`, not raw WebApp:
```typescript
import { onBackButtonClick, showBackButton } from '@telegram-apps/sdk';
onBackButtonClick(handleBack);
```

### Sharing with Inline Mode
1. Enable inline mode: @BotFather → `/setinline` → select bot
2. Backend calls `savePreparedInlineMessage` → returns `prepared_message_id`
3. Frontend calls `WebApp.shareMessage(prepared_message_id)`

**Note:** `prepared_message_id` is **single-use** — prepare fresh for each share tap.
For static content, consider caching images on R2/CDN and preparing per-tap.

### React "0" Rendering
```tsx
// WRONG: renders literal "0"
{count && <span>{count}</span>}

// CORRECT
{count > 0 && <span>{count}</span>}
```

## Detailed Guides

- **[references/KNOWLEDGE.md](references/KNOWLEDGE.md)** — Full knowledge base with all gotchas and solutions
- **[references/hooks.ts](references/hooks.ts)** — Copy-paste React hooks (useSafeAreaInset, useFullscreen, etc.)
- **[references/components.tsx](references/components.tsx)** — Ready-to-use components (SafeAreaHeader, DebugOverlay)

## Testing Checklist

Before shipping, test:
- [ ] Open from folder (chat list)
- [ ] Open from direct bot chat
- [ ] iOS device
- [ ] Android device
- [ ] Share flow (tap → dismiss → tap again)
- [ ] Share to different chat types (user, group, channel)
- [ ] Back button
- [ ] Scroll with sticky header
