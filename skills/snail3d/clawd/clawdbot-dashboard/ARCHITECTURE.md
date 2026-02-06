# Dashboard Architecture & Component Guide

## 🏗 Overall Architecture

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx                          │
│            (Layout + State Management)              │
└─────────────────────────────────────────────────────┘
           ┌──────────────┬──────────────┐
           │              │              │
      ┌────▼────┐  ┌──────▼──────┐ ┌────▼────┐
      │ Header  │  │  Sidebar    │ │ChatPanel│
      └────┬────┘  └──────┬──────┘ └────┬────┘
           │               │             │
           │         ┌─────▼────┐        │
           │         │ Session  │        │
           │         │   Card   │        │
           │         └─────┬────┘        │
           │               │             │
           │               │    ┌────────▼────────┐
           │               │    │ Message List    │
           │               │    │ (animated)      │
           │               │    ├─────────────────┤
           │               │    │ Message (x10)   │
           │               │    │ - User          │
           │               │    │ - Assistant     │
           │               │    │ - System        │
           │               │    └────────┬────────┘
           │               │             │
           │               │    ┌────────▼────────┐
           │               │    │  Input Box      │
           │               │    │  - Multi-line   │
           │               │    │  - Auto-expand  │
           │               │    └─────────────────┘
```

## 📦 Component Hierarchy

```
App
├── Header (isDark, onToggleDark)
│   ├── Logo + Brand
│   └── Theme Toggle Button
│
├── Sidebar (isDark)
│   ├── Session Info Card (glassmorphic)
│   │   ├── Session Key (copyable)
│   │   ├── Token Usage (progress bar)
│   │   ├── Runtime
│   │   └── Model
│   │
│   └── Quick Stats Grid
│       ├── Messages
│       ├── Uptime
│       ├── Latency
│       └── Status
│
└── ChatPanel (isDark)
    ├── Welcome Header
    ├── Message List
    │   └── Message (x10)
    │       ├── Avatar
    │       ├── Header (name + time)
    │       ├── Bubble
    │       │   └── Markdown Content
    │       │       ├── Headers
    │       │       ├── Code Blocks
    │       │       ├── Tables
    │       │       ├── Lists
    │       │       └── Blockquotes
    │       │
    ├── Input Area
    │   ├── Textarea (auto-expand)
    │   ├── Attachment Button
    │   └── Send Button
    │
    └── Footer (status info)
```

## 🎭 Component Details

### App.tsx

**Purpose**: Root component, layout management, theme state  
**Responsibilities**:

- Dark/light mode state
- Global layout structure
- Background effects (grid)
- Props delegation

**Key State**:

```typescript
const [isDark, setIsDark] = useState(true)
```

**Pass Down**:

- `isDark` boolean to all children
- `onToggleDark` callback to Header

---

### Header.tsx

**Purpose**: Top navigation bar, theme toggle  
**Responsibilities**:

- Logo and branding
- Dark/light mode toggle button
- Animations (entrance + hover)

**Props**:

```typescript
interface HeaderProps {
  isDark: boolean
  onToggleDark: () => void
}
```

**Animations**:

- Entrance: Spring animation from top (`y: -100` → `0`)
- Hover: Scale button (1.05x)
- Click: Scale button (0.95x)

**Styling**:

- Fixed position (top: 0, height: 64px)
- Glassmorphism (`backdrop-blur-xl`)
- Conditional dark/light classes

---

### Sidebar.tsx

**Purpose**: Session information & quick stats  
**Responsibilities**:

- Display session metadata (key, tokens, runtime, model)
- Show token usage with progress bar
- Display 4 key metrics
- Copy-to-clipboard for sensitive data

**Props**:

```typescript
interface SidebarProps {
  isDark: boolean
}
```

**Sub-components**:

1. **Session Info Card** (glassmorphic)
   - 4 fields with copy actions
   - Progress bar for token usage
   - Color-coded backgrounds (amber/green/purple)

2. **Stats Grid**
   - 2x2 grid layout
   - 4 metrics with icons/values
   - Staggered entrance animation

**Animations**:

- Entrance: Slide from left + fade
- Card items: Staggered appear (delay + 0.1s each)
- Copy button: Icon swap (Copy → Check)

**State**:

```typescript
const [copiedField, setCopiedField] = useState<string | null>(null)
```

---

### ChatPanel.tsx

**Purpose**: Main chat interface  
**Responsibilities**:

- Display message list
- Manage input state
- Handle send logic
- Auto-scroll to latest message
- Status indicators

**Props**:

```typescript
interface ChatPanelProps {
  isDark: boolean
}
```

**State**:

```typescript
const [messages, setMessages] = useState(dummyMessages)
const [inputValue, setInputValue] = useState('')
const [isFocused, setIsFocused] = useState(false)
```

**Key Features**:

- **Auto-scroll**: Smooth scroll to latest message
- **Textarea expansion**: Max 120px, min 44px
- **Keyboard shortcuts**:
  - Enter = Send
  - Shift+Enter = New line
- **Simulated responses**: Auto-reply after 500ms
- **Status footer**: Connection, latency, model info

**Sub-components**:

1. **Message List Container**
   - `overflow-y-auto` (scrollable)
   - `AnimatePresence` for exits
   - Welcome header

2. **Input Area**
   - Expandable textarea
   - Paperclip attachment button
   - Gradient send button
   - Status indicators

---

### Message.tsx

**Purpose**: Individual message rendering with markdown  
**Responsibilities**:

- Render different message types (user/assistant/system)
- Parse and display markdown content
- Syntax highlight code blocks
- Handle hover effects

**Props**:

```typescript
interface MessageProps {
  id: string
  author: 'user' | 'system' | 'assistant'
  content: string
  timestamp: string
  isDark: boolean
  index: number
}
```

**Features**:

- **Author differentiation**:
  - User: Purple gradient, right-aligned
  - Assistant: Gray gradient, left-aligned
  - System: Blue gradient, left-aligned

- **Markdown rendering**:
  - Headers (H1-H3)
  - Code blocks with language detection
  - Tables with borders
  - Lists (ordered/unordered)
  - Blockquotes
  - Links with hover

- **Animations**:
  - Entrance: Scale + fade (spring)
  - Staggered by index
  - Hover: Scale bubble (1.01x)
  - Highlight background on hover

**Markdown Components** (customized):

```typescript
h1: Custom styling with accent colors
h2: Smaller than h1
h3: Smaller than h2
pre: Code blocks with dark background
code: Inline code with monospace
table: Striped rows, proper borders
a: Accent color with hover
blockquote: Accent left border
```

---

## 🎨 Styling System

### Tailwind Classes Used

**Layout**:

```
h-screen, w-full, flex, flex-col, flex-row, items-center, justify-between
grid, gap-3, p-4, px-6, py-3, space-y-4, space-x-2
```

**Colors**:

```
bg-[#0f0f0f], bg-gradient-to-b, from-gray-900, to-black
text-white, text-gray-400, text-teal-accent, text-purple-accent
border-white/10, border-gray-200
```

**Effects**:

```
backdrop-blur-xl, rounded-lg, rounded-2xl, opacity-50, transition-colors
shadow-lg, shadow-teal-500/50
```

**Responsive**:

```
sm:block (hidden on mobile), max-w-2xl, w-80 (sidebar width)
```

### Custom Classes (.index.css)

```css
.glass { backdrop-blur-xl, bg-white/10, border, border-white/20 }
.glass-dark { backdrop-blur-xl, bg-black/40, border, border-white/10 }
```

### Theme Colors

**Dark Mode (Default)**:

- Background: #0f0f0f
- Surface: rgba(0,0,0,0.3-0.5)
- Border: rgba(255,255,255,0.1-0.2)
- Accent Primary: #14b8a6 (Teal)
- Accent Secondary: #a78bfa (Purple)

**Light Mode**:

- Background: #f9fafb
- Surface: rgba(255,255,255,0.3-0.5)
- Border: rgba(0,0,0,0.1-0.2)
- Accent Primary: #0ea5e9 (Blue)
- Accent Secondary: #a855f7 (Purple)

---

## 📊 Data Flow

### Message Flow

```
User Types in Input
    ↓
handleInputChange (textarea)
    ↓
Input Value State Updated
    ↓
User Presses Enter
    ↓
handleSendMessage
    ↓
Create Message Object { id, author: 'user', content, timestamp }
    ↓
Add to Messages Array
    ↓
Reset Input & Scroll to Bottom
    ↓
ChatPanel re-renders
    ↓
Messages render via AnimatePresence
    ↓
Each Message animates in with stagger
```

### Theme Toggle Flow

```
User Clicks Sun/Moon Icon
    ↓
onToggleDark() callback
    ↓
App state: isDark = !isDark
    ↓
isDark passed to all children
    ↓
Conditional classes update
    ↓
CSS transition: duration-300
    ↓
All elements fade/transform colors
```

### Copy to Clipboard Flow

```
User Clicks Session Key
    ↓
copyToClipboard(text, field)
    ↓
navigator.clipboard.writeText()
    ↓
Set copiedField = field
    ↓
Icon changes Copy → Check (green)
    ↓
setTimeout 2000ms
    ↓
Reset copiedField = null
    ↓
Icon changes back to Copy
```

---

## ⚡ Performance Optimizations

### Code Splitting

```
vendor-*.js      (React, Framer Motion)
markdown-*.js    (react-markdown, rehype-prism)
index-*.js       (App code)
```

### Lazy Loading

- Prism.js: Loaded from CDN
- Code highlighting: Done client-side on demand

### Animations

- Framer Motion: GPU-accelerated transforms
- Staggering: `delay: index * 0.05` prevents jank

### CSS

- Tailwind JIT: Only used classes included
- No unused CSS loaded
- Efficient color transitions

---

## 🔄 Re-render Optimization

**Components that trigger re-renders**:

1. `App`: isDark state change → all children
2. `ChatPanel`: messages state → Message list
3. `Message`: props change (content, isDark, index)
4. `Sidebar`: isDark change only

**Memoization opportunities** (for Phase 2):

```typescript
export const Message = memo(MessageComponent)
export const ChatPanel = memo(ChatPanelComponent)
```

---

## 🧪 Testing Points

**Unit Tests** (components):

- Message markdown rendering
- Copy to clipboard function
- Input expansion logic
- Message staggering animation

**Integration Tests**:

- Dark mode toggle propagates
- Send message updates state
- Auto-scroll to latest message
- Keyboard shortcuts work

**E2E Tests**:

- Full user flow (type → send → receive → read)
- Theme toggle persistence (add localStorage)
- Markdown rendering in all message types

---

## 🚀 Scaling to Phase 2 (Real-time)

### Add Socket.io Integration

```typescript
// App.tsx
const socket = io(import.meta.env.VITE_SOCKET_URL)

const handleNewMessage = (message) => {
  setMessages(prev => [...prev, message])
}

useEffect(() => {
  socket.on('message:new', handleNewMessage)
  return () => socket.off('message:new', handleNewMessage)
}, [])

// Pass socket to ChatPanel
<ChatPanel socket={socket} />
```

### Update Sidebar with Live Data

```typescript
const [session, setSession] = useState(null)

useEffect(() => {
  socket.on('session:update', setSession)
}, [])

// In Sidebar, use session data instead of static mock
```

### Add Typing Indicators

```typescript
// In Message.tsx
if (author === 'typing') {
  return (
    <div>
      <span>typing</span>
      <span className="animate-bounce">.</span>
      <span className="animate-bounce">.</span>
      <span className="animate-bounce">.</span>
    </div>
  )
}
```

---

## 📐 Responsive Design Checklist

- [ ] Mobile breakpoints (sm, md, lg)
- [ ] Sidebar collapse on mobile
- [ ] Touch-friendly buttons (44px min)
- [ ] Landscape keyboard support
- [ ] Message bubbles fit screen width
- [ ] Input box responsive width

---

## 🎓 Learning Resources

1. **React 19**: https://react.dev
2. **Tailwind CSS v4**: https://tailwindcss.com
3. **Framer Motion**: https://framer.com/motion
4. **react-markdown**: https://github.com/remarkjs/react-markdown
5. **Prism.js**: https://prismjs.com

---

**Last Updated**: January 2025  
**Phase**: 1 (Complete) ✅
