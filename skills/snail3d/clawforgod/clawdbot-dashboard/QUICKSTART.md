# Quick Start Guide - Clawdbot Dashboard

Get the dashboard running in **under 2 minutes**.

## ⚡ 60-Second Setup

### 1. Install Dependencies

```bash
cd /Users/ericwoodard/clawd/clawdbot-dashboard
npm install
```

### 2. Start Dev Server

```bash
npm run dev
```

### 3. Open Browser

```
http://localhost:5173
```

**Done!** The dashboard is live with:

- ✅ Dark mode (default)
- ✅ 10 sample messages
- ✅ Session info card
- ✅ Full markdown support
- ✅ Code syntax highlighting
- ✅ Smooth animations

## 🎮 What You Can Do Right Now

### Try the UI

1. **Toggle Dark/Light Mode**: Click sun/moon icon in header
2. **Send Messages**: Type in input box, press Enter
3. **Copy Session Key**: Click the session key field (copy icon appears)
4. **Explore Messages**: Scroll through 10 demo messages with:
   - Code blocks (TypeScript, Python)
   - Data tables
   - Markdown formatting
   - Different message types (user, assistant, system)

### Interactive Features

- **Hover Messages**: Messages highlight on hover
- **Expand Input**: Type more, box grows automatically
- **Send Button**: Gradient button with hover effects
- **Live Indicators**: See connection status at bottom

## 📱 Project Structure (Key Files)

```
src/
├── App.tsx              ← Root component with layout
├── components/
│   ├── Header.tsx       ← Theme toggle + logo
│   ├── Sidebar.tsx      ← Session info card
│   ├── ChatPanel.tsx    ← Chat area + input box
│   └── Message.tsx      ← Message bubbles + markdown
└── data/
    └── messages.ts      ← Edit dummy messages here
```

## ✏️ Common Edits

### Change Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  'teal-accent': '#14b8a6',    // Change this color
  'purple-accent': '#a78bfa',  // And this
}
```

### Add Custom Messages

Edit `src/data/messages.ts`:

```typescript
{
  id: 'msg-11',
  author: 'assistant',
  content: 'Your markdown content here',
  timestamp: '10:10 AM',
}
```

### Adjust Animation Speed

Edit component files (e.g., `src/components/Header.tsx`):

```typescript
transition={{
  type: 'spring',
  stiffness: 300,  // Lower = slower
  damping: 30
}}
```

## 🔧 Commands Reference

| Command           | What It Does                             |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start dev server (http://localhost:5173) |
| `npm run build`   | Build for production (creates `dist/`)   |
| `npm run preview` | Preview production build locally         |
| `npm run lint`    | Check for code issues                    |

## 🚀 Deploy to Production

### Build

```bash
npm run build
```

### Output

```
dist/
├── index.html
├── assets/
│   ├── index-*.js
│   ├── index-*.css
│   ├── vendor-*.js
│   └── markdown-*.js
```

### Deploy (Vercel, Netlify, etc.)

```bash
# Vercel
vercel deploy

# Netlify
netlify deploy --prod --dir=dist

# Or serve dist/ with any static host
```

## 🎨 Customization Examples

### Example 1: Change Accent Colors to Purple/Blue

**tailwind.config.js:**

```javascript
colors: {
  'teal-accent': '#3b82f6',   // Blue
  'purple-accent': '#8b5cf6',  // Purple
}
```

### Example 2: Make Messages Center-Aligned

**src/components/Message.tsx:**

```typescript
className={`flex gap-3 justify-center ...`}
```

### Example 3: Disable Animations

**src/components/Header.tsx:**

```typescript
initial={{ y: 0 }}  // Remove animation
animate={{ y: 0 }}
transition={{}}     // No transition
```

### Example 4: Add More Sample Messages

**src/data/messages.ts:**

```typescript
{
  id: 'msg-11',
  author: 'user',
  content: '# Welcome to my custom message!\n\nWith **markdown** support',
  timestamp: '10:10 AM',
}
```

## 📊 Real-time Integration (Next Phase)

To connect Socket.io for live updates:

**Step 1:** Install socket.io (already installed)

```bash
npm list socket.io-client
```

**Step 2:** Add socket connection in App.tsx:

```typescript
import io from 'socket.io-client'

const socket = io('http://localhost:3000')

socket.on('message:new', (msg) => {
  setMessages((prev) => [...prev, msg])
})
```

**Step 3:** Replace dummy data with real messages.

## 🐛 Quick Troubleshooting

| Problem                  | Fix                                      |
| ------------------------ | ---------------------------------------- |
| Port 5173 already in use | Run `npm run dev -- --port 5174`         |
| Styles not loading       | Run `npm install` again                  |
| TypeScript errors        | Run `npm run build` to see all errors    |
| Markdown not rendering   | Check internet (Prism.js loads from CDN) |

## 📚 Learn More

- **README.md** - Full feature documentation
- **SKILL.md** - Integration & API docs
- **src/components** - Component source code with comments

## 🎯 Next Steps

1. ✅ **Run it** (`npm run dev`)
2. ✅ **Explore** the UI and features
3. 📝 **Customize** colors and messages
4. 🔌 **Integrate** with Socket.io (Phase 2)
5. 📱 **Deploy** to production

## Need Help?

1. Check the **README.md** for detailed docs
2. Look at **SKILL.md** for integration guides
3. Review component source code (well-commented)
4. Check **TROUBLESHOOTING** section in README

---

**Ready?** Just run:

```bash
npm install && npm run dev
```

Then open `http://localhost:5173` 🚀
