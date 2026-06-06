'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Moon, Sun, Trash2 } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'
import { Sidebar } from '@/components/assistant/sidebar'
import { ChatArea } from '@/components/assistant/chat-area'
import { ChatInput } from '@/components/assistant/chat-input'
import { StatusIndicator, ProviderBadge } from '@/components/assistant/status-indicator'
import { SettingsPanel } from '@/components/assistant/settings-panel'
import { RemindersPanel } from '@/components/assistant/reminders-panel'
import { ClipboardPanel } from '@/components/assistant/clipboard-panel'
import { SystemMonitorPanel } from '@/components/assistant/system-monitor'
import { PcControlPanel } from '@/components/assistant/pc-control-panel'
import { toast } from 'sonner'
import { PcBridgeProvider } from '@/components/assistant/pc-bridge-provider'

function HeaderBar() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { status, provider, model, activePanel, clearMessages, messages } = useAssistantStore()

  useEffect(() => { setMounted(true) }, [])

  const handleClear = () => {
    clearMessages()
    toast.success('Chat cleared')
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-14 flex items-center justify-between px-4 border-b border-white/5 glass-card shrink-0"
      style={{ borderRadius: 0 }}
    >
      <div className="flex items-center gap-3">
        <StatusIndicator status={status} />
        {activePanel === 'chat' && <ProviderBadge provider={provider} model={model} />}
      </div>
      <div className="flex items-center gap-2">
        {activePanel === 'chat' && messages.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClear}
            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          aria-label="Toggle theme"
        >
          {mounted ? (
            theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </motion.button>
      </div>
    </motion.header>
  )
}

function Starfield() {
  const [mounted, setMounted] = useState(false)

  // Deterministic star positions (no Math.random — same on server & client)
  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: (i * 37 + 13) % 100,
      top: (i * 53 + 7) % 100,
      delay: ((i * 41 + 29) % 500) / 100,
      duration: 2 + ((i * 23 + 11) % 400) / 100,
      w: 1 + ((i * 17 + 3) % 200) / 100,
      h: 1 + ((i * 31 + 7) % 200) / 100,
    })),
  [])

  useEffect(() => { setMounted(true) }, [])

  // Before mount: return empty container (matches SSR)
  // After mount: render stars (only client-side, no hydration mismatch)
  if (!mounted) return <div className="starfield" />

  return (
    <div className="starfield">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            width: `${s.w}px`,
            height: `${s.h}px`,
          }}
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  const { activePanel, sidebarOpen, reminders } = useAssistantStore()

  // Load reminders from API on mount
  useEffect(() => {
    fetch('/api/reminders')
      .then((r) => r.json())
      .then((data) => {
        if (data.reminders && data.reminders.length > 0) {
          data.reminders.forEach((r: { id: string; text: string; createdAt: number; expiresAt: number; completed: boolean }) => {
            useAssistantStore.getState().addReminder(r)
          })
        }
      })
      .catch(() => {/* silent */})

    fetch('/api/clipboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.items && data.items.length > 0) {
          data.items.forEach((item: string) => {
            useAssistantStore.getState().addClipboardItem(item)
          })
        }
      })
      .catch(() => {/* silent */})
  }, [])

  const renderPanel = () => {
    switch (activePanel) {
      case 'settings':
        return <SettingsPanel />
      case 'reminders':
        return <RemindersPanel />
      case 'clipboard':
        return <ClipboardPanel />
      case 'system':
        return <SystemMonitorPanel />
      case 'pc-control':
        return <PcControlPanel />
      case 'chat':
      default:
        return (
          <>
            <ChatArea />
            <ChatInput />
          </>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] overflow-hidden">
      {/* Aurora Background */}
      <div className="aurora-bg">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>

      {/* Starfield */}
      <Starfield />

      {/* Main Content */}
      <PcBridgeProvider>
        <div className="relative z-10 h-full flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <motion.div
          initial={false}
          animate={{ marginLeft: sidebarOpen ? 0 : 0 }}
          className="flex-1 flex flex-col min-w-0"
        >
          <HeaderBar />

          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderPanel()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
      </PcBridgeProvider>
    </div>
  )
}
