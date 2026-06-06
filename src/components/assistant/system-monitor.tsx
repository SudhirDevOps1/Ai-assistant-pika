'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cpu, HardDrive, Battery, Wifi, Monitor, Clock, Thermometer, Server, Mail } from 'lucide-react'
import { toast } from 'sonner'

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
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch('/api/system')
        const data = await res.json()
        setInfo(data)
      } catch {
        // Silently fail
      }
    }
    fetchInfo()
    const interval = setInterval(fetchInfo, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

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
          <p className="text-sm text-muted-foreground mt-1">Real-time system information</p>
        </motion.div>

        {/* Gauges */}
        {info && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex flex-wrap justify-center gap-8">
              <CircularProgress value={info.cpuUsage} label="CPU Usage" />
              <CircularProgress value={info.ramUsage} label="RAM Usage" />
              <CircularProgress value={info.battery} label="Battery" />
            </div>
          </motion.div>
        )}

        {/* Storage & Bars */}
        {info && (
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
            <ProgressBar value={info.diskUsed} max={info.diskTotal} label="Disk Space" color="cyan" />
            <ProgressBar value={info.ramUsed || info.ramUsage} max={info.ramTotal} label="Memory" color="purple" />
            {info.gpuUsage !== undefined && (
              <ProgressBar value={info.gpuUsage} max={100} label="GPU Usage" color="cyan" />
            )}
          </motion.div>
        )}

        {/* System Info Cards */}
        {info && (
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
              <InfoCard icon={<Cpu className="w-4 h-4 text-cyan-400" />} label="OS" value={info.os} />
              <InfoCard icon={<Wifi className="w-4 h-4 text-cyan-400" />} label="IP Address" value={info.ip} />
              <InfoCard icon={<Server className="w-4 h-4 text-purple-400" />} label="Hostname" value={info.hostname} />
              <InfoCard icon={<Clock className="w-4 h-4 text-purple-400" />} label="Uptime" value={formatUptime(info.uptime)} />
              {info.cpuTemp !== undefined && (
                <InfoCard icon={<Thermometer className="w-4 h-4 text-orange-400" />} label="CPU Temp" value={`${info.cpuTemp}°C`} />
              )}
              {info.processes !== undefined && (
                <InfoCard icon={<Server className="w-4 h-4 text-emerald-400" />} label="Processes" value={String(info.processes)} />
              )}
            </div>
          </motion.div>
        )}

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

        {/* Email Report */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="mailto:?subject=System%20Report&body=System%20monitor%20report%20from%20Voice%20AI%20Assistant"
            className="inline-flex items-center gap-2 px-4 py-2.5 glass-card rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Send Report via Email
          </motion.a>
        </motion.div>

        {!info && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}
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
