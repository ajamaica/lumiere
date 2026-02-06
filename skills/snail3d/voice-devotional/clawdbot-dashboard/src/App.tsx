import './index.css'

import { useState } from 'react'

import ChatPanel from './components/ChatPanel'
import Header from './components/Header'
import Sidebar from './components/Sidebar'

export default function App() {
  const [isDark, setIsDark] = useState(true)

  return (
    <div className={isDark ? 'dark' : ''}>
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]'
            : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
        }`}
      >
        {/* Grid background effect */}
        <div className={`fixed inset-0 pointer-events-none ${isDark ? 'opacity-5' : 'opacity-10'}`}>
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Main Layout */}
        <div className="flex h-screen overflow-hidden relative z-0">
          <Header isDark={isDark} onToggleDark={() => setIsDark(!isDark)} />

          <div className="flex w-full pt-16">
            <Sidebar isDark={isDark} />
            <ChatPanel isDark={isDark} />
          </div>
        </div>
      </div>
    </div>
  )
}
