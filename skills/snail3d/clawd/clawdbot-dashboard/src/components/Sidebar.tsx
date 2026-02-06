import { motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  isDark: boolean
}

export default function Sidebar({ isDark }: SidebarProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const sessionInfo = {
    sessionKey: 'sess_a30f27ac-ae79-4e3c-8dfa-175253c02f02',
    tokens: '4,821 / 200,000',
    runtime: '42m 15s',
    model: 'claude-haiku-4.5',
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`w-80 border-r transition-colors duration-300 overflow-y-auto ${
        isDark
          ? 'bg-gradient-to-b from-gray-900/50 via-gray-950/30 to-black/20 border-white/10'
          : 'bg-gradient-to-b from-gray-100/50 via-gray-50/30 to-white/20 border-gray-200'
      }`}
    >
      <div className="p-6 space-y-6">
        {/* Session Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`glass-dark p-6 space-y-4 ${
            isDark ? 'bg-black/30 border-white/10' : 'bg-white/30 border-gray-200/50'
          }`}
        >
          <h3
            className={`text-sm font-semibold uppercase tracking-wider transition-colors duration-300 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Session Info
          </h3>

          {/* Session Key */}
          <div className="space-y-2">
            <label
              className={`text-xs font-medium transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Session Key
            </label>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => copyToClipboard(sessionInfo.sessionKey, 'sessionKey')}
              className={`w-full p-3 rounded-lg text-sm font-mono text-left transition-all duration-300 group flex items-center justify-between ${
                isDark
                  ? 'bg-gray-900/50 hover:bg-gray-800/50 text-cyan-400'
                  : 'bg-gray-200/50 hover:bg-gray-300/50 text-blue-600'
              }`}
            >
              <code className="truncate text-xs">{sessionInfo.sessionKey.substring(0, 20)}...</code>
              <motion.div
                animate={{ rotate: copiedField === 'sessionKey' ? 0 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {copiedField === 'sessionKey' ? (
                  <Check size={16} className="text-green-400" />
                ) : (
                  <Copy
                    size={16}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </motion.div>
            </motion.button>
          </div>

          {/* Tokens */}
          <div className="space-y-2">
            <label
              className={`text-xs font-medium transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Token Usage
            </label>
            <div
              className={`p-3 rounded-lg text-sm transition-colors duration-300 ${
                isDark
                  ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 text-amber-300'
                  : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700'
              }`}
            >
              <div className="font-mono font-semibold">{sessionInfo.tokens}</div>
              <div className="text-xs opacity-75 mt-1">2.4% of budget</div>
              {/* Progress bar */}
              <div
                className={`mt-2 h-1.5 rounded-full overflow-hidden transition-colors duration-300 ${
                  isDark ? 'bg-black/30' : 'bg-black/10'
                }`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '2.4%' }}
                  transition={{ duration: 1.5, delay: 0.3 }}
                  className={`h-full transition-colors duration-300 ${
                    isDark
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Runtime */}
          <div className="space-y-2">
            <label
              className={`text-xs font-medium transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Runtime
            </label>
            <div
              className={`p-3 rounded-lg text-sm font-mono transition-colors duration-300 ${
                isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700'
              }`}
            >
              {sessionInfo.runtime}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label
              className={`text-xs font-medium transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Model
            </label>
            <div
              className={`p-3 rounded-lg text-sm font-mono transition-colors duration-300 ${
                isDark ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-100 text-purple-700'
              }`}
            >
              {sessionInfo.model}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`grid grid-cols-2 gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {[
            { label: 'Messages', value: '127' },
            { label: 'Uptime', value: '99.9%' },
            { label: 'Latency', value: '45ms' },
            { label: 'Status', value: 'Active' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className={`p-4 rounded-lg text-center transition-colors duration-300 ${
                isDark
                  ? 'bg-gray-900/30 border border-white/5'
                  : 'bg-gray-100/50 border border-gray-200/50'
              }`}
            >
              <div
                className={`text-lg font-bold transition-colors duration-300 ${
                  isDark ? 'text-teal-accent' : 'text-blue-600'
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`text-xs transition-colors duration-300 ${
                  isDark ? 'text-gray-500' : 'text-gray-600'
                }`}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.aside>
  )
}
