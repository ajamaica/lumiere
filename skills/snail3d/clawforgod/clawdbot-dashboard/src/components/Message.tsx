import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypePrism from 'rehype-prism-plus'

interface MessageProps {
  id: string
  author: 'user' | 'system' | 'assistant'
  content: string
  timestamp: string
  isDark: boolean
  index: number
}

export default function Message({ id, author, content, timestamp, isDark, index }: MessageProps) {
  const [isHighlighted, setIsHighlighted] = useState(false)

  useEffect(() => {
    // Highlight code blocks on mount
    const codeBlocks = document.querySelectorAll(`#message-${id} pre code`)
    codeBlocks.forEach((block) => {
      if (window.Prism) {
        window.Prism.highlightElement(block)
      }
    })
  }, [id])

  const isUserMessage = author === 'user'
  const isSystemMessage = author === 'system'

  return (
    <motion.div
      id={`message-${id}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: index * 0.05,
      }}
      onHoverStart={() => setIsHighlighted(true)}
      onHoverEnd={() => setIsHighlighted(false)}
      className={`flex gap-3 transition-all duration-300 ${
        isUserMessage ? 'flex-row-reverse' : 'flex-row'
      } ${isHighlighted ? 'px-4 py-2 rounded-lg' : ''} ${
        isHighlighted && isDark ? 'bg-white/5' : ''
      } ${isHighlighted && !isDark ? 'bg-gray-100/50' : ''}`}
    >
      {/* Avatar */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-colors duration-300 ${
          isSystemMessage
            ? isDark
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-blue-200 text-blue-700'
            : isUserMessage
              ? isDark
                ? 'bg-purple-900/50 text-purple-300'
                : 'bg-purple-200 text-purple-700'
              : isDark
                ? 'bg-teal-900/50 text-teal-300'
                : 'bg-teal-200 text-teal-700'
        }`}
      >
        {isSystemMessage ? '⚙️' : isUserMessage ? '👤' : '🤖'}
      </motion.div>

      {/* Content */}
      <div
        className={`flex flex-col gap-2 max-w-2xl ${isUserMessage ? 'items-end' : 'items-start'}`}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          <span className="font-semibold transition-colors duration-300">
            {isSystemMessage ? 'System' : isUserMessage ? 'You' : 'Assistant'}
          </span>
          <span
            className={`transition-colors duration-300 ${
              isDark ? 'text-gray-600' : 'text-gray-500'
            }`}
          >
            {timestamp}
          </span>
        </div>

        {/* Message Bubble */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`px-4 py-3 rounded-2xl transition-all duration-300 backdrop-blur-md ${
            isUserMessage
              ? isDark
                ? 'bg-purple-900/40 border border-purple-500/50 text-white rounded-br-none'
                : 'bg-purple-100/60 border border-purple-300 text-gray-900 rounded-br-none'
              : isSystemMessage
                ? isDark
                  ? 'bg-blue-900/30 border border-blue-500/40 text-white rounded-bl-none'
                  : 'bg-blue-100/50 border border-blue-300 text-gray-900 rounded-bl-none'
                : isDark
                  ? 'bg-gray-900/50 border border-white/10 text-white rounded-bl-none'
                  : 'bg-gray-100/50 border border-gray-300 text-gray-900 rounded-bl-none'
          }`}
        >
          <div className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown
              rehypePlugins={[rehypePrism]}
              components={{
                // Custom heading styles
                h1: ({ ...props }) => (
                  <h1
                    {...props}
                    className={`mt-4 mb-2 text-xl font-bold transition-colors duration-300 ${
                      isDark ? 'text-teal-accent' : 'text-blue-600'
                    }`}
                  />
                ),
                h2: ({ ...props }) => (
                  <h2
                    {...props}
                    className={`mt-3 mb-2 text-lg font-bold transition-colors duration-300 ${
                      isDark ? 'text-teal-accent' : 'text-blue-600'
                    }`}
                  />
                ),
                h3: ({ ...props }) => (
                  <h3
                    {...props}
                    className={`mt-2 mb-1 text-base font-bold transition-colors duration-300 ${
                      isDark ? 'text-teal-accent' : 'text-blue-600'
                    }`}
                  />
                ),
                // Code block styles
                pre: ({ ...props }) => (
                  <pre
                    {...props}
                    className={`my-2 p-3 rounded-lg overflow-x-auto text-xs font-mono transition-colors duration-300 ${
                      isDark
                        ? 'bg-black/50 border border-white/10'
                        : 'bg-gray-800/50 border border-gray-600'
                    }`}
                  />
                ),
                code: ({ ...props }) => (
                  <code
                    {...props}
                    className={`px-2 py-1 rounded text-xs font-mono transition-colors duration-300 ${
                      isDark ? 'bg-black/30 text-cyan-400' : 'bg-gray-800/30 text-cyan-500'
                    }`}
                  />
                ),
                // Link styles
                a: ({ ...props }) => (
                  <a
                    {...props}
                    className={`font-medium underline transition-colors duration-300 ${
                      isDark
                        ? 'text-teal-accent hover:text-purple-accent'
                        : 'text-blue-600 hover:text-purple-600'
                    }`}
                  />
                ),
                // Table styles
                table: ({ ...props }) => (
                  <table
                    {...props}
                    className={`my-2 border-collapse w-full text-xs transition-colors duration-300 ${
                      isDark ? 'border border-white/10' : 'border border-gray-400'
                    }`}
                  />
                ),
                th: ({ ...props }) => (
                  <th
                    {...props}
                    className={`px-3 py-1 text-left font-semibold transition-colors duration-300 ${
                      isDark
                        ? 'bg-white/5 border border-white/10 text-teal-accent'
                        : 'bg-gray-200 border border-gray-400 text-blue-600'
                    }`}
                  />
                ),
                td: ({ ...props }) => (
                  <td
                    {...props}
                    className={`px-3 py-1 transition-colors duration-300 ${
                      isDark ? 'border border-white/10' : 'border border-gray-400'
                    }`}
                  />
                ),
                // List styles
                ul: ({ ...props }) => (
                  <ul {...props} className="list-disc list-inside my-2 space-y-1" />
                ),
                ol: ({ ...props }) => (
                  <ol {...props} className="list-decimal list-inside my-2 space-y-1" />
                ),
                li: ({ ...props }) => <li {...props} className="ml-2" />,
                blockquote: ({ ...props }) => (
                  <blockquote
                    {...props}
                    className={`my-2 pl-3 border-l-4 transition-colors duration-300 ${
                      isDark
                        ? 'border-teal-accent/50 text-gray-400'
                        : 'border-blue-600 text-gray-700'
                    }`}
                  />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
