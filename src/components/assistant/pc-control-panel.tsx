'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Power, RotateCcw, Moon, Lock, LogOut,
  Volume2, Volume1, VolumeX,
  Play, SkipForward, SkipBack,
  MonitorUp, MonitorDown, Minus, X, ArrowLeftRight,
  Chrome, Globe, Search, FileText, Camera,
  Bell, Wifi, Sun, Keyboard, Terminal,
  WifiOff, Usb, Link, Link2, Unlink,
  ChevronDown, ChevronRight, Loader2,
} from 'lucide-react'
import { usePcBridge } from '@/hooks/use-pc-bridge'
import { toast } from 'sonner'

function SectionCard({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
      >
        {icon}
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  variant = 'default',
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'success'
}) {
  const colors = {
    default: 'hover:bg-cyan-500/15 hover:text-cyan-400 hover:border-cyan-500/30',
    danger: 'hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30',
    success: 'hover:bg-green-500/15 hover:text-green-400 hover:border-green-500/30',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/5 
        bg-white/3 text-sm font-medium text-muted-foreground transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed ${colors[variant]}`}
    >
      {icon}
      {label}
    </motion.button>
  )
}

export function PcControlPanel() {
  const { status, bridgeUrl, setBridgeUrl, connect, disconnect, sendCommand, speakText, isConnected, systemData } = usePcBridge()
  const [urlInput, setUrlInput] = useState('ws://localhost:8765')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleConnect = () => {
    if (urlInput) {
      setBridgeUrl(urlInput)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const execCommand = async (category: string, action: string, params: Record<string, unknown> = {}) => {
    if (!isConnected) {
      toast.error('Not connected to PC Bridge')
      return
    }
    const key = `${category}/${action}`
    setLoadingAction(key)
    const result = await sendCommand(category, action, params)
    if (result.success) {
      toast.success(result.message || 'Done!')
      if (result.message) speakText(result.message)
    } else {
      toast.error(result.message || 'Command failed')
      if (result.message) speakText("कमांड फ़ेल हो गई: " + result.message)
    }
    setLoadingAction(null)
  }

  const isLoading = (category: string, action: string) => loadingAction === `${category}/${action}`

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              PC Control
            </h2>
            <p className="text-xs text-muted-foreground">Control your PC from the web UI via WebSocket</p>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className={`glass-card-strong p-4 flex items-center gap-4 border-l-4 ${
          isConnected ? 'border-l-green-500' : status === 'connecting' ? 'border-l-yellow-500' : status === 'error' ? 'border-l-red-500' : 'border-l-muted'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' : status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-muted-foreground'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isConnected ? 'Connected to PC Bridge' : status === 'connecting' ? 'Connecting...' : status === 'error' ? 'Connection Error' : 'Disconnected'}
            </p>
            {isConnected && systemData && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {systemData.hostname as string} • {systemData.platform as string}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isConnected ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConnect}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors"
              >
                <Link className="w-3.5 h-3.5" />
                Connect
              </motion.button>
            )}
          </div>
        </div>

        {/* URL Input */}
        <div className="glass-card p-4">
          <label className="text-xs text-muted-foreground font-medium mb-2 block">WebSocket URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="ws://localhost:8765 or ws://192.168.1.100:8765"
              disabled={isConnected}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            />
            {!isConnected ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConnect}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium"
              >
                Connect
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium"
              >
                Disconnect
              </motion.button>
            )}
          </div>
          {!isConnected && (
            <p className="text-xs text-muted-foreground mt-2">
              Run <code className="text-cyan-400">python pc_bridge.py</code> on your PC first, then connect here.
            </p>
          )}
        </div>

        {/* ── System Commands ── */}
        <SectionCard title="System Commands" icon={<Power className="w-4 h-4 text-red-400" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            <ActionButton label="Shutdown" icon={<Power className="w-4 h-4" />} onClick={() => execCommand('system', 'shutdown')} disabled={!isConnected} variant="danger" />
            <ActionButton label="Restart" icon={<RotateCcw className="w-4 h-4" />} onClick={() => execCommand('system', 'restart')} disabled={!isConnected} variant="danger" />
            <ActionButton label="Sleep" icon={<Moon className="w-4 h-4" />} onClick={() => execCommand('system', 'sleep')} disabled={!isConnected} />
            <ActionButton label="Lock Screen" icon={<Lock className="w-4 h-4" />} onClick={() => execCommand('system', 'lock')} disabled={!isConnected} />
            <ActionButton label="Log Off" icon={<LogOut className="w-4 h-4" />} onClick={() => execCommand('system', 'logoff')} disabled={!isConnected} variant="danger" />
          </div>
        </SectionCard>

        {/* ── Volume Control ── */}
        <SectionCard title="Volume & Media" icon={<Volume2 className="w-4 h-4 text-cyan-400" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <ActionButton label="Vol +" icon={<Volume2 className="w-4 h-4" />} onClick={() => execCommand('volume', 'up')} disabled={!isConnected} />
            <ActionButton label="Vol -" icon={<Volume1 className="w-4 h-4" />} onClick={() => execCommand('volume', 'down')} disabled={!isConnected} />
            <ActionButton label="Mute" icon={<VolumeX className="w-4 h-4" />} onClick={() => execCommand('volume', 'mute')} disabled={!isConnected} />
            <ActionButton label="Play/Pause" icon={<Play className="w-4 h-4" />} onClick={() => execCommand('media', 'play_pause')} disabled={!isConnected} />
            <ActionButton label="Next" icon={<SkipForward className="w-4 h-4" />} onClick={() => execCommand('media', 'next')} disabled={!isConnected} />
            <ActionButton label="Prev" icon={<SkipBack className="w-4 h-4" />} onClick={() => execCommand('media', 'prev')} disabled={!isConnected} />
          </div>
          {/* Volume Slider */}
          <div className="flex items-center gap-3 mt-2">
            <Volume1 className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => execCommand('volume', 'set', { level: parseInt(e.target.value) })}
              disabled={!isConnected}
              className="flex-1 accent-cyan-500 disabled:opacity-30"
            />
            <Volume2 className="w-4 h-4 text-muted-foreground" />
          </div>
        </SectionCard>

        {/* ── Window Management ── */}
        <SectionCard title="Window Management" icon={<MonitorUp className="w-4 h-4 text-purple-400" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            <ActionButton label="Maximize" icon={<MonitorUp className="w-4 h-4" />} onClick={() => execCommand('window', 'maximize')} disabled={!isConnected} />
            <ActionButton label="Minimize" icon={<MonitorDown className="w-4 h-4" />} onClick={() => execCommand('window', 'minimize')} disabled={!isConnected} />
            <ActionButton label="Close" icon={<X className="w-4 h-4" />} onClick={() => execCommand('window', 'close')} disabled={!isConnected} variant="danger" />
            <ActionButton label="Switch" icon={<ArrowLeftRight className="w-4 h-4" />} onClick={() => execCommand('window', 'switch')} disabled={!isConnected} />
            <ActionButton label="Desktop" icon={<Minus className="w-4 h-4" />} onClick={() => execCommand('window', 'show_desktop')} disabled={!isConnected} />
          </div>
        </SectionCard>

        {/* ── Quick Apps ── */}
        <SectionCard title="Quick Apps" icon={<Chrome className="w-4 h-4 text-orange-400" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {['Chrome', 'Notepad', 'VS Code', 'Spotify', 'Discord', 'Telegram', 'WhatsApp', 'Calculator', 'File Explorer', 'Task Manager'].map((app) => (
              <ActionButton
                key={app}
                label={app}
                icon={<span className="text-xs">{app === 'Chrome' ? '🌐' : app === 'Notepad' ? '📝' : app === 'VS Code' ? '💻' : app === 'Spotify' ? '🎵' : app === 'Discord' ? '💬' : app === 'Telegram' ? '✈️' : app === 'WhatsApp' ? '📱' : app === 'Calculator' ? '🔢' : app === 'File Explorer' ? '📁' : '⚡'}</span>}
                onClick={() => execCommand('app', 'open', { name: app })}
                disabled={!isConnected}
              />
            ))}
          </div>
        </SectionCard>

        {/* ── Quick Websites ── */}
        <SectionCard title="Quick Websites" icon={<Globe className="w-4 h-4 text-blue-400" />} defaultOpen={false}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {['youtube', 'google', 'gmail', 'github', 'stackoverflow', 'reddit', 'twitter', 'linkedin', 'netflix', 'chatgpt'].map((site) => (
              <ActionButton
                key={site}
                label={site.charAt(0).toUpperCase() + site.slice(1)}
                icon={<Globe className="w-4 h-4" />}
                onClick={() => execCommand('app', 'open', { name: site })}
                disabled={!isConnected}
              />
            ))}
          </div>
        </SectionCard>

        {/* ── Search ── */}
        <SectionCard title="Web Search" icon={<Search className="w-4 h-4 text-green-400" />} defaultOpen={false}>
          <div className="flex gap-2">
            <input
              type="text"
              id="pc-search-input"
              placeholder="Search query..."
              disabled={!isConnected}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  execCommand('search', 'google', { query: e.currentTarget.value.trim() })
                }
              }}
            />
            <ActionButton label="Google" icon={<Search className="w-4 h-4" />} onClick={() => {
              const input = document.getElementById('pc-search-input') as HTMLInputElement
              if (input?.value.trim()) execCommand('search', 'google', { query: input.value.trim() })
            }} disabled={!isConnected} />
            <ActionButton label="YouTube" icon={<Play className="w-4 h-4" />} onClick={() => {
              const input = document.getElementById('pc-search-input') as HTMLInputElement
              if (input?.value.trim()) execCommand('search', 'youtube', { query: input.value.trim() })
            }} disabled={!isConnected} />
            <ActionButton label="GitHub" icon={<Chrome className="w-4 h-4" />} onClick={() => {
              const input = document.getElementById('pc-search-input') as HTMLInputElement
              if (input?.value.trim()) execCommand('search', 'github', { query: input.value.trim() })
            }} disabled={!isConnected} />
          </div>
        </SectionCard>

        {/* ── Keyboard & Input ── */}
        <SectionCard title="Keyboard & Input" icon={<Keyboard className="w-4 h-4 text-yellow-400" />} defaultOpen={false}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            <ActionButton label="Select All" icon={<span className="text-xs">Ctrl+A</span>} onClick={() => execCommand('shortcut', 'select_all')} disabled={!isConnected} />
            <ActionButton label="Copy" icon={<span className="text-xs">Ctrl+C</span>} onClick={() => execCommand('shortcut', 'copy')} disabled={!isConnected} />
            <ActionButton label="Paste" icon={<span className="text-xs">Ctrl+V</span>} onClick={() => execCommand('shortcut', 'paste')} disabled={!isConnected} />
            <ActionButton label="Save" icon={<span className="text-xs">Ctrl+S</span>} onClick={() => execCommand('shortcut', 'save')} disabled={!isConnected} />
            <ActionButton label="Find" icon={<span className="text-xs">Ctrl+F</span>} onClick={() => execCommand('shortcut', 'find')} disabled={!isConnected} />
            <ActionButton label="Undo" icon={<span className="text-xs">Ctrl+Z</span>} onClick={() => execCommand('shortcut', 'undo')} disabled={!isConnected} />
            <ActionButton label="New Tab" icon={<span className="text-xs">Ctrl+T</span>} onClick={() => execCommand('shortcut', 'new_tab')} disabled={!isConnected} />
            <ActionButton label="Close Tab" icon={<span className="text-xs">Ctrl+W</span>} onClick={() => execCommand('shortcut', 'close_tab')} disabled={!isConnected} />
            <ActionButton label="Refresh" icon={<span className="text-xs">Ctrl+R</span>} onClick={() => execCommand('shortcut', 'refresh')} disabled={!isConnected} />
            <ActionButton label="Print" icon={<span className="text-xs">Ctrl+P</span>} onClick={() => execCommand('shortcut', 'print')} disabled={!isConnected} />
          </div>
          {/* Custom Hotkey */}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              id="pc-hotkey-input"
              placeholder="Custom hotkey (e.g. ctrl+shift+i)..."
              disabled={!isConnected}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  execCommand('hotkey', 'press', { keys: e.currentTarget.value.trim() })
                  e.currentTarget.value = ''
                }
              }}
            />
            <ActionButton label="Execute" icon={<Keyboard className="w-4 h-4" />} onClick={() => {
              const input = document.getElementById('pc-hotkey-input') as HTMLInputElement
              if (input?.value.trim()) {
                execCommand('hotkey', 'press', { keys: input.value.trim() })
                input.value = ''
              }
            }} disabled={!isConnected} />
          </div>
        </SectionCard>

        {/* ── Visual File Explorer ── */}
        <FileExplorerSection isConnected={isConnected} sendCommand={sendCommand} />

        {/* ── Screen & Display ── */}
        <SectionCard title="Screen & Display" icon={<Sun className="w-4 h-4 text-amber-400" />} defaultOpen={false}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <ActionButton label="Screenshot" icon={<Camera className="w-4 h-4" />} onClick={() => execCommand('screenshot', 'take')} disabled={!isConnected} variant="success" />
            <ActionButton label="Brightness +" icon={<Sun className="w-4 h-4" />} onClick={() => execCommand('brightness', 'up')} disabled={!isConnected} />
            <ActionButton label="Brightness -" icon={<Sun className="w-4 h-4" />} onClick={() => execCommand('brightness', 'down')} disabled={!isConnected} />
            <ActionButton label="Lock Screen" icon={<Lock className="w-4 h-4" />} onClick={() => execCommand('shortcut', 'lock_screen')} disabled={!isConnected} />
          </div>
        </SectionCard>

        {/* ── File Operations ── */}
        <SectionCard title="File Operations" icon={<FileText className="w-4 h-4 text-teal-400" />} defaultOpen={false}>
          <div className="flex gap-2">
            <input
              type="text"
              id="pc-filename-input"
              placeholder="File name (e.g. notes.txt)"
              disabled={!isConnected}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            />
            <ActionButton label="Create File" icon={<FileText className="w-4 h-4" />} onClick={() => {
              const input = document.getElementById('pc-filename-input') as HTMLInputElement
              if (input?.value.trim()) {
                execCommand('file', 'create', { name: input.value.trim() })
                input.value = ''
              }
            }} disabled={!isConnected} variant="success" />
          </div>
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionCard title="Notifications" icon={<Bell className="w-4 h-4 text-pink-400" />} defaultOpen={false}>
          <div className="flex gap-2">
            <input
              type="text"
              id="pc-notif-title"
              placeholder="Title..."
              disabled={!isConnected}
              className="w-1/3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            />
            <input
              type="text"
              id="pc-notif-body"
              placeholder="Notification message..."
              disabled={!isConnected}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            />
            <ActionButton label="Send" icon={<Bell className="w-4 h-4" />} onClick={() => {
              const title = (document.getElementById('pc-notif-title') as HTMLInputElement)?.value || 'Voice AI'
              const body = (document.getElementById('pc-notif-body') as HTMLInputElement)?.value || ''
              if (body.trim()) {
                execCommand('notification', 'show', { title, body })
              }
            }} disabled={!isConnected} />
          </div>
        </SectionCard>

        {/* ── Clipboard ── */}
        <SectionCard title="Clipboard Control" icon={<Terminal className="w-4 h-4 text-indigo-400" />} defaultOpen={false}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <ActionButton label="Get Clipboard" icon={<Terminal className="w-4 h-4" />} onClick={async () => {
              const res = await sendCommand('clipboard', 'get')
              if (res.success && res.data?.content) {
                toast.success(`Clipboard: ${(res.data.content as string).substring(0, 100)}...`)
              }
            }} disabled={!isConnected} />
            <ActionButton label="Paste" icon={<span className="text-xs">Ctrl+V</span>} onClick={() => execCommand('clipboard', 'paste')} disabled={!isConnected} />
            <ActionButton label="Copy Text" icon={<span className="text-xs">📋</span>} onClick={() => {
              const text = prompt('Enter text to copy to clipboard:')
              if (text) execCommand('clipboard', 'set', { text })
            }} disabled={!isConnected} />
          </div>
        </SectionCard>

        {/* ── Quick System Info ── */}
        <SectionCard title="Quick System Info" icon={<MonitorUp className="w-4 h-4 text-emerald-400" />} defaultOpen={false}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            <ActionButton label="CPU & RAM" icon={<MonitorUp className="w-4 h-4" />} onClick={() => execCommand('info', 'cpu_ram')} disabled={!isConnected} />
            <ActionButton label="Battery" icon={<Battery className="w-4 h-4" />} onClick={() => execCommand('info', 'battery')} disabled={!isConnected} />
            <ActionButton label="Disk Space" icon={<HardDrive className="w-4 h-4" />} onClick={() => execCommand('info', 'disk')} disabled={!isConnected} />
            <ActionButton label="IP Address" icon={<Wifi className="w-4 h-4" />} onClick={() => execCommand('info', 'ip')} disabled={!isConnected} />
            <ActionButton label="Full Report" icon={<FileText className="w-4 h-4" />} onClick={() => execCommand('info', 'full_report')} disabled={!isConnected} variant="success" />
          </div>
        </SectionCard>

        {/* Loading overlay */}
        <AnimatePresence>
          {loadingAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-6 right-6 z-50 glass-card-strong p-3 flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs text-muted-foreground">Executing: {loadingAction}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Visual File Explorer Section Component
function FileExplorerSection({
  isConnected,
  sendCommand,
}: {
  isConnected: boolean
  sendCommand: any
}) {
  const [currentPath, setCurrentPath] = useState('')
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadDirectory = async (pathStr: string) => {
    if (!isConnected) return
    setLoading(true)
    const res = await sendCommand('file', 'list_dir', { path: pathStr })
    if (res.success && res.data) {
      setCurrentPath(res.data.path)
      setFiles(res.data.items || [])
    } else {
      toast.error(res.message || 'Failed to list directory')
    }
    setLoading(false)
  }

  // Load initial root directory
  useEffect(() => {
    if (isConnected) {
      loadDirectory('')
    } else {
      setFiles([])
      setCurrentPath('')
    }
  }, [isConnected])

  const navigateUp = () => {
    if (!currentPath) return
    const parts = currentPath.split(/[\\/]/)
    parts.pop()
    const parent = parts.join('\\')
    loadDirectory(parent || 'C:\\')
  }

  const handleItemClick = (item: any) => {
    const fullPath = `${currentPath}\\${item.name}`
    if (item.type === 'dir') {
      loadDirectory(fullPath)
    } else {
      // Direct execute / open
      sendCommand('app', 'open', { name: fullPath })
      toast.success(`Opening file: ${item.name}`)
    }
  }

  return (
    <SectionCard title="Visual File Explorer" icon={<FileText className="w-4 h-4 text-emerald-400" />}>
      <div className="space-y-3">
        {/* Navigation Breadcrumb header */}
        <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-white/5 border border-white/5 text-xs text-muted-foreground">
          <button
            onClick={navigateUp}
            disabled={!isConnected || !currentPath}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-semibold transition-colors disabled:opacity-40 shrink-0"
          >
            ◀ Back
          </button>
          <span className="font-mono truncate select-all">{currentPath || 'Not connected'}</span>
        </div>

        {/* Directory Files List grid */}
        <div className="border border-white/5 rounded-xl bg-slate-950/20 max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {isConnected ? 'Empty folder' : 'Connect PC Bridge to browse files'}
            </div>
          ) : (
            files.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 text-xs text-left group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm shrink-0">
                    {item.type === 'dir' ? '📁' : '📄'}
                  </span>
                  <span className="truncate text-muted-foreground group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                </div>
                {item.size !== null && (
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {Math.round(item.size / 1024)} KB
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// Helper components for icons not in lucide
function Battery({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
      <line x1="23" y1="13" x2="23" y2="11" />
    </svg>
  )
}

function HardDrive({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}
