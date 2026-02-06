# 🚀 Clawdbot Dashboard - Premium AI Interface

A gorgeous, premium React dashboard UI designed for Clawdbot AI sessions. Built with beauty-first design principles, featuring glassmorphism effects, real-time updates, and seamless interactions.

## ✨ Features

### Design & UX

- **Dark Mode Default** with light mode support
- **Glassmorphism** aesthetic with backdrop blur effects
- **Framer Motion** smooth animations (300ms transitions)
- **Responsive Layout** with sidebar session info and chat panel
- **System Typography** SF Pro Display + JetBrains Mono for code

### Functionality

- **Discord-style Message Bubbles** with user/system/assistant differentiation
- **Full Markdown Support** with syntax highlighting
- **Code Block Rendering** with language-specific styling
- **Real-time Message Updates** with smooth animations
- **Session Info Card** showing key metrics and stats
- **Multi-line Input** with keyboard shortcuts (Shift+Enter for newline)
- **Copy-to-Clipboard** for session keys and data
- **Live Status Indicators** (connection, latency, model info)

## 🎨 Design System

### Color Palette

```
Dark Mode (Default):
- Background: #0f0f0f
- Primary Accent: #14b8a6 (Teal)
- Secondary Accent: #a78bfa (Purple)
- Surface: rgba(0,0,0,0.3-0.5)
- Border: rgba(255,255,255,0.1-0.2)

Light Mode:
- Background: #f9fafb
- Primary Accent: #0ea5e9 (Blue)
- Secondary Accent: #a855f7 (Purple)
```

### Typography

- **Headings**: System fonts (SF Pro Display on macOS)
- **Body**: System sans-serif stack
- **Code**: JetBrains Mono with Prism syntax highlighting

### Components

- **Glassmorphism Cards**: `backdrop-blur-xl` with subtle borders
- **Message Bubbles**: Rounded, gradient-aware, hover-responsive
- **Input Box**: Expandable textarea with gradient send button
- **Session Card**: Multi-field info display with copy actions

## 🛠 Tech Stack

### Core

- **React 19** + TypeScript 5.9
- **Vite** for fast development and optimized builds
- **Tailwind CSS v4** (new JIT engine)

### UI & Animations

- **Framer Motion** 12.x for spring-based animations
- **Lucide React** for beautiful icons
- **Prism.js** for syntax highlighting

### Content & Markdown

- **react-markdown** with rehype plugins
- **rehype-prism-plus** for code highlighting
- **Socket.io-client** ready for real-time updates

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+ (v25.4.0 recommended)
- npm or yarn

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

- **URL**: `http://localhost:5173`
- **Hot Module Reload (HMR)**: Enabled
- **Auto-open**: Browser tab opens on start

## 🏗 Project Structure

```
clawdbot-dashboard/
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Top navigation + theme toggle
│   │   ├── Sidebar.tsx         # Session info card + stats
│   │   ├── ChatPanel.tsx       # Main chat area + input
│   │   └── Message.tsx         # Message bubble + markdown
│   ├── data/
│   │   └── messages.ts         # Dummy data (10 sample messages)
│   ├── types/
│   │   └── prism.d.ts          # Prism type definitions
│   ├── App.tsx                 # Root layout
│   ├── main.tsx                # React entry point
│   └── index.css               # Global styles
├── index.html                  # HTML template
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind design tokens
├── postcss.config.js           # PostCSS plugins
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

## 🎮 Features Deep Dive

### Session Info Card (Sidebar)

Displays real-time session information in a premium glassmorphic card:

- **Session Key**: Truncated with one-click copy functionality
- **Token Usage**: Visual progress bar with percentage
- **Runtime**: Elapsed session time
- **Model**: Current AI model in use
- **Quick Stats**: 4 key metrics (Messages, Uptime, Latency, Status)

### Message System

Each message supports:

- **User Messages**: Purple gradient, right-aligned
- **Assistant Messages**: Gray gradient, left-aligned
- **System Messages**: Blue gradient, left-aligned
- **Markdown**: Full support including:
  - Headers (H1-H3)
  - Bold, italic, code
  - Code blocks with language highlighting
  - Tables with proper styling
  - Links with hover effects
  - Blockquotes and lists

### Input Box

- **Auto-expanding**: Grows with content (max 120px)
- **Keyboard Shortcuts**:
  - `Enter`: Send message
  - `Shift+Enter`: New line
- **Rich Actions**: Attachment button, send button
- **Status Info**: Connection indicator, latency, model info

### Dark/Light Toggle

- **Persistent States**: Smooth color transitions
- **Accessible**: Uses semantic HTML + proper contrast
- **Animated**: Scale and rotate effects on interaction

## 🎬 Animations

All animations use Framer Motion with 300ms duration:

```typescript
// Entrance animations
{ type: 'spring', stiffness: 300, damping: 30 }

// Hover effects
whileHover={{ scale: 1.05 }}

// Tap interactions
whileTap={{ scale: 0.95 }}

// List staggering
transition={{ delay: index * 0.05 }}
```

## 🖼 Dummy Data

The app comes with **10 sample messages** demonstrating:

- System message (welcome)
- User → Assistant conversation
- Code blocks (TypeScript, Python)
- Data tables
- Markdown formatting
- Feature showcase

Located in `src/data/messages.ts` - easily customizable.

## 🔧 Configuration

### Tailwind Customization

Edit `tailwind.config.js`:

```javascript
theme: {
  colors: {
    'teal-accent': '#14b8a6',
    'purple-accent': '#a78bfa',
  },
  fontFamily: {
    mono: ['JetBrains Mono', 'Monaco'],
  },
}
```

### Vite Build Options

Edit `vite.config.ts`:

```typescript
build: {
  outDir: 'dist',
  rollupOptions: {
    output: {
      manualChunks: { /* ... */ }
    }
  }
}
```

## 📊 Performance

### Bundle Size (Gzipped)

- **Vendor**: 43.3 KB (React, Framer Motion)
- **App Code**: 64.0 KB
- **Markdown**: 259.1 KB (react-markdown, rehype-prism)
- **Total**: ~367 KB (production)

### Optimization Tips

1. Code blocks are lazy-loaded via Prism.js CDN
2. Tailwind CSS uses JIT compilation
3. Image assets can be optimized with sharp
4. Consider dynamic imports for markdown library

## 🚀 Next Steps for Production

### Phase 2 - WebSocket Integration

1. Connect to Socket.io server
2. Real-time message sync
3. Typing indicators
4. Online user presence

### Phase 3 - Advanced Features

1. **File Upload**: Attachment preview + progress
2. **Message Editing**: Edit history
3. **Reactions**: Emoji reactions on messages
4. **Search**: Full-text message search
5. **Notifications**: Browser notifications

### Phase 4 - Mobile & Accessibility

1. **Responsive Design**: Mobile-first optimization
2. **Touch Interactions**: Swipe gestures
3. **ARIA Labels**: Screen reader support
4. **Keyboard Navigation**: Full keyboard support

## 📝 Environment Variables

Create `.env` file:

```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=ws://localhost:3000
```

Usage in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## 🤝 Extending Components

### Adding a New Message Type

```typescript
// In Message.tsx
const isCustomType = author === 'custom'

return (
  <div className={isCustomType ? 'custom-styles' : 'default'}>
    {/* content */}
  </div>
)
```

### Adding New Commands

```typescript
// In ChatPanel.tsx
const handleCommand = (input: string) => {
  if (input.startsWith('/')) {
    const [cmd, ...args] = input.split(' ')
    // Handle command
  }
}
```

## 🐛 Troubleshooting

### Markdown not rendering?

- Check if `react-markdown` is imported
- Verify Prism.js CDN is loaded in `index.html`
- Clear browser cache

### Tailwind classes not applying?

- Ensure `.css` file imports are correct
- Run `npm run dev` to rebuild
- Check `tailwind.config.js` includes correct file paths

### TypeScript errors?

- Run `npm run build` to catch all errors
- Check `tsconfig.json` for strict mode settings
- Type all props with interfaces

## 📄 License

Built for Clawdbot Premium Dashboard. All rights reserved.

## 🎯 Goals Achieved

✅ **Phase 1 Complete:**

- [x] Project setup (Vite + React + Tailwind)
- [x] Layout & components (Header, Sidebar, ChatPanel)
- [x] Message bubbles (Discord-style)
- [x] Input box (multi-line, auto-expand)
- [x] Dark/light toggle
- [x] Markdown rendering (full support)
- [x] Animations (Framer Motion)
- [x] Dummy data (10 comprehensive examples)
- [x] Session info card (glassmorphism)
- [x] Premium styling (colors, typography, effects)

## 🙌 Credits

Built with:

- ⚡ Vite
- ⚛️ React 19
- 🎨 Tailwind CSS v4
- ✨ Framer Motion
- 🔤 Prism.js
- 🎯 TypeScript

---

**Status**: Production Ready (Phase 1) | **Last Updated**: January 2025
