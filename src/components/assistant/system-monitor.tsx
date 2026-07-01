'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cpu, HardDrive, Battery, Wifi, Monitor, Clock, Thermometer, Server, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { usePcBridge } from '@/hooks/use-pc-bridge'

interface SystemInfo {
  cpuUsage: number
  ramUsage: number
  ramTotal: number
  diskUsed: number
  diskTotal: number
  battery: number
  isCharging: boolean
  ip: string
  hostname: string
  os: string
  uptime: number
  gpuUsage?: number
  cpuTemp?: number
  processes?: number
}

function CircularProgress({
  value,
  max,
  size = 100,
  strokeWidth = 8,
  color = 'from-cyan-400 to-purple-500',
  label,
  unit = '%',
}: {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  label: string
  unit?: string
}) {
  const percentage = Math.min((value / (max || 100)) * 100, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="circular-progress" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{value}{unit}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function ProgressBar({ value, max, label, color = 'cyan' }: {
  value: number
  max: number
  label: string
  color?: string
}) {
  const percentage = Math.round((value / max) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{value} / {max} ({percentage}%)</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${
            color === 'cyan' ? 'from-cyan-400 to-cyan-500' :
            color === 'purple' ? 'from-purple-400 to-purple-500' :
            'from-emerald-400 to-emerald-500'
          }`}
        />
      </div>
    </div>
  )
}

export function SystemMonitorPanel() {
  const { isConnected, systemData, sendCommand } = usePcBridge()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Terminate a program
  const handleKillProcess = async (pid: number, name: string) => {
    if (!isConnected) {
      toast.error('Connect PC Bridge to manage processes')
      return
    }
    const res = await sendCommand('app', 'close', { name: name.replace('.exe', '') })
    if (res.success) {
      toast.success(`Terminated process ${name} (PID: ${pid})`)
    } else {
      // Fallback manual taskkill
      const killRes = await sendCommand('keyboard', 'press', { keys: `taskkill /PID ${pid} /F` })
      toast.success(`Process kill command sent for PID ${pid}`)
    }
  }

  // Use websocket systemData if connected, otherwise fallback to local mock API or defaults
  const liveInfo = isConnected && systemData ? {
    cpuUsage: Math.round(Number(systemData.cpu_percent ?? 32)),
    ramUsage: Math.round(Number(systemData.ram_percent ?? 45)),
    ramUsed: Number(systemData.ram_used_gb ?? 7.2),
    ramTotal: Number(systemData.ram_total_gb ?? 16),
    diskUsed: Number(systemData.disk_total_gb ?? 512) - Number(systemData.disk_free_gb ?? 256),
    diskTotal: Number(systemData.disk_total_gb ?? 512),
    battery: Number(systemData.battery_percent ?? 100),
    isCharging: Boolean(systemData.battery_charging ?? true),
    ip: String(systemData.ip_address ?? '127.0.0.1'),
    hostname: String(systemData.hostname ?? 'Local PC'),
    os: String(systemData.os ?? 'Windows'),
    uptime: Number(systemData.uptime_hours ?? 2) * 3600,
    gpuUsage: 15,
    cpuTemp: 45,
    processes: Array.isArray(systemData.processes) ? systemData.processes.length : 120,
    processesList: Array.isArray(systemData.processes) ? systemData.processes : []
  } : {
    cpuUsage: 12,
    ramUsage: 38,
    ramUsed: 6.1,
    ramTotal: 16,
    diskUsed: 180,
    diskTotal: 512,
    battery: 100,
    isCharging: true,
    ip: '127.0.0.1',
    hostname: 'Mock Mode (PC Bridge Disconnected)',
    os: 'Local host',
    uptime: 1200,
    gpuUsage: 5,
    cpuTemp: 39,
    processes: 80,
    processesList: []
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            System Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isConnected ? '⚡ Real-time telemetry connected' : '🔌 Connect PC Bridge for live system monitoring'}
          </p>
        </motion.div>

        {/* Gauges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex flex-wrap justify-center gap-8">
            <CircularProgress value={liveInfo.cpuUsage} label="CPU Usage" />
            <CircularProgress value={liveInfo.ramUsage} label="RAM Usage" />
            <CircularProgress value={liveInfo.battery} label="Battery" unit={liveInfo.isCharging ? '% ⚡' : '%'} />
          </div>
        </motion.div>

        {/* Storage & Bars */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            Storage & Resources
          </h3>
          <ProgressBar value={Math.round(liveInfo.diskUsed)} max={Math.round(liveInfo.diskTotal)} label="Disk Space (GB)" color="cyan" />
          <ProgressBar value={Number(liveInfo.ramUsed.toFixed(1))} max={liveInfo.ramTotal} label="Memory (GB)" color="purple" />
        </motion.div>

        {/* Active Processes list */}
        {isConnected && liveInfo.processesList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Top Memory Processes
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {liveInfo.processesList.slice(0, 7).map((p: any) => (
                <div key={p.pid} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-cyan-400 text-[10px] bg-cyan-950/30 px-1.5 py-0.5 rounded">PID {p.pid}</span>
                    <span className="font-medium truncate text-muted-foreground hover:text-white transition-colors">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-purple-400 font-mono text-[11px]">{p.memory}% RAM</span>
                    <button
                      onClick={() => handleKillProcess(p.pid, p.name)}
                      className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 font-medium transition-all"
                    >
                      End Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* System Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-400" />
            System Details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Cpu className="w-4 h-4 text-cyan-400" />} label="OS" value={liveInfo.os} />
            <InfoCard icon={<Wifi className="w-4 h-4 text-cyan-400" />} label="IP Address" value={liveInfo.ip} />
            <InfoCard icon={<Server className="w-4 h-4 text-purple-400" />} label="Hostname" value={liveInfo.hostname} />
            <InfoCard icon={<Clock className="w-4 h-4 text-purple-400" />} label="Uptime" value={formatUptime(liveInfo.uptime)} />
          </div>
        </motion.div>

        {/* Date/Time */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5 text-center"
        >
          <Clock className="w-6 h-6 mx-auto text-cyan-400 mb-2" />
          <p className="text-2xl font-bold font-mono bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            {time.toLocaleTimeString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 glass-card rounded-lg">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  )
}
