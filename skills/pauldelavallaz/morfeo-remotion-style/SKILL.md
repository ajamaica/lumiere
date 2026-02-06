---
name: morfeo-remotion-style
description: Morfeo Academy's Remotion video style guide. Use when creating Remotion videos, stories, or animations for Paul/Morfeo Academy. Triggers on "estilo Morfeo", "mi estilo Remotion", "video para Morfeo", "story estilo Morfeo", or any Remotion video request from Paul.
---

# Morfeo Remotion Style

Style guide for Remotion videos matching Morfeo Academy's brand.

## Brand Colors

```typescript
export const colors = {
  lime: '#cdff3d', // Primary accent - VERY IMPORTANT
  black: '#050508', // Background
  darkGray: '#111111', // Secondary bg
  white: '#FFFFFF', // Text
  gray: '#888888', // Muted text
}
```

## Typography

```typescript
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans'
import { loadFont as loadInstrumentSerif } from '@remotion/google-fonts/InstrumentSerif'
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono'

export const fonts = {
  heading: `${instrumentSerif}, serif`, // Títulos - ALWAYS italic
  body: `${dmSans}, sans-serif`, // Cuerpo
  mono: `${jetBrainsMono}, monospace`, // Código
}
```

**Rules:**

- Headings: Instrument Serif, **always italic**, weight 400
- Body: DM Sans, weight 400-600
- Code/tech: JetBrains Mono

## Emojis

Use Apple emojis via CDN (Remotion can't render system emojis):

```typescript
// See references/AppleEmoji.tsx for full component
<AppleEmoji emoji="🤖" size={28} />
<InlineEmoji emoji="🎙️" size={38} />  // For inline with text
```

## Brand Icons (WhatsApp, Telegram, etc.)

Use inline SVGs, not icon libraries (they don't work in Remotion):

```typescript
// See references/BrandIcon.tsx for full component
<BrandIcon brand="whatsapp" size={44} />
<BrandIcon brand="telegram" size={44} />
```

## Animation Style

### Spring Config

```typescript
spring({
  frame,
  fps,
  from: 0,
  to: 1,
  config: { damping: 15 }, // Standard damping
})
```

### Entry Sequence (staggered reveals)

1. **Tag** (frame 0-15): Fade in + slide from top
2. **Emoji** (frame 15+): Scale spring from 0
3. **Title** (frame 30-50): Fade + slide from bottom
4. **Lines** (frame 60, 90, 120): Staggered fade in

### Pulsing Effect (for emojis)

```typescript
const pulse = interpolate(frame % 60, [0, 30, 60], [1, 1.1, 1], { extrapolateRight: 'clamp' })
```

## Common Elements

### Lime Tag (top of screen)

```typescript
<div style={{
  position: "absolute",
  top: 80,
  fontSize: 28,
  fontWeight: 600,
  fontFamily: fonts.body,
  color: colors.black,
  backgroundColor: colors.lime,
  padding: "12px 28px",
  borderRadius: 30,
  display: "flex",
  alignItems: "center",
  gap: 8,
}}>
  <AppleEmoji emoji="🤖" size={28} /> TEXT HERE
</div>
```

### Big Emoji (center)

```typescript
<AppleEmoji emoji="🗣️" size={140} />
```

### Title (Instrument Serif italic)

```typescript
<h1 style={{
  fontSize: 68,
  fontWeight: 400,
  fontFamily: fonts.heading,
  fontStyle: "italic",  // ALWAYS
  color: colors.white,
  textAlign: "center",
  lineHeight: 1.15,
}}>
  Text with <span style={{ color: colors.lime }}>lime accent</span>
</h1>
```

## Video Specs

- **Format:** 1080x1920 (9:16 vertical stories)
- **FPS:** 30
- **Duration:** 5 seconds (150 frames) per story
- **Background:** Always `colors.black` (#050508)

## Project Setup

```bash
npx create-video@latest --template blank
npm i @remotion/google-fonts
```

## File Structure

```
src/
├── styles.ts          # Colors & fonts exports
├── AppleEmoji.tsx     # Emoji component
├── BrandIcon.tsx      # Brand icons (WhatsApp, Telegram, etc.)
├── [StoryName].tsx    # Individual stories
└── Root.tsx           # Composition setup
```

## References

- `references/styles.ts` - Complete styles file
- `references/AppleEmoji.tsx` - Apple emoji component
- `references/BrandIcon.tsx` - Brand icons component
- `references/MorfeoStory-example.tsx` - Full story example

## DO NOT

- ❌ Use system fonts (won't render)
- ❌ Use icon libraries like simple-icons (won't work)
- ❌ Use non-italic headings
- ❌ Use colors outside the palette
- ❌ Forget the lime accent color
