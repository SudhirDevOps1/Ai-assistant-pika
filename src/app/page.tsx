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
import { ToolsPanel } from '@/components/assistant/tools-panel'
import { MacrosPanel } from '@/components/assistant/macros-panel'
import { SchedulerPanel } from '@/components/assistant/scheduler-panel'
import { toast } from 'sonner'
import { PcBridgeProvider } from '@/components/assistant/pc-bridge-provider'
import { PiPWindow } from '@/components/assistant/PiPWindow'
import { usePcBridge } from '@/hooks/use-pc-bridge'
import { WebcamFeed } from '@/components/assistant/webcam-feed'
import { NeuralNetVisualizer } from '@/components/assistant/neural-net-visualizer'

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
  const { activePanel, sidebarOpen, auroraTheme, pipMode, showManualChat } = useAssistantStore()
  const { systemData } = usePcBridge()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Cursor tracking for ambient parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 35,
        y: (e.clientY / window.innerHeight - 0.5) * 35,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Load reminders and clipboard from API on mount
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

    // Also fetch initial auroraTheme config from API
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.auroraTheme) {
          useAssistantStore.getState().setAuroraTheme(data.auroraTheme)
        }
      })
      .catch(() => {/* silent */})
  }, [])

  const AURORA_THEMES: Record<string, { a1: string; a2: string; a3: string; a4: string }> = {
    neon: { a1: '#06b6d4', a2: '#a855f7', a3: '#06b6d4', a4: '#a855f7' },
    cyber: { a1: '#ff007f', a2: '#00f0ff', a3: '#ff007f', a4: '#00f0ff' },
    sunset: { a1: '#ff4e50', a2: '#f9d423', a3: '#f9d423', a4: '#ff4e50' },
    emerald: { a1: '#059669', a2: '#34d399', a3: '#10b981', a4: '#a7f3d0' }
  }

  const currentThemeColors = AURORA_THEMES[auroraTheme] || AURORA_THEMES.neon

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
      case 'tools':
        return <ToolsPanel />
      case 'macros':
        return <MacrosPanel />
      case 'scheduler':
        return <SchedulerPanel />
      case 'chat':
      default: {
        const cpu = Math.round(Number(systemData?.cpu_percent ?? 34))
        const ram = Math.round(Number(systemData?.ram_percent ?? 65))
        const temp = Math.round(Number(systemData?.cpu_temp ?? 50))
        const osName = String(systemData?.os ?? 'Windows 11')

        return (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 overflow-y-auto lg:overflow-hidden text-white bg-[#03060f]/95">
            {/* Left Column: Network Telemetry & Core Metrics */}
            <div className="w-full lg:w-[280px] flex flex-col gap-4 select-none shrink-0 lg:overflow-y-auto pr-1">
              {/* Network Telemetry */}
              <div className="glass-card rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                  ⚡ Network Telemetry
                </span>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold">Avg Latency</div>
                    <div className="text-sm font-bold text-white tracking-wide">10ms</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold">Packet Rate</div>
                    <div className="text-sm font-bold text-white tracking-wide">42 KB/s</div>
                  </div>
                </div>
              </div>

              {/* Core Metrics */}
              <div className="glass-card rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                  📊 Core Metrics
                </span>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="flex flex-col items-center">
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold pb-1">CPU Load</div>
                    <div className="relative w-14 h-14 flex items-center justify-center border border-white/5 rounded-full bg-slate-950/30">
                      <span className="text-[11px] font-bold">{cpu}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold pb-1">RAM Usage</div>
                    <div className="relative w-14 h-14 flex items-center justify-center border border-white/5 rounded-full bg-slate-950/30">
                      <span className="text-[11px] font-bold">{ram}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold pb-1">Temp</div>
                    <div className="relative w-14 h-14 flex items-center justify-center border border-white/5 rounded-full bg-slate-950/30">
                      <span className="text-[11px] font-bold">{temp}°C</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold pb-1">OS</div>
                    <div className="relative w-14 h-14 flex flex-col items-center justify-center border border-white/5 rounded-full bg-slate-950/30 text-[9px] text-center font-bold p-1">
                      <span className="leading-tight text-white/90">{osName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webcam Live Toggler */}
              <WebcamFeed />

              {/* Built With the Best (Technology Blueprint) */}
              <div className="glass-card rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                  🛠️ Built With the Best
                </span>
                <div className="space-y-3 pt-1 text-[10px] select-none">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">⚡ AI Engine <span className="text-cyan-400 font-semibold">(Gemini Flash)</span></div>
                    <div className="text-muted-foreground leading-snug">Core reasoning and multimodal screen understanding</div>
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">🐍 Backend Engine <span className="text-cyan-400 font-semibold">(Python Core)</span></div>
                    <div className="text-muted-foreground leading-snug">Local system execution, processes, and tools framework</div>
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">⚙️ OS Automation <span className="text-cyan-400 font-semibold">(pyautogui)</span></div>
                    <div className="text-muted-foreground leading-snug">Sub-millisecond keyboard and cursor movement injection</div>
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">🗣️ Voice Array <span className="text-cyan-400 font-semibold">(Whisper API)</span></div>
                    <div className="text-muted-foreground leading-snug">High-speed audio-to-intent stream decoding</div>
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">🌐 Web App <span className="text-cyan-400 font-semibold">(Next.js 14)</span></div>
                    <div className="text-muted-foreground leading-snug">React app with server-side generation features</div>
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">🎨 Design System <span className="text-cyan-400 font-semibold">(Tailwind CSS)</span></div>
                    <div className="text-muted-foreground leading-snug">Utility tokens powering modern premium animations</div>
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">📦 Packaging <span className="text-cyan-400 font-semibold">(PyInstaller)</span></div>
                    <div className="text-muted-foreground leading-snug">Lightweight desktop executable compiler under 120MB</div>
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">🗄️ Local Memory <span className="text-cyan-400 font-semibold">(SQLite 3)</span></div>
                    <div className="text-muted-foreground leading-snug">Local vector context database keeping system private</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Column: Rotating Circular Gyroscope Orbits */}
            <div className="flex-1 glass-card rounded-2xl border border-white/5 bg-slate-950/20 flex flex-col items-center justify-center p-4 min-w-[280px] min-h-[350px] lg:min-h-0">
              <NeuralNetVisualizer />
            </div>

            {/* Right Column: Stylized Transcript Feed */}
            {showManualChat && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full lg:w-[320px] h-[480px] lg:h-auto glass-card rounded-2xl border border-white/5 bg-[#040713]/80 flex flex-col shrink-0 overflow-hidden relative"
              >
                <div className="p-3 border-b border-white/5 flex items-center gap-2 select-none">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                    📜 Transcript logs
                  </span>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <ChatArea />
                  <ChatInput />
                </div>
              </motion.div>
            )}
          </div>
        )
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[#0a0a1a] overflow-hidden"
      style={{
        '--aurora-1': currentThemeColors.a1,
        '--aurora-2': currentThemeColors.a2,
        '--aurora-3': currentThemeColors.a3,
        '--aurora-4': currentThemeColors.a4,
      } as any}
    >
      {/* Aurora Background with Parallax */}
      <div className="aurora-bg">
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
        >
          <div className="aurora-blob" />
          <div className="aurora-blob" />
          <div className="aurora-blob" />
          <div className="aurora-blob" />
        </div>
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
          
          {/* PiP Floating Window */}
          {pipMode && <PiPWindow />}
        </div>
      </PcBridgeProvider>
    </div>
  )
}
