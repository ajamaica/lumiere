import { AnimatePresence, motion } from 'framer-motion'
import { Paperclip, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { dummyMessages } from '../data/messages'
import Message from './Message'

interface ChatPanelProps {
  isDark: boolean
}

export default function ChatPanel({ isDark }: ChatPanelProps) {
  const [messages, setMessages] = useState(dummyMessages)
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage = {
        id: `msg-${Date.now()}`,
        author: 'user' as const,
        content: inputValue,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
      setMessages([...messages, newMessage])
      setInputValue('')

      // Simulate assistant response
      setTimeout(() => {
        const response = {
          id: `msg-${Date.now() + 1}`,
          author: 'assistant' as const,
          content: `I received your message: "${inputValue.substring(0, 50)}..."\n\n\`\`\`json\n{"status": "received", "processing": true}\n\`\`\``,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }
        setMessages((prev) => [...prev, response])
      }, 500)

      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className={`flex-1 flex flex-col transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-gray-950/50 to-black/30'
          : 'bg-gradient-to-b from-white/50 to-gray-50/30'
      }`}
    >
      {/* Messages Container */}
      <div
        className={`flex-1 overflow-y-auto p-6 space-y-4 transition-colors duration-300 ${
          isDark ? 'scrollbar-dark' : 'scrollbar-light'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`py-6 text-center border-b transition-colors duration-300 ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Welcome to Clawdbot Dashboard
          </h2>
          <p
            className={`text-sm transition-colors duration-300 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            A premium real-time AI assistant interface
          </p>
        </motion.div>

        {/* Messages */}
        <AnimatePresence>
          {messages.map((message, index) => (
            <Message key={message.id} {...message} isDark={isDark} index={index} />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`border-t transition-colors duration-300 p-4 backdrop-blur-md ${
          isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Input Box */}
          <motion.div
            animate={{
              borderColor: isFocused
                ? isDark
                  ? 'rgba(148, 163, 184, 0.5)'
                  : 'rgba(59, 130, 246, 0.5)'
                : isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)',
            }}
            className={`relative rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md ${
              isDark ? 'bg-gray-900/50 border-white/10' : 'bg-white/50 border-gray-300/50'
            } border-2`}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type your message here... (Shift+Enter for new line)"
              className={`w-full px-4 py-3 bg-transparent outline-none resize-none font-sans transition-colors duration-300 placeholder-current ${
                isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'
              }`}
              rows={1}
              style={{
                maxHeight: '120px',
                minHeight: '44px',
              }}
            />

            {/* Right Actions */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-lg transition-colors duration-300 ${
                  isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/10 text-gray-600'
                }`}
              >
                <Paperclip size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  inputValue.trim()
                    ? isDark
                      ? 'bg-gradient-to-r from-teal-500 to-purple-500 text-white hover:shadow-lg hover:shadow-teal-500/50'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-blue-500/50'
                    : isDark
                      ? 'bg-gray-800 text-gray-600'
                      : 'bg-gray-300 text-gray-500'
                }`}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </motion.div>

          {/* Footer Info */}
          <div
            className={`text-xs flex items-center justify-between px-2 transition-colors duration-300 ${
              isDark ? 'text-gray-500' : 'text-gray-600'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Connected</span>
              </div>
              <span>Latency: 45ms</span>
            </div>
            <span>Model: claude-haiku-4.5</span>
          </div>
        </div>
      </motion.div>
    </motion.main>
  )
}
