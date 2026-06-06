'use client'

import { motion } from 'framer-motion'

export function StatusIndicator({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    idle: 'bg-green-400',
    listening: 'bg-cyan-400',
    thinking: 'bg-yellow-400',
    speaking: 'bg-purple-400',
  }

  const labelMap: Record<string, string> = {
    idle: 'Idle',
    listening: 'Listening',
    thinking: 'Thinking...',
    speaking: 'Speaking',
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 glass-card rounded-full">
      <div className="relative">
        <div
          className={`w-2 h-2 rounded-full ${colorMap[status] || 'bg-green-400'} ${
            status !== 'idle' ? 'status-dot-animated' : ''
          }`}
          style={{ color: colorMap[status] === 'bg-cyan-400' ? 'rgb(34 211 238)' : 'currentColor' }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground capitalize">
        {labelMap[status] || 'Idle'}
      </span>
    </div>
  )
}

export function ProviderBadge({ provider, model }: { provider: string; model: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 glass-card rounded-full"
    >
      <span className="text-xs font-medium bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent capitalize">
        {provider}
      </span>
      <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[120px]">
        {model}
      </span>
    </motion.div>
  )
}
