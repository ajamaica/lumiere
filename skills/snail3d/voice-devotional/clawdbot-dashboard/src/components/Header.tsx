import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'

interface HeaderProps {
  isDark: boolean
  onToggleDark: () => void
}

export default function Header({ isDark, onToggleDark }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed top-0 left-0 right-0 h-16 backdrop-blur-xl border-b transition-colors duration-300 z-50 ${
        isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200'
      }`}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg transition-colors duration-300 ${
              isDark
                ? 'bg-gradient-to-br from-teal-accent to-purple-accent text-black'
                : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
            }`}
          >
            ⚡
          </div>
          <div className="hidden sm:block">
            <h1
              className={`text-xl font-bold transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Clawdbot
            </h1>
            <p
              className={`text-xs transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Premium Dashboard
            </p>
          </div>
        </motion.div>

        {/* Dark/Light Toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleDark}
          className={`p-3 rounded-lg transition-colors duration-300 ${
            isDark
              ? 'bg-white/10 hover:bg-white/20 text-yellow-300'
              : 'bg-gray-200/50 hover:bg-gray-300/50 text-gray-800'
          }`}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </motion.button>
      </div>
    </motion.header>
  )
}
