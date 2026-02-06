export const dummyMessages = [
  {
    id: 'msg-1',
    author: 'system' as const,
    content:
      '**Welcome to Clawdbot Dashboard!** This is a premium real-time interface for managing your AI sessions.',
    timestamp: '10:00 AM',
  },
  {
    id: 'msg-2',
    author: 'user' as const,
    content: 'Can you help me understand how this dashboard works?',
    timestamp: '10:01 AM',
  },
  {
    id: 'msg-3',
    author: 'assistant' as const,
    content: `Absolutely! Here's a quick overview:

## Dashboard Features

This premium dashboard includes:

1. **Real-time Monitoring** - Track token usage, latency, and runtime
2. **Beautiful UI** - Dark mode with glassmorphism effects
3. **Markdown Support** - Full markdown rendering with syntax highlighting
4. **Session Management** - View and manage your session information

### Key Components

- **Header**: Navigation and theme toggle
- **Sidebar**: Session info card with stats
- **Chat Panel**: Message interface with real-time updates
- **Input Box**: Rich text input with multi-line support

You can use **bold**, *italic*, and \`inline code\` formatting!`,
    timestamp: '10:02 AM',
  },
  {
    id: 'msg-4',
    author: 'user' as const,
    content: 'Can you show me some code examples?',
    timestamp: '10:03 AM',
  },
  {
    id: 'msg-5',
    author: 'assistant' as const,
    content: `Sure! Here's some React code:

\`\`\`typescript
interface Message {
  id: string
  author: 'user' | 'system' | 'assistant'
  content: string
  timestamp: string
}

const Message: React.FC<MessageProps> = ({ 
  id, 
  author, 
  content, 
  timestamp 
}) => {
  return (
    <div className="message-bubble">
      <div className="message-header">
        <span>{author}</span>
        <time>{timestamp}</time>
      </div>
      <div className="message-content">
        {content}
      </div>
    </div>
  )
}
\`\`\`

And here's some Python:

\`\`\`python
def fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Example usage
result = fibonacci(10)
print(f"Fibonacci(10) = {result}")
\`\`\``,
    timestamp: '10:04 AM',
  },
  {
    id: 'msg-6',
    author: 'user' as const,
    content: 'That looks great! Can you also show me a data table?',
    timestamp: '10:05 AM',
  },
  {
    id: 'msg-7',
    author: 'assistant' as const,
    content: `Absolutely! Here's a sample data table:

| Feature | Status | Progress | ETA |
|---------|--------|----------|-----|
| UI Components | ✅ Complete | 100% | Done |
| Markdown Support | ✅ Complete | 100% | Done |
| Real-time Updates | 🔄 In Progress | 75% | 2 days |
| WebSocket Integration | ⏳ Planned | 0% | 1 week |
| Mobile Responsive | ⏳ Planned | 0% | 2 weeks |

### Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Load Time | 1.2s | 🟢 Good |
| First Paint | 680ms | 🟢 Good |
| Lighthouse Score | 94/100 | 🟢 Excellent |
| Bundle Size | 245KB | 🟡 Good |`,
    timestamp: '10:06 AM',
  },
  {
    id: 'msg-8',
    author: 'user' as const,
    content: 'Impressive! What are the main styling features?',
    timestamp: '10:07 AM',
  },
  {
    id: 'msg-9',
    author: 'assistant' as const,
    content: `Great question! Here are the key styling features:

## Design System

### Colors
- **Primary Dark**: \`#0f0f0f\` (Main background)
- **Accent Teal**: \`#14b8a6\` (Primary accent)
- **Accent Purple**: \`#a78bfa\` (Secondary accent)

### Typography
- **Sans-serif**: System fonts (SF Pro Display, Segoe UI, etc.)
- **Monospace**: JetBrains Mono (for code blocks)

### Effects & Animations

\`\`\`css
/* Glassmorphism */
.glass {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}

/* Smooth transitions */
.smooth-transition {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover scale effect */
.hover-scale:hover {
  transform: scale(1.05);
}
\`\`\`

### Motion & Framer

All components use Framer Motion for:
- ✨ Smooth entrance animations
- 🎯 Interactive hover effects
- 🔄 Spring-based physics
- ⚡ GPU-accelerated transforms`,
    timestamp: '10:08 AM',
  },
  {
    id: 'msg-10',
    author: 'assistant' as const,
    content: `## Summary

This dashboard brings together:

> **Beauty** meets **Functionality**
> 
> A premium interface built for power users who appreciate quality design.

### Quick Stats
- 📊 Real-time metrics dashboard
- 🎨 Premium dark mode (default) + light mode
- ✨ Smooth animations throughout
- 📱 Responsive layout
- 🚀 Fast performance

### Next Steps
1. Connect to a WebSocket server
2. Implement real-time message sync
3. Add file upload support
4. Mobile optimization

**Ready to start building amazing things?** 🚀`,
    timestamp: '10:09 AM',
  },
]
