'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Bell,
  ClipboardList,
  Monitor,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mic,
  Terminal,
} from 'lucide-react'
import { useAssistantStore, type ActivePanel } from '@/store/assistant-store'
import { providerNames } from '@/lib/model-catalog'
import { cn } from '@/lib/utils'

const navItems: { id: ActivePanel; icon: typeof MessageSquare; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'pc-control', icon: Terminal, label: 'PC Control' },
  { id: 'reminders', icon: Bell, label: 'Reminders' },
  { id: 'clipboard', icon: ClipboardList, label: 'Clipboard' },
  { id: 'system', icon: Monitor, label: 'System' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, activePanel, setActivePanel, provider, status } =
    useAssistantStore()

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 68 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-full flex flex-col glass-card-strong relative z-10 shrink-0"
      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shrink-0">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="overflow-hidden"
            >
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Pika AI
              </span>
              <p className="text-xs text-muted-foreground">Desktop Assistant</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activePanel === item.id
          return (
            <motion.button
              key={item.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActivePanel(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-purple-500/15 text-white border border-white/10'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-cyan-400')} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && sidebarOpen && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400"
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom: Provider & Status */}
      <div className="p-3 border-t border-white/5">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-2.5 mb-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    status === 'idle' && 'bg-green-400',
                    status === 'listening' && 'bg-cyan-400 animate-pulse',
                    status === 'thinking' && 'bg-yellow-400 animate-pulse',
                    status === 'speaking' && 'bg-purple-400 animate-pulse'
                  )}
                />
                <span className="text-xs text-muted-foreground capitalize">{status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {providerNames[provider] || provider}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-white"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </motion.button>
      </div>
    </motion.aside>
  )
}
