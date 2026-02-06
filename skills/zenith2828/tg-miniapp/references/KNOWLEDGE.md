# Telegram Mini App Knowledge Base

Everything we've learned building Telegram Mini Apps. Read this before starting a new project or debugging issues.

---

## 🔴 Critical Issues (Will Bite You)

### 1. Safe Area / Fullscreen Mode
**The Problem:** In fullscreen mode, Telegram overlays its controls (X Close, chevron) on top of your app. Content gets hidden behind them.

**Why It's Tricky:**
- `safeAreaInset` and `contentSafeAreaInset` can return 0 initially
- Values differ based on how app is opened (folder vs direct chat)
- Values are async — can change after initial render
- iOS and Android have different safe areas

**The Solution:**
```typescript
// Use reactive hook, not one-time check
function useSafeAreaInset() {
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    const update = () => {
      const safeArea = webApp.safeAreaInset || { top: 0 };
      const contentSafeArea = webApp.contentSafeAreaInset || { top: 0 };
      const isFullscreen = webApp.isFullscreen;
      
      let top = Math.max(safeArea.top || 0, contentSafeArea.top || 0);
      
      // Minimum fallbacks when in fullscreen but values are low
      if (isFullscreen && top < 80) {
        top = webApp.platform === 'ios' ? 100 : 80;
      }
      
      setInsets({ top, bottom: safeArea.bottom || 0 });
    };

    update();
    
    // Listen for changes
    webApp.onEvent?.('safeAreaChanged', update);
    webApp.onEvent?.('fullscreenChanged', update);
    
    // Fallback: poll every 500ms
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, []);

  return insets;
}
```

**Sticky Headers:**
```tsx
// WRONG - content shows through gap
<div className="sticky top-0">Header</div>

// CORRECT - background covers full safe area
<div 
  className="sticky top-0 bg-[var(--tg-theme-bg-color)]"
  style={{ paddingTop: safeAreaInset.top }}
>
  Header
</div>
```

---

### 2. position: fixed Doesn't Work
**The Problem:** Telegram Mini Apps apply CSS `transform` to the container, which breaks `position: fixed` elements.

**Symptoms:** Bottom sheets, modals, tooltips render in wrong position.

**The Solution:** Use React `createPortal` to render to `document.body`:
```tsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999]">{children}</div>,
    document.body
  );
}
```

---

### 3. React Renders "0" as Text
**The Problem:** `{value && value > 0 && <Component />}` renders literal "0" when value is 0.

**The Solution:**
```tsx
// WRONG
{count && count > 0 && <span>{count}</span>}

// CORRECT
{count != null && count > 0 && <span>{count}</span>}
// OR
{count > 0 && <span>{count}</span>}
// OR
{!!count && <span>{count}</span>}
```

---

### 4. BackButton Click Handler Doesn't Fire
**The Problem:** Telegram BackButton appears but clicking does nothing.

**Why:** Using raw `window.Telegram.WebApp.BackButton` with stale closures.

**The Solution:** Use `@telegram-apps/sdk`:
```typescript
import { 
  mountBackButton, 
  showBackButton, 
  hideBackButton, 
  onBackButtonClick, 
  offBackButtonClick 
} from '@telegram-apps/sdk';

// Mount once at app init
mountBackButton();

// In component
useEffect(() => {
  if (shouldShowBack) {
    showBackButton();
    onBackButtonClick(handleBack);
  } else {
    hideBackButton();
  }
  
  return () => offBackButtonClick(handleBack);
}, [shouldShowBack, handleBack]);
```

---

### 5. Sharing with Inline Mode
**The Problem:** `WebApp.shareMessage()` fails with cryptic errors.

**Requirements:**
1. Bot must have **inline mode enabled** via @BotFather (`/setinline`)
2. Must call `savePreparedInlineMessage` on backend first
3. Pass the `prepared_message_id` to `shareMessage()`

**Basic Flow:**
```
Frontend → POST /api/prepare-share → Backend calls savePreparedInlineMessage
                                   ← Returns prepared_message_id
Frontend → WebApp.shareMessage(id) → Native share picker
```

**Key Insight: prepared_message_id is Single-Use**
Once a `prepared_message_id` is consumed by `shareMessage()` (whether sent or dismissed), it cannot be reused. This affects UX:
- User taps share → prepares message → opens picker → dismisses → taps share again → **fails**
- Need to prepare a fresh message for each share attempt

**Two Approaches:**

**A) Dynamic Preparation (per-tap)**
Prepare a fresh message every time user taps share:
```typescript
const handleShare = async () => {
  const { prepared_message_id } = await fetch('/api/prepare-share').then(r => r.json());
  await WebApp.shareMessage(prepared_message_id);
};
```
- ✅ Always works, each tap gets fresh ID
- ⚠️ More API calls
- ⚠️ Slight delay before picker opens

**B) Static Content Caching (recommended for frequent shares)**
Use static inline results with `allow_user_chats: true`. The content stays the same, so you can cache results:
```typescript
// Backend: savePreparedInlineMessage with static result
const result = {
  type: 'photo',
  photo_url: 'https://cdn.example.com/static-card.jpg', // Same URL always
  thumbnail_url: ...,
};
const { prepared_message_id } = await bot.savePreparedInlineMessage(userId, result, {
  allow_user_chats: true,
  allow_bot_chats: true,
  allow_group_chats: true,
  allow_channel_chats: true,
});

// Frontend: prepare once, reuse pattern
const handleShare = async () => {
  // For static content, prepare fresh each time anyway (IDs are single-use)
  const { prepared_message_id } = await fetch('/api/prepare-share-static').then(r => r.json());
  await WebApp.shareMessage(prepared_message_id);
};
```
- ✅ Works reliably for multi-share scenarios
- ✅ Image can be cached on CDN
- ⚠️ Content is same for all shares of that item

**Fallback chain:**
1. Try native `shareMessage` (requires inline mode)
2. Try sending image to bot chat (user forwards manually)
3. Fall back to text share via `web_app_open_tg_link`

**Known Behaviors (2026-02):**
- `shareMessage` requires **WebApp 8.0+** — check version before calling
- **PNG actually works** — Despite docs suggesting JPEG/GIF, PNG renders fine in inline results
- **Callback returns falsy even on success** — use truthy check `if (sent)` not `=== true`
- **JPEG recommended for share cards** — Smaller file size, faster loading in chat
- **photo_url must be publicly accessible** — Use R2 public bucket or similar CDN

**Two-Button Pattern (ClawdFessions approach):**
For apps where you want both quick sharing AND rich custom cards:
```tsx
<div className="flex gap-1">
  {/* Quick Share - uses static prepared message, opens native picker */}
  <button onClick={handleQuickShare}>⚡</button>
  
  {/* Share Card - sends rich image to bot chat, user forwards manually */}
  <button onClick={handleShareCard}>🎨</button>
</div>
```
- Quick Share: Native picker, faster, less friction
- Share Card: Custom generated image, richer but requires manual forward

---

### 6. Generating Share Cards (Server-Side Images)
**The Problem:** You want custom share card images generated dynamically per item.

**Solution: resvg-wasm in Cloudflare Workers**
Generate SVG → convert to PNG/JPEG server-side:
```typescript
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import resvgWasm from './resvg.wasm';

let initialized = false;
async function ensureWasm() {
  if (!initialized) {
    await initWasm(resvgWasm);
    initialized = true;
  }
}

async function svgToJpeg(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 800 },
    font: {
      fontBuffers: [fontData], // Bundle your fonts
      defaultFontFamily: 'Inter',
    },
  });
  const pixels = resvg.render();
  return encodeJpeg(pixels); // Use jpeg-js or similar
}
```

**Tips:**
- Bundle fonts as base64 or binary — Google Fonts won't load at runtime
- Cache generated images in R2 with content hash keys
- 800px width is good for Telegram inline results
- JPEG for photos, PNG if you need transparency

**R2 Caching Pattern:**
```typescript
// Check cache first
const cacheKey = `cards/${confessionId}.jpg`;
const cached = await env.CARDS.get(cacheKey);
if (cached) return new Response(cached.body, { headers: { 'Content-Type': 'image/jpeg' } });

// Generate and cache
const jpeg = await generateCard(confession);
await env.CARDS.put(cacheKey, jpeg, { httpMetadata: { contentType: 'image/jpeg' } });
return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
```

---

## 🟡 Common Gotchas

### API Image Paths
Different APIs return images in different paths. Always use fallback chains:
```typescript
const imageUrl = item.preview?.image256 
  || item.collection?.preview?.image256 
  || item.image 
  || '/placeholder.png';
```

### GetGems API
- Only supports `limit`, **no pagination/offset**
- Rate limit: 400 requests / 5 minutes per IP
- Volume data is **all-time**, not 24h
- USDT listings exist — detect by token address

### Fragment API
- Number images: `https://nft.fragment.com/number/{11-digit-number}.webp`
- Username images: via separate API call

### Theme Colors
Use CSS variables for Telegram theme integration:
```css
background: var(--tg-theme-bg-color, #0f0f1a);
color: var(--tg-theme-text-color, #fff);
```

---

## 🟢 Best Practices

### Debug Overlay
Add a dev-only panel showing platform info:
```tsx
function DebugOverlay() {
  if (!isDev) return null;
  
  const webApp = window.Telegram?.WebApp;
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 p-2 text-xs">
      <div>Platform: {webApp?.platform}</div>
      <div>Fullscreen: {webApp?.isFullscreen ? 'Y' : 'N'}</div>
      <div>Safe top: {webApp?.safeAreaInset?.top}</div>
      <div>Content safe top: {webApp?.contentSafeAreaInset?.top}</div>
    </div>
  );
}
```

### Testing Checklist
- [ ] Open from folder (chat list)
- [ ] Open from direct chat
- [ ] Open from inline button
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Test share flow
- [ ] Test back button
- [ ] Scroll with sticky header

### Deployment
```bash
# Always staging first
npx wrangler pages deploy dist --project-name myapp-staging

# Production only after testing
npx wrangler pages deploy dist --project-name myapp
```

---

## 📁 Component Library

Reusable components at `~/clawd/projects/tg-miniapp-components/`:
- `useSafeAreaInset()` — Reactive safe area hook
- `useFullscreen()` — Fullscreen state + control
- `SafeAreaHeader` — Sticky header with safe area handling
- `DebugOverlay` — Dev panel for debugging

---

## 📚 Resources

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [@telegram-apps/sdk](https://github.com/Telegram-Mini-Apps/telegram-apps)
- Project PLAYBOOK files contain project-specific learnings

---

*Last updated: 2026-02-02*
*Compiled from sessions: 2026-01-27 through 2026-02-02*
